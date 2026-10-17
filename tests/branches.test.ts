// specs/003: specs on feat/ branches. Synthetic repos only; GitHub is faked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProjectCache, getProject, getSpecVariant, listBranches, loadProject, loadSpecDir, MAX_BRANCHES, type Source } from '../server/github';
import { parseUiConfig } from '../server/parse';
import { route } from '../server/routes';
import { clearTrackingCache, decideGate, GateRefused, loadTracking } from '../server/tracking';
import { browserBackend } from '../src/backend';
import { fakeBranches, fakeReq, fakeRes, READY_SPEC, SPEC, type BranchRepo, type Call } from './fakeGitHub';

const src: Source = { owner: 'o', repo: 'r', token: 't', identity: 'u1' };
const PLAN = '# Implementation Plan: X\n\n## Summary\n\nS\n';
const main = { 'specs/001-a/spec.md': READY_SPEC('A'), 'specs/002-b/spec.md': READY_SPEC('B') };

const repo = (): BranchRepo => ({
  defaultBranch: 'main',
  branches: {
    main,
    'feat/001-a': { ...main },
    'feat/002-plan': { ...main, 'specs/002-b/plan.md': PLAN },
    'feat/003-x': { ...main, 'specs/003-x/spec.md': READY_SPEC('X') },
    'feat/004-y': { ...main, 'specs/003-x/spec.md': READY_SPEC('X'), 'specs/004-y/spec.md': READY_SPEC('Y') },
    'feat/005-z': { ...main, 'specs/005-z/spec.md': READY_SPEC('Z') },
    'feat/006-w': { ...main, 'specs/005-other/spec.md': READY_SPEC('Other') },
    'feat/no-specs': { 'README.md': 'hi' },
    'fix/007-q': { ...main, 'specs/007-q/spec.md': READY_SPEC('Q') }
  }
});
const trees = (calls: Call[], sha?: string) => calls.filter(c => c.path.includes('/git/trees/') && (!sha || c.path.endsWith(sha)));
const bySlug = (p: Awaited<ReturnType<typeof loadProject>>) => Object.fromEntries(p.specs.map(f => [f.slug, f]));

beforeEach(() => { clearProjectCache(); clearTrackingCache(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('branch config and listing', () => {
  it('parseUiConfig reads branchPrefixes with a feat/ default', () => {
    expect(parseUiConfig(null).branchPrefixes).toEqual(['feat/']);
    expect(parseUiConfig('{"branchPrefixes":[]}').branchPrefixes).toEqual([]);
    expect(parseUiConfig('{"branchPrefixes":["feat/","spec/"]}').branchPrefixes).toEqual(['feat/', 'spec/']);
    expect(parseUiConfig('{"branchPrefixes":"feat/"}').branchPrefixes).toEqual(['feat/']);
    expect(parseUiConfig('{"branchPrefixes":[1]}').branchPrefixes).toEqual(['feat/']);
  });

  it('lists feat/ branches only, highest name first, at most 30', async () => {
    const r = repo();
    for (let i = 10; i < 40; i++) r.branches[`feat/1${i}-extra`] = { ...main };
    fakeBranches('o/r', r);
    const { branches, skipped } = await listBranches(src, ['feat/']);
    expect(branches).toHaveLength(MAX_BRANCHES);
    expect(skipped).toBe(7 + 30 - MAX_BRANCHES); // 7 feat/ branches in repo() plus 30 extra
    expect(branches[0].name).toBe('feat/no-specs');
    expect(branches.some(b => b.name.startsWith('fix/'))).toBe(false);
    expect(await listBranches(src, [])).toEqual({ branches: [], skipped: 0 });
  });

  it('serves a spec folder seen before from cache, by tree SHA', async () => {
    const calls = fakeBranches('o/r', repo());
    const p = await loadProject({ ...src, ref: 'main' });
    const sha = p.specs[0].variants[0].treeSha;
    calls.length = 0;
    const f = await loadSpecDir(src, p.sha, '001-a', sha);
    expect(f.title).toBe('A');
    expect(calls).toEqual([]);
  });
});

describe('unmerged specs in the list (US1)', () => {
  it('lists main and feat/ specs with their branch, and ignores fix/', async () => {
    fakeBranches('o/r', repo());
    const p = await loadProject(src);
    const s = bySlug(p);
    expect(Object.keys(s)).toEqual(['001-a', '002-b', '003-x', '004-y', '005-other', '005-z']);
    expect([s['001-a'].branch, s['001-a'].unmerged]).toEqual([null, false]);
    expect([s['004-y'].branch, s['004-y'].unmerged]).toEqual(['feat/004-y', true]);
    expect(p.branches.find(b => b.name === 'feat/003-x')!.unmergedSlugs).toEqual(['003-x']);
    expect(p.warnings.filter(w => !w.startsWith('Spec number'))).toEqual([]);
  });

  it('costs one tree call for a merged branch and skips branches without specs/', async () => {
    const calls = fakeBranches('o/r', repo());
    const p = await loadProject(src);
    const merged = p.branches.find(b => b.name === 'feat/001-a')!;
    expect(trees(calls, merged.sha)).toHaveLength(1);
    expect(merged.unmergedSlugs).toEqual([]);
    expect(p.branches.find(b => b.name === 'feat/no-specs')).toMatchObject({ specsTreeSha: null, error: null });
  });

  it('a failing branch warns and leaves the other specs (FR-008)', async () => {
    fakeBranches('o/r', { ...repo(), failBranch: 'feat/005-z' });
    const p = await loadProject(src);
    expect(p.warnings.some(w => w.startsWith('Could not read branch feat/005-z'))).toBe(true);
    expect(bySlug(p)['005-z']).toBeUndefined();
    expect(bySlug(p)['004-y']).toBeDefined();
  });

  it('a pinned branch reads only that branch (FR-010)', async () => {
    fakeBranches('o/r', repo());
    const p = await loadProject({ ...src, ref: 'main' });
    expect(p.specs.map(f => f.slug)).toEqual(['001-a', '002-b']);
    expect(p.branches).toEqual([]);
    expect(p.pinned).toBe(true);
    expect((await loadProject(src)).pinned).toBe(false);
  });

  it('works when branches cannot be listed (404)', async () => {
    fakeBranches('o/r', { ...repo(), noBranchList: true });
    const p = await loadProject(src);
    expect(p.specs.map(f => f.slug)).toEqual(['001-a', '002-b']);
    expect(p.warnings).toEqual([]);
  });

  it('refreshing with nothing changed lists commits and branches only; a push shows at once (SC-001)', async () => {
    const r = repo();
    const calls = fakeBranches('o/r', r);
    await getProject(src);
    calls.length = 0;
    await getProject(src, true);
    expect(calls.map(c => c.path).sort()).toEqual(['/repos/o/r/branches', '/repos/o/r/commits/main']);
    r.branches['feat/003-x']['specs/003-x/plan.md'] = PLAN;
    const p = await getProject(src, true);
    expect(bySlug(p)['003-x'].plan).not.toBeNull();
  });

  it('a deleted branch disappears and a force-push back shows the old content (G1)', async () => {
    const r = repo();
    fakeBranches('o/r', r);
    const before = r.branches['feat/005-z'];
    delete r.branches['feat/005-z'];
    expect(bySlug(await getProject(src, true))['005-z']).toBeUndefined();
    r.branches['feat/005-z'] = { ...before, 'specs/005-z/plan.md': PLAN };
    expect(bySlug(await getProject(src, true))['005-z'].plan).not.toBeNull();
    r.branches['feat/005-z'] = before;
    expect(bySlug(await getProject(src, true))['005-z'].plan).toBeNull();
  });
});

describe('one row per spec (US3)', () => {
  it('shows the version that went furthest and lists every version', async () => {
    fakeBranches('o/r', repo());
    const b = bySlug(await loadProject(src))['002-b'];
    expect(b.branch).toBe('feat/002-plan');
    expect(b.plan).not.toBeNull();
    expect(b.variants.map(v => [v.branches, v.onDefault])).toEqual([[['feat/002-plan'], false], [['main'], true]]);
  });

  it('branches with the same folder count as one version', async () => {
    fakeBranches('o/r', repo());
    const x = bySlug(await loadProject(src))['003-x'];
    expect(x.variants).toHaveLength(1);
    // Named after the branch made for it, not the one read first.
    expect(x.variants[0].branches).toEqual(['feat/003-x', 'feat/004-y']);
    expect(x.branch).toBe('feat/003-x');
    expect(x.sha).toBe(bySlug(await loadProject(src))['003-x'].variants[0].sha);
  });

  it('breaks a tie with the newer commit, fetched only for the tie', async () => {
    const r = repo();
    r.branches['feat/008-a'] = { ...main, 'specs/008-t/spec.md': READY_SPEC('T old') };
    r.branches['feat/009-b'] = { ...main, 'specs/008-t/spec.md': READY_SPEC('T new') };
    r.dates = { 'feat/008-a': '2026-10-01T00:00:00Z', 'feat/009-b': '2026-10-05T00:00:00Z' };
    const calls = fakeBranches('o/r', r);
    const t = bySlug(await loadProject(src))['008-t'];
    expect(t.title).toBe('T new');
    expect(t.variants).toHaveLength(2);
    const dateCalls = calls.filter(c => /\/commits\/c[0-9a-f]{8}$/.test(c.path));
    expect(dateCalls).toHaveLength(2);
  });

  it('warns when two specs share a number (FR-007)', async () => {
    fakeBranches('o/r', repo());
    const p = await loadProject(src);
    expect(p.warnings).toContain('Spec number 005 is used by 005-other (feat/006-w) and 005-z (feat/005-z).');
  });
});

describe('working with a branch version (US2)', () => {
  const r2 = () => {
    const r = repo();
    // Main's 010 is not ready to approve; the branch's is. Main is newer, so main's version is shown.
    r.branches.main = { ...main, 'specs/010-g/spec.md': SPEC('G') };
    r.branches['feat/010-g'] = { ...r.branches.main, 'specs/010-g/spec.md': READY_SPEC('G') };
    r.dates = { main: '2026-10-09T00:00:00Z', 'feat/010-g': '2026-10-02T00:00:00Z' };
    return r;
  };

  it('checks and records a gate on the version of the branch', async () => {
    const calls = fakeBranches('o/r', r2());
    const p = await getProject(src);
    const shown = p.specs.find(f => f.slug === '010-g')!;
    expect(shown.branch).toBeNull();
    await expect(decideGate(src, p, shown, 'specify', 'approve', '')).rejects.toThrow(GateRefused);
    const onBranch = (await getSpecVariant(src, p, '010-g', 'feat/010-g'))!;
    expect(onBranch.branch).toBe('feat/010-g');
    const d = await decideGate(src, p, onBranch, 'specify', 'approve', '');
    expect(d.issue.gates.specify?.approved).toBe(true);
    const created = calls.find(c => c.method === 'POST' && c.path === '/repos/o/r/issues')!;
    expect(String(created.body!.body)).toContain('/tree/feat/010-g/specs/010-g');
  });

  it('a branch version is locked by its own unapproved gates (specs/004 FR-010)', async () => {
    const r = repo();
    r.branches['feat/011-h'] = { ...main, 'specs/011-h/spec.md': READY_SPEC('H'), 'specs/011-h/plan.md': PLAN };
    const calls = fakeBranches('o/r', r);
    const p = await getProject(src);
    const h = p.specs.find(f => f.slug === '011-h')!;
    expect(h.branch).toBe('feat/011-h');
    await expect(decideGate(src, p, h, 'plan', 'approve', '')).rejects.toThrow('Approve Specify first.');
    expect(calls.filter(c => c.method !== 'GET')).toEqual([]);
  });

  it('GET /api/spec returns a version, main without a branch, 404 and 400 otherwise', async () => {
    fakeBranches('o/r', r2());
    const get = async (q: string) => {
      const res = fakeRes();
      await route(fakeReq('GET'), res, new URL('http://h/api/spec?repo=o/r&' + q), { GITHUB_TOKEN: 't' });
      return { status: res.out.status, body: JSON.parse(res.out.body) };
    };
    expect((await get('slug=010-g&branch=feat/010-g')).body.feature).toMatchObject({ slug: '010-g', branch: 'feat/010-g', unmerged: true });
    expect((await get('slug=010-g')).body.feature).toMatchObject({ branch: null, unmerged: false });
    expect((await get('slug=010-g&branch=main')).body.feature.branch).toBeNull();
    expect((await get('slug=999-none')).status).toBe(404);
    expect((await get('slug=010-g&branch=fix/007-q')).status).toBe(400);
  });

  it('the browser backend returns the same version', async () => {
    fakeBranches('o/r', r2());
    const f = await browserBackend({ repo: '', ref: '', githubToken: 't', anthropicKey: '', remember: false }).spec('o/r', '010-g', 'feat/010-g');
    expect(f).toMatchObject({ branch: 'feat/010-g', unmerged: true, title: 'G' });
  });

  it('the Implement gate uses the branch\'s own submodule pointers (C1)', async () => {
    const r = repo();
    r.branches.main = { ...main, '.gitmodules': '[submodule "edge"]\n\tpath = edge\n\turl = https://github.com/o/back.git\n' };
    r.branches['feat/011-s'] = { ...r.branches.main, 'specs/011-s/spec.md': READY_SPEC('S'), 'specs/011-s/plan.md': PLAN };
    r.pointers = { main: { edge: 'pmain' }, 'feat/011-s': { edge: 'pnew' } };
    fakeBranches('o/r', r, u => {
      if (u.pathname === '/repos/o/back/pulls') return new Response(JSON.stringify([{ number: 1, title: 'S', html_url: 'h', state: 'closed', merged_at: '2026-10-01T00:00:00Z', merge_commit_sha: 'm1', body: '', head: { ref: 'feat/011-s' } }]));
      if (u.pathname === '/repos/o/back/compare/m1...pnew') return new Response(JSON.stringify({ status: 'ahead' }));
      if (u.pathname === '/repos/o/back/compare/m1...pmain') return new Response(JSON.stringify({ status: 'behind' }));
      return undefined;
    });
    const p = await getProject(src);
    expect(p.specs.find(f => f.slug === '011-s')!.branch).toBe('feat/011-s');
    const t = await loadTracking(src, p);
    expect(t.prs['011-s'].map(x => [x.repo, x.bumped])).toEqual([['o/back', true]]);
  });
});
