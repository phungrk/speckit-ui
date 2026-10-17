// specs/004 US2: the Claude Code gate check. Synthetic project folders; GitHub and gh are faked.
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { install, readTarget, run, type Deps, type GhResult } from '../hook/speckit-gate';
import { newIssueBody } from '../src/project/gates';
import type { GateKey } from '../src/project/types';
import { READY_SPEC } from './fakeGitHub';

const PLAN = '# Implementation Plan: X\n\n## Summary\n\nS\n';
const dirs: string[] = [];
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });

/** A project folder with the given files. */
function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'sk-gate-'));
  dirs.push(root);
  for (const [p, text] of Object.entries({ '.specify/memory/constitution.md': '# C\n', ...files })) {
    mkdirSync(join(root, p, '..'), { recursive: true });
    writeFileSync(join(root, p), text);
  }
  return root;
}

const SPECS = {
  'specs/001-a/spec.md': READY_SPEC('A'),
  'specs/002-b/spec.md': READY_SPEC('B'),
  'specs/002-b/plan.md': PLAN
};

/** GitHub with one tracking issue per slug, approved gates as given. */
const github = (approved: Record<string, GateKey[]>, calls: string[] = []): Deps['github'] => async path => {
  calls.push(path);
  const issues = Object.entries(approved).map(([slug, gates], i) => ({
    number: i + 1, html_url: `https://github.com/acme/alpha/issues/${i + 1}`, state: 'open',
    body: newIssueBody(slug, 'u', Object.fromEntries(gates.map(g => [g, { approved: true }])))
  }));
  return { status: 200, body: JSON.stringify([...issues, { number: 99, body: 'pr', pull_request: {} }]) } as GhResult;
};

const deps = (root: string, gh: Deps['github'], env: Deps['env'] = {}, branch = 'main'): Deps => ({
  root, env, github: gh,
  git: args => (args[0] === 'remote' ? 'git@github.com:acme/alpha.git' : args[0] === 'rev-parse' ? branch : null)
});
const prompt = (text: string) => JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: text });
const skill = (tool_input: Record<string, unknown>) => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input });

/** Every file and its content, to prove nothing changed. */
const snapshot = (root: string) => {
  const out: Record<string, string> = {};
  const walk = (d: string) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else out[p] = readFileSync(p, 'utf8'); } };
  walk(root);
  return out;
};

describe('recognising commands (R3)', () => {
  it('reads typed commands and Skill calls, with either prefix', () => {
    expect(readTarget({ hook_event_name: 'UserPromptSubmit', prompt: '/speckit-plan 004' })).toMatchObject({ step: 3, args: '004', event: 'prompt' });
    expect(readTarget({ hook_event_name: 'UserPromptSubmit', prompt: '/speckit.implement' })).toMatchObject({ step: 6 });
    for (const field of ['skill', 'name', 'command']) {
      expect(readTarget({ hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { [field]: 'speckit-tasks', args: '002' } })).toMatchObject({ step: 4, args: '002', event: 'tool' });
    }
  });

  it('ignores everything else', () => {
    for (const p of ['/speckit-specify x', '/speckit-constitution', '/speckit-checklist', '/speckit-converge', '/speckit-taskstoissues', 'please run speckit-plan', '/speckit-planner']) {
      expect(readTarget({ hook_event_name: 'UserPromptSubmit', prompt: p })).toBeNull();
    }
    expect(readTarget({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: '/speckit-plan' } })).toBeNull();
  });
});

describe('the gate check (US2)', () => {
  it('blocks /speckit-plan while Specify is unapproved, and lets it run once approved', async () => {
    const root = project(SPECS);
    const before = snapshot(root);
    const blocked = await run(prompt('/speckit-plan 001'), deps(root, github({})));
    expect(blocked.code).toBe(2);
    expect(blocked.stderr).toBe('Approve Specify for 001-a before running /speckit-plan. Approve it in speckit-ui.');
    const withIssue = await run(prompt('/speckit-plan 001'), deps(root, github({ '001-a': [] })));
    expect(withIssue.stderr).toContain('Tracking issue: https://github.com/acme/alpha/issues/1');
    expect(await run(prompt('/speckit-plan 001'), deps(root, github({ '001-a': ['specify'] })))).toEqual({ code: 0 });
    expect(snapshot(root)).toEqual(before);
  });

  it('a Skill call is checked the same way', async () => {
    const root = project(SPECS);
    expect((await run(skill({ skill: 'speckit-plan', args: '001' }), deps(root, github({})))).code).toBe(2);
    expect((await run(skill({ skill: 'speckit-plan', args: '001' }), deps(root, github({ '001-a': ['specify'] })))).code).toBe(0);
  });

  it('every gated command follows blockingGates', async () => {
    const root = project(SPECS);
    // 002-b has a plan but Specify is unapproved: Tasks onwards is locked by Specify, then by Plan.
    for (const c of ['clarify', 'plan', 'tasks', 'analyze', 'implement']) {
      expect((await run(prompt(`/speckit-${c} 002`), deps(root, github({})))).code).toBe(2);
    }
    const r = await run(prompt('/speckit-tasks 002'), deps(root, github({ '002-b': ['specify'] })));
    expect(r.stderr).toContain('Approve Plan for 002-b');
    expect((await run(prompt('/speckit-tasks 002'), deps(root, github({ '002-b': ['specify', 'plan'] })))).code).toBe(0);
  });

  it('does not ask GitHub when nothing before the step has run', async () => {
    const root = project({ 'specs/003-c/.keep': '' });
    const calls: string[] = [];
    expect(await run(prompt('/speckit-plan 003'), deps(root, github({}, calls)))).toEqual({ code: 0 });
    expect(calls).toEqual([]);
  });

  it('finds the spec from the argument, SPECIFY_FEATURE, feature.json, then the branch (R4)', async () => {
    const root = project({ ...SPECS, '.specify/feature.json': '{"feature_directory":"specs/002-b"}' });
    const g = github({ '001-a': ['specify'], '002-b': ['specify', 'plan'] });
    expect((await run(prompt('/speckit-plan 001'), deps(root, github({ '002-b': ['specify'] })))).code).toBe(2);
    expect((await run(prompt('/speckit-tasks'), deps(root, g))).code).toBe(0);
    expect((await run(prompt('/speckit-tasks'), deps(root, github({ '002-b': ['specify'] })))).stderr).toContain('002-b');
    expect((await run(prompt('/speckit-plan'), deps(root, github({}), { SPECIFY_FEATURE: '001-a' }))).stderr).toContain('001-a');
    const noJson = project(SPECS);
    expect((await run(prompt('/speckit-plan'), deps(noJson, github({}), {}, 'feat/001-a'))).stderr).toContain('001-a');
    expect(await run(prompt('/speckit-plan'), deps(noJson, github({}), {}, 'main'))).toEqual({ code: 0 });
  });

  it('lets everything run when the repo turns gates off', async () => {
    const root = project({ ...SPECS, '.specify/speckit-ui.json': '{"approvalGates":"off"}' });
    expect(await run(prompt('/speckit-plan 001'), deps(root, github({})))).toEqual({ code: 0 });
  });

  it('stops when approvals cannot be checked, unless bypassed on purpose, and records the bypass (FR-008)', async () => {
    const root = project(SPECS);
    const down: Deps['github'] = async () => { throw new Error('gh api failed: network down'); };
    const denied: Deps['github'] = async () => ({ status: 401, body: '' });
    for (const g of [down, denied]) {
      const r = await run(prompt('/speckit-plan 001'), deps(root, g));
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/^Could not check approvals for 001-a: .*SPECKIT_GATE_BYPASS/);
    }
    const typed = await run(prompt('/speckit-plan 001'), deps(root, down, { SPECKIT_GATE_BYPASS: 'offline demo' }));
    expect(typed).toMatchObject({ code: 0 });
    expect(typed.stdout).toContain('Approval gate check bypassed for 001-a: offline demo');
    const tool = await run(skill({ skill: 'speckit-plan', args: '001' }), deps(root, down, { SPECKIT_GATE_BYPASS: 'offline demo' }));
    expect(JSON.parse(tool.stdout!).hookSpecificOutput).toMatchObject({ hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: expect.stringContaining('offline demo') });
    // A bypass does not override a gate GitHub says is unapproved.
    expect((await run(prompt('/speckit-plan 001'), deps(root, github({}), { SPECKIT_GATE_BYPASS: 'x' }))).code).toBe(2);
  });

  it('a repo without a GitHub remote cannot be checked', async () => {
    const root = project(SPECS);
    const r = await run(prompt('/speckit-plan 001'), { ...deps(root, github({})), git: () => null });
    expect(r).toMatchObject({ code: 2, stderr: expect.stringContaining('no GitHub remote') });
  });
});

describe('install', () => {
  it('adds both hooks, keeps what is there, and adds nothing the second time', () => {
    const root = project({ '.claude/settings.json': JSON.stringify({ permissions: { allow: ['Bash(npm test)'] }, hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo bye' }] }] } }) });
    expect(install(root)).toMatch(/^Added UserPromptSubmit and PreToolUse \(Skill\)/);
    const s = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'));
    expect(s.permissions).toEqual({ allow: ['Bash(npm test)'] });
    expect(s.hooks.Stop).toHaveLength(1);
    expect(s.hooks.UserPromptSubmit[0].hooks[0]).toEqual({
      type: 'command', timeout: 30,
      command: `command -v node >/dev/null || { echo 'speckit gate: node not found' >&2; exit 2; }; node "$CLAUDE_PROJECT_DIR/.claude/hooks/speckit-gate.mjs"`
    });
    expect(s.hooks.PreToolUse[0].matcher).toBe('Skill');
    expect(install(root)).toMatch(/already runs the gate check/);
    expect(JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'))).toEqual(s);
  });

  it('creates settings.json when there is none', () => {
    const root = project({});
    install(root);
    expect(JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')).hooks.PreToolUse).toHaveLength(1);
  });
});

describe('the built speckit-gate.mjs (G2)', () => {
  // Built here, so `npm test` covers the shipped file even before `npm run build`.
  const out = mkdtempSync(join(tmpdir(), 'sk-gate-build-'));
  dirs.push(out);
  const node = (args: string[], input: string, env: Record<string, string>) => spawnSync(process.execPath, args, { input, encoding: 'utf8', env: { PATH: env.PATH ?? process.env.PATH!, ...env } });

  it('runs on plain Node and blocks with exit 2', () => {
    execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.hook.config.ts', '--logLevel', 'error'], { env: { ...process.env, HOOK_OUT_DIR: out }, stdio: 'pipe' });
    const file = join(out, 'speckit-gate.mjs');
    expect(readFileSync(file, 'utf8')).toMatch(/^#!\/usr\/bin\/env node\n\/\/ speckit-gate \w+/);
    expect(node([file, '--version'], '', {}).stdout).toMatch(/^speckit-gate \w+/);

    // A fake gh on PATH answers the issue list; git answers the remote.
    const root = project(SPECS);
    const bin = join(root, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'gh'), '#!/bin/sh\nif [ "$1" = "--version" ]; then echo gh; exit 0; fi\necho "[]"\n');
    writeFileSync(join(bin, 'git'), '#!/bin/sh\nif [ "$1" = "remote" ]; then echo https://github.com/acme/alpha.git; exit 0; fi\necho main\n');
    chmodSync(join(bin, 'gh'), 0o755); chmodSync(join(bin, 'git'), 0o755);
    const r = node([file], prompt('/speckit-plan 001'), { PATH: `${bin}:/usr/bin:/bin`, CLAUDE_PROJECT_DIR: root });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('Approve Specify for 001-a before running /speckit-plan.');
    expect(node([file], prompt('hello'), { CLAUDE_PROJECT_DIR: root }).status).toBe(0);
  }, 60_000);
});
