import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { canApprove, gateChecks, mergeOrderProblems, newIssueBody, parseIssueBody, unapprovedGates, withGates } from '../src/project/gates';
import { parseGitmodules, parseUiConfig } from '../server/parse';
import { GateRefused, decideGate, handleGate, loadTracking, prMatches, sameOrigin, trackedRepos } from '../server/tracking';
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
  ...over
});

const pr = (repo: string, number: number, state: SpecPR['state'], mergedAt: string | null = null, bumped: boolean | null = null): SpecPR =>
  ({ repo, number, title: 't', url: 'u', state, mergedAt, headRef: 'feat/007-cards', bumped });

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
    expect(unapprovedGates(['done', 'done', 'skipped', 'done', 'current', 'pending', 'pending'], { number: 1, url: '', state: 'open', gates: { specify: { approved: true } } })).toEqual(['plan']);
  });
});

describe('repo config', () => {
  it('parses .gitmodules and merge order', () => {
    expect(parseGitmodules('[submodule "web"]\n\tpath = web\n\turl = https://github.com/a/front.git\n[submodule "edge"]\n\tpath = edge\n\turl = git@github.com:a/back.git\n[submodule "x"]\n\tpath = x\n\turl = https://gitlab.com/a/x'))
      .toEqual([{ path: 'web', repo: 'a/front' }, { path: 'edge', repo: 'a/back' }, { path: 'x', repo: null }]);
    expect(parseUiConfig('{"mergeOrder":["edge","a/front",3]}')).toEqual({ mergeOrder: ['edge', 'a/front'] });
    expect(parseUiConfig('nope')).toEqual({ mergeOrder: [] });
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
  specs: [f], submodules: [{ path: 'edge', repo: 'a/back', sha: pointer }], warnings: []
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
  afterEach(() => vi.unstubAllGlobals());
  it('creates the tracking issue on first approval, ticks the gate and comments', async () => {
    const calls = fakeGitHub();
    const issue = await decideGate(src, project(), feature(), 'plan', 'approve', '');
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
    const shipped = await decideGate(src, project(feature(), 'ptr2'), feature(), 'implement', 'approve', '');
    expect(shipped.state).toBe('closed');
    expect(calls.find(c => c.method === 'PATCH')!.body).toMatchObject({ state: 'closed', state_reason: 'completed' });
    const reopened = await decideGate(src, project(feature(), 'ptr2'), feature(), 'implement', 'reopen', 'regression');
    expect(reopened.state).toBe('open');
    expect(reopened.gates.implement).toEqual({ approved: false });
    expect(String(calls.filter(c => c.path.endsWith('/comments')).at(-1)!.body!.body)).toContain('> regression');
  });
  it('needs an existing issue to request changes', async () => {
    fakeGitHub();
    await expect(decideGate(src, project(), feature(), 'plan', 'changes', 'no')).rejects.toThrow(/no tracking issue/i);
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
      await handleGate(req(headers), res);
      expect(res.statusCode).toBe(403);
    }
  });
});
