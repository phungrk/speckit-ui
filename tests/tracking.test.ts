import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { canApprove, gateChecks, mergeOrderProblems, newIssueBody, parseIssueBody, unapprovedGates, withGates } from '../src/project/gates';
import { parseGitmodules, parseUiConfig } from '../server/parse';
import { route, sameOrigin } from '../server/routes';
import { GateRefused, RECENT_MS, applyIssue, clearTrackingCache, decideGate, getTracking, loadTracking, prMatches, trackedRepos } from '../server/tracking';
import { clearProjectCache, getProject, type Source } from '../server/github';
import { browserBackend } from '../src/backend';
import { READY_SPEC, fakeGitHub as fakeRepos, fakeReq, fakeRes, type Call as FakeCall, type FakeRepo } from './fakeGitHub';
import type { Project, SpecFeature, SpecPR } from '../src/project/types';

const feature = (over: Partial<SpecFeature> = {}): SpecFeature => ({
  id: '007', slug: '007-cards', title: 'Cards', files: ['spec.md'],
  spec: {
    title: 'Cards', fields: {}, raw: '', needsClarification: 0, clarifications: [],
    stories: [{ id: 'US1', p: 'P1', title: 'Freeze', text: '', ac: [['a', 'b', 'c']] }],
    frs: [{ id: 'FR-001', text: 'x' }], sc: [{ id: 'SC-001', text: 'y' }]
  },
  plan: { summary: '', context: [['Storage', 'Postgres']], checks: [['I. Spec', true], ['II. A11y', true]], raw: '' },
  tasks: [{ name: 'Setup', tasks: [{ id: 'T001', done: true, parallel: false, story: 'US1', text: 'do', path: 'web/a.ts' }] }],
  analysis: { findings: [], raw: '' },
  checklists: [{ name: 'requirements.md', done: 3, total: 3 }],
  docs: {},
  branch: null, sha: '', unmerged: false, variants: [],
  ...over
});

const pr = (repo: string, number: number, state: SpecPR['state'], mergedAt: string | null = null, bumped: boolean | null = null): SpecPR =>
  ({ repo, number, title: 't', url: 'u', state, mergedAt, headRef: 'feat/007-cards', bumped, link: null });

describe('gate checks', () => {
  it('passes a complete spec at every gate', () => {
    for (const g of ['specify', 'clarify', 'plan', 'tasks', 'analyze'] as const) expect(canApprove(gateChecks(feature(), g))).toBe(true);
  });
  it('blocks on the things each gate guards', () => {
    const f = feature({
      spec: { ...feature().spec!, needsClarification: 2, stories: [{ id: 'US1', p: 'P1', title: 'x', text: '', ac: [] }, { id: 'US2', p: 'P2', title: 'y', text: '', ac: [['a', 'b', 'c']] }] },
      plan: { summary: '', context: [['Storage', 'NEEDS CLARIFICATION']], checks: [['I', true], ['II', false]], raw: '' },
      analysis: { findings: [{ id: 'C1', category: 'Constitution', severity: 'CRITICAL', location: '', summary: '', recommendation: '' }], raw: '' },
      checklists: [{ name: 'requirements.md', done: 2, total: 3 }]
    });
    const failing = (g: Parameters<typeof gateChecks>[1]) => gateChecks(f, g).filter(c => !c.ok && c.required).map(c => c.label);
    expect(failing('specify')).toEqual(['Every user story has acceptance scenarios', 'checklists/requirements.md complete (2/3)']);
    expect(failing('clarify')).toEqual(['2 [NEEDS CLARIFICATION] markers remain']);
    expect(failing('plan')).toEqual(['Constitution Check ticked (1/2)', 'No NEEDS CLARIFICATION in Technical Context']);
    expect(failing('tasks')).toEqual(['No tasks for US2']);
    expect(failing('analyze')).toEqual(['No CRITICAL findings (1)']);
  });
  it('markers only warn at Specify', () => {
    const f = feature({ spec: { ...feature().spec!, needsClarification: 1 } });
    expect(canApprove(gateChecks(f, 'specify'))).toBe(true);
  });
  it('implement needs tasks done, PRs merged in order and submodules bumped', () => {
    const repos = { repos: [{ repo: 'a/root', path: null, pointer: null }, { repo: 'a/back', path: 'edge', pointer: 'p' }, { repo: 'a/front', path: 'web', pointer: 'q' }] };
    const good = [pr('a/back', 1, 'merged', '2026-10-01T00:00:00Z', true), pr('a/front', 2, 'merged', '2026-10-02T00:00:00Z', true)];
    expect(canApprove(gateChecks(feature(), 'implement', good, repos))).toBe(true);
    const bad = [pr('a/back', 1, 'merged', '2026-10-03T00:00:00Z', false), pr('a/front', 2, 'merged', '2026-10-02T00:00:00Z', true), pr('a/root', 3, 'open')];
    expect(gateChecks(feature(), 'implement', bad, repos).filter(c => !c.ok && c.required).map(c => c.label)).toEqual([
      '1 linked PRs still open',
      'Merged out of order: a/front#2 before a/back#1',
      'Submodule pointer not bumped for a/back#1'
    ]);
  });
  it('only checks merge order across the listed repos', () => {
    expect(mergeOrderProblems([pr('a/root', 9, 'merged', '2026-12-01T00:00:00Z'), pr('a/back', 1, 'merged', '2026-10-01T00:00:00Z')], ['a/back', 'a/front'])).toEqual([]);
  });
});

describe('tracking issue body', () => {
  it('round-trips gate approvals', () => {
    const body = newIssueBody('007-cards', 'https://x', { specify: { approved: true, by: 'mai', at: '2026-10-17' } });
    expect(parseIssueBody(body)).toEqual({ slug: '007-cards', gates: {
      specify: { approved: true, by: 'mai', at: '2026-10-17' }, clarify: { approved: false }, plan: { approved: false },
      tasks: { approved: false }, analyze: { approved: false }, implement: { approved: false }
    } });
  });
  it('reads a box ticked on GitHub and keeps text around the block', () => {
    const body = 'Notes before\n\n' + newIssueBody('007-cards', 'https://x').replace('- [ ] Plan', '- [x] Plan') + '\nNotes after';
    expect(parseIssueBody(body)!.gates.plan).toEqual({ approved: true });
    const next = withGates(body, { plan: { approved: false } });
    expect(next.startsWith('Notes before')).toBe(true);
    expect(next.endsWith('Notes after')).toBe(true);
    expect(parseIssueBody(next)!.gates.plan).toEqual({ approved: false });
  });
  it('ignores issues that are not tracking issues', () => {
    expect(parseIssueBody('Just a bug')).toBeNull();
  });
  it('lists done steps that still need approval', () => {
    expect(unapprovedGates(['done', 'done', 'skipped', 'done', 'current', 'pending', 'pending'], { number: 1, url: '', state: 'open', gates: { specify: { approved: true } }, updatedAt: null })).toEqual(['plan']);
  });
});

describe('repo config', () => {
  it('parses .gitmodules and merge order', () => {
    expect(parseGitmodules('[submodule "web"]\n\tpath = web\n\turl = https://github.com/a/front.git\n[submodule "edge"]\n\tpath = edge\n\turl = git@github.com:a/back.git\n[submodule "x"]\n\tpath = x\n\turl = https://gitlab.com/a/x'))
      .toEqual([{ path: 'web', repo: 'a/front' }, { path: 'edge', repo: 'a/back' }, { path: 'x', repo: null }]);
    expect(parseUiConfig('{"mergeOrder":["edge","a/front",3]}')).toEqual({ mergeOrder: ['edge', 'a/front'], branchPrefixes: ['feat/'], approvalGates: 'block', prLinks: 'block' });
    expect(parseUiConfig('nope')).toEqual({ mergeOrder: [], branchPrefixes: ['feat/'], approvalGates: 'block', prLinks: 'block' });
  });
  it('links PRs by branch or description', () => {
    expect(prMatches({ head: { ref: 'feat/007-cards' }, body: '', title: '' }, '007-cards')).toBe(true);
    expect(prMatches({ head: { ref: 'fix/x' }, body: 'Spec: specs/007-cards/spec.md', title: '' }, '007-cards')).toBe(true);
    expect(prMatches({ head: { ref: 'fix/007-other' }, body: null, title: '' }, '007-cards')).toBe(false);
  });
});

// ---- Server flows against a fake GitHub ----

const src = { owner: 'a', repo: 'root', token: 't' };
const project = (f = feature(), pointer = 'ptr'): Project => ({
  repo: 'a/root', ref: 'main', sha: 'abc1234', committedAt: null, fetchedAt: '', commandPrefix: '/speckit.', constitution: null,
  specs: [f], submodules: [{ path: 'edge', repo: 'a/back', sha: pointer }], warnings: [], branches: [], skippedBranches: 0, branchPrefixes: ['feat/'], pinned: false, approvalGates: 'off', gateCheck: 'installed'
});

interface Call { method: string; path: string; body?: Record<string, unknown> }

function fakeGitHub(opts: { issues?: object[]; bumped?: boolean; rootOpen?: boolean } = {}) {
  const calls: Call[] = [];
  const issues = [...(opts.issues ?? [])] as { number: number; body: string; state: string; html_url: string }[];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path: u.pathname, body });
    const ok = (x: unknown) => new Response(JSON.stringify(x), { status: 200 });
    if (u.pathname === '/user') return ok({ login: 'mai' });
    if (u.pathname === '/repos/a/root/issues' && method === 'GET') return ok([...issues, { number: 99, body: 'x', pull_request: {} }]);
    if (u.pathname === '/repos/a/root/issues' && method === 'POST') {
      const i = { number: 5, body: body.body, state: 'open', html_url: 'https://github.com/a/root/issues/5' };
      issues.push(i);
      return ok(i);
    }
    const one = u.pathname.match(/^\/repos\/a\/root\/issues\/(\d+)$/);
    if (one) {
      const i = issues.find(x => x.number === +one[1])!;
      if (method === 'PATCH') Object.assign(i, body);
      return ok(i);
    }
    if (/\/issues\/\d+\/comments$/.test(u.pathname)) return ok({ id: 1 });
    if (u.pathname === '/repos/a/root/pulls') return ok(opts.rootOpen === false ? [] : [{ number: 3, title: 'Bump', html_url: 'h', state: 'open', draft: false, merged_at: null, merge_commit_sha: null, body: 'specs/007-cards', head: { ref: 'chore/bump' } }]);
    if (u.pathname === '/repos/a/back/pulls') return ok([
      { number: 1, title: 'API', html_url: 'h', state: 'closed', merged_at: '2026-10-01T00:00:00Z', merge_commit_sha: 'm1', body: '', head: { ref: 'feat/007-cards' } },
      { number: 2, title: 'Other', html_url: 'h', state: 'open', merged_at: null, merge_commit_sha: null, body: '', head: { ref: 'feat/008-x' } }
    ]);
    if (/^\/repos\/a\/back\/compare\/m1\.\.\.\w+$/.test(u.pathname)) return ok({ status: opts.bumped === false ? 'behind' : 'ahead' });
    return new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

describe('loadTracking', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('collects issues, linked PRs and bump status', async () => {
    fakeGitHub({ issues: [{ number: 4, state: 'open', html_url: 'i4', body: newIssueBody('007-cards', 'x', { specify: { approved: true, by: 'mai' } }) }], bumped: false });
    const t = await loadTracking(src, project());
    expect(t.user).toBe('mai');
    expect(t.repos.map(r => r.repo)).toEqual(['a/root', 'a/back']);
    expect(t.issues['007-cards']).toMatchObject({ number: 4, gates: { specify: { approved: true, by: 'mai' } } });
    expect(t.prs['007-cards'].map(p => [p.repo, p.number, p.state, p.bumped])).toEqual([['a/root', 3, 'open', null], ['a/back', 1, 'merged', false]]);
    expect(t.warnings).toEqual([]);
    expect(trackedRepos(src, project())).toHaveLength(2);
  });
});

describe('decideGate', () => {
  beforeEach(() => clearTrackingCache());
  afterEach(() => vi.unstubAllGlobals());
  it('creates the tracking issue on first approval, ticks the gate and comments', async () => {
    const calls = fakeGitHub();
    const { issue } = await decideGate(src, project(), feature(), 'plan', 'approve', '');
    expect(issue).toMatchObject({ number: 5, state: 'open', gates: { plan: { approved: true, by: 'mai' } } });
    const writes = calls.filter(c => c.method !== 'GET');
    expect(writes.map(c => `${c.method} ${c.path}`)).toEqual(['POST /repos/a/root/issues', 'PATCH /repos/a/root/issues/5', 'POST /repos/a/root/issues/5/comments']);
    expect(writes[0].body).toMatchObject({ title: 'Spec 007: Cards', labels: ['speckit'] });
    expect(String(writes[2].body!.body)).toContain('✅ **Plan** approved by @mai');
  });
  it('refuses to approve when a required check fails, without writing', async () => {
    const calls = fakeGitHub();
    const f = feature({ plan: { summary: '', context: [], checks: [['I', false]], raw: '' } });
    await expect(decideGate(src, project(f), f, 'plan', 'approve', '')).rejects.toThrow(GateRefused);
    expect(calls.filter(c => c.method !== 'GET')).toEqual([]);
  });
  it('closes the issue when Implement is approved, and reopens on request', async () => {
    const body = newIssueBody('007-cards', 'x');
    const calls = fakeGitHub({ issues: [{ number: 4, state: 'open', html_url: 'i4', body }], rootOpen: false });
    const { issue: shipped } = await decideGate(src, project(feature(), 'ptr2'), feature(), 'implement', 'approve', '');
    expect(shipped.state).toBe('closed');
    expect(calls.find(c => c.method === 'PATCH')!.body).toMatchObject({ state: 'closed', state_reason: 'completed' });
    const { issue: reopened } = await decideGate(src, project(feature(), 'ptr2'), feature(), 'implement', 'reopen', 'regression');
    expect(reopened.state).toBe('open');
    expect(reopened.gates.implement).toEqual({ approved: false });
    expect(String(calls.filter(c => c.path.endsWith('/comments')).at(-1)!.body!.body)).toContain('> regression');
  });
  it('needs an existing issue to request changes', async () => {
    fakeGitHub();
    await expect(decideGate(src, project(), feature(), 'plan', 'changes', 'no')).rejects.toThrow(/no tracking issue/i);
  });
});

describe('decideGate with approval gates on (specs/004 FR-005)', () => {
  beforeEach(() => clearTrackingCache());
  afterEach(() => vi.unstubAllGlobals());
  const gated = (f = feature()): Project => ({ ...project(f), approvalGates: 'block' });

  it('refuses Plan while Specify is unapproved, without writing', async () => {
    const calls = fakeGitHub();
    await expect(decideGate(src, gated(), feature(), 'plan', 'approve', '')).rejects.toThrow('Approve Specify first.');
    expect(calls.filter(c => c.method !== 'GET')).toEqual([]);
  });

  it('checks the issue as it is right now, not the cached list', async () => {
    const issues = [{ number: 4, state: 'open', html_url: 'i4', body: newIssueBody('007-cards', 'x') }];
    fakeGitHub({ issues });
    await getTracking(src, gated(), true);
    // Someone approves Specify on GitHub after the list was read.
    issues[0].body = newIssueBody('007-cards', 'x', { specify: { approved: true, by: 'lan' } });
    const { issue } = await decideGate(src, gated(), feature(), 'plan', 'approve', '');
    expect(issue.gates.plan?.approved).toBe(true);
  });

  it('approves in order: Specify, then Plan', async () => {
    fakeGitHub();
    await decideGate(src, gated(), feature(), 'specify', 'approve', '');
    const { issue } = await decideGate(src, gated(), feature(), 'plan', 'approve', '');
    expect(issue.gates).toMatchObject({ specify: { approved: true }, plan: { approved: true } });
  });

  it('never refuses reopen or changes for this reason', async () => {
    const calls = fakeGitHub({ issues: [{ number: 4, state: 'open', html_url: 'i4', body: newIssueBody('007-cards', 'x', { plan: { approved: true } }) }] });
    await decideGate(src, gated(), feature(), 'plan', 'reopen', '');
    await decideGate(src, gated(), feature(), 'tasks', 'changes', 'why');
    expect(calls.filter(c => c.method === 'PATCH')).toHaveLength(2);
  });
});

describe('write protection', () => {
  const req = (headers: Record<string, string>, method = 'POST') => ({ method, headers }) as unknown as IncomingMessage;
  it('accepts same-origin requests only', () => {
    expect(sameOrigin(req({ host: 'localhost:5173', origin: 'http://localhost:5173' }))).toBe(true);
    expect(sameOrigin(req({ host: 'localhost:5173', origin: 'https://evil.example' }))).toBe(false);
    expect(sameOrigin(req({ host: 'localhost:5173', 'sec-fetch-site': 'cross-site' }))).toBe(false);
    expect(sameOrigin(req({ host: 'localhost:5173' }))).toBe(true);
  });
  it('rejects cross-site and non-JSON posts before reading the body', async () => {
    for (const headers of [{ host: 'h', origin: 'https://evil.example', 'content-type': 'application/json' }, { host: 'h', origin: 'http://h', 'content-type': 'text/plain' }]) {
      const res = { statusCode: 0, setHeader() {}, end: vi.fn() } as unknown as ServerResponse & { end: ReturnType<typeof vi.fn> };
      await route(req(headers), res, new URL('http://h/api/gates'), { GITHUB_TOKEN: 't', GITHUB_REPO: 'a/root' });
      expect(res.statusCode).toBe(403);
    }
  });
});

// ---- specs/001: the gate shows the decision at once, and only once ----

describe('gate decisions against a lagging GitHub (specs/001)', () => {
  const me = (identity = 'u1'): Source => ({ owner: 'o', repo: 'r', token: 't', identity });
  const repo = (over: Partial<FakeRepo> = {}): Record<string, FakeRepo> => ({ 'o/r': { specs: { '001-x': READY_SPEC('X') }, staleIssueList: true, ...over } });
  const posts = (calls: FakeCall[], suffix: string) => calls.filter(c => c.method !== 'GET' && c.path.endsWith(suffix)).length;
  const load = async (s = me()) => { const p = await getProject(s); return { p, f: p.specs[0] }; };

  beforeEach(() => { clearTrackingCache(); clearProjectCache(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('applyIssue returns new tracking and leaves its input alone', () => {
    const t = { fetchedAt: '', user: null, repos: [], issues: {}, prs: {}, warnings: [] };
    const i = { number: 1, url: 'u', state: 'open' as const, gates: { plan: { approved: true } }, updatedAt: 'x' };
    expect(applyIssue(t, '001-x', i).issues['001-x']).toBe(i);
    expect(t.issues).toEqual({});
  });

  it('reads GitHub with cache: no-cache, writes without', async () => {
    const calls = fakeRepos(repo({ staleIssueList: false }));
    const { p, f } = await load();
    await decideGate(me(), p, f, 'specify', 'approve', '');
    expect(calls.filter(c => c.method === 'GET').every(c => c.cache === 'no-cache')).toBe(true);
    expect(calls.filter(c => c.method !== 'GET').every(c => c.cache === undefined)).toBe(true);
  });

  it('shows the approval at once and keeps it while the list is stale (US1, FR-004)', async () => {
    const calls = fakeRepos(repo());
    const { p, f } = await load();
    const d = await decideGate(me(), p, f, 'specify', 'approve', '');
    expect(d.unchanged).toBe(false);
    expect(d.tracking.issues['001-x'].gates.specify).toMatchObject({ approved: true, by: 'mai' });
    // A refresh re-lists the stale issue list; the fresh write still wins.
    const t = await getTracking(me(), p, true);
    expect(t.issues['001-x'].gates.specify).toMatchObject({ approved: true });
    expect(posts(calls, '/issues')).toBe(1);
  });

  it('a newer copy on GitHub wins over the remembered write', async () => {
    const repos = repo({ staleIssueList: false });
    fakeRepos(repos);
    const { p, f } = await load();
    await decideGate(me(), p, f, 'specify', 'approve', '');
    // Someone unticks the box on GitHub afterwards.
    const issue = repos['o/r'].issues![0];
    issue.body = issue.body.replace('- [x] Specify', '- [ ] Specify');
    issue.updated_at = new Date(Date.parse(issue.updated_at!) + 60_000).toISOString();
    expect((await getTracking(me(), p, true)).issues['001-x'].gates.specify?.approved).toBe(false);
  });

  it('forgets a remembered write after RECENT_MS', async () => {
    fakeRepos(repo());
    const { p, f } = await load();
    await decideGate(me(), p, f, 'specify', 'approve', '');
    vi.useFakeTimers({ now: Date.now() + RECENT_MS + 1000 });
    // The stale list still has no issue for the spec, and the write has expired.
    expect((await getTracking(me(), p, true)).issues['001-x']).toBeUndefined();
  });

  it('POST /api/gates and the browser backend return the write, not a re-read (FR-009)', async () => {
    const calls = fakeRepos(repo());
    const res = fakeRes();
    await route(fakeReq('POST', {}, { repo: 'o/r', slug: '001-x', gate: 'specify', action: 'approve' }), res, new URL('http://h/api/gates'), { GITHUB_TOKEN: 't' });
    const body = JSON.parse(res.out.body);
    expect(res.out.status).toBe(200);
    expect(body.unchanged).toBe(false);
    expect(body.tracking.issues['001-x'].gates.specify.approved).toBe(true);
    expect(calls.filter(c => c.path.endsWith('/pulls')).length).toBe(1);

    clearTrackingCache(); clearProjectCache();
    fakeRepos(repo());
    const r = await browserBackend({ repo: '', ref: '', githubToken: 't', anthropicKey: '', remember: false }).decide('o/r', '001-x', 'specify', 'approve', '');
    expect(r.tracking.issues['001-x'].gates.specify?.approved).toBe(true);
  });

  it('approving Implement returns the closed issue (G1)', async () => {
    const done = '# Tasks\n\n## Phase 1\n\n- [x] T001 [US1] Do it in `a/b.ts`\n';
    fakeRepos(repo({ staleIssueList: false }), u => (u.pathname.endsWith('/contents/specs/001-x/tasks.md') ? new Response(done) : undefined));
    const { p, f } = await load();
    const d = await decideGate(me(), { ...p, approvalGates: 'off' }, { ...f, tasks: [{ name: 'P', tasks: [{ id: 'T001', done: true, parallel: false, story: 'US1', text: 'x', path: 'a/b.ts' }] }] }, 'implement', 'approve', '');
    expect(d.issue.state).toBe('closed');
    expect(d.tracking.issues['001-x'].state).toBe('closed');
  });

  it('five rapid approvals write once (SC-002)', async () => {
    const calls = fakeRepos(repo());
    const { p, f } = await load();
    const all = await Promise.all(Array.from({ length: 5 }, () => decideGate(me(), p, f, 'specify', 'approve', '')));
    expect(posts(calls, '/issues')).toBe(1);
    expect(calls.filter(c => c.method === 'PATCH').length).toBe(1);
    expect(posts(calls, '/comments')).toBe(1);
    expect(all.filter(d => d.unchanged).length).toBe(4);
  });

  it('approving a gate someone else approved writes nothing and names them (FR-007, C1)', async () => {
    const body = newIssueBody('001-x', 'u', { specify: { approved: true, by: 'lan', at: '2026-10-16' } });
    const calls = fakeRepos(repo({ issues: [{ number: 7, state: 'open', html_url: 'i7', body }] }));
    const { p, f } = await load();
    // Even when the checks would now fail, the answer is "already approved", not 409.
    const d = await decideGate(me(), p, { ...f, spec: null }, 'specify', 'approve', '');
    expect(d.unchanged).toBe(true);
    expect(d.issue.gates.specify).toMatchObject({ approved: true, by: 'lan' });
    expect(calls.filter(c => c.method !== 'GET')).toEqual([]);
  });

  it('a second gate right after the first approval reuses the new issue, for any user (U1)', async () => {
    const calls = fakeRepos(repo());
    const { p, f } = await load();
    await decideGate(me('u1'), p, f, 'specify', 'approve', '');
    await decideGate(me('u1'), p, f, 'clarify', 'approve', '');
    await decideGate(me('u2'), p, f, 'clarify', 'reopen', '');
    expect(posts(calls, '/issues')).toBe(1);
    expect(calls.filter(c => c.method === 'PATCH').map(c => c.path)).toEqual(['/repos/o/r/issues/1', '/repos/o/r/issues/1', '/repos/o/r/issues/1']);
  });

  it('a refused write, a failing check or a network error never shows an approval (SC-004)', async () => {
    const unapproved = () => [{ number: 1, state: 'open', html_url: 'i1', body: newIssueBody('001-x', 'u') }];
    const approvedNow = async (p: Awaited<ReturnType<typeof load>>['p']) => {
      fakeRepos(repo({ staleIssueList: false, issues: unapproved() }));
      return (await getTracking(me(), p, true)).issues['001-x']?.gates.specify?.approved ?? false;
    };

    // GitHub refuses the write (no Issues: write).
    fakeRepos(repo({ issues: unapproved(), patchStatus: 403 }));
    let { p, f } = await load();
    await expect(decideGate(me(), p, f, 'specify', 'approve', '')).rejects.toThrow(/403/);
    expect(await approvedNow(p)).toBe(false);

    // The gate's checks fail: refused before any write.
    clearTrackingCache(); clearProjectCache();
    const calls = fakeRepos(repo({ issues: unapproved() }));
    ({ p, f } = await load());
    await expect(decideGate(me(), p, { ...f, spec: null }, 'specify', 'approve', '')).rejects.toThrow(GateRefused);
    expect(calls.filter(c => c.method !== 'GET')).toEqual([]);
    expect(await approvedNow(p)).toBe(false);

    // The network drops.
    clearTrackingCache(); clearProjectCache();
    fakeRepos(repo({ issues: unapproved() }));
    ({ p, f } = await load());
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(decideGate(me(), p, f, 'specify', 'approve', '')).rejects.toThrow();
    expect(await approvedNow(p)).toBe(false);
  });

  it('a failed comment after the PATCH reports an error, then the next try is unchanged (I1)', async () => {
    const repos = repo({ commentStatus: 500 });
    const calls = fakeRepos(repos);
    const { p, f } = await load();
    await expect(decideGate(me(), p, f, 'specify', 'approve', '')).rejects.toThrow();
    expect((await getTracking(me(), p, true)).issues['001-x'].gates.specify?.approved).toBe(true);
    repos['o/r'].commentStatus = undefined;
    const d = await decideGate(me(), p, f, 'specify', 'approve', '');
    expect(d.unchanged).toBe(true);
    expect(calls.filter(c => c.method === 'PATCH').length).toBe(1);
  });

  it('reopen shows at once, is idempotent, and a failed reopen keeps the approval (US4)', async () => {
    const approved = newIssueBody('001-x', 'u', { specify: { approved: true, by: 'mai', at: '2026-10-16' } });
    const repos = repo({ issues: [{ number: 1, state: 'open', html_url: 'i1', body: approved }] });
    const calls = fakeRepos(repos);
    const { p, f } = await load();
    const d = await decideGate(me(), p, f, 'specify', 'reopen', '');
    expect(d.tracking.issues['001-x'].gates.specify?.approved).toBe(false);
    expect((await getTracking(me(), p, true)).issues['001-x'].gates.specify?.approved).toBe(false);
    expect((await decideGate(me(), p, f, 'specify', 'reopen', '')).unchanged).toBe(true);
    expect(calls.filter(c => c.method === 'PATCH').length).toBe(1);

    clearTrackingCache(); clearProjectCache();
    fakeRepos(repo({ staleIssueList: false, issues: [{ number: 1, state: 'open', html_url: 'i1', body: approved }], patchStatus: 403 }));
    const again = await load();
    await expect(decideGate(me(), again.p, again.f, 'specify', 'reopen', '')).rejects.toThrow(/403/);
    expect((await getTracking(me(), again.p, true)).issues['001-x'].gates.specify?.approved).toBe(true);
  });
});
