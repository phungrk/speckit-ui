// Reads Spec Kit projects from GitHub (REST API). Shared by the server and the static build,
// so nothing here uses Node APIs; the HTTP handlers live in routes.ts.
import type { AccessibleRepo, DetectResult, DetectTarget, Project, RepoListing, SpecFeature } from '../src/project/types.ts';
import { commandPrefix, parseAnalysis, parseChecklist, parseConstitution, parseGitmodules, parsePlan, parseSpec, parseTasks, parseUiConfig } from './parse.ts';

const API = 'https://api.github.com';
const RECHECK_MS = 30_000; // how long a loaded commit is served before checking for a newer one
const CONCURRENCY = 8;
const DOCS = ['research.md', 'data-model.md', 'quickstart.md'];

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

export async function gh(src: Source, path: string, raw = false, write?: { method: 'POST' | 'PATCH'; body: unknown }): Promise<Response> {
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
      ...(src.token ? { Authorization: `Bearer ${src.token}` } : {})
    }
  });
  if (res.ok) return res;
  const name = path.match(/^\/repos\/([^/]+\/[^/?]+)/)?.[1] ?? `${src.owner}/${src.repo}`;
  if (res.status === 404) throw new GitHubError(`GitHub returned 404 for ${name}${path.includes('/contents/') ? ' ' + decodeURIComponent(path.split('/contents/')[1].split('?')[0]) : ''}. The repository or branch may not exist, or your token cannot read it.`, 404);
  if (res.status === 401) throw new GitHubError('GitHub rejected the token (401).', 401);
  if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) throw new GitHubError('GitHub rate limit reached. Try again in a few minutes.', 429);
  if (res.status === 403) throw new GitHubError(`GitHub refused the request (403). The token may lack access to ${name}${write ? ' (writing to issues needs Issues: Read and write)' : ''}.`, 403);
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

export async function loadProject(src: Source): Promise<Project> {
  const base = `/repos/${src.owner}/${src.repo}`;
  const ref = src.ref || (await json<{ default_branch: string }>(src, base)).default_branch;
  const commit = await json<{ sha: string; commit: { committer?: { date?: string } } }>(src, `${base}/commits/${encodeURIComponent(ref)}`);
  return loadAt(src, ref, commit.sha, commit.commit.committer?.date ?? null);
}

async function loadAt(src: Source, ref: string, sha: string, committedAt: string | null): Promise<Project> {
  const base = `/repos/${src.owner}/${src.repo}`;
  const tree = await json<{ tree: { path: string; type: string; sha?: string }[]; truncated: boolean }>(src, `${base}/git/trees/${sha}?recursive=1`);
  const blobs = tree.tree.filter(e => e.type === 'blob').map(e => e.path);
  const pointers = new Map(tree.tree.filter(e => e.type === 'commit').map(e => [e.path, e.sha ?? null]));
  const warnings: string[] = tree.truncated ? ['The repository tree was too large to list fully; some specs may be missing.'] : [];

  const specFiles = new Map<string, string[]>();
  for (const p of blobs) {
    const m = p.match(/^specs\/(\d{3,}-[^/]+)\/(.+)$/);
    if (m) specFiles.set(m[1], [...(specFiles.get(m[1]) || []), m[2]]);
  }

  // Only the files the UI renders are downloaded.
  const wanted = ['.specify/memory/constitution.md', '.specify/integration.json', '.specify/speckit-ui.json', '.gitmodules'].filter(p => blobs.includes(p));
  for (const [dir, files] of specFiles) {
    for (const f of files) {
      if (['spec.md', 'plan.md', 'tasks.md', 'analysis.md', ...DOCS].includes(f) || /^checklists\/[^/]+\.md$/.test(f)) wanted.push(`specs/${dir}/${f}`);
    }
  }
  const texts = new Map<string, string>();
  await pool(wanted, CONCURRENCY, async p => {
    try { texts.set(p, await (await gh(src, `${base}/contents/${enc(p)}?ref=${sha}`, true)).text()); }
    catch (e) { warnings.push(`Could not read ${p}: ${e instanceof Error ? e.message : e}`); }
  });

  const read = (p: string) => texts.get(p) ?? null;
  const specs: SpecFeature[] = [...specFiles.keys()].sort().map(dir => {
    const at = (f: string) => read(`specs/${dir}/${f}`);
    const spec = at('spec.md');
    const plan = at('plan.md');
    const tasks = at('tasks.md');
    const analysis = at('analysis.md');
    const parsedSpec = spec ? parseSpec(spec) : null;
    const files = specFiles.get(dir)!.sort();
    return {
      id: dir.match(/^\d+/)![0],
      slug: dir,
      title: parsedSpec?.title || dir.replace(/^\d+-/, '').replace(/-/g, ' '),
      files,
      spec: parsedSpec,
      plan: plan ? parsePlan(plan) : null,
      tasks: tasks ? parseTasks(tasks) : null,
      analysis: analysis ? parseAnalysis(analysis) : null,
      checklists: files.filter(f => /^checklists\/[^/]+\.md$/.test(f) && at(f) !== null).map(f => parseChecklist(f.slice('checklists/'.length), at(f)!)),
      docs: Object.fromEntries(DOCS.flatMap(d => (at(d) !== null ? [[d, at(d)!]] : [])))
    };
  });

  const constitution = read('.specify/memory/constitution.md');
  const modules = parseGitmodules(read('.gitmodules') || '').map(m => ({ ...m, sha: pointers.get(m.path) ?? null }));
  // Merge order: .specify/speckit-ui.json if present, else .gitmodules order.
  const order = parseUiConfig(read('.specify/speckit-ui.json')).mergeOrder;
  const rank = (m: { path: string; repo: string | null }) => { const i = order.findIndex(o => o === m.path || o === m.repo); return i < 0 ? order.length : i; };
  const submodules = modules.map((m, i) => ({ m, i })).sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i).map(x => x.m);
  return {
    repo: `${src.owner}/${src.repo}`,
    ref,
    sha,
    committedAt,
    fetchedAt: new Date().toISOString(),
    commandPrefix: commandPrefix(read('.specify/integration.json')),
    constitution: constitution ? parseConstitution(constitution) : null,
    specs,
    submodules,
    warnings
  };
}

// ---- Caches, keyed by identity|owner/repo@ref so users and repos never share an entry ----

export const MAX_CACHED = 8;

/** Insert or refresh `key` as the newest entry, dropping the oldest beyond MAX_CACHED. */
export function remember<V>(map: Map<string, V>, key: string, value: V) {
  map.delete(key);
  map.set(key, value);
  while (map.size > MAX_CACHED) map.delete(map.keys().next().value!);
}

const projectKey = (src: Source) => `${src.identity ?? ''}|${src.owner}/${src.repo}@${src.ref || ''}`;
const projects = new Map<string, { project: Project; checkedAt: number }>();
const inflight = new Map<string, Promise<Project>>();
const detected = new Map<string, boolean>();

/** Forget every loaded project and Spec Kit check (Disconnect, Sign out). */
export function clearProjectCache() {
  projects.clear();
  inflight.clear();
  detected.clear();
}

/** Serve a load for RECHECK_MS, then re-check the branch head and reload only if it moved. */
export async function getProject(src: Source, refresh = false): Promise<Project> {
  const key = projectKey(src);
  const hit = projects.get(key);
  if (hit && !refresh && Date.now() - hit.checkedAt < RECHECK_MS) return hit.project;
  const running = inflight.get(key);
  if (running) return running;
  const load = (async () => {
    try {
      if (hit) {
        const commit = await json<{ sha: string }>(src, `/repos/${src.owner}/${src.repo}/commits/${encodeURIComponent(hit.project.ref)}`);
        if (commit.sha === hit.project.sha) {
          remember(projects, key, { project: hit.project, checkedAt: Date.now() });
          return hit.project;
        }
      }
      const project = await loadProject(src);
      remember(projects, key, { project, checkedAt: Date.now() });
      return project;
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
