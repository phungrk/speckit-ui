import type { GateKey, Tracking, TrackingResponse } from './types';

export type GateAction = 'approve' | 'changes' | 'reopen';

/** A failed call to the speckit-ui server, with its HTTP status. */
export class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

/** The server needs the user to sign in (sign-in mode). */
export class SignInRequired extends HttpError {
  constructor() { super('Sign in required.', 401); }
}

/** fetch() against the speckit-ui server, turning failures into readable errors. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(path, init); } catch { throw new Error('Could not reach the speckit-ui server.'); }
  const data = await res.json().catch(() => ({})) as T & { error?: string; mode?: string };
  if (res.status === 401 && data.error === 'Sign in required.') throw new SignInRequired();
  if (!res.ok) throw new HttpError(data.error || `Request failed (${res.status}).`, res.status);
  return data;
}

const q = (repo: string, refresh: boolean) => `?repo=${encodeURIComponent(repo)}${refresh ? '&refresh=1' : ''}`;

/** null when GitHub mode is off; throws with a readable message on failure. */
export async function fetchTracking(repo: string, refresh = false): Promise<Tracking | null> {
  const data = await api<TrackingResponse>('/api/tracking' + q(repo, refresh));
  if (!data.configured) return null;
  if ('error' in data) throw new Error(data.error);
  return data.tracking;
}

/** What a gate decision returns: tracking with the write applied, and whether anything was written. */
export interface Decided { tracking: Tracking; unchanged: boolean }

/** Records a gate decision in the spec's tracking issue in `repo`. */
export async function postGate(repo: string, slug: string, gate: GateKey, action: GateAction, note = '', branch?: string | null): Promise<Decided> {
  const data = await api<{ tracking?: Tracking; unchanged?: boolean }>('/api/gates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo, slug, gate, action, note, ...(branch ? { branch } : {}) }) });
  if (!data.tracking) throw new Error('Gate update failed.');
  return { tracking: data.tracking, unchanged: !!data.unchanged };
}
