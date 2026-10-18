// Gate checks and the tracking-issue format. Shared by the browser and the server,
// so this module has no runtime imports besides ./types.ts.
import { GATE_KEYS, type GateApproval, type GateIssue, type GateKey, type SpecFeature, type SpecPR, type Tracking } from './types.ts';

export const GATE_NAME: Record<GateKey, string> = {
  specify: 'Specify', clarify: 'Clarify', plan: 'Plan', tasks: 'Tasks', analyze: 'Analyze', implement: 'Implement'
};

export interface Check {
  label: string;
  ok: boolean;
  /** A failing required check blocks approval. */
  required: boolean;
}

export const canApprove = (checks: Check[]) => checks.every(c => c.ok || !c.required);

const req = (label: string, ok: boolean): Check => ({ label, ok, required: true });
const warn = (label: string, ok: boolean): Check => ({ label, ok, required: false });

/** What must be true before a gate can be approved, evaluated from the spec's files and its PRs. */
export function gateChecks(f: SpecFeature, gate: GateKey, prs: SpecPR[] = [], tracking?: Pick<Tracking, 'repos'> & Partial<Pick<Tracking, 'issues'>>): Check[] {
  const s = f.spec;
  const tasks = (f.tasks || []).flatMap(p => p.tasks);
  switch (gate) {
    case 'specify': {
      if (!s) return [req('spec.md exists', false)];
      const reqList = f.checklists.find(c => c.name === 'requirements.md');
      return [
        req('spec.md exists', true),
        req('Every user story has acceptance scenarios', s.stories.length > 0 && s.stories.every(u => u.ac.length > 0)),
        req('Functional requirements listed', s.frs.length > 0),
        req('Success criteria listed', s.sc.length > 0),
        reqList ? req(`checklists/requirements.md complete (${reqList.done}/${reqList.total})`, reqList.done === reqList.total) : warn('checklists/requirements.md exists', false),
        warn(s.needsClarification ? `${s.needsClarification} [NEEDS CLARIFICATION] markers (resolved in Clarify)` : 'No [NEEDS CLARIFICATION] markers', s.needsClarification === 0)
      ];
    }
    case 'clarify':
      if (!s) return [req('spec.md exists', false)];
      return [
        req(s.needsClarification ? `${s.needsClarification} [NEEDS CLARIFICATION] markers remain` : 'No [NEEDS CLARIFICATION] markers remain', s.needsClarification === 0),
        warn(`${s.clarifications.length} clarification answers recorded`, s.clarifications.length > 0)
      ];
    case 'plan': {
      if (!f.plan) return [req('plan.md exists', false)];
      const ticked = f.plan.checks.filter(c => c[1]).length;
      return [
        req('plan.md exists', true),
        f.plan.checks.length ? req(`Constitution Check ticked (${ticked}/${f.plan.checks.length})`, ticked === f.plan.checks.length) : warn('Constitution Check list found', false),
        req('No NEEDS CLARIFICATION in Technical Context', !f.plan.context.some(([, v]) => /NEEDS CLARIFICATION/i.test(v)))
      ];
    }
    case 'tasks': {
      if (!f.tasks) return [req('tasks.md exists', false)];
      const stories = (s?.stories || []).map(u => u.id);
      const missing = stories.filter(id => !tasks.some(t => t.story === id));
      const noPath = tasks.filter(t => !t.path).length;
      return [
        req('tasks.md exists', true),
        req(missing.length ? `No tasks for ${missing.join(', ')}` : 'Every user story has tasks', missing.length === 0),
        warn(noPath ? `${noPath} tasks name no file path` : 'Every task names a file path', noPath === 0)
      ];
    }
    case 'analyze': {
      if (!f.analysis) return [req(`analysis.md saved in specs/${f.slug}/`, false)];
      const count = (sev: string) => f.analysis!.findings.filter(x => x.severity === sev).length;
      return [
        req('analysis.md saved', true),
        req(`No CRITICAL findings (${count('CRITICAL')})`, count('CRITICAL') === 0),
        warn(`No HIGH findings (${count('HIGH')})`, count('HIGH') === 0)
      ];
    }
    case 'implement': {
      const done = tasks.filter(t => t.done).length;
      const open = prs.filter(p => p.state === 'open' || p.state === 'draft');
      const merged = prs.filter(p => p.state === 'merged');
      const notBumped = merged.filter(p => p.bumped === false);
      const outOfOrder = mergeOrderProblems(prs, tracking?.repos.map(r => r.repo) ?? []);
      return [
        req(`All tasks checked off (${done}/${tasks.length})`, tasks.length > 0 && done === tasks.length),
        warn(prs.length ? `${prs.length} linked PRs found` : 'Linked PRs found', prs.length > 0),
        req(open.length ? `${open.length} linked PRs still open` : 'All linked PRs merged or closed', open.length === 0),
        req(outOfOrder.length ? `Merged out of order: ${outOfOrder.join('; ')}` : 'Merged in the configured repo order', outOfOrder.length === 0),
        req(notBumped.length ? `Submodule pointer not bumped for ${notBumped.map(p => `${p.repo}#${p.number}`).join(', ')}` : 'Submodule pointers include every merged PR', notBumped.length === 0),
        ...linkChecks(f.slug, prs, tracking)
      ];
    }
  }
}

/** Warnings about how the spec's PRs link to its tracking issue; none without an issue or without PRs (specs/005 FR-003). */
function linkChecks(slug: string, prs: SpecPR[], tracking?: Pick<Tracking, 'repos'> & Partial<Pick<Tracking, 'issues'>>): Check[] {
  const issue = tracking?.issues?.[slug]?.number;
  const rootRepo = tracking?.repos.find(r => !r.path)?.repo;
  const linked = prs.filter(p => p.link !== null);
  if (issue === undefined || !rootRepo || !linked.length) return [];
  const out = [warn(`Every PR links to #${issue}`, linked.every(p => linkStatus(p.link, p.repo, rootRepo, issue)?.ok))];
  const inRoot = linked.filter(p => p.repo === rootRepo);
  if (inRoot.length) out.push(warn(`A PR in this repo closes #${issue}`, inRoot.some(p => p.link === 'closes')));
  return out;
}

/**
 * Pairs of merged PRs whose merge times contradict `order` (submodule repos, in merge order).
 * Repos not in `order`, such as the root repo, are not checked.
 */
export function mergeOrderProblems(prs: SpecPR[], order: string[]): string[] {
  const merged = prs.filter(p => p.state === 'merged' && p.mergedAt && order.includes(p.repo));
  const out: string[] = [];
  for (const a of merged) for (const b of merged) {
    if (order.indexOf(a.repo) < order.indexOf(b.repo) && Date.parse(a.mergedAt!) > Date.parse(b.mergedAt!)) {
      out.push(`${b.repo}#${b.number} before ${a.repo}#${a.number}`);
    }
  }
  return out;
}

// ---- Tracking issue body ----

const START = '<!-- speckit-ui:gates -->';
const END = '<!-- /speckit-ui:gates -->';
const specMarker = (slug: string) => `<!-- speckit-ui:spec=${slug} -->`;

export const issueTitle = (f: Pick<SpecFeature, 'id' | 'title'>) => `Spec ${f.id}: ${f.title}`;

export function gatesBlock(gates: Partial<Record<GateKey, GateApproval>>): string {
  const line = (k: GateKey) => {
    const g = gates[k];
    return `- [${g?.approved ? 'x' : ' '}] ${GATE_NAME[k]}${g?.approved && g.by ? ` · @${g.by}` : ''}${g?.approved && g.at ? ` · ${g.at}` : ''}`;
  };
  return [START, ...GATE_KEYS.map(line), END].join('\n');
}

export function newIssueBody(slug: string, specUrl: string, gates: Partial<Record<GateKey, GateApproval>> = {}): string {
  return `${specMarker(slug)}
Tracking issue for [\`specs/${slug}\`](${specUrl}), managed by speckit-ui. Approve gates in the app, or tick a box below.

${gatesBlock(gates)}
`;
}

/** Replace the managed gates block, keeping anything people wrote around it. */
export function withGates(body: string, gates: Partial<Record<GateKey, GateApproval>>): string {
  const i = body.indexOf(START);
  const j = body.indexOf(END);
  if (i >= 0 && j > i) return body.slice(0, i) + gatesBlock(gates) + body.slice(j + END.length);
  return body.trimEnd() + '\n\n' + gatesBlock(gates) + '\n';
}

/** The spec slug and gate states in a tracking issue body, or null if it isn't one. */
export function parseIssueBody(body: string): { slug: string; gates: Partial<Record<GateKey, GateApproval>> } | null {
  const slug = body.match(/<!-- speckit-ui:spec=([^\s>]+) -->/)?.[1];
  if (!slug) return null;
  const i = body.indexOf(START);
  const j = body.indexOf(END);
  const block = i >= 0 && j > i ? body.slice(i, j) : '';
  const gates: Partial<Record<GateKey, GateApproval>> = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+([A-Za-z]+)(?:\s+·\s+@([\w-]+))?(?:\s+·\s+(\d{4}-\d{2}-\d{2}))?/);
    const key = m && GATE_KEYS.find(k => GATE_NAME[k].toLowerCase() === m[2].toLowerCase());
    if (m && key) gates[key] = { approved: m[1] !== ' ', ...(m[3] ? { by: m[3] } : {}), ...(m[4] ? { at: m[4] } : {}) };
  }
  return { slug, gates };
}

export const issueFor = (tracking: Tracking | null, slug: string): GateIssue | null => tracking?.issues[slug] ?? null;

/** Gate steps whose files are done but which nobody has approved yet. */
export function unapprovedGates(status: string[], issue: GateIssue | null): GateKey[] {
  return GATE_KEYS.filter((k, i) => status[i + 1] === 'done' && !issue?.gates[k]?.approved);
}


// ---- Approval gates lock the steps after them (specs/004) ----

/** Where the Claude Code gate check lives in a project repo, and the settings file that runs it. */
export const GATE_HOOK_FILE = 'speckit-gate.mjs';
export const GATE_HOOK_PATH = `.claude/hooks/${GATE_HOOK_FILE}`;
export const CLAUDE_SETTINGS = '.claude/settings.json';

/**
 * The gate that locks each step (index as in PHASES), or null. A step is locked by the first
 * unapproved gate among the steps before it that ran; steps that were not run never lock
 * anything, and the constitution has no gate. The app, the server and the gate check share this.
 */
export function blockingGates(status: readonly string[], issue: Pick<GateIssue, 'gates'> | null, mode: 'block' | 'off' = 'block'): (GateKey | null)[] {
  let first: GateKey | null = null;
  return status.map((s, i) => {
    const locked = mode === 'block' ? first : null;
    const k = GATE_KEYS[i - 1];
    if (k && !first && s === 'done' && !issue?.gates[k]?.approved) first = k;
    return locked;
  });
}

export const blockedReason = (k: GateKey) => `Approve ${GATE_NAME[k]} first.`;

// ---- PRs link to the tracking issue (specs/005) ----

/** Words GitHub reads as "close this issue when the PR is merged into the default branch". */
export const CLOSING_KEYWORDS = ['close', 'closes', 'closed', 'fix', 'fixes', 'fixed', 'resolve', 'resolves', 'resolved'];

/** The PreToolUse matcher of the gate check that covers creating a PR from Bash and from the GitHub MCP tool. */
export const PR_HOOK_MATCHER = 'Bash|mcp__.*__create_pull_request';

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The three ways a description can name issue `n` of `rootRepo`, each as a regex source. */
const issueRefs = (n: number, rootRepo: string) => ({
  bare: `#${n}(?!\\d)`,
  full: `${escapeRe(rootRepo)}#${n}(?!\\d)`,
  url: `https://github\\.com/${escapeRe(rootRepo)}/issues/${n}(?!\\d)`
});

/**
 * How a PR description points at the spec's tracking issue (research R1, R2): with a closing
 * keyword, with a plain reference, or not at all. Shared by the app and the Claude Code gate check.
 */
export function linkKind(body: string | null | undefined, issueNumber: number, rootRepo: string): 'closes' | 'mentions' | 'none' {
  const text = body ?? '';
  const r = issueRefs(issueNumber, rootRepo);
  const closing = new RegExp(`(?<![\\w/])(?:${CLOSING_KEYWORDS.join('|')}):?\\s+(?:${r.bare}|${r.full}|${r.url})`, 'i');
  if (closing.test(text)) return 'closes';
  // A bare "#12" must not sit inside a word or a longer path; the owner/repo and URL forms carry their own prefix.
  const mention = new RegExp(`(?<![\\w/])${r.bare}|(?<![\\w/.-])(?:${r.full}|${r.url})`, 'i');
  return mention.test(text) ? 'mentions' : 'none';
}

/** How one PR is linked, as a label and whether it is right for the repo it is in (data-model.md). */
export function linkStatus(link: SpecPR['link'], prRepo: string, rootRepo: string, issueNumber: number | null): { ok: boolean; label: string } | null {
  if (link === null || issueNumber === null) return null;
  const n = `#${issueNumber}`;
  if (link === 'none') return { ok: false, label: `Not linked to ${n}` };
  if (prRepo === rootRepo) return { ok: true, label: link === 'closes' ? `Closes ${n}` : `Linked to ${n}` };
  // Only the root repo's PR may close the issue; one in a submodule repo would close it too early.
  return link === 'mentions' ? { ok: true, label: `Linked to ${n}` } : { ok: false, label: `Closes ${n} early` };
}

/** The line to put in a PR description: `closes` only matters for a PR in the root repo (the spec's last PR). */
export function linkLine(issueNumber: number, rootRepo: string, prRepo: string, closes = true): string {
  if (prRepo !== rootRepo) return `Part of ${rootRepo}#${issueNumber}`;
  return `${closes ? 'Closes' : 'Part of'} #${issueNumber}`;
}
