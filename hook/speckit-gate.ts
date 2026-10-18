// The Claude Code gate check (specs/004 US2). Built into dist/speckit-gate.mjs and installed by
// users in their project repo as .claude/hooks/speckit-gate.mjs. It stops /speckit-clarify …
// /speckit-implement before they run when an earlier gate of the spec is not approved, using the
// same lock rule as speckit-ui (blockingGates). It also stops a PR for a spec from being created
// without a line that links the spec's tracking issue (specs/005). It only reads: local files and the tracking issue.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import { buildFeature } from '../server/github.ts';
import { parseGitmodules, parseUiConfig } from '../server/parse.ts';
import { GATE_HOOK_FILE, GATE_HOOK_PATH, GATE_NAME, PR_HOOK_MATCHER, blockingGates, linkKind, parseIssueBody } from '../src/project/gates.ts';
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
  /** `git <args>` in `cwd` (default: root); null when it fails. */
  git: (args: string[], cwd?: string) => string | null;
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
  // Anything that is not a PR being created leaves here at once: most Bash commands pass through this hook.
  const pr = readPrRequest(input, deps);
  if (pr) return checkPr(pr, deps);
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

// ---- Creating a PR (specs/005 R4) ----

/** A PR about to be created. `body` is null when it cannot be read from the command. */
export interface PrRequest { repo: string | null; head: string | null; body: string | null; dir: string }

interface Tok { text: string; op: boolean; dyn: boolean }

/** Shell words, with quotes resolved and `$(cat <<EOF …)` bodies kept; `dyn` marks text we cannot know (variables, other substitutions). */
function tokenize(cmd: string): Tok[] {
  const out: Tok[] = [];
  let cur = '', has = false, dyn = false, i = 0;
  const flush = () => { if (has) out.push({ text: cur, op: false, dyn }); cur = ''; has = false; dyn = false; };
  const substitution = () => {
    const here = /^\$\(\s*cat\s+<<-?\s*(['"]?)(\w+)\1[^\n]*\n/.exec(cmd.slice(i));
    if (here) {
      const start = i + here[0].length;
      const end = cmd.indexOf(`\n${here[2]}`, start - 1);
      if (end >= 0) {
        cur += cmd.slice(start, end);
        const close = cmd.indexOf(')', end + here[2].length + 1);
        i = close < 0 ? cmd.length : close + 1;
        return;
      }
    }
    // Any other substitution: skip to its matching parenthesis and remember we don't know the text.
    let depth = 0;
    for (; i < cmd.length; i++) { if (cmd[i] === '(') depth++; else if (cmd[i] === ')' && --depth === 0) { i++; break; } }
    dyn = true;
  };
  while (i < cmd.length) {
    const c = cmd[i];
    if (c === "'") { const j = cmd.indexOf("'", i + 1); const end = j < 0 ? cmd.length : j; cur += cmd.slice(i + 1, end); has = true; i = end + 1; continue; }
    if (c === '"') {
      has = true; i++;
      while (i < cmd.length && cmd[i] !== '"') {
        if (cmd[i] === '\\' && i + 1 < cmd.length && '"\\$`\n'.includes(cmd[i + 1])) { cur += cmd[i + 1]; i += 2; }
        else if (cmd.startsWith('$(', i)) { substitution(); }
        else if (cmd[i] === '$' && /[\w{]/.test(cmd[i + 1] ?? '')) { dyn = true; i++; }
        else cur += cmd[i++];
      }
      i++;
      continue;
    }
    if (c === '\\' && i + 1 < cmd.length) { cur += cmd[i + 1]; has = true; i += 2; continue; }
    if (cmd.startsWith('$(', i)) { has = true; substitution(); continue; }
    if (c === '$' && /[\w{]/.test(cmd[i + 1] ?? '')) { dyn = true; has = true; cur += c; i++; continue; }
    if (/\s/.test(c) && c !== '\n') { flush(); i++; continue; }
    const op = /^(&&|\|\||;|\||\n)/.exec(cmd.slice(i));
    if (op) { flush(); out.push({ text: op[1], op: true, dyn: false }); i += op[1].length; continue; }
    cur += c; has = true; i++;
  }
  flush();
  return out;
}

const PR_VALUE_FLAGS = new Set(['--body', '-b', '--body-file', '-F', '--repo', '-R', '--head', '-H', '--title', '-t', '--base', '-B', '--assignee', '-a', '--label', '-l', '--milestone', '-m', '--project', '-p', '--reviewer', '-r', '--template', '-T']);
const API_VALUE_FLAGS = new Set(['-X', '--method', '-f', '--raw-field', '-F', '--field', '-H', '--header', '--input', '--jq', '-q', '--template', '-t', '--hostname', '--cache', '-p', '--preview']);

/** Flags and positionals of one command; `--flag=value` and `-fvalue` count as `--flag value`. */
function flags(args: Tok[], withValue: Set<string>) {
  const list: { flag: string; value: Tok | null }[] = [];
  const rest: Tok[] = [];
  for (let k = 0; k < args.length; k++) {
    const t = args[k];
    const eq = /^(--[\w-]+)=([\s\S]*)$/.exec(t.text);
    if (eq) { list.push({ flag: eq[1], value: { ...t, text: eq[2] } }); continue; }
    if (t.text.startsWith('-') && t.text.length > 1) {
      if (withValue.has(t.text)) { list.push({ flag: t.text, value: args[k + 1] ?? null }); k++; }
      else if (/^-[a-zA-Z]./.test(t.text) && withValue.has(t.text.slice(0, 2))) list.push({ flag: t.text.slice(0, 2), value: { ...t, text: t.text.slice(2) } });
      else list.push({ flag: t.text, value: null });
    } else rest.push(t);
  }
  return { list, rest };
}

/** The PR a Bash command or the GitHub MCP tool is about to create, or null for anything else (R4). */
export function readPrRequest(input: Record<string, unknown>, deps: Pick<Deps, 'root' | 'git'>): PrRequest | null {
  const ti = (input.tool_input ?? {}) as Record<string, unknown>;
  const base = typeof input.cwd === 'string' && input.cwd ? input.cwd : deps.root;
  const headOf = (h: unknown, dir: string) => (typeof h === 'string' && h ? h.replace(/^[^:]+:/, '') : deps.git(['rev-parse', '--abbrev-ref', 'HEAD'], dir));
  if (typeof input.tool_name === 'string' && /^mcp__.*__create_pull_request$/.test(input.tool_name)) {
    const repo = typeof ti.owner === 'string' && typeof ti.repo === 'string' ? `${ti.owner}/${ti.repo}` : null;
    return { repo, head: headOf(ti.head, base), body: typeof ti.body === 'string' ? ti.body : '', dir: base };
  }
  if (input.tool_name !== 'Bash' || typeof ti.command !== 'string' || !/\bgh\b/.test(ti.command)) return null;
  const readFile = (name: string, dir: string) => read(isAbsolute(name) ? name : join(dir, name)) ?? read(join(deps.root, name));

  let dir = base;
  const segments: Tok[][] = [[]];
  for (const t of tokenize(ti.command)) { if (t.op) segments.push([]); else segments.at(-1)!.push(t); }
  for (const seg of segments) {
    const words = [...seg];
    while (words.length && /^[A-Za-z_]\w*=/.test(words[0].text)) words.shift();
    if (words[0]?.text === 'cd' && words[1]) { dir = isAbsolute(words[1].text) ? words[1].text : join(dir, words[1].text); continue; }
    if (words[0]?.text !== 'gh') continue;
    if (words[1]?.text === 'pr' && words[2]?.text === 'create') {
      const { list } = flags(words.slice(3), PR_VALUE_FLAGS);
      const get = (...names: string[]) => list.find(f => names.includes(f.flag))?.value ?? null;
      const bodyFlag = get('--body', '-b'), fileFlag = get('--body-file', '-F');
      let body: string | null = '';
      if (bodyFlag) body = bodyFlag.dyn ? null : bodyFlag.text;
      else if (fileFlag) body = fileFlag.dyn || fileFlag.text === '-' ? null : readFile(fileFlag.text, dir);
      return { repo: get('--repo', '-R')?.text ?? null, head: headOf(get('--head', '-H')?.text, dir), body, dir };
    }
    if (words[1]?.text === 'api') {
      const { list, rest } = flags(words.slice(2), API_VALUE_FLAGS);
      const m = /^\/?repos\/([^/]+)\/([^/]+)\/pulls\/?$/.exec(rest[0]?.text ?? '');
      if (!m) continue;
      const method = list.find(f => f.flag === '-X' || f.flag === '--method')?.value?.text.toUpperCase();
      const fields = list.filter(f => ['-f', '--raw-field', '-F', '--field'].includes(f.flag) && f.value);
      if (method ? method !== 'POST' : !fields.length) continue;
      const field = (key: string) => {
        const f = fields.find(x => x.value!.text.startsWith(`${key}=`));
        if (!f) return undefined;
        const v = f.value!.text.slice(key.length + 1);
        if (f.value!.dyn) return null;
        if ((f.flag === '-F' || f.flag === '--field') && v.startsWith('@')) return v === '@-' ? null : readFile(v.slice(1), dir);
        return v;
      };
      const body = list.some(f => f.flag === '--input') ? null : (field('body') ?? (fields.some(x => x.value!.text.startsWith('body=')) ? null : ''));
      return { repo: `${m[1]}/${m[2]}`, head: headOf(field('head') ?? undefined, dir), body, dir };
    }
  }
  return null;
}

const lower = (x: string | null) => x?.toLowerCase() ?? null;

/** Let a PR be created, and leave the reason in the session (PreToolUse `allow`). */
const allowTool = (reason: string): Outcome => ({ code: 0, stdout: JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', permissionDecisionReason: reason } }) });

/** Decide one PR creation: every spec it is for needs a line that links the spec's tracking issue. */
async function checkPr(pr: PrRequest, deps: Deps): Promise<Outcome> {
  if (parseUiConfig(read(join(deps.root, '.specify', 'speckit-ui.json'))).prLinks === 'off') return { code: 0 };
  const specsDir = join(deps.root, 'specs');
  const dirs = isDir(specsDir) ? readdirSync(specsDir).filter(d => /^\d{3,}-/.test(d) && isDir(join(specsDir, d))) : [];
  const slugs = dirs.filter(d => pr.head?.includes(d) || (pr.body !== null && pr.body.includes(`specs/${d}`)));
  if (!slugs.length) return { code: 0 };

  const rootRepo = repoOf(deps.git(['remote', 'get-url', 'origin']));
  const prRepo = pr.repo ?? repoOf(deps.git(['remote', 'get-url', 'origin'], pr.dir)) ?? rootRepo;
  const submodules = parseGitmodules(read(join(deps.root, '.gitmodules')) ?? '').flatMap(m => (m.repo ? [lower(m.repo)] : []));
  // A repo that is neither this project's nor one of its submodules is not ours to check.
  if (rootRepo && lower(prRepo) !== lower(rootRepo) && !submodules.includes(lower(prRepo))) return { code: 0 };
  const inRoot = !rootRepo || lower(prRepo) === lower(rootRepo);

  const found: { slug: string; issue: GateIssue | null }[] = [];
  try { for (const slug of slugs) found.push({ slug, issue: await trackingIssue(deps, slug) }); }
  catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    const bypass = deps.env.SPECKIT_GATE_BYPASS?.trim();
    if (bypass) return allowTool(`PR link check bypassed for ${slugs.join(', ')}: ${bypass} (could not check: ${why}).`);
    return { code: 2, stderr: `Could not check the tracking issue for ${slugs.join(', ')}: ${why}. To create the PR anyway, set SPECKIT_GATE_BYPASS="<why>" and try again.` };
  }

  const withIssue = found.flatMap(f => (f.issue ? [{ slug: f.slug, issue: f.issue }] : []));
  const without = found.filter(f => !f.issue).map(f => f.slug);
  const problems: string[] = [];
  if (withIssue.length && pr.body === null) {
    return { code: 2, stderr: 'Could not read the PR description from this command. Put it in a file and pass --body-file (gh pr create) or -F body=@file (gh api).' };
  }
  for (const { slug, issue } of withIssue) {
    const kind = linkKind(pr.body, issue.number, rootRepo!, prRepo!);
    if (inRoot ? kind !== 'none' : kind === 'mentions') continue;
    const line = inRoot ? `"Closes #${issue.number}" (or "Part of #${issue.number}" if more PRs follow)` : `"Part of ${rootRepo}#${issue.number}"`;
    problems.push(`Add ${line} to the PR description for ${slug} (tracking issue ${issue.url}), then create the PR again.`);
  }
  if (problems.length) return { code: 2, stderr: problems.join('\n') };
  if (without.length) return allowTool(without.map(s => `No tracking issue for ${s} yet, so this PR isn't linked. Approve Specify in speckit-ui to create it.`).join(' '));
  return { code: 0 };
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

/** Add the three hooks to .claude/settings.json, keeping everything else; running it again adds only what is missing. */
export function install(root: string): string {
  const file = join(root, '.claude', 'settings.json');
  const raw = read(file);
  let s: Settings;
  try { s = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`${file} is not valid JSON; fix it and run install again.`); }
  s.hooks ??= {};
  const runs = (g: { hooks?: { command?: string }[] }) => (g.hooks ?? []).some(h => (h.command ?? '').includes(GATE_HOOK_FILE));
  const has = (event: string, matcher?: string) => (s.hooks![event] ?? []).some(g => runs(g) && (matcher === undefined || g.matcher === matcher));
  const added: string[] = [];
  if (!has('UserPromptSubmit')) { (s.hooks.UserPromptSubmit ??= []).push({ hooks: [entry()] }); added.push('UserPromptSubmit'); }
  if (!has('PreToolUse', 'Skill')) { (s.hooks.PreToolUse ??= []).push({ matcher: 'Skill', hooks: [entry()] }); added.push('PreToolUse (Skill)'); }
  // The PR hook arrived with spec 005: a gate check from spec 004 is upgraded by adding just this one.
  if (!has('PreToolUse', PR_HOOK_MATCHER)) { (s.hooks.PreToolUse ??= []).push({ matcher: PR_HOOK_MATCHER, hooks: [entry()] }); added.push('PreToolUse (pull requests)'); }
  if (!added.length) return `${file} already runs the gate check.`;
  mkdirSync(join(root, '.claude'), { recursive: true });
  writeFileSync(file, JSON.stringify(s, null, 2) + '\n');
  return `Added ${added.length > 1 ? `${added.slice(0, -1).join(', ')} and ${added.at(-1)}` : added[0]} to ${file}. Commit .claude/ so everyone working on the repo gets it.`;
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
  return { root, env, git: (args, dir) => run_('git', args, dir ?? root), github: nodeGithub(env, root) };
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

