import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DETECT_CONCURRENCY, clearProjectCache, detectSpeckit, listRepos, sortRepos } from '../server/github';
import { MISSING_TOKEN, listenHost, route } from '../server/routes';
import type { AccessibleRepo, SessionResponse } from '../src/project/types';
import { fakeGitHub, fakeReq, fakeRes } from './fakeGitHub';

const ghRepo = (i: number) => ({ full_name: `o/r${i}`, private: i % 2 === 0, default_branch: 'main', pushed_at: new Date(Date.UTC(2026, 0, 1) + (5000 - i) * 3600_000).toISOString() });
const ok = (x: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(x), { status: 200, headers });

/** /user/repos serving `total` repos, 100 a page, with a Link header like GitHub's. */
function userRepos(total: number) {
  return fakeGitHub({}, u => {
    if (u.pathname !== '/user/repos') return undefined;
    const page = Number(u.searchParams.get('page'));
    const items = Array.from({ length: Math.max(0, Math.min(100, total - (page - 1) * 100)) }, (_, i) => ghRepo((page - 1) * 100 + i));
    const links = [page * 100 < total && `<https://api.github.com/user/repos?page=${page + 1}>; rel="next"`, page > 1 && '<https://api.github.com/user/repos?page=1>; rel="first"'].filter(Boolean);
    return ok(items, links.length ? { link: links.join(', ') } : {});
  });
}

describe('listRepos', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists 200 repos in exactly 2 calls (SC-002)', async () => {
    const calls = userRepos(200);
    const l = await listRepos({ token: 'github_pat_x' });
    expect(calls.filter(c => c.path === '/user/repos')).toHaveLength(2);
    expect(l.repos).toHaveLength(200);
    expect(l.truncated).toBe(false);
    expect(l.repos[0]).toEqual({ fullName: 'o/r0', private: true, defaultBranch: 'main', pushedAt: ghRepo(0).pushed_at, speckit: null, pinned: false });
  });

  it('stops at 1,000 repos and says so', async () => {
    const calls = userRepos(1500);
    const l = await listRepos({ token: 'github_pat_x' });
    expect(calls.filter(c => c.path === '/user/repos')).toHaveLength(10);
    expect(l.repos).toHaveLength(1000);
    expect(l.truncated).toBe(true);
  });

  it('lists GitHub App user tokens per installation', async () => {
    const calls = fakeGitHub({}, u => {
      if (u.pathname === '/user/installations') return ok({ installations: [{ id: 1 }, { id: 2 }] });
      if (u.pathname === '/user/installations/1/repositories') return ok({ repositories: [ghRepo(1), ghRepo(2)] });
      if (u.pathname === '/user/installations/2/repositories') return ok({ repositories: [ghRepo(2), ghRepo(3)] });
      return undefined;
    });
    const l = await listRepos({ token: 'ghu_x' });
    expect(l.repos.map(r => r.fullName)).toEqual(['o/r1', 'o/r2', 'o/r3']);
    expect(calls.some(c => c.path === '/user/repos')).toBe(false);
  });
});

describe('detectSpeckit', () => {
  beforeEach(() => clearProjectCache());
  afterEach(() => vi.unstubAllGlobals());

  it('maps 200 to Spec Kit, 404 to not, and other errors to an error entry', async () => {
    fakeGitHub({}, u => {
      if (u.pathname === '/repos/o/kit/contents/.specify') return ok([]);
      if (u.pathname === '/repos/o/plain/contents/.specify') return new Response('{}', { status: 404 });
      if (u.pathname === '/repos/o/broken/contents/.specify') return new Response('{}', { status: 500 });
      return undefined;
    });
    const d = await detectSpeckit({ token: 't', identity: 'u' }, [{ fullName: 'o/kit' }, { fullName: 'o/plain' }, { fullName: 'o/broken' }]);
    expect(d.results).toEqual({ 'o/kit': true, 'o/plain': false, 'o/broken': false });
    expect(Object.keys(d.errors)).toEqual(['o/broken']);
  });

  it(`runs at most ${DETECT_CONCURRENCY} checks at once`, async () => {
    let now = 0, peak = 0;
    fakeGitHub({}, async () => { peak = Math.max(peak, ++now); await new Promise(r => setTimeout(r, 5)); now--; return ok([]); });
    await detectSpeckit({ token: 't', identity: 'u' }, Array.from({ length: 20 }, (_, i) => ({ fullName: `o/r${i}` })));
    expect(peak).toBe(DETECT_CONCURRENCY);
  });

  it('caches by pushedAt, in memory only', async () => {
    const calls = fakeGitHub({}, () => ok([]));
    const id = { token: 't', identity: 'u' };
    await detectSpeckit(id, [{ fullName: 'o/a', pushedAt: '1' }]);
    await detectSpeckit(id, [{ fullName: 'o/a', pushedAt: '1' }]);
    expect(calls).toHaveLength(1);
    await detectSpeckit(id, [{ fullName: 'o/a', pushedAt: '2' }]);
    expect(calls).toHaveLength(2);
    await detectSpeckit({ token: 't', identity: 'other' }, [{ fullName: 'o/a', pushedAt: '2' }]);
    expect(calls).toHaveLength(3);
  });
});

describe('sortRepos', () => {
  const repo = (fullName: string, speckit: boolean | null, pushedAt: string): AccessibleRepo => ({ fullName, private: false, defaultBranch: 'main', pushedAt, speckit, pinned: false });
  it('orders pinned, Spec Kit, unknown, plain, newest first within each', () => {
    const repos = [repo('o/plain', false, '2026-09'), repo('o/kit-old', true, '2026-01'), repo('o/unknown', null, '2026-05'), repo('o/kit-new', true, '2026-08'), repo('o/pinned-plain', false, '2025-01')];
    expect(sortRepos(repos, ['o/pinned-plain']).map(r => r.fullName)).toEqual(['o/pinned-plain', 'o/kit-new', 'o/kit-old', 'o/unknown', 'o/plain']);
  });
});

describe('/api/session in token mode', () => {
  afterEach(() => vi.unstubAllGlobals());
  const session = async (env: Record<string, string>) => {
    const res = fakeRes();
    await route(fakeReq('GET'), res, new URL('http://h/api/session'), env);
    return { status: res.out.status, body: JSON.parse(res.out.body) as SessionResponse, raw: res.out.body };
  };

  it('returns the login behind GITHUB_TOKEN and never the token', async () => {
    fakeGitHub({});
    const s = await session({ GITHUB_TOKEN: 'github_pat_good', GITHUB_REPO: 'o/a' });
    expect(s.body).toEqual({ mode: 'token', defaultRepo: 'o/a', user: { login: 'mai', avatarUrl: 'https://avatars.example/mai' } });
    expect(s.raw).not.toContain('github_pat_good');
  });

  it('points at .env.local when the token is missing or rejected', async () => {
    fakeGitHub({}, u => (u.pathname === '/user' ? new Response('{}', { status: 401 }) : undefined));
    expect((await session({ GITHUB_REPO: 'o/a' })).body).toMatchObject({ mode: 'token', user: null, error: MISSING_TOKEN });
    expect((await session({ GITHUB_TOKEN: 'github_pat_bad' })).body.error).toMatch(/rejected GITHUB_TOKEN \(401\)\. Put a valid fine-grained token in \.env\.local/);
  });

  it('is demo mode without any GitHub configuration', async () => {
    expect((await session({})).body).toEqual({ mode: 'demo', user: null });
  });
});

describe('listenHost (R6)', () => {
  const token = { GITHUB_TOKEN: 't' };
  it('keeps token mode on this machine', () => {
    expect(listenHost(undefined, token)).toEqual({ host: '127.0.0.1', warning: null });
    expect(listenHost('localhost', token)).toEqual({ host: 'localhost', warning: null });
    const wide = listenHost('0.0.0.0', token);
    expect(wide.host).toBe('127.0.0.1');
    expect(wide.warning).toMatch(/refusing to listen on 0\.0\.0\.0/);
  });
  it('listens wider only with ALLOW_REMOTE_TOKEN_MODE=1, and warns', () => {
    const r = listenHost('0.0.0.0', { ...token, ALLOW_REMOTE_TOKEN_MODE: '1' });
    expect(r.host).toBe('0.0.0.0');
    expect(r.warning).toMatch(/acts as the GITHUB_TOKEN owner/);
  });
  it('leaves sign-in and demo servers alone', () => {
    expect(listenHost('0.0.0.0', { GITHUB_APP_CLIENT_ID: 'a', GITHUB_APP_CLIENT_SECRET: 'b', GITHUB_TOKEN: 't' })).toEqual({ host: '0.0.0.0', warning: null });
    expect(listenHost(undefined, {})).toEqual({ host: undefined, warning: null });
  });
});
