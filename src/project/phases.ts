import { SK } from '../data';
import { allTasks, phaseStatus, type LiveStatus } from './status';
import type { LiveTask, Project, SpecFeature } from './types';

export { allTasks, phaseStatus, type LiveStatus };

export const LIVE_LABEL: Record<LiveStatus, string> = { done: 'Done', current: 'Next', pending: 'Not started', skipped: 'Not run' };
/** Rail and progress-bar classes from the design: current reads as "review", pending as "locked". */
export const LIVE_CLASS: Record<LiveStatus, string> = { done: 'done', current: 'review', pending: 'locked', skipped: 'skipped' };

export const PHASES = SK.phases;

/** Top-level folder a task touches, e.g. "wedding-front". */
export const taskArea = (t: LiveTask) => (t.path && t.path.includes('/') ? t.path.split('/')[0] : '—');

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
