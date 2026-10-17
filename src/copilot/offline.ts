import { SK } from '../data';
import { currentPhaseName, gateBrief, type WorkspaceState } from './context';

export const OFFLINE_NOTE = 'Offline answer from workspace data. Set ANTHROPIC_API_KEY on the server for AI answers.';

const bullets = (xs: string[]) => xs.map(x => '- ' + x).join('\n');

/**
 * Rule-based answers used when the Copilot API has no credentials.
 * Covers the suggested questions; anything else gets a pointer to them.
 */
export function offlineAnswer(question: string, s: WorkspaceState): string {
  const q = question.toLowerCase();
  const { f, tasks, done, resolved, qa, role } = s;
  const openTasks = tasks.filter(t => !done[t.id]);
  const openFindings = SK.findings.filter(x => resolved[x.id] === undefined);
  const has = (...words: string[]) => words.some(w => q.includes(w));

  if (has('before approving', 'check before')) {
    const brief = gateBrief(s);
    return brief ? bullets(brief) : `Nothing specific to check at ${s.phase.n} for ${f.id}. Review ${s.phase.file} against the constitution.`;
  }
  if (!f.detailed) {
    const at = currentPhaseName(f);
    return bullets([`**${f.slug}** is at ${at}.`, f.summary, f.draft ? `${f.draft.frs.filter(r => r[2]).map(r => r[0]).join(', ')} need clarification.` : 'Full artifacts are not loaded for this feature.']);
  }
  if (has('summar', 'stand')) {
    return bullets([
      `**${f.slug}** is at ${currentPhaseName(f)}.`,
      `${tasks.length - openTasks.length} of ${tasks.length} tasks done; ${openFindings.length} findings open.`,
      openFindings.some(x => x.sev === 'HIGH') ? 'A1 (HIGH) blocks the Analyze gate until QA or Engineer resolves it.' : 'No HIGH findings block the next gate.'
    ]);
  }
  if (has('block', 'release')) {
    const items = openFindings.filter(x => x.sev === 'HIGH').map(x => `${x.id} ${x.sev}: ${x.d} Owner: QA or Engineer.`);
    const pending = SK.phases.flatMap((p, i) => f.status[i] === 'review' ? p.gate.filter(g => !(f.approvals[p.k] || {})[g]).map(g => `${p.n} needs approval from ${g} (${SK.people[g].name}).`) : []);
    if (f.status[6] !== 'locked' && openTasks.length) items.push(`${openTasks.length} tasks open, e.g. ${openTasks.slice(0, 3).map(t => `${t.id} (${t.o})`).join(', ')}.`);
    return bullets([...items, ...pending]);
  }
  if (has('parallel')) {
    const p = openTasks.filter(t => t.p);
    return p.length ? bullets(p.map(t => `${t.id} ${t.d} (${t.o})`)) : 'No open [P] tasks right now.';
  }
  if (has('no test', 'acceptance')) {
    const tested = new Set(tasks.filter(t => t.o === 'QA' && t.s).map(t => t.s));
    const gaps = SK.spec.stories.filter(u => !tested.has(u.id));
    const fails = Object.entries(qa).filter(([, v]) => v === 'Fail').map(([k]) => k);
    return bullets([
      ...gaps.map(u => `${u.id} (${u.title}) has no QA test task. Consider an integration test for FR-005.`),
      ...(gaps.length ? [] : ['Every story has at least one QA test task.']),
      ...(fails.length ? [`Failing scenarios recorded: ${fails.join(', ')}.`] : [])
    ]);
  }
  if (has('edge case')) {
    return bullets(['Transfer submitted at 23:59:59 and settled after 00:00 (FR-002).', 'User changes time zone mid-day: which midnight applies? (Q1 says local.)', 'Daylight-saving shifts where a day has 23 or 25 hours.', 'Scheduled transfers executing at 00:00 (A1).']);
  }
  if (has('defer', 'safe')) {
    const a1 = SK.findings[0];
    return resolved.A1 !== undefined ? `A1 is already resolved: ${a1.opts[resolved.A1]}.` : bullets([`A1: ${a1.d}`, 'Deferring leaves a path where money can move past the cap, which conflicts with SC-002 and principle III.', 'If deferred, record the exception and add a guard so scheduled transfers are blocked until v2.']);
  }
  if (has('changed', 'spec since')) {
    return resolved.A1 === 0 ? bullets(['FR-006 added: scheduled transfers count against the day they execute.', 'T018 added to US1 to implement it.']) : 'No spec changes since Plan was approved. Resolving A1 with its first option would add FR-006 and T018.';
  }
  if (has('ui state', 'design task')) {
    const designed = new Set(tasks.filter(t => t.o === 'Designer' && t.s).map(t => t.s));
    return bullets(SK.spec.stories.map(u => designed.has(u.id) ? `${u.id} has design tasks: ${tasks.filter(t => t.s === u.id && t.o === 'Designer').map(t => t.id).join(', ')}.` : `${u.id} has no design task.`).concat('No task covers the error state when step-up auth fails (US2, FR-003).'));
  }
  if (has('accessib')) {
    return bullets(['Principle II requires WCAG 2.2 AA with Designer sign-off.', `T016 covers the limit screens (${done.T016 ? 'done' : 'open'}).`, 'T008 and T014 have no explicit accessibility notes yet.']);
  }
  if (has('copy', 'message')) {
    return bullets(['**Title:** Daily limit reached', '**Body:** You can send 1,000,000 VND more today. Your limit resets at 00:00.', '**Actions:** Raise limit · Change amount', 'Covers US1 acceptance 1 and T008.']);
  }
  if (has('pr description')) {
    const mine = tasks.filter(t => done[t.id] && (t.o === role || role === 'Engineer'));
    return mine.length ? bullets([`**${f.slug}**: ${mine.map(t => t.id).join(', ')}`, ...mine.map(t => `${t.id} ${t.d} (${t.f})`)]) : 'You have no completed tasks yet.';
  }
  return 'Offline mode only answers the suggested questions. Pick one below, or ask an admin to set ANTHROPIC_API_KEY.';
}
