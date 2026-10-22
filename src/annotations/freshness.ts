// Looks for other people's new comments while the tab is open (specs/012 FR-014, research R8). It never changes what is
// on screen: it keeps what it found aside and counts it; the page applies it when the user clicks. Pure: the clock, the
// read and the screen are handed in, so the four modes and the tests share it (constitution III).
import type { Highlight } from '../project/types';
import { diffIncoming, nextPollDelay } from './comments';

/** What a read says: the file's items and etag, or that it is unchanged since the etag that was sent. */
export type ReadResult = { items: Highlight[]; error: string | null; etag: string | null } | 'unchanged';

export interface FreshnessState {
  etag: string | null;
  /** The list read last time, when it has something the screen does not (applied only on request). */
  incoming: Highlight[] | null;
  /** How many comments are new or changed in `incoming`: the number on the badge. */
  newCount: number;
  /** When it last looked, even if the answer was 304. */
  checkedAt: number | null;
  failures: number;
  /** Not looking because the tab is hidden. */
  paused: boolean;
  /** Not looking any more: the sign-in ended (401). */
  stopped: boolean;
}

export interface FreshnessDeps {
  read: (etag: string | null) => Promise<ReadResult>;
  /** What the screen shows now. */
  current: () => Highlight[];
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  isVisible: () => boolean;
  /** Look on a timer (server, Pages). Local looks only when asked: on focus and on the button. */
  poll: boolean;
  onChange: (state: FreshnessState) => void;
}

const fresh = (): FreshnessState => ({ etag: null, incoming: null, newCount: 0, checkedAt: null, failures: 0, paused: false, stopped: false });

export function createFreshness(deps: FreshnessDeps) {
  let st = fresh();
  let timer: unknown = null;
  let started = false;
  let running: Promise<void> | null = null;
  const emit = () => deps.onChange({ ...st });
  const clear = () => { if (timer !== null) { deps.clearTimer(timer); timer = null; } };

  const schedule = () => {
    clear();
    if (!started || !deps.poll || st.stopped) return;
    const ms = nextPollDelay(st.failures, deps.isVisible());
    if (ms === null) { st.paused = true; emit(); return; }
    st.paused = false;
    timer = deps.setTimer(tick, ms);
  };

  const tick = () => {
    timer = null;
    if (!deps.isVisible()) { st.paused = true; emit(); return; }
    void check();
  };

  /** Looks now. Never two reads at once: a second call joins the one in flight. */
  function check(): Promise<void> {
    if (st.stopped) return Promise.resolve();
    if (running) return running;
    running = (async () => {
      try {
        const r = await deps.read(st.etag);
        st.checkedAt = deps.now();
        st.failures = 0;
        if (r !== 'unchanged') {
          st.etag = r.etag;
          // A file that cannot be read is not a pile of new comments; the page already shows why it is read-only.
          const d = r.error ? null : diffIncoming(deps.current(), r.items);
          const found = !!d && d.newCount > 0;
          st.incoming = found ? r.items : null;
          st.newCount = found ? d!.newCount : 0;
        }
      } catch (e) {
        if ((e as { status?: number }).status === 401) st.stopped = true; else st.failures++;
      } finally {
        running = null;
        emit();
        schedule();
      }
    })();
    return running;
  }

  return {
    start() { started = true; schedule(); },
    stop() { started = false; clear(); },
    check,
    /** The tab was hidden or shown. Shown again after a pause: look at once. */
    visibility() {
      if (!started || !deps.poll || st.stopped) return;
      if (deps.isVisible()) { if (st.paused) { st.paused = false; clear(); void check(); } } else { clear(); st.paused = true; emit(); }
    },
    /** Hands over what was found, once; nothing is new afterwards. */
    apply(): Highlight[] | null {
      const items = st.incoming;
      if (!items) return null;
      st = { ...st, incoming: null, newCount: 0 };
      emit();
      return items;
    },
    /** Another spec or branch: forget the etag and what was held, and start counting again. */
    reset() { st = fresh(); clear(); emit(); if (started) schedule(); },
    state: (): FreshnessState => ({ ...st })
  };
}
