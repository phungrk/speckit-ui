// The address bar: which repo, spec, step and screen are open (FR-008). Only these four
// parameters are ever written, so a shared link can never carry a token or key.
import { PHASES } from './phases';

export type View = 'overview' | 'repos';

export interface UrlState {
  repo: string | null;
  spec: string | null;
  /** Step index 0–6 */
  step: number | null;
  view: View | null;
}

export const URL_KEYS = ['repo', 'spec', 'step', 'view'] as const;

/** The app keeps the step as an index; the URL uses its name, e.g. "plan". */
export const stepToParam = (step: number | null): string | null => (step == null ? null : PHASES[step]?.k ?? null);
export const paramToStep = (name: string | null): number | null => { const i = PHASES.findIndex(p => p.k === name); return i < 0 ? null : i; };

export function readUrl(search: string = location.search): UrlState {
  const q = new URLSearchParams(search);
  const view = q.get('view');
  return { repo: q.get('repo'), spec: q.get('spec'), step: paramToStep(q.get('step')), view: view === 'overview' || view === 'repos' ? view : null };
}

/** The query string for `s`, built from URL_KEYS only. */
export function queryFor(s: Partial<UrlState>): string {
  const q = new URLSearchParams();
  if (s.repo) q.set('repo', s.repo);
  if (s.spec) q.set('spec', s.spec);
  const step = stepToParam(s.step ?? null);
  if (step) q.set('step', step);
  if (s.view) q.set('view', s.view);
  return q.toString();
}

/** Updates the address without adding a history entry for every click. */
export function writeUrl(s: Partial<UrlState>) {
  const qs = queryFor(s);
  try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch { /* not in a browser */ }
}
