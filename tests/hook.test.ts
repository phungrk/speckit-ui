// specs/004 US2: the Claude Code gate check. Synthetic project folders; GitHub and gh are faked.
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { install, readTarget, run, type Deps, type GhResult } from '../hook/speckit-gate';
import { PR_HOOK_MATCHER, newIssueBody } from '../src/project/gates';
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
    expect(install(root)).toMatch(/^Added UserPromptSubmit, PreToolUse \(Skill\) and PreToolUse \(pull requests\)/);
    const s = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'));
    expect(s.permissions).toEqual({ allow: ['Bash(npm test)'] });
    expect(s.hooks.Stop).toHaveLength(1);
    expect(s.hooks.UserPromptSubmit[0].hooks[0]).toEqual({
      type: 'command', timeout: 30,
      command: `command -v node >/dev/null || { echo 'speckit gate: node not found' >&2; exit 2; }; node "$CLAUDE_PROJECT_DIR/.claude/hooks/speckit-gate.mjs"`
    });
    expect(s.hooks.PreToolUse.map((g: { matcher: string }) => g.matcher)).toEqual(['Skill', PR_HOOK_MATCHER]);
    expect(install(root)).toMatch(/already runs the gate check/);
    expect(JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'))).toEqual(s);
  });

  it('upgrades a settings.json from spec 004 by adding only the PR hook (specs/005 R5)', () => {
    const entry = { type: 'command', timeout: 30, command: `command -v node >/dev/null || { echo 'speckit gate: node not found' >&2; exit 2; }; node "$CLAUDE_PROJECT_DIR/.claude/hooks/speckit-gate.mjs"` };
    const old = { hooks: { UserPromptSubmit: [{ hooks: [entry] }], PreToolUse: [{ matcher: 'Skill', hooks: [entry] }, { matcher: 'Edit', hooks: [{ type: 'command', command: 'echo edit' }] }] } };
    const root = project({ '.claude/settings.json': JSON.stringify(old) });
    expect(install(root)).toMatch(/^Added PreToolUse \(pull requests\) to /);
    const s = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'));
    expect(s.hooks.UserPromptSubmit).toEqual(old.hooks.UserPromptSubmit);
    expect(s.hooks.PreToolUse.slice(0, 2)).toEqual(old.hooks.PreToolUse);
    expect(s.hooks.PreToolUse[2]).toEqual({ matcher: PR_HOOK_MATCHER, hooks: [entry] });
    expect(install(root)).toMatch(/already runs the gate check/);
  });

  it('creates settings.json when there is none', () => {
    const root = project({});
    install(root);
    expect(JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')).hooks.PreToolUse).toHaveLength(2);
  });
});

// ---- specs/005: creating a PR needs a line that links the tracking issue ----

const SUB = '[submodule "back"]\n\tpath = back\n\turl = git@github.com:acme/back.git\n';
const bash = (command: string, cwd?: string) => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, ...(cwd ? { cwd } : {}) });
const mcp = (tool_input: Record<string, unknown>) => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'mcp__github__create_pull_request', tool_input });
const prProject = (extra: Record<string, string> = {}) => project({ ...SPECS, '.gitmodules': SUB, ...extra });
/** Issue #1 belongs to 001-a, #2 to 003-c; 002-b has none. */
const tracked = (calls: string[] = []) => github({ '001-a': ['specify'], '003-c': [] }, calls);
const CREATE = 'gh pr create --head feat/001-a --title x';

describe('creating a PR (specs/005 R4, FR-008)', () => {
  it('blocks gh pr create without a link, and names both lines', async () => {
    const r = await run(bash(`${CREATE} --body "Adds login"`), deps(prProject(), tracked()));
    expect(r.code).toBe(2);
    expect(r.stderr).toBe('Add "Closes #1" (or "Part of #1" if more PRs follow) to the PR description for 001-a (tracking issue https://github.com/acme/alpha/issues/1), then create the PR again.');
  });
  it('lets it through with Closes (the last PR) or Part of (an earlier PR)', async () => {
    for (const body of ['Adds login\n\nCloses #1', 'Fixes #1', 'Adds login\n\nPart of #1', 'Closes acme/alpha#1']) {
      expect(await run(bash(`${CREATE} --body "${body}"`), deps(prProject(), tracked()))).toEqual({ code: 0 });
    }
  });
  it('reads --body, -b, --body=… and a heredoc substitution', async () => {
    const r = deps(prProject(), tracked());
    expect((await run(bash(`${CREATE} -b "x"`), r)).code).toBe(2);
    expect((await run(bash(`${CREATE} --body="Closes #1"`), r)).code).toBe(0);
    expect((await run(bash(`${CREATE} -b 'Closes #1'`), r)).code).toBe(0);
    const heredoc = (line: string) => `${CREATE} --body "$(cat <<'EOF'\nSummary\n\n${line}\nEOF\n)"`;
    expect((await run(bash(heredoc('Closes #1')), r)).code).toBe(0);
    expect((await run(bash(heredoc('nothing')), r)).code).toBe(2);
  });
  it('reads --body-file from the project folder, with and without the line', async () => {
    const root = prProject({ 'good.md': 'Closes #1\n', 'bad.md': 'No link\n' });
    expect((await run(bash(`${CREATE} --body-file good.md`), deps(root, tracked()))).code).toBe(0);
    expect((await run(bash(`${CREATE} -F bad.md`), deps(root, tracked()))).code).toBe(2);
    const missing = await run(bash(`${CREATE} --body-file nope.md`), deps(root, tracked()));
    expect(missing.code).toBe(2);
    expect(missing.stderr).toContain('Could not read the PR description');
  });
  it('checks gh api …/pulls in its -f / -F / --method POST forms', async () => {
    const root = prProject({ 'good.md': 'Closes #1', 'bad.md': 'x' });
    const api = (rest: string) => `gh api repos/acme/alpha/pulls ${rest}`;
    expect((await run(bash(api('-f head=feat/001-a -f title=x -f body="Adds login"')), deps(root, tracked()))).code).toBe(2);
    expect((await run(bash(api('-f head=feat/001-a -f title=x -f body="Closes #1"')), deps(root, tracked()))).code).toBe(0);
    expect((await run(bash(api('-f head=feat/001-a -F body=@good.md')), deps(root, tracked()))).code).toBe(0);
    expect((await run(bash(api('-f head=feat/001-a -F body=@bad.md')), deps(root, tracked()))).code).toBe(2);
    expect((await run(bash(api('--method POST --raw-field head=feat/001-a --raw-field body=x')), deps(root, tracked()))).code).toBe(2);
    expect((await run(bash(api('-X POST -f head=feat/001-a -f body=x')), deps(root, tracked()))).code).toBe(2);
    // Reading the list of PRs is not creating one.
    expect(await run(bash('gh api repos/acme/alpha/pulls --method GET'), deps(root, tracked()))).toEqual({ code: 0 });
    expect(await run(bash('gh api repos/acme/alpha/pulls'), deps(root, tracked()))).toEqual({ code: 0 });
  });
  it('checks the GitHub MCP create_pull_request tool', async () => {
    const root = prProject();
    const input = (body: string) => mcp({ owner: 'acme', repo: 'alpha', head: 'feat/001-a', base: 'main', title: 'x', body });
    expect((await run(input('Adds login'), deps(root, tracked()))).code).toBe(2);
    expect((await run(input('Closes #1'), deps(root, tracked()))).code).toBe(0);
    expect((await run(mcp({ owner: 'acme', repo: 'alpha', head: 'feat/001-a', title: 'x' }), deps(root, tracked()))).code).toBe(2);
  });
  it('finds the spec from the current branch when there is no --head, and from the description (R4)', async () => {
    const r = (branch: string) => deps(prProject(), tracked(), {}, branch);
    expect((await run(bash('gh pr create --title x --body "Adds login"'), r('feat/001-a'))).code).toBe(2);
    expect((await run(bash('gh pr create --title x --body "Adds login\n\nspecs/001-a"'), r('main'))).code).toBe(2);
    expect(await run(bash('gh pr create --title x --body "Adds login"'), r('main'))).toEqual({ code: 0 });
  });
  it('falls back to symbolic-ref when rev-parse has no HEAD yet (a repo without commits)', async () => {
    const noCommits: Deps = { ...deps(prProject(), tracked()), git: args => (args[0] === 'remote' ? 'git@github.com:acme/alpha.git' : args[0] === 'symbolic-ref' ? 'feat/001-a' : null) };
    expect((await run(bash('gh pr create --title x --body "Adds login"'), noCommits)).code).toBe(2);
  });
  it('treats --fill and a missing body as an empty description', async () => {
    const r = deps(prProject(), tracked());
    expect((await run(bash(`${CREATE} --fill`), r)).code).toBe(2);
    expect((await run(bash(CREATE), r)).code).toBe(2);
  });
  it('finds a spec that exists only on the checked-out feat/ branch (FR-007)', async () => {
    const root = project({ 'specs/004-only-here/spec.md': READY_SPEC('Only here'), '.gitmodules': SUB });
    const gh = github({ '004-only-here': ['specify'] });
    const r = await run(bash('gh pr create --title x --body "Adds"'), deps(root, gh, {}, 'feat/004-only-here'));
    expect(r.code).toBe(2);
    expect(r.stderr).toContain('004-only-here');
  });
  it('a PR in a submodule repo needs a cross-repo line, and Closes would close the issue too early', async () => {
    const root = prProject();
    const sub = (body: string) => run(bash(`gh pr create --repo acme/back --head feat/001-a --title x --body "${body}"`), deps(root, tracked()));
    expect((await sub('Part of acme/alpha#1')).code).toBe(0);
    const early = await sub('Closes acme/alpha#1');
    expect(early.code).toBe(2);
    expect(early.stderr).toContain('Part of acme/alpha#1');
    const bare = await sub('Part of #1');   // "#1" would mean issue 1 of acme/back
    expect(bare.code).toBe(2);
    expect(bare.stderr).toContain('Part of acme/alpha#1');
  });
  it('lets a spec without a tracking issue through, with a reminder (FR-002)', async () => {
    const r = await run(bash('gh pr create --head feat/002-b --title x --body "Adds"'), deps(prProject(), tracked()));
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout!).hookSpecificOutput).toMatchObject({
      hookEventName: 'PreToolUse', permissionDecision: 'allow',
      permissionDecisionReason: 'No tracking issue for 002-b yet, so this PR isn\'t linked. Approve Specify in speckit-ui to create it.'
    });
  });
  it('a PR for two specs needs a line for each', async () => {
    const g = github({ '001-a': ['specify'], '003-c': [] });
    const both = await run(bash('gh pr create --head feat/001-a --title x --body "also specs/003-c"'), deps(project({ ...SPECS, 'specs/003-c/spec.md': READY_SPEC('C'), '.gitmodules': SUB }), g));
    expect(both.code).toBe(2);
    expect(both.stderr).toContain('001-a');
    const ok = await run(bash('gh pr create --head feat/001-a --title x --body "also specs/003-c\n\nCloses #1\nCloses #2"'), deps(project({ ...SPECS, 'specs/003-c/spec.md': READY_SPEC('C'), '.gitmodules': SUB }), g));
    expect(ok.code).toBe(0);
  });
  it('stops when the description cannot be read from the command', async () => {
    const r = await run(bash(`${CREATE} --body "$BODY"`), deps(prProject(), tracked()));
    expect(r).toMatchObject({ code: 2, stderr: 'Could not read the PR description from this command. Put it in a file and pass --body-file (gh pr create) or -F body=@file (gh api).' });
  });
  it('stops when GitHub cannot be reached, unless bypassed on purpose', async () => {
    const down: Deps['github'] = async () => { throw new Error('gh api failed: network down'); };
    const r = await run(bash(`${CREATE} --body x`), deps(prProject(), down));
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/SPECKIT_GATE_BYPASS/);
    const bypass = await run(bash(`${CREATE} --body x`), deps(prProject(), down, { SPECKIT_GATE_BYPASS: 'offline' }));
    expect(bypass.code).toBe(0);
    expect(JSON.parse(bypass.stdout!).hookSpecificOutput.permissionDecisionReason).toContain('offline');
  });
  it('is switched off with prLinks "off", but not by approvalGates "off"', async () => {
    const off = prProject({ '.specify/speckit-ui.json': '{"prLinks":"off"}' });
    expect(await run(bash(`${CREATE} --body x`), deps(off, tracked()))).toEqual({ code: 0 });
    const gatesOff = prProject({ '.specify/speckit-ui.json': '{"approvalGates":"off"}' });
    expect((await run(bash(`${CREATE} --body x`), deps(gatesOff, tracked()))).code).toBe(2);
  });
  it('passes what is not about a spec of this project', async () => {
    const r = deps(prProject(), tracked());
    expect(await run(bash('gh pr create --head feat/999-none --title x --body "Adds"'), r)).toEqual({ code: 0 });
    expect(await run(bash('gh pr create --repo other/place --head feat/001-a --title x --body "Adds"'), r)).toEqual({ code: 0 });
    expect(await run(bash(`${CREATE} --repo other/place --body x`), r)).toEqual({ code: 0 });
  });
  it('leaves every other command at once, without reading the config or asking GitHub', async () => {
    const calls: string[] = [];
    const root = prProject();
    for (const c of ['gh pr list', 'gh pr view 3', 'git push -u origin feat/001-a', 'npm test', 'ls -la', 'gh issue create --body x', 'echo gh pr create']) {
      expect(await run(bash(c), deps(root, tracked(calls)))).toEqual({ code: 0 });
    }
    expect(calls).toEqual([]);
    // A broken config would throw if it were read; the hook must not even look at it.
    const broken = prProject({ '.specify/speckit-ui.json': '{not json' });
    expect(await run(bash('npm test'), deps(broken, tracked(calls)))).toEqual({ code: 0 });
  });
  it('finds the repo from cd <dir> && …', async () => {
    const root = prProject();
    const r = await run(bash(`cd ${root} && gh pr create --head feat/001-a --title x --body "Adds"`), deps(root, tracked()));
    expect(r.code).toBe(2);
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
