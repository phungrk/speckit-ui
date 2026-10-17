import type { Phase } from '../types';
import { allTasks, nextStep, phaseStatus, PHASES, taskArea } from './phases';
import type { Project, SpecFeature } from './types';

export const LIVE_SUGGEST = [
  'What should I do next on this spec?',
  'Check this spec against the constitution',
  'Which requirements still need clarification?',
  'Which tasks touch each area, and which can run in parallel?'
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Artifact IDs to link in answers: requirements, stories, tasks, clarifications and this spec's findings. */
export function liveRefPattern(f: SpecFeature) {
  const findings = (f.analysis?.findings || []).map(x => escape(x.id)).filter(Boolean);
  return new RegExp(`\\b(FR-\\d{3}|SC-\\d{3}|US\\d+|T\\d{3}|Q\\d+${findings.length ? '|' + findings.join('|') : ''})\\b`, 'g');
}

export function liveRefPhase(f: SpecFeature, r: string) {
  if (/^(FR|SC)-|^US\d/.test(r)) return 1;
  if (/^Q\d/.test(r)) return 2;
  if (/^T\d{3}$/.test(r)) return allTasks(f).some(t => t.done) ? 6 : 4;
  return 5;
}

const MAX_FILE = 20_000;
const cap = (s: string) => (s.length > MAX_FILE ? s.slice(0, MAX_FILE) + '\n…[truncated]' : s);

export function buildLiveContext(p: Project, f: SpecFeature, phase: Phase) {
  const st = phaseStatus(p, f);
  const parts = [
    `Repository: ${p.repo} at ${p.ref} (${p.sha.slice(0, 7)}). Commands are invoked as ${p.commandPrefix}<step>.`,
    `Current spec: specs/${f.slug} "${f.title}". Step being viewed: ${phase.n}.`,
    `Step status: ${PHASES.map((x, i) => `${x.n}=${st[i]}`).join(', ')}.`,
    `Other specs: ${p.specs.filter(x => x !== f).map(x => `${x.slug} (next: ${nextStep(p, x)?.text ?? 'done'})`).join('; ') || 'none'}.`,
    `Files in specs/${f.slug}/: ${f.files.join(', ')}.`
  ];
  if (p.constitution) parts.push('=== .specify/memory/constitution.md ===\n' + cap(p.constitution.raw));
  if (f.spec) parts.push('=== spec.md ===\n' + cap(f.spec.raw));
  if (f.plan) parts.push('=== plan.md ===\n' + cap(f.plan.raw));
  if (f.tasks) parts.push('=== tasks (parsed) ===\n' + allTasks(f).map(t => `${t.id} [${t.done ? 'x' : ' '}]${t.parallel ? ' [P]' : ''}${t.story ? ' [' + t.story + ']' : ''} ${t.text}`).join('\n'));
  if (f.analysis) parts.push('=== analysis.md ===\n' + cap(f.analysis.raw));
  if (f.checklists.length) parts.push('Checklists: ' + f.checklists.map(c => `${c.name} ${c.done}/${c.total}`).join(', '));
  return parts.join('\n\n');
}

const bullets = (xs: string[]) => xs.map(x => '- ' + x).join('\n');

/** Answers from the project files when the server has no Claude credentials. */
export function liveOfflineAnswer(question: string, p: Project, f: SpecFeature): string {
  const q = question.toLowerCase();
  const tasks = allTasks(f);
  if (q.includes('next')) {
    const n = nextStep(p, f);
    if (!n) return `**${f.slug}** has every step done.`;
    const open = tasks.filter(t => !t.done);
    return bullets([
      `Next step: **${PHASES[n.phase].n}**. Run \`${p.commandPrefix}${PHASES[n.phase].k}\` in Claude Code.`,
      ...(n.phase === 6 && open.length ? [`Open tasks: ${open.slice(0, 5).map(t => t.id).join(', ')}${open.length > 5 ? '…' : ''}.`] : []),
      ...(n.phase === 5 ? [`Save the report to specs/${f.slug}/analysis.md so it shows here.`] : [])
    ]);
  }
  if (q.includes('clarif')) {
    const nc = (f.spec?.frs || []).filter(r => r.clarification);
    if (!f.spec) return 'This spec has no spec.md yet.';
    if (!f.spec.needsClarification) return `No [NEEDS CLARIFICATION] markers in spec.md. ${f.spec.clarifications.length} clarification answers recorded.`;
    return bullets([`${f.spec.needsClarification} [NEEDS CLARIFICATION] markers in spec.md.`, ...nc.map(r => `${r.id}: ${r.clarification}`)]);
  }
  if (q.includes('constitution')) {
    if (!f.plan?.checks.length) return 'plan.md has no Constitution Check yet. Checking the spec itself needs AI answers (set ANTHROPIC_API_KEY).';
    const failed = f.plan.checks.filter(c => !c[1]);
    return bullets([`plan.md Constitution Check: ${f.plan.checks.length - failed.length} of ${f.plan.checks.length} ticked.`, ...failed.map(c => `Not ticked: ${c[0]}`), 'A full review against each principle needs AI answers (set ANTHROPIC_API_KEY).']);
  }
  if (q.includes('task') || q.includes('parallel')) {
    if (!tasks.length) return 'This spec has no tasks.md yet.';
    const areas = new Map<string, string[]>();
    for (const t of tasks) areas.set(taskArea(t), [...(areas.get(taskArea(t)) || []), t.id]);
    const par = tasks.filter(t => t.parallel && !t.done).map(t => t.id);
    return bullets([...[...areas].map(([a, ids]) => `${a}: ${ids.join(', ')}`), par.length ? `Open [P] tasks: ${par.join(', ')}.` : 'No open [P] tasks.']);
  }
  return 'Offline mode only answers the suggested questions. Set ANTHROPIC_API_KEY on the server for AI answers.';
}
