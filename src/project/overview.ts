// What to do next in a project: the workspace's "Next up" list and the overview of pinned repos.
import { GATE_NAME, unapprovedGates } from './gates';
import { PHASES, nextStep, phaseStatus } from './phases';
import type { OverviewItem, Project, Tracking } from './types';

/** Pending approvals first, then the next command to run; specs with nothing to do are left out. */
export function buildOverview(project: Project, tracking: Tracking | null): OverviewItem[] {
  return project.specs.flatMap((f): OverviewItem[] => {
    const base = { repo: project.repo, slug: f.slug, title: f.title };
    const todo = tracking ? unapprovedGates(phaseStatus(project, f), tracking.issues[f.slug] ?? null) : [];
    if (todo.length) return [{ ...base, kind: 'approve', label: `Approve ${GATE_NAME[todo[0]]}`, step: PHASES.findIndex(p => p.k === todo[0]) }];
    const n = nextStep(project, f);
    return n ? [{ ...base, kind: n.phase === 6 ? 'implement' : 'run', label: n.text, step: n.phase }] : [];
  });
}
