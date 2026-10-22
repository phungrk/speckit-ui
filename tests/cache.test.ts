import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_CACHED, clearProjectCache, getProject, type Source } from '../server/github';
import { route } from '../server/routes';
import { clearTrackingCache, decideGate, getTracking } from '../server/tracking';
import { browserBackend } from '../src/backend';
import { newIssueBody } from '../src/project/gates';
import { SPEC, fakeGitHub, fakeReq, fakeRes } from './fakeGitHub';

const src = (repo: string, identity = 'u1'): Source => ({ owner: 'o', repo, token: 't', identity });
const trees = (calls: { path: string }[], repo: string) => calls.filter(c => c.path.startsWith(`/repos/o/${repo}/git/trees/`)).length;

describe('project cache keyed by user and repo', () => {
  beforeEach(() => { clearProjectCache(); clearTrackingCache(); });
  afterEach(() => vi.unstubAllGlobals());

  it('switching repo while a load is in flight returns the right repo', async () => {
    fakeGitHub({ 'o/a': { delay: 30, specs: { '001-a': SPEC('A') } }, 'o/b': { specs: { '001-b': SPEC('B') } } });
    const [a, b] = await Promise.all([getProject(src('a')), getProject(src('b'))]);
    expect(a.repo).toBe('o/a');
    expect(b.repo).toBe('o/b');
    expect(b.specs.map(s => s.slug)).toEqual(['001-b']);
  });

  it('never shares an entry between two identities', async () => {
    const calls = fakeGitHub({ 'o/a': {} });
    await getProject(src('a', 'u1'));
    await getProject(src('a', 'u1'));
    expect(trees(calls, 'a')).toBe(1);
    await getProject(src('a', 'u2'));
    expect(trees(calls, 'a')).toBe(2);
  });

  it(`keeps at most ${MAX_CACHED} projects, dropping the oldest`, async () => {
    const repos = Object.fromEntries(Array.from({ length: MAX_CACHED + 1 }, (_, i) => [`o/r${i}`, {}]));
    const calls = fakeGitHub(repos);
    for (let i = 0; i <= MAX_CACHED; i++) await getProject(src(`r${i}`));
    await getProject(src(`r${MAX_CACHED}`));
    expect(trees(calls, `r${MAX_CACHED}`)).toBe(1);
    await getProject(src('r0'));
    expect(trees(calls, 'r0')).toBe(2);
  });

  it('clearProjectCache and clearTrackingCache leave no entries', async () => {
    const calls = fakeGitHub({ 'o/a': {} });
    const p = await getProject(src('a'));
    await getTracking(src('a'), p);
    clearProjectCache();
    clearTrackingCache();
    await getTracking(src('a'), await getProject(src('a')));
    expect(trees(calls, 'a')).toBe(2);
    expect(calls.filter(c => c.path === '/repos/o/a/issues').length).toBe(2);
  });
});

describe('gate writes go to the repo that is open', () => {
  beforeEach(() => { clearProjectCache(); clearTrackingCache(); });
  afterEach(() => vi.unstubAllGlobals());

  const repos = () => ({
    'o/a': { specs: { '001-x': SPEC('X') }, issues: [{ number: 1, state: 'open', html_url: 'a1', body: newIssueBody('001-x', 'u') }] },
    'o/b': { specs: { '001-x': SPEC('X') }, issues: [{ number: 1, state: 'open', html_url: 'b1', body: newIssueBody('001-x', 'u') }] }
  });
  const writes = (calls: { method: string; path: string }[]) => calls.filter(c => c.method !== 'GET').map(c => `${c.method} ${c.path}`);

  it('a tracking write updates only its own repo', async () => {
    const calls = fakeGitHub(repos());
    const pa = await getProject(src('a')), pb = await getProject(src('b'));
    await getTracking(src('a'), pa);
    const before = await getTracking(src('b'), pb);
    await decideGate(src('a'), pa, pa.specs[0], 'specify', 'changes', 'fix it');
    const lists = (r: string) => calls.filter(c => c.method === 'GET' && c.path === `/repos/o/${r}/issues`).length;
    const [a0, b0] = [lists('a'), lists('b')];
    // A's cached tracking already holds the write, so no re-list is needed; B is untouched.
    expect((await getTracking(src('a'), pa)).issues['001-x'].gates.specify).toEqual({ approved: false });
    expect(await getTracking(src('b'), pb)).toBe(before);
    expect([lists('a'), lists('b')]).toEqual([a0, b0]);
  });

  it('POST /api/gates writes in the repo from the body, not GITHUB_REPO (FR-009)', async () => {
    const calls = fakeGitHub(repos());
    const res = fakeRes();
    await route(fakeReq('POST', {}, { repo: 'o/b', slug: '001-x', gate: 'specify', action: 'changes', note: 'fix it' }), res, new URL('http://h/api/gates'), { GITHUB_TOKEN: 't', GITHUB_REPO: 'o/a' });
    expect(res.out.status).toBe(200);
    expect(writes(calls)).toEqual(['PATCH /repos/o/b/issues/1', 'POST /repos/o/b/issues/1/comments']);
  });

  it('the browser backend writes in the repo it is given', async () => {
    const calls = fakeGitHub(repos());
    await browserBackend({ repo: 'o/a', ref: '', githubToken: 't', anthropicKey: '', remember: false }).decide('o/b', '001-x', 'specify', 'changes', 'fix it');
    expect(writes(calls)).toEqual(['PATCH /repos/o/b/issues/1', 'POST /repos/o/b/issues/1/comments']);
  });
});

describe('write access of the user, kept apart from the cached project (specs/012 FR-016, research R16)', () => {
  beforeEach(() => { clearProjectCache(); clearTrackingCache(); });
  afterEach(() => vi.unstubAllGlobals());
  const repoCalls = (calls: { path: string }[], repo: string) => calls.filter(c => c.path === `/repos/o/${repo}`).length;

  it('is false, true or null as GitHub says, and null when it does not say', async () => {
    fakeGitHub({ 'o/ro': { permissions: { push: false } }, 'o/rw': { permissions: { push: true } }, 'o/unknown': {} });
    expect((await getProject(src('ro'))).canWrite).toBe(false);
    expect((await getProject(src('rw'))).canWrite).toBe(true);
    expect((await getProject(src('unknown'))).canWrite).toBeNull();
  });

  it('is null for a pinned branch, which does not read the repository at all', async () => {
    const calls = fakeGitHub({ 'o/a': { permissions: { push: false } } });
    expect((await getProject({ ...src('a'), ref: 'main' })).canWrite).toBeNull();
    expect(repoCalls(calls, 'a')).toBe(0);
  });

  it('follows a change of role when the commit has not changed, on refresh only', async () => {
    const repo = { permissions: { push: false } };
    const calls = fakeGitHub({ 'o/a': repo });
    expect((await getProject(src('a'))).canWrite).toBe(false);
    repo.permissions = { push: true };
    // Served from the cache: nothing is asked again, so the old answer stands until a refresh.
    expect((await getProject(src('a'))).canWrite).toBe(false);
    expect((await getProject(src('a'), true)).canWrite).toBe(true);
    // The load itself came from the cached commit: the tree was read once.
    expect(trees(calls, 'a')).toBe(1);
  });

  it('is not shared between two users of the same repository', async () => {
    fakeGitHub({ 'o/a': { permissions: auth => ({ push: auth === 'Bearer writer' }) } });
    const as = (identity: string, token: string): Source => ({ owner: 'o', repo: 'a', token, identity });
    expect((await getProject(as('u1', 'writer'))).canWrite).toBe(true);
    expect((await getProject(as('u2', 'reader'))).canWrite).toBe(false);
    expect((await getProject(as('u1', 'writer'))).canWrite).toBe(true);
  });
});

