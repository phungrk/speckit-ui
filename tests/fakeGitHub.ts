// A small fake of the GitHub REST API for multi-repo tests. Synthetic data only.
import { vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface Call { method: string; path: string; auth: string | null; body?: Record<string, unknown>; cache?: RequestCache }
export interface FakeIssue { number: number; body: string; state: string; html_url: string; updated_at?: string }
export interface FakeRepo {
  /** spec slug → spec.md text */
  specs?: Record<string, string>;
  issues?: FakeIssue[];
  /** ms to wait before answering the tree request */
  delay?: number;
  /** The issue list keeps answering as it was before the first write, like a lagging list or a browser cache (specs/001). */
  staleIssueList?: boolean;
  /** Status for every PATCH /issues/{n}, to simulate a refused write. */
  patchStatus?: number;
  /** Make POST …/comments fail with this status. */
  commentStatus?: number;
  /** Files written through the Contents API, by branch then path (specs/010-spec-annotations). */
  files?: Record<string, Record<string, string>>;
  /** Status for every PUT …/contents, to simulate a refused or protected branch. */
  putStatus?: number;
  /** Runs before a PUT is checked, e.g. to let "someone else" commit first. */
  beforePut?: (files: Record<string, Record<string, string>>) => void;
  /** Commits made through PUT …/contents: branch, path, message. */
  commits?: { branch: string; path: string; message: string }[];
}

let blobN = 0;
const blobSha = (text: string) => `blob-${text.length}-${[...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16)}`;

let clock = Date.UTC(2026, 9, 17, 10, 0, 0);
/** A strictly increasing updated_at. */
const tick = () => new Date((clock += 1000)).toISOString();

const ok = (x: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(x), { status: 200, headers });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Serves `repos` (keyed owner/name) and records every call. `extra` handles anything else first. */
export function fakeGitHub(repos: Record<string, FakeRepo>, extra?: (u: URL, method: string, body: Record<string, unknown> | undefined) => Response | Promise<Response | undefined> | undefined,
  user: (auth: string | null) => unknown = () => ({ login: 'mai', avatar_url: 'https://avatars.example/mai' })) {
  const calls: Call[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ method, path: u.pathname, auth: headers.Authorization ?? null, body, cache: init?.cache });
    const x = await extra?.(u, method, body);
    if (x) return x;
    if (u.pathname === '/user') return ok(user(headers.Authorization ?? null));
    const m = u.pathname.match(/^\/repos\/([^/]+\/[^/]+)(\/.*)?$/);
    const r = m && repos[m[1]];
    if (!m || !r) return new Response('{}', { status: 404 });
    const name = m[1].split('/')[1], rest = m[2] || '';
    const issues = (r.issues ??= []);
    for (const i of issues) i.updated_at ??= tick();
    const snapshot = ((r as { snapshot?: FakeIssue[] }).snapshot ??= issues.map(i => ({ ...i })));
    const wrote = () => { if (!r.staleIssueList) (r as { snapshot?: FakeIssue[] }).snapshot = undefined; };
    if (rest === '') return ok({ default_branch: 'main' });
    if (rest === '/commits/main') return ok({ sha: `sha-${name}`, commit: { committer: { date: '2026-10-01T00:00:00Z' } } });
    if (rest.startsWith('/git/trees/')) {
      if (r.delay) await sleep(r.delay);
      return ok({ truncated: false, tree: Object.keys(r.specs ?? {}).map(slug => ({ path: `specs/${slug}/spec.md`, type: 'blob' })) });
    }
    const content = rest.match(/^\/contents\/(specs\/[^/]+\/highlights\.json)$/);
    if (content) {
      const path = decodeURIComponent(content[1]);
      const files = (r.files ??= {});
      if (method === 'GET') {
        const text = files[u.searchParams.get('ref') ?? 'main']?.[path];
        if (text === undefined) return new Response('{}', { status: 404 });
        if ((headers.Accept ?? '').includes('raw')) return new Response(text, { status: 200 });
        return ok({ sha: blobSha(text), content: Buffer.from(text).toString('base64'), encoding: 'base64' });
      }
      if (method === 'PUT') {
        r.beforePut?.(files);
        if (r.putStatus) return new Response('{}', { status: r.putStatus });
        const branch = String(body!.branch);
        const current = files[branch]?.[path];
        if ((current === undefined) !== (body!.sha === undefined) || (current !== undefined && blobSha(current) !== body!.sha)) return new Response('{"message":"sha does not match"}', { status: 409 });
        const text = Buffer.from(String(body!.content), 'base64').toString('utf8');
        (files[branch] ??= {})[path] = text;
        (r.commits ??= []).push({ branch, path, message: String(body!.message) });
        const sha = `c${++blobN}`;
        return ok({ content: { sha: blobSha(text) }, commit: { sha, html_url: `https://github.com/${m[1]}/commit/${sha}` } });
      }
    }
    const file = rest.match(/^\/contents\/specs\/([^/]+)\/spec\.md$/);
    if (file) return new Response(r.specs?.[decodeURIComponent(file[1])] ?? '', { status: 200 });
    if (rest === '/contents/.specify') return ok([]);
    if (rest === '/pulls') return ok([]);
    if (rest === '/issues' && method === 'GET') return ok(r.staleIssueList ? snapshot : issues);
    if (rest === '/issues' && method === 'POST') {
      const i = { number: issues.length + 1, body: String(body!.body), state: 'open', html_url: `https://github.com/${m[1]}/issues/${issues.length + 1}`, updated_at: tick() };
      issues.push(i);
      wrote();
      return ok(i);
    }
    const one = rest.match(/^\/issues\/(\d+)$/);
    if (one) {
      const i = issues.find(x => x.number === +one[1]);
      if (!i) return new Response('{}', { status: 404 });
      if (method === 'PATCH') {
        if (r.patchStatus) return new Response('{}', { status: r.patchStatus });
        Object.assign(i, body, { updated_at: tick() });
        wrote();
      }
      return ok(i);
    }
    if (/^\/issues\/\d+\/comments$/.test(rest)) return r.commentStatus ? new Response('{}', { status: r.commentStatus }) : ok({ id: 1 });
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

export const SPEC = (title: string) => `# Feature Specification: ${title}\n\n**Status**: Draft\n`;

/** A spec.md that passes the Specify gate: a story with acceptance scenarios, FRs and SCs. */
export const READY_SPEC = (title: string) => `# Feature Specification: ${title}

**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Do it (Priority: P1)

Text.

**Acceptance Scenarios**:

1. **Given** a, **When** b, **Then** c

## Requirements

### Functional Requirements

- **FR-001**: x

## Success Criteria

### Measurable Outcomes

- **SC-001**: y
`;

/** A request the route handlers accept, with an optional JSON body. */
export function fakeReq(method: string, headers: Record<string, string> = {}, body?: unknown): IncomingMessage {
  const raw = body === undefined ? '' : JSON.stringify(body);
  return {
    method,
    headers: { host: 'h', ...(body !== undefined ? { origin: 'http://h', 'content-type': 'application/json' } : {}), ...headers },
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() { if (raw) yield raw; }
  } as unknown as IncomingMessage;
}

export interface FakeRes { status: number; headers: Record<string, string | string[]>; body: string }

export function fakeRes(): ServerResponse & { out: FakeRes } {
  const out: FakeRes = { status: 0, headers: {}, body: '' };
  return {
    out,
    get statusCode() { return out.status; },
    set statusCode(v: number) { out.status = v; },
    setHeader(k: string, v: string | string[]) { out.headers[k.toLowerCase()] = v; },
    end(b?: string) { out.body = b ?? ''; }
  } as unknown as ServerResponse & { out: FakeRes };
}

// ---- A repo with branches (specs/003): content-derived SHAs, so identical folders share one ----

export interface BranchRepo {
  defaultBranch: string;
  /** branch → path → text */
  branches: Record<string, Record<string, string>>;
  /** branch → submodule path → pointer */
  pointers?: Record<string, Record<string, string>>;
  /** branch → commit date */
  dates?: Record<string, string>;
  /** Branch whose trees answer 500. */
  failBranch?: string;
  /** Answer GET …/branches with 404 (no branch listing). */
  noBranchList?: boolean;
}

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(16).padStart(8, '0'); };

interface Node { type: 'blob' | 'tree' | 'commit'; sha: string; children?: Map<string, Node>; text?: string }

/** Git-like trees for one branch: a tree's SHA depends only on what it holds. */
function buildTree(files: Record<string, string>, pointers: Record<string, string>): Node {
  const root: Node = { type: 'tree', sha: '', children: new Map() };
  const put = (path: string, leaf: Node) => {
    const parts = path.split('/');
    let n = root;
    for (const p of parts.slice(0, -1)) {
      if (!n.children!.has(p)) n.children!.set(p, { type: 'tree', sha: '', children: new Map() });
      n = n.children!.get(p)!;
    }
    n.children!.set(parts.at(-1)!, leaf);
  };
  for (const [p, text] of Object.entries(files)) put(p, { type: 'blob', sha: 'b' + hash(text), text });
  for (const [p, sha] of Object.entries(pointers)) put(p, { type: 'commit', sha });
  const seal = (n: Node): string => {
    if (n.type !== 'tree') return n.sha;
    n.sha = 't' + hash([...n.children!].sort(([a], [b]) => a.localeCompare(b)).map(([k, c]) => `${k}:${seal(c)}`).join(';'));
    return n.sha;
  };
  seal(root);
  return root;
}

/** Serves `name` (owner/repo) with its branches, plus a minimal tracking-issue API. Returns the recorded calls. */
export function fakeBranches(name: string, repo: BranchRepo, extra?: (u: URL, method: string, body: Record<string, unknown> | undefined) => Response | Promise<Response> | undefined) {
  const issues: FakeIssue[] = [];
  const view = () => {
    const out = new Map<string, { root: Node; commit: string }>();
    for (const [b, files] of Object.entries(repo.branches)) {
      const root = buildTree(files, repo.pointers?.[b] ?? {});
      out.set(b, { root, commit: 'c' + hash(b + root.sha) });
    }
    return out;
  };
  const findTree = (n: Node, sha: string): Node | null => {
    if (n.sha === sha && n.type === 'tree') return n;
    for (const c of n.children?.values() ?? []) { const f = findTree(c, sha); if (f) return f; }
    return null;
  };
  const entries = (n: Node, recursive: boolean, prefix = ''): { path: string; type: string; sha: string }[] =>
    [...n.children!].flatMap(([k, c]) => [{ path: prefix + k, type: c.type, sha: c.sha }, ...(recursive && c.type === 'tree' ? entries(c, true, `${prefix}${k}/`) : [])]);
  return fakeGitHub({}, async (u, method, body) => {
    const x = await extra?.(u, method, body);
    if (x) return x;
    const base = `/repos/${name}`;
    if (!u.pathname.startsWith(base)) return undefined;
    const rest = u.pathname.slice(base.length);
    const v = view();
    const byCommit = (sha: string) => [...v].find(([, b]) => b.commit === sha);
    if (rest === '') return ok({ default_branch: repo.defaultBranch });
    if (rest === '/branches') return repo.noBranchList ? new Response('{}', { status: 404 }) : ok([...v].map(([b, { commit }]) => ({ name: b, commit: { sha: commit } })));
    const commit = rest.match(/^\/commits\/(.+)$/);
    if (commit) {
      const ref = decodeURIComponent(commit[1]);
      const hit = v.get(ref) ? [ref, v.get(ref)!] as const : byCommit(ref);
      return hit ? ok({ sha: hit[1].commit, commit: { committer: { date: repo.dates?.[hit[0]] ?? '2026-10-01T00:00:00Z' } } }) : new Response('{}', { status: 404 });
    }
    const tree = rest.match(/^\/git\/trees\/([^/?]+)$/);
    if (tree) {
      const recursive = u.searchParams.has('recursive');
      const asCommit = byCommit(tree[1]);
      if (asCommit) {
        if (asCommit[0] === repo.failBranch) return new Response('{}', { status: 500 });
        return ok({ truncated: false, tree: entries(asCommit[1].root, recursive) });
      }
      for (const [, b] of v) { const t = findTree(b.root, tree[1]); if (t) return ok({ truncated: false, tree: entries(t, recursive) }); }
      return new Response('{}', { status: 404 });
    }
    const file = rest.match(/^\/contents\/(.+)$/);
    if (file) {
      const at = byCommit(u.searchParams.get('ref') ?? '');
      const text = at && repo.branches[at[0]][decodeURIComponent(file[1])];
      return text === undefined ? new Response('{}', { status: 404 }) : new Response(text, { status: 200 });
    }
    if (rest === '/pulls') return ok([]);
    if (rest === '/issues' && method === 'GET') return ok(issues);
    if (rest === '/issues' && method === 'POST') {
      const i = { number: issues.length + 1, body: String(body!.body), state: 'open', html_url: `https://github.com/${name}/issues/${issues.length + 1}`, updated_at: tick() };
      issues.push(i);
      return ok(i);
    }
    const one = rest.match(/^\/issues\/(\d+)$/);
    if (one) {
      const i = issues.find(y => y.number === +one[1]);
      if (!i) return new Response('{}', { status: 404 });
      if (method === 'PATCH') Object.assign(i, body, { updated_at: tick() });
      return ok(i);
    }
    if (/^\/issues\/\d+\/comments$/.test(rest)) return ok({ id: 1 });
    return undefined;
  });
}
