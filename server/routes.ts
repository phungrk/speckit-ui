// HTTP API for `npm run dev` and `npm start`. Decides how users are identified, resolves each
// request's GitHub access, and serves the shared GitHub and tracking logic. See
// specs/002-multi-repo-workspace/contracts/server-api.md.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GATE_KEYS, type DetectTarget, type GateKey, type SessionResponse } from '../src/project/types.ts';
import { handleCopilot } from './copilot.ts';
import { GitHubError, detectSpeckit, getProject, getSpecVariant, identityFor, json, listRepos, type Source } from './github.ts';
import { appConfig, destroySession, getSession, handleCallback, handleLogin, handleLogout, sessionToken } from './session.ts';
import { GateRefused, decideGate, getTracking, type GateAction } from './tracking.ts';
import { HighlightError, readHighlights, saveHighlight } from './highlights.ts';
import type { HighlightChange } from '../src/project/types.ts';

type Env = Record<string, string | undefined>;

/** signin: everyone signs in with GitHub · token: one local user from GITHUB_TOKEN · demo: sample data */
export type Mode = 'signin' | 'token' | 'demo';

export function serverMode(env: Env = process.env): Mode {
  if (appConfig(env)) return 'signin';
  if (env.GITHUB_TOKEN?.trim() || env.GITHUB_REPO?.trim()) return 'token';
  return 'demo';
}

export const LOCAL_HOST = '127.0.0.1';
const isLocal = (host: string) => host === LOCAL_HOST || host === 'localhost' || host === '::1';

/**
 * Where the server may listen (R6). A token-mode server acts as the token's owner for everyone who
 * reaches it, so it stays on this machine unless ALLOW_REMOTE_TOKEN_MODE=1. Used by `npm start` and `npm run dev`.
 */
export function listenHost(requested: string | undefined, env: Env = process.env): { host: string | undefined; warning: string | null } {
  if (serverMode(env) !== 'token') return { host: requested, warning: null };
  if (!requested || isLocal(requested)) return { host: requested || LOCAL_HOST, warning: null };
  if (env.ALLOW_REMOTE_TOKEN_MODE === '1') return { host: requested, warning: `Token mode on ${requested}: everyone who can reach this server acts as the GITHUB_TOKEN owner.` };
  return {
    host: LOCAL_HOST,
    warning: `Token mode: refusing to listen on ${requested}. Everyone who could reach it would act as the GITHUB_TOKEN owner.
Listening on ${LOCAL_HOST} instead. Set up sign-in (GITHUB_APP_CLIENT_ID/SECRET) to share the server, or set ALLOW_REMOTE_TOKEN_MODE=1.`
  };
}

const REPO_RE = /^([\w.-]+)\/([\w.-]+)$/;
const defaultRepo = (env: Env) => (REPO_RE.test(env.GITHUB_REPO?.trim() || '') ? env.GITHUB_REPO!.trim() : null);

export const MISSING_TOKEN = 'GITHUB_TOKEN is not set. Add your token to .env.local (see .env.example), then restart the server.';
const rejectedToken = (status: number) => `GitHub rejected GITHUB_TOKEN (${status}). Put a valid fine-grained token in .env.local, with Contents read, Pull requests read and Issues read and write, then restart the server.`;

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const send = (res: ServerResponse, status: number, data: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};

/** Writes are only accepted from this app's own pages (blocks cross-site form posts and fetches). */
export function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return (req.headers['sec-fetch-site'] ?? 'same-origin') === 'same-origin';
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

const isJsonWrite = (req: IncomingMessage) => sameOrigin(req) && (req.headers['content-type'] || '').startsWith('application/json');

async function readJson(req: IncomingMessage, limit = 8_000): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > limit) throw new HttpError(400, 'Body too large.'); }
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  } catch { /* fall through */ }
  throw new HttpError(400, 'Body must be a JSON object.');
}

// ---- Whose access a request uses ----

interface Access { token: string; identity: string; sessionId?: string }

const tokenUsers = new Map<string, { login: string; avatarUrl: string | null }>();

/** The login behind GITHUB_TOKEN, looked up once per token. */
async function tokenUser(token: string) {
  const known = tokenUsers.get(token);
  if (known) return known;
  const u = await json<{ login: string; avatar_url?: string }>({ owner: '', repo: '', token }, '/user');
  const user = { login: u.login, avatarUrl: u.avatar_url ?? null };
  tokenUsers.set(token, user);
  return user;
}

async function accessFor(req: IncomingMessage, env: Env): Promise<Access> {
  const mode = serverMode(env);
  if (mode === 'signin') {
    const s = getSession(req);
    const token = s && await sessionToken(s, appConfig(env)!);
    if (!s || !token) throw new HttpError(401, 'Sign in required.');
    return { token, identity: s.login, sessionId: s.id };
  }
  const token = env.GITHUB_TOKEN?.trim();
  if (mode === 'demo' || !token) throw new HttpError(401, MISSING_TOKEN);
  return { token, identity: await identityFor(token) };
}

/** The repo a request names, else GITHUB_REPO. */
function sourceFor(access: Access, repo: unknown, ref: unknown, env: Env): Source {
  const name = typeof repo === 'string' && repo.trim() ? repo.trim() : defaultRepo(env);
  if (!name) throw new HttpError(400, 'No repository given. Pass ?repo=owner/name.');
  const m = name.match(REPO_RE);
  if (!m) throw new HttpError(400, 'Repository must look like owner/name.');
  const r = (typeof ref === 'string' && ref.trim()) || (name === defaultRepo(env) ? env.GITHUB_REF?.trim() : '') || undefined;
  return { owner: m[1], repo: m[2], ref: r, token: access.token, identity: access.identity };
}

function fail(res: ServerResponse, e: unknown, access: Access | null, extra: object = {}) {
  if (e instanceof HttpError) return send(res, e.status, { ...extra, error: e.message });
  if (e instanceof GateRefused) return send(res, 409, { error: e.message });
  if (e instanceof HighlightError) return send(res, e.status, { error: e.message });
  if (e instanceof GitHubError) {
    // GitHub no longer accepts the signed-in user's token: end the session.
    if (e.status === 401 && access?.sessionId) { destroySession(access.sessionId); return send(res, 401, { ...extra, error: 'Sign in required.' }); }
    return send(res, e.status === 404 || e.status === 403 ? e.status : 502, { ...extra, error: e.message });
  }
  console.error('Request failed:', e);
  return send(res, 500, { ...extra, error: 'Something went wrong on the speckit-ui server.' });
}

// ---- Endpoints ----

async function handleSession(req: IncomingMessage, res: ServerResponse, env: Env) {
  const mode = serverMode(env);
  const base = { defaultRepo: defaultRepo(env) };
  if (mode === 'demo') return send(res, 200, { mode, user: null } satisfies SessionResponse);
  if (mode === 'signin') {
    const s = getSession(req);
    return send(res, 200, { mode, ...base, user: s ? { login: s.login, avatarUrl: s.avatarUrl } : null } satisfies SessionResponse);
  }
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) return send(res, 200, { mode, ...base, user: null, error: MISSING_TOKEN } satisfies SessionResponse);
  try {
    return send(res, 200, { mode, ...base, user: await tokenUser(token) } satisfies SessionResponse);
  } catch (e) {
    const error = e instanceof GitHubError && (e.status === 401 || e.status === 403) ? rejectedToken(e.status) : e instanceof Error ? e.message : 'Could not reach GitHub.';
    return send(res, 200, { mode, ...base, user: null, error } satisfies SessionResponse);
  }
}

const MAX_DETECT = 30;

function detectTargets(body: Record<string, unknown>): DetectTarget[] {
  const list = body.repos;
  if (!Array.isArray(list) || list.length > MAX_DETECT) throw new HttpError(400, `Expected { repos: [...] } with at most ${MAX_DETECT} repos.`);
  return list.map(x => {
    const t: DetectTarget = typeof x === 'string' ? { fullName: x } : x && typeof x === 'object' ? x as DetectTarget : { fullName: '' };
    if (typeof t.fullName !== 'string' || !REPO_RE.test(t.fullName) || (t.pushedAt != null && typeof t.pushedAt !== 'string')) throw new HttpError(400, 'Each repo must be owner/name.');
    return { fullName: t.fullName, pushedAt: t.pushedAt ?? null };
  });
}

async function handleGate(req: IncomingMessage, res: ServerResponse, access: Access, env: Env) {
  const body = await readJson(req);
  const { repo, slug, gate, action, note, branch } = body;
  if (typeof slug !== 'string' || !GATE_KEYS.includes(gate as GateKey) || !['approve', 'changes', 'reopen'].includes(action as string) || (note !== undefined && typeof note !== 'string') || (branch != null && typeof branch !== 'string')) {
    throw new HttpError(400, 'Expected { repo, slug, branch?, gate, action: approve | changes | reopen, note? }.');
  }
  const src = sourceFor(access, repo, undefined, env);
  const project = await getProject(src);
  const f = await specVersion(src, project, slug, branch as string | undefined);
  // The write's own result goes back: re-reading GitHub's list here could return the gate as it was (specs/001).
  return send(res, 200, await decideGate(src, project, f, gate as GateKey, action as GateAction, ((note as string) || '').trim().slice(0, 2000)));
}

/** Commits one highlight change to the viewed spec's highlights.json (specs/010-spec-annotations). */
async function handleHighlight(req: IncomingMessage, res: ServerResponse, access: Access, env: Env) {
  const { repo, slug, branch, change } = await readJson(req);
  const c = change as HighlightChange | undefined;
  if (typeof slug !== 'string' || !/^\d{3,}-[^/]+$/.test(slug) || typeof branch !== 'string' || !branch || !c || !['add', 'update', 'remove'].includes(c.type)) {
    throw new HttpError(400, 'Expected { repo, slug, branch, change: { type: add | update | remove, … } }.');
  }
  const src = sourceFor(access, repo, undefined, env);
  // The author is who the server knows, never what the page sends (FR-011).
  const user = access.sessionId ? access.identity : (await tokenUser(access.token)).login;
  return send(res, 200, await saveHighlight(src, { slug, branch, change: c, user }));
}

/**
 * The items and etag of the viewed spec's highlights.json, for the page's check for new comments (specs/012 FR-014,
 * contracts/refresh-api.md). A read like the others: same access, nothing written. With If-None-Match it answers 304
 * when the file has not changed, which GitHub does not count against the rate limit.
 */
async function handleHighlightRead(req: IncomingMessage, res: ServerResponse, access: Access, env: Env, url: URL) {
  const q = url.searchParams;
  const slug = q.get('slug'), branch = q.get('branch');
  if (!slug || !/^\d{3,}-[^/]+$/.test(slug) || !branch) throw new HttpError(400, 'Expected ?repo=owner/name&slug=NNN-slug&branch=…');
  const src = sourceFor(access, q.get('repo'), undefined, env);
  const etag = typeof req.headers['if-none-match'] === 'string' ? req.headers['if-none-match'] : null;
  const r = await readHighlights(src, { slug, branch, etag });
  if (r.status === 'unchanged') { res.statusCode = 304; res.setHeader('Cache-Control', 'no-store'); return res.end(); }
  return send(res, 200, { items: r.items, error: r.error, etag: r.etag });
}

/** The version of a spec on `branch`, or the shown one; 400 for a branch outside branchPrefixes (contracts/branches.md). */
async function specVersion(src: Source, project: Awaited<ReturnType<typeof getProject>>, slug: string, branch?: string | null) {
  if (branch && branch !== project.ref && !project.branchPrefixes.some(p => branch.startsWith(p))) {
    throw new HttpError(400, `Branch ${branch} is not read here (branch prefixes: ${project.branchPrefixes.join(', ') || 'none'}).`);
  }
  const f = branch === undefined || branch === null ? project.specs.find(x => x.slug === slug) : await getSpecVariant(src, project, slug, branch);
  if (!f) throw new HttpError(404, `No spec ${slug}${branch ? ` on ${branch}` : ''} in ${project.repo}.`);
  return f;
}

const POSTS = new Set(['/api/repos/detect', '/api/gates', '/api/highlights', '/api/copilot', '/auth/logout']);
const JSON_WRITES = new Set(['/api/repos/detect', '/api/gates', '/api/highlights']);
const ROUTES = new Set(['/api/session', '/api/repos', '/api/repos/detect', '/api/project', '/api/spec', '/api/tracking', '/api/gates', '/api/highlights', '/api/copilot', '/auth/login', '/auth/callback', '/auth/logout']);

/** Serves the API. Returns false when the path is not an API route. */
export function handleApi(req: IncomingMessage, res: ServerResponse, env: Env = process.env): boolean {
  const url = new URL(req.url || '/', 'http://x');
  if (!ROUTES.has(url.pathname)) return false;
  void route(req, res, url, env);
  return true;
}

export async function route(req: IncomingMessage, res: ServerResponse, url: URL, env: Env = process.env) {
  const path = url.pathname;
  const method = req.method || 'GET';
  // /api/highlights takes a GET (the check for new comments) and a POST (the save); the other paths one method each.
  if (path === '/api/highlights' ? method !== 'GET' && method !== 'POST' : method !== (POSTS.has(path) ? 'POST' : 'GET')) return send(res, 405, { error: 'Method not allowed.' });
  // JSON writes must come from our own pages; checked before the body is read.
  if (JSON_WRITES.has(path) && method === 'POST' && !isJsonWrite(req)) return send(res, 403, { error: 'Forbidden.' });

  if (path.startsWith('/auth/')) {
    const cfg = appConfig(env);
    if (!cfg) return send(res, 404, { error: 'Sign-in is not configured on this server.' });
    if (path === '/auth/login') return handleLogin(req, res, cfg, url);
    if (path === '/auth/callback') return handleCallback(req, res, cfg, url);
    if (!sameOrigin(req)) return send(res, 403, { error: 'Forbidden.' });
    return handleLogout(req, res);
  }
  if (path === '/api/session') return handleSession(req, res, env);

  const mode = serverMode(env);
  if (path === '/api/copilot') {
    if (mode === 'signin' && !getSession(req)) return send(res, 401, { error: 'Sign in required.' });
    return handleCopilot(req, res);
  }
  const data = path === '/api/project' || path === '/api/tracking' || path === '/api/spec';
  // Without any GitHub configuration the app shows the sample workspace.
  if (mode === 'demo' && data) return send(res, 200, { configured: false });

  let access: Access | null = null;
  const extra = data ? { configured: true } : {};
  try {
    access = await accessFor(req, env);
    const q = url.searchParams;
    if (path === '/api/repos') return send(res, 200, await listRepos(access));
    if (path === '/api/repos/detect') return send(res, 200, await detectSpeckit(access, detectTargets(await readJson(req))));
    if (path === '/api/gates') return await handleGate(req, res, access, env);
    if (path === '/api/highlights') return await (method === 'GET' ? handleHighlightRead(req, res, access, env, url) : handleHighlight(req, res, access, env));
    const src = sourceFor(access, q.get('repo'), q.get('ref'), env);
    const refresh = q.has('refresh');
    const project = await getProject(src, refresh);
    if (path === '/api/project') return send(res, 200, { configured: true, project });
    if (path === '/api/spec') {
      const slug = q.get('slug');
      if (!slug) throw new HttpError(400, 'Expected ?slug=NNN-slug.');
      return send(res, 200, { configured: true, feature: await specVersion(src, project, slug, q.get('branch') || null) });
    }
    return send(res, 200, { configured: true, tracking: await getTracking(src, project, refresh) });
  } catch (e) {
    return fail(res, e, access, extra);
  }
}
