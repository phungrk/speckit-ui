// Reads a Spec Kit project from GitHub (REST API) and serves it as /api/project.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Project, ProjectResponse, SpecFeature } from '../src/project/types.ts';
import { commandPrefix, parseAnalysis, parseChecklist, parseConstitution, parseGitmodules, parsePlan, parseSpec, parseTasks, parseUiConfig } from './parse.ts';

const API = 'https://api.github.com';
const RECHECK_MS = 30_000; // how long a loaded commit is served before checking for a newer one
const CONCURRENCY = 8;
const DOCS = ['research.md', 'data-model.md', 'quickstart.md'];

export interface Source { owner: string; repo: string; ref?: string; token?: string }

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
    ...(write ? { method: write.method, body: JSON.stringify(write.body) } : {}),
    headers: {
      Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'speckit-ui',
      ...(write ? { 'Content-Type': 'application/json' } : {}),
      ...(src.token ? { Authorization: `Bearer ${src.token}` } : {})
    }
  });
  if (res.ok) return res;
  const name = `${src.owner}/${src.repo}`;
  if (res.status === 404) throw new GitHubError(`GitHub returned 404 for ${name}${path.includes('/contents/') ? ' ' + decodeURIComponent(path.split('/contents/')[1].split('?')[0]) : ''}. Check GITHUB_REPO, GITHUB_REF, and that GITHUB_TOKEN can read this repository.`, 404);
  if (res.status === 401) throw new GitHubError('GITHUB_TOKEN was rejected by GitHub (401).', 401);
  if (res.status === 403 || res.status === 429) throw new GitHubError(`GitHub refused the request (${res.status}). The token may lack access${write ? ' (writing to issues needs Issues: Read and write)' : ''}, or the rate limit is exhausted.`, res.status);
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

// Cache: serve the last load for RECHECK_MS, then re-check the branch head and reload only if it moved.
let cache: { key: string; project: Project; checkedAt: number } | null = null;
let inflight: Promise<Project> | null = null;

export async function getProject(src: Source, refresh = false): Promise<Project> {
  const key = `${src.owner}/${src.repo}@${src.ref || ''}`;
  if (cache?.key === key && !refresh && Date.now() - cache.checkedAt < RECHECK_MS) return cache.project;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      if (cache?.key === key) {
        const commit = await json<{ sha: string }>(src, `/repos/${src.owner}/${src.repo}/commits/${encodeURIComponent(cache.project.ref)}`);
        if (commit.sha === cache.project.sha) {
          cache.checkedAt = Date.now();
          return cache.project;
        }
      }
      const project = await loadProject(src);
      cache = { key, project, checkedAt: Date.now() };
      return project;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function handleProject(req: IncomingMessage, res: ServerResponse) {
  const send = (status: number, data: ProjectResponse) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
  };
  if (req.method !== 'GET') return send(405, { configured: true, error: 'Method not allowed.' });
  const src = sourceFromEnv();
  if (!src) return send(200, { configured: false });
  try {
    const refresh = new URL(req.url || '/', 'http://x').searchParams.has('refresh');
    return send(200, { configured: true, project: await getProject(src, refresh) });
  } catch (e) {
    if (!(e instanceof GitHubError)) console.error('Project load failed:', e);
    return send(e instanceof GitHubError ? 502 : 500, { configured: true, error: e instanceof Error ? e.message : 'Could not load the project.' });
  }
}
