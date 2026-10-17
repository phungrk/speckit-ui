// Where a spec stands, from its files only. Shared by the app, the server and the Claude Code
// gate check (specs/004 R1), so this module has no runtime imports besides ./types.ts.
import type { LiveTask, Project, SpecFeature } from './types.ts';

/** done: artifact exists · current: the next step · pending: later · skipped: passed over */
export type LiveStatus = 'done' | 'current' | 'pending' | 'skipped';

export const allTasks = (f: SpecFeature): LiveTask[] => (f.tasks || []).flatMap(p => p.tasks);

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
