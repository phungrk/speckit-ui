// specs/004: approval gates lock the steps after them. Synthetic data only; GitHub is faked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearProjectCache, loadProject, type Source } from '../server/github';
import { parseUiConfig } from '../server/parse';
import { blockedReason, blockingGates, newIssueBody, parseIssueBody } from '../src/project/gates';
import { buildOverview } from '../src/project/overview';
import { phaseStatus } from '../src/project/status';
import type { GateIssue, GateKey, Project, SpecFeature, Tracking } from '../src/project/types';
import { fakeBranches, READY_SPEC } from './fakeGitHub';

const issue = (...approved: GateKey[]): GateIssue => ({
  number: 1, url: 'https://github.com/o/r/issues/1', state: 'open', updatedAt: null,
  gates: parseIssueBody(newIssueBody('x', 'u', Object.fromEntries(approved.map(g => [g, { approved: true }]))))!.gates
});

describe('blockingGates (R1)', () => {
  // Constitution, Specify, Clarify, Plan, Tasks, Analyze, Implement
  const specOnly = ['done', 'done', 'skipped', 'current', 'pending', 'pending', 'pending'];
  const upToTasks = ['done', 'done', 'skipped', 'done', 'done', 'current', 'pending'];

  it('an unapproved Specify locks every later step', () => {
    expect(blockingGates(specOnly, issue())).toEqual([null, null, 'specify', 'specify', 'specify', 'specify', 'specify']);
    expect(blockingGates(specOnly, null)).toEqual([null, null, 'specify', 'specify', 'specify', 'specify', 'specify']);
  });

  it('once Specify is approved, the next unapproved step that ran locks the steps after it', () => {
    expect(blockingGates(specOnly, issue('specify'))).toEqual([null, null, null, null, null, null, null]);
    expect(blockingGates(upToTasks, issue('specify'))).toEqual([null, null, null, null, 'plan', 'plan', 'plan']);
    expect(blockingGates(upToTasks, issue('specify', 'plan'))).toEqual([null, null, null, null, null, 'tasks', 'tasks']);
  });

  it('a step that was not run never locks (Clarify, light track)', () => {
    const light = ['done', 'done', 'skipped', 'done', 'skipped', 'skipped', 'skipped'];
    expect(blockingGates(light, issue('specify'))).toEqual([null, null, null, null, 'plan', 'plan', 'plan']);
    expect(blockingGates(light, issue('specify', 'plan'))).toEqual([null, null, null, null, null, null, null]);
  });

  it('gates ticked out of order on GitHub still lock at the first gap', () => {
    expect(blockingGates(upToTasks, issue('plan', 'tasks'))).toEqual([null, null, 'specify', 'specify', 'specify', 'specify', 'specify']);
  });

  it('locks nothing when the repo turns gates off', () => {
    expect(blockingGates(specOnly, null, 'off').every(x => x === null)).toBe(true);
  });

  it('names the gate to approve', () => {
    expect(blockedReason('specify')).toBe('Approve Specify first.');
  });
});

const src: Source = { owner: 'o', repo: 'r', token: 't', identity: 'u1', ref: 'main' };
const repo = (files: Record<string, string>) => ({ defaultBranch: 'main', branches: { main: { 'specs/001-a/spec.md': READY_SPEC('A'), ...files } } });

describe('repo config and the gate check (R6, R7)', () => {
  beforeEach(() => clearProjectCache());
  afterEach(() => vi.unstubAllGlobals());

  it('parseUiConfig reads approvalGates with "block" as the default', () => {
    expect(parseUiConfig(null).approvalGates).toBe('block');
    expect(parseUiConfig('{"approvalGates":"off"}').approvalGates).toBe('off');
    expect(parseUiConfig('{"approvalGates":false}').approvalGates).toBe('block');
    expect(parseUiConfig('{"approvalGates":"warn"}').approvalGates).toBe('block');
    expect(parseUiConfig('not json').approvalGates).toBe('block');
  });

  it('the project carries approvalGates from .specify/speckit-ui.json', async () => {
    fakeBranches('o/r', repo({ '.specify/speckit-ui.json': '{"approvalGates":"off"}' }));
    expect((await loadProject(src)).approvalGates).toBe('off');
  });

  it('the gate check is installed only with both the script and settings.json running it', async () => {
    fakeBranches('o/r', repo({}));
    expect((await loadProject(src)).gateCheck).toBe('missing');
    clearProjectCache();
    fakeBranches('o/r', repo({ '.claude/hooks/speckit-gate.mjs': '// speckit-gate', '.claude/settings.json': '{"hooks":{}}' }));
    expect((await loadProject(src)).gateCheck).toBe('missing');
    clearProjectCache();
    fakeBranches('o/r', repo({ '.claude/hooks/speckit-gate.mjs': '// speckit-gate', '.claude/settings.json': '{"hooks":{"UserPromptSubmit":[{"hooks":[{"type":"command","command":"node .claude/hooks/speckit-gate.mjs"}]}]}}' }));
    const p = await loadProject(src);
    expect(p.gateCheck).toBe('installed');
    expect(p.approvalGates).toBe('block');
  });
});

// ---- Shared fixtures for the stories below ----

const SPEC: SpecFeature['spec'] = { title: 'A', fields: {}, raw: '', needsClarification: 0, clarifications: [], stories: [{ id: 'US1', p: 'P1', title: 's', text: '', ac: [['a', 'b', 'c']] }], frs: [{ id: 'FR-001', text: 'x' }], sc: [{ id: 'SC-001', text: 'y' }] };
const PLAN = { summary: '', context: [], checks: [], raw: '' };
export const feature = (slug: string, over: Partial<SpecFeature> = {}): SpecFeature => ({
  id: slug.slice(0, 3), slug, title: slug, files: [], spec: SPEC, plan: null, tasks: null, analysis: null, checklists: [], docs: {},
  branch: null, sha: '', unmerged: false, variants: [], ...over
});
const project = (specs: SpecFeature[], over: Partial<Project> = {}): Project => ({
  repo: 'o/r', ref: 'main', sha: 'abc1234', committedAt: null, fetchedAt: '', commandPrefix: '/speckit-',
  constitution: { title: 'C' } as Project['constitution'], specs, submodules: [], warnings: [],
  branches: [], skippedBranches: 0, branchPrefixes: ['feat/'], pinned: false, approvalGates: 'block', gateCheck: 'installed', ...over
});
const tracking = (issues: Record<string, GateIssue>): Tracking => ({ fetchedAt: '', user: 'mai', repos: [], issues, prs: {}, warnings: [] });
const TASKS = [{ name: 'P', tasks: [{ id: 'T1', done: false, parallel: false, story: 'US1', text: 'x', path: 'a/b' }] }];

describe('Next up and the overview (US1)', () => {
  it('a locked spec only asks for the pending approval', () => {
    const p = project([feature('001-a')]);
    expect(buildOverview(p, tracking({})).map(i => i.label)).toEqual(['Approve Specify']);
    expect(buildOverview(p, tracking({ '001-a': issue('specify') })).map(i => i.label)).toEqual(['Run /speckit-plan']);
  });

  it('suggests no command while approvals cannot be loaded', () => {
    const p = project([feature('001-a'), feature('002-b', { plan: PLAN, tasks: TASKS })]);
    expect(buildOverview(p, null)).toEqual([]);
    expect(buildOverview({ ...p, approvalGates: 'off' }, null).map(i => i.label)).toEqual(['Run /speckit-plan', 'Run /speckit-analyze']);
  });
});

describe('work done before approval (US3)', () => {
  it('Plan and Tasks that ran before Specify was approved are done but locked ("Ran early")', () => {
    const f = feature('002-b', { plan: PLAN, tasks: TASKS });
    const st = phaseStatus({ constitution: { title: 'C' } as Project['constitution'] }, f);
    expect(st.slice(3, 5)).toEqual(['done', 'done']);
    const blocked = blockingGates(st, issue());
    expect(blocked.slice(3, 5)).toEqual(['specify', 'specify']);
  });

  it('approving in order unlocks each next gate', () => {
    const st = phaseStatus({ constitution: { title: 'C' } as Project['constitution'] }, feature('002-b', { plan: PLAN, tasks: TASKS }));
    expect(blockingGates(st, issue('specify'))[4]).toBe('plan');
    expect(blockingGates(st, issue('specify', 'plan'))[4]).toBeNull();
    expect(blockingGates(st, issue('specify', 'plan'))[5]).toBe('tasks');
  });
});
