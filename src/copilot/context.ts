import { FR006, SK } from '../data';
import type { Feature, Phase, QaResult, Role, Task } from '../types';

/** Everything Copilot and the gate brief read from the workspace. */
export interface WorkspaceState {
  f: Feature;
  phase: Phase;
  role: Role;
  resolved: Record<string, number>;
  done: Record<string, boolean>;
  qa: Record<string, QaResult>;
  tasks: Task[];
  features: Feature[];
}

export const CP_SUGGEST: Record<Role, string[]> = {
  Director: ['Summarize where this feature stands in 3 lines', 'What is blocking release, and who owns it?', 'What should I check before approving this gate?'],
  Designer: ['Which stories need UI states that have no design task?', 'Check accessibility coverage against principle II', 'Draft copy for the blocked-transfer message'],
  Engineer: ['What changed in the spec since the plan was approved?', 'Which open tasks can run in parallel right now?', 'Draft a PR description for my completed tasks'],
  QA: ['Which acceptance scenarios have no test task?', 'Suggest edge cases for FR-002', 'Is the open HIGH finding safe to defer?']
};

/** Artifact IDs that become clickable in Copilot answers. One capture group, so split() interleaves matches. */
export const CP_REF = /\b(FR-\d{3}|SC-\d{3}|US\d|T0\d{2}|A\d|Q\d)\b/g;

/** Phase index that holds a referenced artifact. */
export const refPhase = (r: string, implOpen: boolean) =>
  r.startsWith('FR') || r.startsWith('SC') || r.startsWith('US') ? 1 : r[0] === 'Q' ? 2 : r[0] === 'A' ? 5 : implOpen ? 6 : 4;

export const currentPhaseName = (x: Feature) => {
  const i = x.status.indexOf('review');
  return i < 0 ? 'shipped' : SK.phases[i].n;
};

export function buildContext({ f, phase, role, resolved, done, qa, tasks, features }: WorkspaceState) {
  const lines = [
    `Project: ${SK.project}. User role: ${role} (${SK.people[role].name}).`,
    `Current feature: ${f.slug} "${f.title}". Phase being viewed: ${phase.n} (${phase.cmd}).`,
    `Phase status: ${SK.phases.map((p, i) => `${p.n}=${f.status[i]}`).join(', ')}.`,
    `Gate approvers for ${phase.n}: ${phase.gate.join(', ')}. Approvals so far: ${JSON.stringify(f.approvals[phase.k] || {})}.`,
    `Constitution ${SK.constitution.version}: ${SK.constitution.principles.map((p, i) => `${i + 1}. ${p[0]}: ${p[1]}`).join(' ')}`,
    `Other features: ${features.map(x => `${x.id} ${x.title} (at ${currentPhaseName(x)})`).join('; ')}.`
  ];
  if (f.detailed) {
    lines.push('SPEC user stories: ' + SK.spec.stories.map(u => `${u.id} [${u.p}] ${u.title}: ${u.text} Acceptance: ${u.ac.map(a => `Given ${a[0]} when ${a[1]} then ${a[2]}`).join(' | ')}`).join(' || '));
    lines.push('SPEC requirements: ' + SK.spec.frs.map(r => r.join(' ')).join(' ') + (resolved.A1 === 0 ? ' ' + FR006.join(' ') : ''));
    lines.push('SPEC success criteria: ' + SK.spec.sc.map(r => r.join(' ')).join(' '));
    lines.push('CLARIFICATIONS: ' + SK.clarify.map((c, i) => `Q${i + 1} ${c.q} -> ${c.opts[c.a]} (by ${c.by})`).join('; '));
    lines.push('PLAN: ' + SK.plan.context.map(c => c.join(': ')).join('; ') + '. Entities: ' + SK.plan.entities.map(e => e.join(' ')).join('; '));
    lines.push('TASKS: ' + tasks.map(t => `${t.id}${t.p ? ' [P]' : ''} ${t.s ? '[' + t.s + '] ' : ''}${t.d} (${t.f}, owner ${t.o}, ${done[t.id] ? 'done' : 'open'})`).join('; '));
    lines.push('ANALYZE findings: ' + SK.findings.map(x => `${x.id} ${x.sev} ${x.cat}: ${x.d} Status: ${resolved[x.id] === undefined ? 'OPEN' : 'resolved with "' + x.opts[resolved[x.id]] + '"'}`).join(' '));
    lines.push('QA acceptance results: ' + (Object.keys(qa).length ? JSON.stringify(qa) : 'none recorded yet'));
  } else if (f.draft) {
    lines.push('DRAFT SPEC: ' + f.summary + ' Requirements: ' + f.draft.frs.map(r => r.filter(Boolean).join(' ')).join(' '));
  } else lines.push('Summary: ' + f.summary + ' (full artifacts not loaded).');
  return lines.join('\n');
}

const scenarioCount = () => SK.spec.stories.reduce((n, u) => n + u.ac.length, 0);

/** Checklist shown to an approver before they approve. Computed from data; no model call. */
export function gateBrief({ f, phase, resolved, done, qa, tasks }: Omit<WorkspaceState, 'role' | 'features'>): string[] | null {
  if (f.draft && phase.k === 'specify') {
    const nc = f.draft.frs.filter(r => r[2]).map(r => r[0]);
    return [`${nc.length} requirements still marked [NEEDS CLARIFICATION]: ${nc.join(', ')}.`, `Checklist passes ${f.draft.checklist.filter(c => c[1]).length} of ${f.draft.checklist.length}.`, 'Approving moves open questions to Clarify. Nothing is lost.'];
  }
  if (!f.detailed) return null;
  if (phase.k === 'analyze') {
    const open = SK.findings.filter(x => resolved[x.id] === undefined);
    const high = open.filter(x => x.sev === 'HIGH' || x.sev === 'CRITICAL');
    const total = SK.spec.frs.length + 1;
    if (!open.length) return [`All findings resolved. Coverage is ${resolved.A1 === 0 ? total : total - 1} of ${total} requirements.`, 'Constitution check still passes.'];
    const items = [high.length ? `${high.map(x => x.id).join(', ')} ${high.length > 1 ? 'are' : 'is'} ${high[0].sev} and open: ${high[0].risk ?? high[0].d}` : 'No HIGH findings remain.'];
    const early = Object.entries(f.approvals.analyze || {}).filter(([, ok]) => ok).map(([r]) => r);
    if (high.length && early.length) items.push(`${early.join(', ')} approved before ${high[0].id} was resolved. Confirm they agree with the fix.`);
    const rest = open.filter(x => !high.includes(x)).map(x => x.id);
    items.push(`${open.length} findings open.${rest.length ? ` ${rest.join(' and ')} do not block this gate.` : ''}`);
    return items;
  }
  if (phase.k === 'implement') {
    const left = tasks.filter(t => !done[t.id]);
    const pass = Object.values(qa).filter(v => v === 'Pass').length;
    // qa keys are "US1-0"; scenarios are labelled "US1.1" in the UI.
    const fail = Object.entries(qa).filter(e => e[1] === 'Fail').map(([k]) => { const [u, i] = k.split('-'); return `${u}.${+i + 1}`; });
    return [left.length ? `${left.length} tasks open. Next unblocked: ${left.slice(0, 3).map(t => t.id).join(', ')}.` : 'All tasks complete.', `${pass} of ${scenarioCount()} acceptance scenarios passed.`, fail.length ? `Failing: ${fail.join(', ')}. Ship stays blocked.` : 'No failing scenarios recorded.'];
  }
  return null;
}
