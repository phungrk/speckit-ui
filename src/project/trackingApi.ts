import type { GateKey, Tracking, TrackingResponse } from './types';

export type GateAction = 'approve' | 'changes' | 'reopen';

/** null when GitHub mode is off; throws with a readable message on failure. */
export async function fetchTracking(refresh = false): Promise<Tracking | null> {
  let data: TrackingResponse;
  try {
    data = await (await fetch('/api/tracking' + (refresh ? '?refresh=1' : ''))).json() as TrackingResponse;
  } catch {
    throw new Error('Could not reach the speckit-ui server.');
  }
  if (!data.configured) return null;
  if ('error' in data) throw new Error(data.error);
  return data.tracking;
}

/** Records a gate decision in the spec's tracking issue and returns fresh tracking. */
export async function postGate(slug: string, gate: GateKey, action: GateAction, note = ''): Promise<Tracking> {
  let res: Response;
  try {
    res = await fetch('/api/gates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, gate, action, note }) });
  } catch {
    throw new Error('Could not reach the speckit-ui server.');
  }
  const data = await res.json().catch(() => ({})) as { tracking?: Tracking; error?: string };
  if (!res.ok || !data.tracking) throw new Error(data.error || `Gate update failed (${res.status}).`);
  return data.tracking;
}
