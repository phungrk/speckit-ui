import { afterEach, describe, expect, it, vi } from 'vitest';
import { commandPrefix, parseAnalysis, parseChecklist, parseConstitution, parsePlan, parseSpec, parseTasks, sections } from '../server/parse';
import { GitHubError, getProject, loadProject, sourceFromEnv } from '../server/github';
import { nextStep, phaseStatus, taskArea } from '../src/project/phases';
import { liveOfflineAnswer, liveRefPattern, liveRefPhase } from '../src/project/copilot';
import type { Project, SpecFeature } from '../src/project/types';

// Synthetic fixtures in Spec Kit's template format.
const SPEC = `# Feature Specification: Recurring transfers

**Feature Branch**: \`002-recurring\`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "repeat a transfer monthly"

## Clarifications

### Session 2026-10-02

- Q: When does a monthly series on the 31st run in short months? → A: Last day of the month
- Q: Retry on insufficient balance? -> A: Once, 2 hours later

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schedule a transfer (Priority: P1)

As an account holder I pick a future date
so the transfer goes out without me.

**Why this priority**: core.

**Acceptance Scenarios**:

1. **Given** a transfer scheduled for the 5th, **When** the 5th arrives, **Then** it is sent and I am notified.
2. **Given** a series exists, **When** I cancel it, **Then** nothing more is sent.

### User Story 2 - Skip one (Priority: P2)

Skip a single occurrence.

### Edge Cases

- Daylight saving.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST schedule up to 12 months ahead.
- **FR-002**: System MUST handle failures [NEEDS CLARIFICATION: retry or fail?]

## Success Criteria *(mandatory)*

- **SC-001**: 99% run on time.

## Non-Goals *(mandatory)*

- No new payment rails.
`;

const PLAN = `# Implementation Plan: Recurring transfers

**Branch**: \`002-recurring\` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

## Summary

Add a scheduler.

## Technical Context

**Language/Version**: TypeScript

**Storage**: Postgres

## Constitution Check

- [x] **I. Spec before code**: yes
- [ ] **II. Accessible**: not yet

## Project Structure

\`\`\`text
## not a heading inside a fence
src/
\`\`\`
`;

const TASKS = `# Tasks

## Phase 1: Setup

- [x] T001 Create module in \`api/src/scheduler/index.ts\`
- [ ] T002 [P] Add migration \`db/0001.sql\`

## Phase 2: User Story 1 - Schedule (Priority: P1)

- [ ] T003 [P] [US1] Screen in \`web/src/Schedule.tsx\`
- [X] T004 [US1] Run \`npm run build\`

## Dependencies

- [ ] not a task line
`;

const ANALYSIS = `## Specification Analysis Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Constitution Alignment | CRITICAL | plan.md:L20 | Principle II unchecked | Add a11y notes |
| D1 | Duplication | low | spec.md | FR-001 repeats US1 | Merge |

| Requirement Key | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | Yes | T003 | |
`;

const CONSTITUTION = `<!-- Sync Impact Report: hidden -->
# Wallet Constitution

## Core Principles

### I. Spec before code

- No branch without a spec.

### II. Accessible by default (NON-NEGOTIABLE)

WCAG 2.2 AA.

## Governance

Amend by PR.

**Version**: 1.2.0 | **Ratified**: 2026-08-04 | **Last Amended**: 2026-09-01
`;

describe('parsers', () => {
  it('ignores headings inside code fences', () => {
    expect(sections(PLAN, 2).map(s => s.title)).toEqual(['Summary', 'Technical Context', 'Constitution Check', 'Project Structure']);
  });

  it('parses spec.md', () => {
    const s = parseSpec(SPEC);
    expect(s.title).toBe('Recurring transfers');
    expect(s.fields).toMatchObject({ 'Feature Branch': '002-recurring', Created: '2026-10-01', Status: 'Draft' });
    expect(s.stories.map(u => [u.id, u.p, u.title, u.ac.length])).toEqual([['US1', 'P1', 'Schedule a transfer', 2], ['US2', 'P2', 'Skip one', 0]]);
    expect(s.stories[0].text).toBe('As an account holder I pick a future date so the transfer goes out without me.');
    expect(s.stories[0].ac[0]).toEqual(['a transfer scheduled for the 5th', 'the 5th arrives', 'it is sent and I am notified']);
    expect(s.frs).toEqual([
      { id: 'FR-001', text: 'Users MUST schedule up to 12 months ahead.' },
      { id: 'FR-002', text: 'System MUST handle failures', clarification: 'retry or fail?' }
    ]);
    expect(s.sc).toHaveLength(1);
    expect(s.needsClarification).toBe(1);
    expect(s.clarifications).toEqual([
      { session: '2026-10-02', q: 'When does a monthly series on the 31st run in short months?', a: 'Last day of the month' },
      { session: '2026-10-02', q: 'Retry on insufficient balance?', a: 'Once, 2 hours later' }
    ]);
  });

  it('parses plan.md', () => {
    const p = parsePlan(PLAN);
    expect(p.summary).toBe('Add a scheduler.');
    expect(p.context).toEqual([['Language/Version', 'TypeScript'], ['Storage', 'Postgres']]);
    expect(p.checks).toEqual([['I. Spec before code', true], ['II. Accessible', false]]);
  });

  it('parses tasks.md', () => {
    const phases = parseTasks(TASKS);
    expect(phases.map(p => p.name)).toEqual(['Setup', 'User Story 1 - Schedule (Priority: P1)']);
    expect(phases.flatMap(p => p.tasks)).toEqual([
      { id: 'T001', done: true, parallel: false, text: 'Create module in `api/src/scheduler/index.ts`', path: 'api/src/scheduler/index.ts' },
      { id: 'T002', done: false, parallel: true, text: 'Add migration `db/0001.sql`', path: 'db/0001.sql' },
      { id: 'T003', done: false, parallel: true, story: 'US1', text: 'Screen in `web/src/Schedule.tsx`', path: 'web/src/Schedule.tsx' },
      { id: 'T004', done: true, parallel: false, story: 'US1', text: 'Run `npm run build`' }
    ]);
  });

  it('parses the analyze findings table and ignores other tables', () => {
    const a = parseAnalysis(ANALYSIS);
    expect(a.findings.map(f => [f.id, f.severity, f.location])).toEqual([['C1', 'CRITICAL', 'plan.md:L20'], ['D1', 'LOW', 'spec.md']]);
  });

  it('parses checklists, constitution and the command prefix', () => {
    expect(parseChecklist('req.md', '- [x] a\n- [ ] b\n- [X] c')).toEqual({ name: 'req.md', done: 2, total: 3 });
    const c = parseConstitution(CONSTITUTION);
    expect(c.title).toBe('Wallet Constitution');
    expect(c.principles.map(p => [p.num, p.title])).toEqual([['I', 'Spec before code'], ['II', 'Accessible by default (NON-NEGOTIABLE)']]);
    expect([c.version, c.ratified, c.amended]).toEqual(['1.2.0', '2026-08-04', '2026-09-01']);
    expect(c.raw).not.toContain('Sync Impact');
    expect(commandPrefix('{"integration":"claude","integration_settings":{"claude":{"invoke_separator":"-"}}}')).toBe('/speckit-');
    expect(commandPrefix(null)).toBe('/speckit.');
  });
});

const feature = (over: Partial<SpecFeature> = {}): SpecFeature => ({
  id: '002', slug: '002-recurring', title: 'Recurring transfers', files: ['spec.md'], spec: parseSpec(SPEC), plan: null, tasks: null, analysis: null, checklists: [], docs: {}, ...over
});
const project = (specs: SpecFeature[]): Project => ({
  repo: 'acme/app', ref: 'main', sha: 'abc1234def', committedAt: null, fetchedAt: new Date().toISOString(), commandPrefix: '/speckit-',
  constitution: parseConstitution(CONSTITUTION), specs, warnings: []
});

describe('phase status', () => {
  const p = project([]);
  it('clarify is next while markers remain and no plan exists', () => {
    const noAnswers = feature({ spec: { ...parseSpec(SPEC), clarifications: [] } });
    expect(phaseStatus(p, noAnswers)).toEqual(['done', 'done', 'current', 'pending', 'pending', 'pending', 'pending']);
    expect(nextStep(p, noAnswers)).toMatchObject({ phase: 2, text: 'Clarify · 1 open', detail: '/speckit-clarify' });
  });
  it('clarify counts as not run once a plan exists', () => {
    const f = feature({ spec: { ...parseSpec(SPEC), clarifications: [] }, plan: parsePlan(PLAN) });
    expect(phaseStatus(p, f).slice(0, 5)).toEqual(['done', 'done', 'skipped', 'done', 'current']);
  });
  it('analyze is next until tasks start, then skipped', () => {
    const tasks = parseTasks(TASKS.replace(/\[(x|X)\]/g, '[ ]'));
    expect(phaseStatus(p, feature({ plan: parsePlan(PLAN), tasks }))[5]).toBe('current');
    const started = feature({ plan: parsePlan(PLAN), tasks: parseTasks(TASKS) });
    expect(phaseStatus(p, started).slice(4)).toEqual(['done', 'skipped', 'current']);
    expect(nextStep(p, started)!.text).toBe('Implement · 2/4 tasks');
  });
  it('a light-track spec is done after plan', () => {
    const light = parseSpec(SPEC.replace('**Status**: Draft', '**Status**: Draft\n\n**Track**: light'));
    expect(phaseStatus(p, feature({ spec: light, plan: parsePlan(PLAN) }))).toEqual(['done', 'done', 'done', 'done', 'skipped', 'skipped', 'skipped']);
    expect(nextStep(p, feature({ spec: light, plan: parsePlan(PLAN) }))).toBeNull();
  });
  it('done when every task is checked', () => {
    const all = parseTasks(TASKS.replace(/\[ \]/g, '[x]'));
    expect(phaseStatus(p, feature({ plan: parsePlan(PLAN), tasks: all, analysis: parseAnalysis(ANALYSIS) })).every(s => s === 'done')).toBe(true);
  });
});

describe('live copilot helpers', () => {
  const f = feature({ plan: parsePlan(PLAN), tasks: parseTasks(TASKS), analysis: parseAnalysis(ANALYSIS) });
  it('links requirement, task and finding IDs', () => {
    expect('See FR-002, T003, C1 and D1, not P1.'.split(liveRefPattern(f)).filter((_, i) => i % 2)).toEqual(['FR-002', 'T003', 'C1', 'D1']);
    expect(['FR-001', 'Q2', 'T003', 'C1'].map(r => liveRefPhase(f, r))).toEqual([1, 2, 6, 5]);
  });
  it('groups tasks by top-level folder', () => {
    expect(parseTasks(TASKS).flatMap(p => p.tasks).map(taskArea)).toEqual(['api', 'db', 'web', '—']);
  });
  it('answers suggested questions offline', () => {
    const p = project([f]);
    expect(liveOfflineAnswer('What should I do next on this spec?', p, f)).toContain('/speckit-implement');
    expect(liveOfflineAnswer('Which requirements still need clarification?', p, f)).toContain('FR-002: retry or fail?');
    expect(liveOfflineAnswer('Check this spec against the constitution', p, f)).toContain('Not ticked: II. Accessible');
    expect(liveOfflineAnswer('Which tasks touch each area, and which can run in parallel?', p, f)).toContain('Open [P] tasks: T002, T003.');
  });
});

describe('GitHub loader', () => {
  afterEach(() => vi.unstubAllGlobals());

  const files: Record<string, string> = {
    '.specify/memory/constitution.md': CONSTITUTION,
    '.specify/integration.json': '{"integration":"claude","integration_settings":{"claude":{"invoke_separator":"-"}}}',
    'specs/002-recurring/spec.md': SPEC,
    'specs/002-recurring/plan.md': PLAN,
    'specs/002-recurring/tasks.md': TASKS,
    'specs/002-recurring/checklists/requirements.md': '- [x] a\n- [ ] b',
    'specs/002-recurring/contracts/api.yaml': 'openapi: 3.1.0',
    'specs/001-old/spec.md': '# Feature Specification: Old\n',
    'src/index.ts': ''
  };
  const fakeGitHub = (sha = 'sha1') => vi.fn(async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    const ok = (body: unknown, raw = false) => new Response(raw ? String(body) : JSON.stringify(body), { status: 200 });
    if (path === '/repos/acme/app') return ok({ default_branch: 'main' });
    if (path === '/repos/acme/app/commits/main') return ok({ sha, commit: { committer: { date: '2026-10-17T00:00:00Z' } } });
    if (path === `/repos/acme/app/git/trees/${sha}`) return ok({ truncated: false, tree: Object.keys(files).map(p => ({ path: p, type: 'blob' })) });
    const m = path.match(/^\/repos\/acme\/app\/contents\/(.+)$/);
    if (m && (init?.headers as Record<string, string>).Accept.includes('raw')) {
      const p = decodeURIComponent(m[1]);
      return p in files ? ok(files[p], true) : new Response('', { status: 404 });
    }
    return new Response('', { status: 404 });
  });

  it('reads env config', () => {
    expect(sourceFromEnv({ GITHUB_REPO: 'acme/app', GITHUB_TOKEN: 't' })).toEqual({ owner: 'acme', repo: 'app', ref: undefined, token: 't' });
    expect(sourceFromEnv({ GITHUB_REPO: 'not a repo' })).toBeNull();
    expect(sourceFromEnv({})).toBeNull();
  });

  it('loads and parses a project, downloading only the files it renders', async () => {
    const fetch = fakeGitHub();
    vi.stubGlobal('fetch', fetch);
    const p = await loadProject({ owner: 'acme', repo: 'app', token: 'secret' });
    expect(p).toMatchObject({ repo: 'acme/app', ref: 'main', sha: 'sha1', commandPrefix: '/speckit-', warnings: [] });
    expect(p.specs.map(s => [s.slug, s.title])).toEqual([['001-old', 'Old'], ['002-recurring', 'Recurring transfers']]);
    const s = p.specs[1];
    expect(s.files).toEqual(['checklists/requirements.md', 'contracts/api.yaml', 'plan.md', 'spec.md', 'tasks.md']);
    expect(s.checklists).toEqual([{ name: 'requirements.md', done: 1, total: 2 }]);
    const fetched = fetch.mock.calls.map(c => decodeURIComponent(new URL(c[0]).pathname));
    expect(fetched).not.toContain('/repos/acme/app/contents/specs/002-recurring/contracts/api.yaml');
    expect(fetched).not.toContain('/repos/acme/app/contents/src/index.ts');
    expect((fetch.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe('Bearer secret');
  });

  it('turns GitHub errors into readable messages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(loadProject({ owner: 'acme', repo: 'nope' })).rejects.toThrow(GitHubError);
    await expect(loadProject({ owner: 'acme', repo: 'nope' })).rejects.toThrow(/404 for acme\/nope/);
  });

  it('serves from cache and reloads only when the branch moves', async () => {
    const src = { owner: 'acme', repo: 'app', ref: 'main' };
    vi.stubGlobal('fetch', fakeGitHub('sha1'));
    expect((await getProject(src, true)).sha).toBe('sha1');
    const same = fakeGitHub('sha1');
    vi.stubGlobal('fetch', same);
    expect((await getProject(src)).sha).toBe('sha1');
    expect(same).not.toHaveBeenCalled();
    expect((await getProject(src, true)).sha).toBe('sha1');
    expect(same).toHaveBeenCalledTimes(1);
    vi.stubGlobal('fetch', fakeGitHub('sha2'));
    expect((await getProject(src, true)).sha).toBe('sha2');
  });
});
