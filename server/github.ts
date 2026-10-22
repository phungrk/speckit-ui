// Reads Spec Kit projects from GitHub (REST API). Shared by the server and the static build,
// so nothing here uses Node APIs; the HTTP handlers live in routes.ts.
import type { AccessibleRepo, BranchInfo, DetectResult, DetectTarget, Project, RepoListing, SpecFeature, SpecVariant } from '../src/project/types.ts';
import { CLAUDE_SETTINGS, GATE_HOOK_FILE, GATE_HOOK_PATH } from '../src/project/gates.ts';
import { commandPrefix, parseConstitution, parseGitmodules, parseUiConfig } from './parse.ts';
import { buildFeature, SPEC_DIR, wantedInSpec } from './project.ts';
export { buildFeature } from './project.ts';

const API = 'https://api.github.com';
const RECHECK_MS = 30_000; // how long a loaded commit is served before checking for a newer one
const CONCURRENCY = 8;

export interface Source {
  owner: string;
  repo: string;
  ref?: string;
  token?: string;
  /** Whose access this is: the login on the server, a token fingerprint elsewhere. Part of every cache key. */
  identity?: string;
}

/** Short fingerprint of a token, so caches are per user without keeping the token in a key. */
export async function identityFor(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].slice(0, 4).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function sourceFromEnv(env = process.env): Source | null {
  const m = (env.GITHUB_REPO || '').trim().match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!m) return null;
  return { owner: m[1], repo: m[2], ref: env.GITHUB_REF?.trim() || undefined, token: env.GITHUB_TOKEN?.trim() || undefined };
}

export class GitHubError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

/** Extra for a read: more request headers (If-None-Match), and whether a 304 is an answer, not an error (specs/012 research R15). */
export interface GhExtra { headers?: Record<string, string>; allow304?: boolean }

export async function gh(src: Source, path: string, raw = false, write?: { method: 'POST' | 'PATCH' | 'PUT'; body: unknown }, extra?: GhExtra): Promise<Response> {
  const res = await fetch(API + path, {
    // Reads revalidate with GitHub (ETag): a browser would otherwise serve GitHub's
    // max-age=60 copy, which is how an approval used to "come back" (specs/001 R1).
    ...(write ? { method: write.method, body: JSON.stringify(write.body) } : { cache: 'no-cache' as RequestCache }),
    headers: {
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      // Browsers set their own User-Agent; sending one from a page breaks GitHub's CORS preflight.
      ...(typeof window === 'undefined' ? { 'User-Agent': 'speckit-ui' } : {}),
      ...(write ? { 'Content-Type': 'application/json' } : {}),
      ...(src.token ? { Authorization: `Bearer ${src.token}` } : {}),
      ...extra?.headers
    }
  });
  if (res.ok || (extra?.allow304 && res.status === 304)) return res;
  const name = path.match(/^\/repos\/([^/]+\/[^/?]+)/)?.[1] ?? `${src.owner}/${src.repo}`;
  if (res.status === 404) throw new GitHubError(`GitHub returned 404 for ${name}${path.includes('/contents/') ? ' ' + decodeURIComponent(path.split('/contents/')[1].split('?')[0]) : ''}. The repository or branch may not exist, or your token cannot read it.`, 404);
  if (res.status === 401) throw new GitHubError('GitHub rejected the token (401).', 401);
  if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) throw new GitHubError('GitHub rate limit reached. Try again in a few minutes.', 429);
  if (res.status === 403) throw new GitHubError(`GitHub refused the request (403). The token may lack access to ${name}${write ? (path.includes('/contents/') ? ' (committing highlights needs Contents: Read and write)' : ' (writing to issues needs Issues: Read and write)') : ''}.`, 403);
  throw new GitHubError(`GitHub API error ${res.status} for ${path}.`, res.status);
}

export const json = async <T>(src: Source, path: string) => (await (await gh(src, path)).json()) as T;
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/** Run `fn` over `items` with at most `n` in flight. */
export async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

interface TreeEntry { path: string; type: string; sha?: string }
/** What the default branch's load knows about its spec folders, for comparing branches against it. */
interface MainTrees { specsTreeSha: string | null; dirShas: Record<string, string>; pointers: Record<string, string> }
const mainTrees = new WeakMap<Project, MainTrees>();

/**
 * Loads a Spec Kit project: the default branch (or `src.ref` when pinned), plus, unless a branch is
 * pinned, every spec that differs on a feat/ branch (specs/003).
 */
export async function loadProject(src: Source): Promise<Project> {
  const main = await loadMain(src);
  return src.ref ? main : withBranches(src, main, await listBranches(src, main.branchPrefixes).catch(branchListFailed));
}

// Whether the user may write, by project key (user and repository). It is NOT part of the cached Project: getProject
// reuses a loaded commit while the default branch has not moved, so a value kept there would stay stale when the user is
// given write access in between (specs/012 research R16). Read with the repository, and again on a refresh.
const writeAccess = new Map<string, boolean | null>();
const pushOf = (r: { permissions?: { push?: boolean } }) => typeof r.permissions?.push === 'boolean' ? r.permissions.push : null;

async function loadMain(src: Source): Promise<Project> {
  const base = `/repos/${src.owner}/${src.repo}`;
  let ref = src.ref;
  if (ref) writeAccess.set(projectKey(src), null);
  else {
    const repo = await json<{ default_branch: string; permissions?: { push?: boolean } }>(src, base);
    ref = repo.default_branch;
    writeAccess.set(projectKey(src), pushOf(repo));
  }
  const commit = await json<{ sha: string; commit: { committer?: { date?: string } } }>(src, `${base}/commits/${encodeURIComponent(ref)}`);
  return loadAt(src, ref, commit.sha, commit.commit.committer?.date ?? null);
}

async function loadAt(src: Source, ref: string, sha: string, committedAt: string | null): Promise<Project> {
  const base = `/repos/${src.owner}/${src.repo}`;
  const tree = await json<{ tree: TreeEntry[]; truncated: boolean }>(src, `${base}/git/trees/${sha}?recursive=1`);
  const blobs = tree.tree.filter(e => e.type === 'blob').map(e => e.path);
  const pointers = new Map(tree.tree.filter(e => e.type === 'commit').map(e => [e.path, e.sha ?? null]));
  const warnings: string[] = tree.truncated ? ['The repository tree was too large to list fully; some specs may be missing.'] : [];

  const specFiles = new Map<string, string[]>();
  for (const p of blobs) {
    const m = p.match(/^specs\/(\d{3,}-[^/]+)\/(.+)$/);
    if (m) specFiles.set(m[1], [...(specFiles.get(m[1]) || []), m[2]]);
  }

  // Only the files the UI renders are downloaded.
  const wanted = ['.specify/memory/constitution.md', '.specify/integration.json', '.specify/speckit-ui.json', '.gitmodules', CLAUDE_SETTINGS].filter(p => blobs.includes(p));
  for (const [dir, files] of specFiles) for (const f of files) if (wantedInSpec(f)) wanted.push(`specs/${dir}/${f}`);
  const texts = new Map<string, string>();
  await pool(wanted, CONCURRENCY, async p => {
    try { texts.set(p, await (await gh(src, `${base}/contents/${enc(p)}?ref=${sha}`, true)).text()); }
    catch (e) { warnings.push(`Could not read ${p}: ${e instanceof Error ? e.message : e}`); }
  });

  const read = (p: string) => texts.get(p) ?? null;
  const treeShas = new Map(tree.tree.filter(e => e.type === 'tree').map(e => [e.path, e.sha ?? '']));
  const blobShas = new Map(tree.tree.filter(e => e.type === 'blob').map(e => [e.path, e.sha ?? '']));
  const specs = [...specFiles.keys()].sort().map(dir => {
    const f = withBlobs(buildFeature(dir, specFiles.get(dir)!, x => read(`specs/${dir}/${x}`), sha), dir, blobShas);
    const treeSha = treeShas.get(`specs/${dir}`);
    // The same folder on a branch is then served from cache.
    if (treeSha) remember(specDirs, dirKey(src, treeSha), f, MAX_SPEC_DIRS);
    return f;
  });

  const constitution = read('.specify/memory/constitution.md');
  const modules = parseGitmodules(read('.gitmodules') || '').map(m => ({ ...m, sha: pointers.get(m.path) ?? null }));
  // Merge order: .specify/speckit-ui.json if present, else .gitmodules order.
  const ui = parseUiConfig(read('.specify/speckit-ui.json'));
  const order = ui.mergeOrder;
  const rank = (m: { path: string; repo: string | null }) => { const i = order.findIndex(o => o === m.path || o === m.repo); return i < 0 ? order.length : i; };
  const submodules = modules.map((m, i) => ({ m, i })).sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i).map(x => x.m);
  const project: Project = {
    repo: `${src.owner}/${src.repo}`,
    ref,
    sha,
    committedAt,
    fetchedAt: new Date().toISOString(),
    commandPrefix: commandPrefix(read('.specify/integration.json')),
    constitution: constitution ? parseConstitution(constitution) : null,
    specs,
    submodules,
    warnings,
    branches: [],
    skippedBranches: 0,
    branchPrefixes: ui.branchPrefixes,
    pinned: !!src.ref,
    approvalGates: ui.approvalGates,
    // The gate check counts as installed when the script is there and settings.json runs it (specs/004 R7).
    gateCheck: blobs.includes(GATE_HOOK_PATH) && (read(CLAUDE_SETTINGS) ?? '').includes(GATE_HOOK_FILE) ? 'installed' : 'missing'
  };
  const dirShas = Object.fromEntries(specs.flatMap(f => { const t = treeShas.get(`specs/${f.slug}`); return t ? [[f.slug, t]] : []; }));
  const mainPointers = Object.fromEntries([...pointers].flatMap(([p, v]) => (v ? [[p, v]] : [])));
  mainTrees.set(project, { specsTreeSha: treeShas.get('specs') ?? null, dirShas, pointers: mainPointers });
  // Each spec starts as its single default-branch version; withBranches adds the others.
  for (const f of specs) f.variants = [{ branches: [ref], treeSha: dirShas[f.slug] ?? '', sha, onDefault: true, stage: stageOf(f), committedAt, pointers: mainPointers }];
  return project;
}

// ---- Specs on feat/ branches (specs/003) ----

export const MAX_BRANCHES = 30;
const BRANCH_PAGES = 3;
const MAX_SPEC_DIRS = 64;

export interface BranchHead { name: string; sha: string }

/** feat/ branches (or the repo's prefixes), highest name first, at most MAX_BRANCHES. */
export interface BranchHeads { branches: BranchHead[]; skipped: number; error?: string }

export async function listBranches(src: Source, prefixes: string[]): Promise<BranchHeads> {
  if (!prefixes.length) return { branches: [], skipped: 0 };
  const all: BranchHead[] = [];
  for (let page = 1; page <= BRANCH_PAGES; page++) {
    const res = await gh(src, `/repos/${src.owner}/${src.repo}/branches?per_page=100&page=${page}`);
    const items = await res.json() as { name: string; commit: { sha: string } }[];
    all.push(...items.map(b => ({ name: b.name, sha: b.commit.sha })));
    if (!res.headers.get('link')?.includes('rel="next"')) break;
  }
  const matching = all.filter(b => prefixes.some(p => b.name.startsWith(p))).sort((a, b) => b.name.localeCompare(a.name));
  return { branches: matching.slice(0, MAX_BRANCHES), skipped: Math.max(0, matching.length - MAX_BRANCHES) };
}

/** A repo whose branches can't be listed still shows its default branch. */
const branchListFailed = (e: unknown): BranchHeads => ({
  branches: [],
  skipped: 0,
  ...(e instanceof GitHubError && e.status === 404 ? {} : { error: `Could not list branches: ${e instanceof Error ? e.message : e}` })
});

// Git objects never change, so anything keyed by a SHA can be kept until evicted.
const specDirs = new Map<string, SpecFeature>();
const trees = new Map<string, TreeEntry[]>();
const commitDates = new Map<string, string | null>();
const dirKey = (src: Source, sha: string) => `${src.identity ?? ''}|${src.owner}/${src.repo}|${sha}`;

async function treeAt(src: Source, sha: string): Promise<TreeEntry[]> {
  const key = dirKey(src, sha);
  const hit = trees.get(key);
  if (hit) return hit;
  const t = (await json<{ tree: TreeEntry[] }>(src, `/repos/${src.owner}/${src.repo}/git/trees/${sha}`)).tree;
  remember(trees, key, t, MAX_SPEC_DIRS);
  return t;
}

/** One spec folder at `commitSha`, cached by the folder's tree SHA. */
/** Blob sha of each file in a spec folder, for a highlight's docSha (specs/010-spec-annotations). */
function withBlobs(f: SpecFeature, dir: string, shas: Map<string, string>): SpecFeature {
  const prefix = dir ? `specs/${dir}/` : '';
  const blobs: Record<string, string> = {};
  for (const file of f.files) { const s = shas.get(prefix + file); if (s) blobs[file] = s; }
  return { ...f, blobs };
}

export async function loadSpecDir(src: Source, commitSha: string, dir: string, treeSha: string): Promise<SpecFeature> {
  const key = dirKey(src, treeSha);
  const hit = specDirs.get(key);
  if (hit) return { ...hit, sha: commitSha };
  const base = `/repos/${src.owner}/${src.repo}`;
  const tree = await json<{ tree: TreeEntry[] }>(src, `${base}/git/trees/${treeSha}?recursive=1`);
  const files = tree.tree.filter(e => e.type === 'blob').map(e => e.path);
  const texts = new Map<string, string>();
  await pool(files.filter(wantedInSpec), CONCURRENCY, async f => {
    texts.set(f, await (await gh(src, `${base}/contents/${enc(`specs/${dir}/${f}`)}?ref=${commitSha}`, true)).text());
  });
  const feature = withBlobs(buildFeature(dir, files, f => texts.get(f) ?? null, commitSha), '', new Map(tree.tree.filter(e => e.type === 'blob').map(e => [e.path, e.sha ?? ''])));
  remember(specDirs, key, feature, MAX_SPEC_DIRS);
  return feature;
}

/** Steps done from Specify to Implement, the measure of how far a version went (R4). */
function stageOf(f: SpecFeature): number {
  const tasks = (f.tasks || []).flatMap(p => p.tasks);
  return [!!f.spec, !!f.spec?.clarifications.length, !!f.plan, !!f.tasks, !!f.analysis, tasks.length > 0 && tasks.every(t => t.done)].filter(Boolean).length;
}

interface BranchRead { info: BranchInfo; versions: { feature: SpecFeature; treeSha: string }[]; pointers: Record<string, string> }

/** Reads one branch: only spec folders whose tree differs from the default branch are loaded (R2). */
async function readBranch(src: Source, main: MainTrees, b: BranchHead): Promise<BranchRead> {
  const info: BranchInfo = { name: b.name, sha: b.sha, specsTreeSha: null, unmergedSlugs: [], error: null };
  try {
    const root = await treeAt(src, b.sha);
    const pointers = Object.fromEntries(root.flatMap(e => (e.type === 'commit' && e.sha ? [[e.path, e.sha]] : [])));
    const specs = root.find(e => e.path === 'specs' && e.type === 'tree');
    info.specsTreeSha = specs?.sha ?? null;
    if (!specs?.sha || specs.sha === main.specsTreeSha) return { info, versions: [], pointers };
    const dirs = (await treeAt(src, specs.sha)).filter(e => e.type === 'tree' && e.sha && SPEC_DIR.test(e.path) && e.sha !== main.dirShas[e.path]);
    info.unmergedSlugs = dirs.map(d => d.path);
    const versions = await pool(dirs, 4, async d => ({ feature: await loadSpecDir(src, b.sha, d.path, d.sha!), treeSha: d.sha! }));
    return { info, versions, pointers };
  } catch (e) {
    info.error = e instanceof Error ? e.message : String(e);
    return { info, versions: [], pointers: {} };
  }
}

async function commitDate(src: Source, sha: string): Promise<string | null> {
  const key = dirKey(src, sha);
  if (commitDates.has(key)) return commitDates.get(key)!;
  let d: string | null = null;
  try { d = (await json<{ commit: { committer?: { date?: string } } }>(src, `/repos/${src.owner}/${src.repo}/commits/${sha}`)).commit.committer?.date ?? null; } catch { /* unknown */ }
  remember(commitDates, key, d, MAX_SPEC_DIRS);
  return d;
}

/** The default branch's project plus every unmerged spec version from `heads`, one row per slug (R4, R5). */
async function withBranches(src: Source, main: Project, heads: BranchHeads): Promise<Project> {
  const trees0 = mainTrees.get(main)!;
  const reads = await pool(heads.branches, CONCURRENCY, b => readBranch(src, trees0, b));
  const warnings = [...main.warnings];
  if (heads.error) warnings.push(heads.error);
  for (const r of reads) if (r.info.error) warnings.push(`Could not read branch ${r.info.name}: ${r.info.error}`);
  if (heads.skipped) warnings.push(`${heads.skipped} more ${main.branchPrefixes.join(', ')} branches were not read (limit ${MAX_BRANCHES}).`);

  // Versions per slug, merged by tree SHA so branches carrying the same folder count once.
  const bySlug = new Map<string, { feature: SpecFeature; variant: SpecVariant }[]>();
  // Copies: `main` stays cached and is re-used when only branches moved.
  for (const f of main.specs) bySlug.set(f.slug, [{ feature: f, variant: { ...f.variants[0], branches: [...f.variants[0].branches] } }]);
  for (const r of reads) {
    for (const v of r.versions) {
      const list = bySlug.get(v.feature.slug) ?? [];
      const same = list.find(x => x.variant.treeSha === v.treeSha);
      if (same) { same.variant.branches.push(r.info.name); continue; }
      list.push({ feature: v.feature, variant: { branches: [r.info.name], treeSha: v.treeSha, sha: r.info.sha, onDefault: false, stage: stageOf(v.feature), committedAt: null, pointers: { ...trees0.pointers, ...r.pointers } } });
      bySlug.set(v.feature.slug, list);
    }
  }

  const specs: SpecFeature[] = [];
  for (const slug of [...bySlug.keys()].sort()) {
    const list = bySlug.get(slug)!;
    // A version carried by several branches is named after the one made for it (feat/003-x for 003-x).
    for (const { variant: v } of list) {
      if (v.onDefault || v.branches.length < 2) continue;
      v.branches.sort((a, b) => Number(b.includes(slug)) - Number(a.includes(slug)) || a.localeCompare(b));
      const r = reads.find(x => x.info.name === v.branches[0]);
      if (r) { v.sha = r.info.sha; v.pointers = { ...trees0.pointers, ...r.pointers }; }
    }
    const top = Math.max(...list.map(x => x.variant.stage));
    const tied = list.filter(x => x.variant.stage === top);
    // Dates are only needed to break a tie between versions that went equally far.
    if (tied.length > 1) await Promise.all(tied.map(async x => { x.variant.committedAt ??= await commitDate(src, x.variant.sha); }));
    list.sort((a, b) => b.variant.stage - a.variant.stage || (b.variant.committedAt ?? '').localeCompare(a.variant.committedAt ?? '') || a.variant.branches[0].localeCompare(b.variant.branches[0]));
    specs.push(asShown(list[0].feature, list[0].variant, list.map(x => x.variant)));
  }

  // Two different specs with the same number (FR-007).
  const byId = new Map<string, SpecFeature[]>();
  for (const f of specs) byId.set(f.id, [...(byId.get(f.id) ?? []), f]);
  for (const [id, fs] of byId) if (fs.length > 1) warnings.push(`Spec number ${id} is used by ${fs.map(f => `${f.slug} (${f.branch ?? main.ref})`).join(' and ')}.`);

  const project: Project = { ...main, specs, warnings, branches: reads.map(r => r.info), skippedBranches: heads.skipped };
  mainTrees.set(project, trees0);
  return project;
}

/** `feature` presented as `variant`, with every version listed and the shown one first. */
const asShown = (feature: SpecFeature, variant: SpecVariant, all: SpecVariant[]): SpecFeature => ({
  ...feature,
  branch: variant.onDefault ? null : variant.branches[0],
  sha: variant.sha,
  unmerged: !variant.onDefault,
  variants: [variant, ...all.filter(v => v !== variant)]
});

/**
 * The version of `slug` on `branch` (or on the default branch when `branch` is empty or the default
 * branch). null when the slug has no such version (contracts/branches.md, GET /api/spec).
 */
export async function getSpecVariant(src: Source, project: Project, slug: string, branch?: string | null): Promise<SpecFeature | null> {
  const shown = project.specs.find(f => f.slug === slug);
  if (!shown) return null;
  const variant = !branch || branch === project.ref ? shown.variants.find(v => v.onDefault) : shown.variants.find(v => v.branches.includes(branch));
  if (!variant) return null;
  if (variant === shown.variants[0]) return shown;
  const feature = await loadSpecDir(src, variant.sha, slug, variant.treeSha);
  return asShown(feature, variant, shown.variants);
}

// ---- Caches, keyed by identity|owner/repo@ref so users and repos never share an entry ----

export const MAX_CACHED = 8;

/** Insert or refresh `key` as the newest entry, dropping the oldest beyond MAX_CACHED. */
export function remember<V>(map: Map<string, V>, key: string, value: V, max = MAX_CACHED) {
  map.delete(key);
  map.set(key, value);
  while (map.size > max) map.delete(map.keys().next().value!);
}

const projectKey = (src: Source) => `${src.identity ?? ''}|${src.owner}/${src.repo}@${src.ref || ''}`;
interface Cached { project: Project; main: Project; heads: string; checkedAt: number }
const projects = new Map<string, Cached>();
const inflight = new Map<string, Promise<Project>>();
const detected = new Map<string, boolean>();

/** Forget every loaded project and Spec Kit check (Disconnect, Sign out). */
export function clearProjectCache() {
  projects.clear();
  inflight.clear();
  detected.clear();
  writeAccess.clear();
  specDirs.clear();
  trees.clear();
  commitDates.clear();
}

const headsKey = (h: BranchHeads) => h.branches.map(b => `${b.name}@${b.sha}`).join(',') + `+${h.skipped}${h.error ? '!' : ''}`;

/**
 * Serve a load for RECHECK_MS, then re-check the default branch head and the feat/ branch heads,
 * re-reading only what moved (specs/003 R3).
 */
export async function getProject(src: Source, refresh = false): Promise<Project> {
  const key = projectKey(src);
  const withAccess = (p: Project): Project => ({ ...p, canWrite: writeAccess.get(key) ?? null });
  const hit = projects.get(key);
  if (hit && !refresh && Date.now() - hit.checkedAt < RECHECK_MS) return withAccess(hit.project);
  const running = inflight.get(key);
  if (running) return running;
  const load = (async () => {
    try {
      let main: Project | null = null;
      const list = (prefixes: string[]) => listBranches(src, prefixes).catch(branchListFailed);
      // On a refresh the branch heads are listed alongside the default branch check, not after it.
      const early = hit && !src.ref ? list(hit.main.branchPrefixes) : null;
      if (hit) {
        const commit = await json<{ sha: string }>(src, `/repos/${src.owner}/${src.repo}/commits/${encodeURIComponent(hit.main.ref)}`);
        if (commit.sha === hit.main.sha) main = hit.main;
      }
      if (!main) main = await loadMain(src);
      else if (refresh && !src.ref && writeAccess.get(key) === false) {
        // The commit has not moved, so loadMain did not run. A user known to be read-only may have been given write
        // access since; ask again. Nobody else needs the call, which keeps a quiet refresh to commits and branches (specs/003 SC-001).
        await json<{ permissions?: { push?: boolean } }>(src, `/repos/${src.owner}/${src.repo}`).then(r => writeAccess.set(key, pushOf(r)), () => {});
      }
      let project = main, heads = '';
      if (!src.ref) {
        const same = early && main.branchPrefixes.join('\n') === hit!.main.branchPrefixes.join('\n');
        const h = await (same ? early : list(main.branchPrefixes));
        heads = headsKey(h);
        project = hit && hit.main === main && hit.heads === heads ? hit.project : await withBranches(src, main, h);
      }
      remember(projects, key, { project, main, heads, checkedAt: Date.now() });
      return withAccess(project);
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, load);
  return load;
}

// ---- Repositories the user can read ----

interface GhRepo { full_name: string; private: boolean; default_branch: string; pushed_at: string | null }

export const MAX_REPO_PAGES = 10;
const PER_PAGE = 100;

const toRepo = (r: GhRepo): AccessibleRepo => ({ fullName: r.full_name, private: r.private, defaultBranch: r.default_branch, pushedAt: r.pushed_at ?? '', speckit: null, pinned: false });

/**
 * Every repo the token can read, most recently pushed first, up to 1,000.
 * Fine-grained tokens only see the repos chosen for them; GitHub App user tokens (ghu_…) are
 * listed per installation, which is the App's reach intersected with the user's access.
 */
export async function listRepos(src: Pick<Source, 'token'>): Promise<RepoListing> {
  const s: Source = { owner: '', repo: '', ...src };
  const out: GhRepo[] = [];
  let truncated = false;
  if (src.token?.startsWith('ghu_')) {
    const { installations } = await json<{ installations: { id: number }[] }>(s, `/user/installations?per_page=${PER_PAGE}`);
    let pages = 0;
    for (const inst of installations) {
      for (let page = 1; ; page++) {
        if (++pages > MAX_REPO_PAGES) { truncated = true; break; }
        const r = await json<{ repositories: GhRepo[] }>(s, `/user/installations/${inst.id}/repositories?per_page=${PER_PAGE}&page=${page}`);
        out.push(...r.repositories);
        if (r.repositories.length < PER_PAGE) break;
      }
      if (truncated) break;
    }
  } else {
    for (let page = 1; page <= MAX_REPO_PAGES; page++) {
      const res = await gh(s, `/user/repos?per_page=${PER_PAGE}&sort=pushed&page=${page}`);
      const r = await res.json() as GhRepo[];
      out.push(...r);
      // GitHub sends a Link header whenever there is more than one page; only rel="next" means another.
      if (!res.headers.get('link')?.includes('rel="next"')) break;
      if (page === MAX_REPO_PAGES) truncated = true;
    }
  }
  const seen = new Set<string>();
  const repos = out.filter(r => !seen.has(r.full_name) && seen.add(r.full_name)).map(toRepo)
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt)).slice(0, MAX_REPO_PAGES * PER_PAGE);
  return { repos, truncated, fetchedAt: new Date().toISOString() };
}

export const DETECT_CONCURRENCY = 6;

/**
 * Whether each repo is a Spec Kit project (has .specify/ at its root). One call per repo,
 * cached by pushedAt so a new push re-checks it.
 */
export async function detectSpeckit(src: Pick<Source, 'token' | 'identity'>, targets: DetectTarget[]): Promise<DetectResult> {
  const s: Source = { owner: '', repo: '', ...src };
  const results: Record<string, boolean> = {};
  const errors: Record<string, string> = {};
  await pool(targets, DETECT_CONCURRENCY, async t => {
    const key = `${src.identity ?? ''}|${t.fullName}@${t.pushedAt ?? ''}`;
    const known = detected.get(key);
    if (known !== undefined) { results[t.fullName] = known; return; }
    try {
      await gh(s, `/repos/${t.fullName.split('/').map(encodeURIComponent).join('/')}/contents/.specify`);
      results[t.fullName] = true;
    } catch (e) {
      results[t.fullName] = false;
      if (e instanceof GitHubError && e.status === 404) { remember(detected, key, false); return; }
      errors[t.fullName] = e instanceof Error ? e.message : 'Not accessible';
      return;
    }
    remember(detected, key, true);
  });
  return { results, errors };
}

const group = (r: AccessibleRepo) => (r.pinned ? 0 : r.speckit === true ? 1 : r.speckit === null ? 2 : 3);

/** Pinned, then Spec Kit, then not yet checked, then plain repos; newest push first within each. */
export const sortRepos = (repos: AccessibleRepo[], pins: string[]): AccessibleRepo[] =>
  repos.map(r => ({ ...r, pinned: pins.includes(r.fullName) }))
    .sort((a, b) => group(a) - group(b) || b.pushedAt.localeCompare(a.pushedAt));
