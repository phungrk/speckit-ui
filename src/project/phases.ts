import { SK } from '../data';
import type { LiveTask, Project, SpecFeature } from './types';

/** done: artifact exists · current: the next step · pending: later · skipped: passed over */
export type LiveStatus = 'done' | 'current' | 'pending' | 'skipped';

export const LIVE_LABEL: Record<LiveStatus, string> = { done: 'Done', current: 'Next', pending: 'Not started', skipped: 'Not run' };
/** Rail and progress-bar classes from the design: current reads as "review", pending as "locked". */
export const LIVE_CLASS: Record<LiveStatus, string> = { done: 'done', current: 'review', pending: 'locked', skipped: 'skipped' };

export const PHASES = SK.phases;

export const allTasks = (f: SpecFeature): LiveTask[] => (f.tasks || []).flatMap(p => p.tasks);

/** Top-level folder a task touches, e.g. "wedding-front". */
export const taskArea = (t: LiveTask) => (t.path && t.path.includes('/') ? t.path.split('/')[0] : '—');

/**
 * Where a spec stands, derived from the files Spec Kit has written. A spec may set
 * `**Track**: light` to stop after Plan, matching projects that run only specify + plan.
 */
export function phaseStatus(project: Pick<Project, 'constitution'>, f: SpecFeature): LiveStatus[] {
  const tasks = allTasks(f);
  const light = /^light/i.test(f.spec?.fields.Track || '');
  const started = tasks.some(t => t.done);
  const has = [
    !!project.constitution,
    !!f.spec,
    !!f.spec?.clarifications.length,
    !!f.plan,
    !!f.tasks,
    !!f.analysis,
    tasks.length > 0 && tasks.every(t => t.done)
  ];
  const skip = [
    false,
    false,
    !has[2] && (!!f.plan || (!!f.spec && f.spec.needsClarification === 0)),
    false,
    light && !f.tasks,
    !has[5] && (started || (light && !f.tasks)),
    light && !f.tasks
  ];
  const out: LiveStatus[] = has.map((h, i) => (h ? 'done' : skip[i] ? 'skipped' : 'pending'));
  const cur = out.findIndex(s => s === 'pending');
  if (cur >= 0) out[cur] = 'current';
  return out;
}

export interface NextStep { phase: number; text: string; detail: string }

export function nextStep(project: Project, f: SpecFeature): NextStep | null {
  const st = phaseStatus(project, f);
  const i = st.indexOf('current');
  if (i < 0) return null;
  const cmd = project.commandPrefix + PHASES[i].k;
  if (i === 6) {
    const tasks = allTasks(f);
    return { phase: i, text: `Implement · ${tasks.filter(t => t.done).length}/${tasks.length} tasks`, detail: cmd };
  }
  if (i === 2) return { phase: i, text: `Clarify · ${f.spec!.needsClarification} open`, detail: cmd };
  return { phase: i, text: `Run ${cmd}`, detail: PHASES[i].n };
}

/** GitHub URL of a file in the loaded commit. */
export const blobUrl = (p: Pick<Project, 'repo' | 'sha'>, path: string) => `https://github.com/${p.repo}/blob/${p.sha}/${path.split('/').map(encodeURIComponent).join('/')}`;
