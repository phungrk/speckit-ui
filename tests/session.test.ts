import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProjectCache } from '../server/github';
import { route } from '../server/routes';
import { createSession, getSession, sessionToken, type ServerSession } from '../server/session';
import { clearTrackingCache } from '../server/tracking';
import { fakeGitHub, fakeReq, fakeRes } from './fakeGitHub';

const ENV = { GITHUB_APP_CLIENT_ID: 'Iv1.app', GITHUB_APP_CLIENT_SECRET: 'app-secret', GITHUB_REPO: 'o/a' };
const ACCESS = 'ghu_mai_secret', REFRESH = 'ghr_refresh_secret';
const ok = (x: unknown) => new Response(JSON.stringify(x), { status: 200 });

async function call(path: string, opts: { method?: string; cookie?: string; body?: unknown; env?: Record<string, string> } = {}) {
  const res = fakeRes();
  const headers: Record<string, string> = opts.cookie ? { cookie: opts.cookie } : {};
  if (opts.method === 'POST' && opts.body === undefined) headers.origin = 'http://h';
  await route(fakeReq(opts.method ?? 'GET', headers, opts.body), res, new URL('http://h' + path), opts.env ?? ENV);
  return res.out;
}
const cookies = (out: { headers: Record<string, string | string[]> }) => ([] as string[]).concat(out.headers['set-cookie'] ?? []);
const cookieValue = (out: { headers: Record<string, string | string[]> }, name: string) => {
  const c = cookies(out).find(x => x.startsWith(name + '='));
  return c ? decodeURIComponent(c.slice(name.length + 1).split(';')[0]) : null;
};

/** GitHub's token endpoint and API. The code names the user: code "lan" gets ghu_lan_secret, and /user answers per token. */
function fakeOAuth() {
  return fakeGitHub({ 'o/a': {} }, (u, _m, body) => {
    if (u.hostname === 'github.com' && u.pathname === '/login/oauth/access_token') {
      const who = body?.grant_type === 'refresh_token' ? 'new' : String(body?.code);
      return ok({ access_token: `ghu_${who}_secret`, refresh_token: REFRESH, expires_in: 28800, token_type: 'bearer' });
    }
    return undefined;
  }, auth => ({ login: auth?.match(/ghu_(\w+?)_secret/)?.[1] ?? 'nobody', avatar_url: null }));
}

async function signIn(login = 'mai') {
  const start = await call('/auth/login?return=' + encodeURIComponent('repo=o/a&step=plan&token=x'));
  const state = new URL(start.headers.location as string).searchParams.get('state')!;
  const done = await call(`/auth/callback?code=${login}&state=${state}`, { cookie: `sk_oauth=${encodeURIComponent(cookieValue(start, 'sk_oauth')!)}` });
  return { start, done, cookie: `sk_session=${cookieValue(done, 'sk_session')}` };
}

describe('sign-in mode', () => {
  beforeEach(() => { clearProjectCache(); clearTrackingCache(); fakeOAuth(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('/auth/login stores a state cookie and redirects to GitHub', async () => {
    const out = await call('/auth/login');
    expect(out.status).toBe(302);
    const to = new URL(out.headers.location as string);
    expect(to.origin + to.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(to.searchParams.get('client_id')).toBe('Iv1.app');
    expect(to.searchParams.get('redirect_uri')).toBe('http://h/auth/callback');
    expect(cookieValue(out, 'sk_oauth')).toContain(to.searchParams.get('state')!);
    expect(cookies(out)[0]).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  });

  it('refuses a wrong, missing or expired state without creating a session', async () => {
    fakeOAuth();
    const start = await call('/auth/login');
    const cookie = `sk_oauth=${encodeURIComponent(cookieValue(start, 'sk_oauth')!)}`;
    for (const path of ['/auth/callback?code=c&state=wrong', '/auth/callback?code=c']) {
      const out = await call(path, { cookie });
      expect(out.status).toBe(400);
      expect(out.body).toContain('Sign in again');
      expect(cookieValue(out, 'sk_session')).toBeNull();
    }
    const state = new URL(start.headers.location as string).searchParams.get('state')!;
    expect((await call(`/auth/callback?code=c&state=${state}`)).status).toBe(400);
    vi.useFakeTimers({ now: Date.now() + 11 * 60_000 });
    expect((await call(`/auth/callback?code=c&state=${state}`, { cookie })).status).toBe(400);
  });

  it('a valid callback sets an HttpOnly session cookie and returns to the deep link', async () => {
    const { done } = await signIn();
    expect(done.status).toBe(302);
    expect(done.headers.location).toBe('/?repo=o%2Fa&step=plan');
    const session = cookies(done).find(c => c.startsWith('sk_session='))!;
    expect(session).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    expect(session).not.toContain(ACCESS);
  });

  it('never sends the GitHub tokens to the browser', async () => {
    const { done, cookie } = await signIn();
    const outs = [done, await call('/api/session', { cookie }), await call('/api/repos', { cookie }), await call('/api/project?repo=o/a', { cookie })];
    for (const o of outs) {
      const all = o.body + JSON.stringify(o.headers);
      expect(all).not.toContain(ACCESS);
      expect(all).not.toContain(REFRESH);
    }
    expect(JSON.parse(outs[1].body)).toEqual({ mode: 'signin', defaultRepo: 'o/a', user: { login: 'mai', avatarUrl: null } });
  });

  it('uses the session token for GitHub calls and keys caches by login', async () => {
    const calls = fakeOAuth();
    const a = await signIn('mai');
    const b = await signIn('lan');
    calls.length = 0;
    await call('/api/project?repo=o/a', { cookie: a.cookie });
    await call('/api/project?repo=o/a', { cookie: b.cookie });
    const trees = calls.filter(c => c.path.startsWith('/repos/o/a/git/trees/'));
    expect(trees.map(c => c.auth)).toEqual(['Bearer ghu_mai_secret', 'Bearer ghu_lan_secret']);
  });

  it('returns 401 on /api/* without a session, except /api/session', async () => {
    for (const p of ['/api/repos', '/api/project?repo=o/a', '/api/tracking?repo=o/a']) {
      const out = await call(p);
      expect(out.status).toBe(401);
      expect(JSON.parse(out.body).error).toBe('Sign in required.');
    }
    expect((await call('/api/copilot', { method: 'POST', body: {} })).status).toBe(401);
    expect(JSON.parse((await call('/api/session')).body)).toMatchObject({ mode: 'signin', user: null });
  });

  it('logout clears the session and the cookie', async () => {
    const { cookie } = await signIn();
    const out = await call('/auth/logout', { method: 'POST', cookie });
    expect(JSON.parse(out.body)).toEqual({ ok: true });
    expect(cookies(out)[0]).toMatch(/^sk_session=; Max-Age=0/);
    expect((await call('/api/repos', { cookie })).status).toBe(401);
  });

  it('refuses a cross-site logout', async () => {
    const { cookie } = await signIn();
    const res = fakeRes();
    await route(fakeReq('POST', { cookie, origin: 'https://evil.example' }), res, new URL('http://h/auth/logout'), ENV);
    expect(res.out.status).toBe(403);
    expect(JSON.parse((await call('/api/session', { cookie })).body).user).toEqual({ login: 'mai', avatarUrl: null });
  });
});

describe('token refresh', () => {
  afterEach(() => vi.unstubAllGlobals());
  const cfg = { clientId: 'Iv1.app', clientSecret: 'app-secret' };
  const expiring = (): ServerSession => createSession({ login: 'mai', avatarUrl: null }, { accessToken: 'ghu_old', refreshToken: REFRESH, accessExpiresAt: Date.now() - 1 });
  const reqFor = (s: ServerSession) => fakeReq('GET', { cookie: `sk_session=${s.id}` });

  it('refreshes an expired access token', async () => {
    const calls = fakeOAuth();
    const s = expiring();
    expect(await sessionToken(s, cfg)).toBe('ghu_new_secret');
    expect(calls.find(c => c.path === '/login/oauth/access_token')!.body).toMatchObject({ grant_type: 'refresh_token', refresh_token: REFRESH });
    expect(getSession(reqFor(s))).not.toBeNull();
  });

  it('ends the session when the refresh fails', async () => {
    fakeGitHub({}, u => (u.pathname === '/login/oauth/access_token' ? ok({ error: 'bad_refresh_token' }) : undefined));
    const s = expiring();
    expect(await sessionToken(s, cfg)).toBeNull();
    expect(getSession(reqFor(s))).toBeNull();
  });
});
