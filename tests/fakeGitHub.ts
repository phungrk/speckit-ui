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
}

let clock = Date.UTC(2026, 9, 17, 10, 0, 0);
/** A strictly increasing updated_at. */
const tick = () => new Date((clock += 1000)).toISOString();

const ok = (x: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(x), { status: 200, headers });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Serves `repos` (keyed owner/name) and records every call. `extra` handles anything else first. */
export function fakeGitHub(repos: Record<string, FakeRepo>, extra?: (u: URL, method: string, body: Record<string, unknown> | undefined) => Response | Promise<Response> | undefined,
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
