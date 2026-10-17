// The Claude Code gate check (specs/004 US2). Built into dist/speckit-gate.mjs and installed by
// users in their project repo as .claude/hooks/speckit-gate.mjs. It stops /speckit-clarify …
// /speckit-implement before they run when an earlier gate of the spec is not approved, using the
// same lock rule as speckit-ui (blockingGates). It only reads: local files and the tracking issue.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { buildFeature } from '../server/github.ts';
import { parseUiConfig } from '../server/parse.ts';
import { GATE_HOOK_FILE, GATE_HOOK_PATH, GATE_NAME, blockingGates, parseIssueBody } from '../src/project/gates.ts';
import { phaseStatus } from '../src/project/status.ts';
import type { GateIssue, Project } from '../src/project/types.ts';

/** Gated commands and their step (index in PHASES): Clarify … Implement (R3). */
const GATED: Record<string, number> = { clarify: 2, plan: 3, tasks: 4, analyze: 5, implement: 6 };
const COMMAND = /^\/?(?:[\w-]+:)?speckit[-.](clarify|plan|tasks|analyze|implement)(?=\s|$)\s*(.*)$/s;

export interface Outcome { code: 0 | 2; stdout?: string; stderr?: string }

export interface GhResult { status: number; body: string }

export interface Deps {
  /** Project root: CLAUDE_PROJECT_DIR, else the hook's cwd. */
  root: string;
  env: Record<string, string | undefined>;
  /** `git <args>` in root; null when it fails. */
  git: (args: string[]) => string | null;
  /** GET a GitHub REST path. Throws when GitHub can't be reached or no credentials exist. */
  github: (path: string) => Promise<GhResult>;
}

interface Target { step: number; command: string; args: string; event: 'prompt' | 'tool' }

/** Which gated command this hook input is, if any. */
export function readTarget(input: Record<string, unknown>): Target | null {
  if (input.hook_event_name === 'PreToolUse' || input.tool_name !== undefined) {
    if (input.tool_name !== 'Skill') return null;
    const ti = (input.tool_input ?? {}) as Record<string, unknown>;
    // The docs don't name the Skill tool's fields; try the likely ones (R2).
    const name = [ti.skill, ti.name, ti.command].find(x => typeof x === 'string') as string | undefined;
    const args = [ti.args, ti.arguments].find(x => typeof x === 'string') as string | undefined;
    const m = name?.trim().match(COMMAND);
    return m ? { step: GATED[m[1]], command: m[1], args: (args ?? m[2] ?? '').trim(), event: 'tool' } : null;
  }
  const m = typeof input.prompt === 'string' ? input.prompt.trim().match(COMMAND) : null;
  return m && m[0].startsWith('/') ? { step: GATED[m[1]], command: m[1], args: m[2].trim(), event: 'prompt' } : null;
}

const read = (p: string) => { try { return readFileSync(p, 'utf8'); } catch { return null; } };
const isDir = (p: string) => { try { return statSync(p).isDirectory(); } catch { return false; } };

/** The spec folder the command is for: argument, SPECIFY_FEATURE, .specify/feature.json, then the branch (R4). */
export function resolveSpec(root: string, args: string, env: Deps['env'], git: Deps['git']): string | null {
  const dir = join(root, 'specs');
  const dirs = isDir(dir) ? readdirSync(dir).filter(d => /^\d{3,}-/.test(d) && isDir(join(dir, d))) : [];
  const match = (s: string | null | undefined) => {
    if (!s) return null;
    const name = s.trim().replace(/\/+$/, '').split('/').pop()!;
    return dirs.find(d => d === name) ?? (/^\d{3,}$/.test(name) ? dirs.find(d => d.startsWith(name + '-')) : null) ?? dirs.find(d => name.endsWith(d)) ?? null;
  };
  const first = args.split(/\s+/)[0];
  if (/^\d{3,}(-[\w.-]+)?$/.test(first)) { const m = match(first); if (m) return m; }
  const fromEnv = match(env.SPECIFY_FEATURE);
  if (fromEnv) return fromEnv;
  try {
    const fd = JSON.parse(read(join(root, '.specify', 'feature.json')) || '{}').feature_directory;
    const m = typeof fd === 'string' ? match(fd) : null;
    if (m) return m;
  } catch { /* no feature.json */ }
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const b = branch?.match(/(\d{3,}-[\w.-]+)$/)?.[1];
  return match(b);
}

/** Every file under specs/<slug>/, relative to it, with / separators. */
function filesIn(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (isDir(p)) walk(p); else out.push(relative(dir, p).split(sep).join('/'));
    }
  };
  walk(dir);
  return out;
}

const repoOf = (url: string | null) => url?.trim().match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)?.slice(1, 3).join('/') ?? null;

class CantCheck extends Error {}

async function trackingIssue(deps: Deps, slug: string): Promise<GateIssue | null> {
  const repo = repoOf(deps.git(['remote', 'get-url', 'origin']));
  if (!repo) throw new CantCheck('this repository has no GitHub remote named origin');
  let r: GhResult;
  try { r = await deps.github(`/repos/${repo}/issues?state=all&labels=speckit&per_page=100`); }
  catch (e) { throw new CantCheck(e instanceof Error ? e.message : String(e)); }
  if (r.status !== 200) throw new CantCheck(`GitHub answered ${r.status} for ${repo} issues`);
  const items = JSON.parse(r.body) as { number: number; html_url: string; state: 'open' | 'closed'; body: string | null; pull_request?: unknown }[];
  for (const i of items) {
    if (i.pull_request) continue;
    const parsed = parseIssueBody(i.body || '');
    if (parsed?.slug === slug) return { number: i.number, url: i.html_url, state: i.state, gates: parsed.gates, updatedAt: null };
  }
  return null;
}

/** Decide one hook input. Pure apart from reading files and GitHub through `deps`. */
export async function run(inputText: string, deps: Deps): Promise<Outcome> {
  let input: Record<string, unknown>;
  try { input = JSON.parse(inputText || '{}'); } catch { return { code: 0 }; }
  const target = readTarget(input);
  if (!target) return { code: 0 };
  const cfg = parseUiConfig(read(join(deps.root, '.specify', 'speckit-ui.json')));
  if (cfg.approvalGates === 'off') return { code: 0 };
  const slug = resolveSpec(deps.root, target.args, deps.env, deps.git);
  if (!slug) return { code: 0 };

  const dir = join(deps.root, 'specs', slug);
  const f = buildFeature(slug, filesIn(dir), x => read(join(dir, x)), '');
  const constitution = read(join(deps.root, '.specify', 'memory', 'constitution.md'));
  const status = phaseStatus({ constitution: constitution ? ({} as Project['constitution']) : null }, f);
  // Nothing before this step ran unapproved: no need to ask GitHub.
  if (!status.slice(1, target.step).some(s => s === 'done')) return { code: 0 };

  const cmd = `/speckit-${target.command}`;
  let issue: GateIssue | null;
  try {
    issue = await trackingIssue(deps, slug);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    const bypass = deps.env.SPECKIT_GATE_BYPASS?.trim();
    if (bypass) return allow(target, `Approval gate check bypassed for ${slug}: ${bypass} (could not check: ${why}).`);
    return { code: 2, stderr: `Could not check approvals for ${slug}: ${why}. To run ${cmd} anyway, set SPECKIT_GATE_BYPASS="<why>" and try again.` };
  }
  const k = blockingGates(status, issue, cfg.approvalGates)[target.step];
  if (!k) return { code: 0 };
  return { code: 2, stderr: `Approve ${GATE_NAME[k]} for ${slug} before running ${cmd}. ${issue ? `Tracking issue: ${issue.url}` : 'Approve it in speckit-ui.'}` };
}

/** Let the command run, and leave the reason in the session on both paths (FR-008). */
function allow(target: Target, reason: string): Outcome {
  if (target.event === 'tool') {
    return { code: 0, stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: reason } }) };
  }
  return { code: 0, stdout: reason };
}

// ---- install ----

const HOOK_COMMAND = `command -v node >/dev/null || { echo 'speckit gate: node not found' >&2; exit 2; }; node "$CLAUDE_PROJECT_DIR/${GATE_HOOK_PATH}"`;
const entry = () => ({ type: 'command', timeout: 30, command: HOOK_COMMAND });

type Settings = { hooks?: Record<string, { matcher?: string; hooks?: { command?: string }[] }[]> } & Record<string, unknown>;

/** Add the two hooks to .claude/settings.json, keeping everything else; running it twice adds nothing. */
export function install(root: string): string {
  const file = join(root, '.claude', 'settings.json');
  const raw = read(file);
  let s: Settings;
  try { s = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`${file} is not valid JSON; fix it and run install again.`); }
  s.hooks ??= {};
  const has = (event: string) => (s.hooks![event] ?? []).some(g => (g.hooks ?? []).some(h => (h.command ?? '').includes(GATE_HOOK_FILE)));
  const added: string[] = [];
  if (!has('UserPromptSubmit')) { (s.hooks.UserPromptSubmit ??= []).push({ hooks: [entry()] }); added.push('UserPromptSubmit'); }
  if (!has('PreToolUse')) { (s.hooks.PreToolUse ??= []).push({ matcher: 'Skill', hooks: [entry()] }); added.push('PreToolUse (Skill)'); }
  if (!added.length) return `${file} already runs the gate check.`;
  mkdirSync(join(root, '.claude'), { recursive: true });
  writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
  return `Added ${added.join(' and ')} to ${file}. Commit .claude/ so everyone working on the repo gets it.`;
}

// ---- Node entry ----

const run_ = (cmd: string, args: string[], cwd: string) => {
  try { return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20_000 }).trim(); } catch { return null; }
};

/** gh first (it carries the session's or the user's login), else a token from the environment (R5). */
export function nodeGithub(env: Deps['env'], cwd: string): Deps['github'] {
  return async path => {
    if (run_('gh', ['--version'], cwd) !== null) {
      try {
        const body = execFileSync('gh', ['api', path.replace(/^\//, '')], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20_000 });
        return { status: 200, body };
      } catch (e) {
        const err = String((e as { stderr?: string }).stderr ?? e);
        const status = Number(err.match(/HTTP (\d{3})/)?.[1]);
        if (status) return { status, body: '' };
        throw new Error(`gh api failed: ${err.split('\n')[0].slice(0, 200)}`);
      }
    }
    const token = env.GH_TOKEN || env.GITHUB_TOKEN;
    if (!token) throw new Error('no GitHub access: install and log in to gh, or set GH_TOKEN');
    const res = await fetch(`https://api.github.com${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20_000) });
    return { status: res.status, body: await res.text() };
  };
}

export function nodeDeps(env: Deps['env'], cwd: string): Deps {
  const root = env.CLAUDE_PROJECT_DIR || cwd;
  return { root, env, git: args => run_('git', args, root), github: nodeGithub(env, root) };
}

async function main(argv: string[]): Promise<Outcome> {
  const env = process.env;
  const cwd = process.cwd();
  if (argv[0] === '--version') return { code: 0, stdout: `speckit-gate ${__BUILD__}` };
  if (argv[0] === 'install') return { code: 0, stdout: install(env.CLAUDE_PROJECT_DIR || cwd) };
  if (argv[0] === 'check') {
    const [spec = '', step = 'plan'] = argv.slice(1);
    const r = await run(JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: `/speckit-${step} ${spec}` }), nodeDeps(env, cwd));
    return { code: r.code, stdout: r.code === 0 ? r.stdout ?? `/speckit-${step} ${spec}: allowed.` : undefined, stderr: r.stderr };
  }
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const ti = JSON.parse(input || '{}') as { cwd?: string };
  return run(input, nodeDeps(env, ti.cwd || cwd));
}

const isMain = typeof process !== 'undefined' && process.argv[1] && /speckit-gate\.(mjs|ts)$/.test(process.argv[1]);
if (isMain) {
  main(process.argv.slice(2)).then(
    r => { if (r.stdout) process.stdout.write(r.stdout + '\n'); if (r.stderr) process.stderr.write(r.stderr + '\n'); process.exitCode = r.code; },
    // Any failure blocks: a hook that exits with another code lets the command run (R2).
    e => { process.stderr.write(`speckit gate: ${e instanceof Error ? e.message : e}\n`); process.exitCode = 2; });
}

