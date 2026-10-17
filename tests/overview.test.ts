import { describe, expect, it } from 'vitest';
import { newIssueBody, parseIssueBody } from '../src/project/gates';
import { buildOverview } from '../src/project/overview';
import { nextStep } from '../src/project/phases';
import type { GateIssue, Project, SpecFeature, Tracking } from '../src/project/types';

const spec = (over: Partial<SpecFeature['spec'] & object> = {}): SpecFeature['spec'] => ({
  title: 't', fields: {}, raw: '', needsClarification: 0, clarifications: [],
  stories: [{ id: 'US1', p: 'P1', title: 's', text: '', ac: [['a', 'b', 'c']] }], frs: [{ id: 'FR-001', text: 'x' }], sc: [{ id: 'SC-001', text: 'y' }], ...over
});
const feature = (slug: string, over: Partial<SpecFeature> = {}): SpecFeature => ({
  id: slug.slice(0, 3), slug, title: slug.slice(4), files: [], spec: spec(), plan: null, tasks: null, analysis: null, checklists: [], docs: {}, branch: null, sha: '', unmerged: false, variants: [], ...over
});
const done = (n: number, of: number) => [{ name: 'P', tasks: Array.from({ length: of }, (_, i) => ({ id: `T${i}`, done: i < n, parallel: false, story: 'US1', text: 'x', path: 'a/b' })) }];

const project = (specs: SpecFeature[]): Project => ({
  repo: 'o/a', ref: 'main', sha: 'abc1234', committedAt: null, fetchedAt: '', commandPrefix: '/speckit-',
  constitution: { title: 'C', version: '1', ratified: '', amended: '', principles: [], raw: '' } as unknown as Project['constitution'],
  specs, submodules: [], warnings: [], branches: [], skippedBranches: 0, branchPrefixes: ['feat/'], pinned: false
});

const tracking = (issues: Record<string, GateIssue>): Tracking => ({ fetchedAt: '', user: 'mai', repos: [], issues, prs: {}, warnings: [] });
const issue = (slug: string, approved: string[]): GateIssue => ({
  number: 1, url: 'u', state: 'open', updatedAt: null,
  gates: parseIssueBody(newIssueBody(slug, 'x', Object.fromEntries(approved.map(g => [g, { approved: true }]))))!.gates
});

const plan = { summary: '', context: [], checks: [], raw: '' };

describe('buildOverview', () => {
  it('puts a pending approval before the next command', () => {
    const p = project([feature('001-auth', { plan })]);
    const items = buildOverview(p, tracking({ '001-auth': issue('001-auth', ['specify']) }));
    expect(items).toEqual([{ repo: 'o/a', slug: '001-auth', title: 'auth', branch: null, kind: 'approve', label: 'Approve Plan', step: 3 }]);
  });

  it('shows the next command once every finished step is approved', () => {
    const p = project([feature('001-auth', { plan })]);
    const items = buildOverview(p, tracking({ '001-auth': issue('001-auth', ['specify', 'plan']) }));
    expect(items[0]).toMatchObject({ kind: 'run', label: 'Run /speckit-tasks', step: 4 });
  });

  it('shows implement progress', () => {
    const p = project([feature('002-pay', { plan, tasks: done(3, 11), analysis: { findings: [], raw: '' } })]);
    expect(buildOverview(p, null)[0]).toMatchObject({ kind: 'implement', label: 'Implement · 3/11 tasks', step: 6 });
  });

  it('leaves out specs with nothing to do', () => {
    const finished = feature('003-done', { plan, tasks: done(2, 2), analysis: { findings: [], raw: '' } });
    expect(buildOverview(project([finished]), null)).toEqual([]);
  });

  it('matches Next up for the same project without approvals loaded', () => {
    const specs = [feature('001-a'), feature('002-b', { plan }), feature('003-c', { plan, tasks: done(1, 4) })];
    const p = project(specs);
    expect(buildOverview(p, null).map(i => [i.slug, i.label, i.step])).toEqual(specs.flatMap(f => {
      const n = nextStep(p, f);
      return n ? [[f.slug, n.text, n.phase]] : [];
    }));
  });
});
