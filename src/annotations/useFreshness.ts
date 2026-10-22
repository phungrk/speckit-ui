import { useEffect, useMemo, useRef, useState } from 'react';
import type { Highlight } from '../project/types';
import { createFreshness, type FreshnessState, type ReadResult } from './freshness';

export interface UseFreshnessOptions {
  /** Off while there is no spec to look at, no branch, or no way to read (the demo). */
  enabled: boolean;
  /** Look on a timer (server, Pages). Local looks on focus and on the button only. */
  poll: boolean;
  read: (etag: string | null) => Promise<ReadResult>;
  /** What the screen shows now. */
  current: () => Highlight[];
  /** Changes with the spec and branch on screen: the etag and what was held are forgotten. */
  resetKey: string;
}

/** React side of the freshness controller (specs/012 research R8): visibility, focus, timers cleaned up. */
export function useFreshness({ enabled, poll, read, current, resetKey }: UseFreshnessOptions) {
  const [state, setState] = useState<FreshnessState>({ etag: null, incoming: null, newCount: 0, checkedAt: null, failures: 0, paused: false, stopped: false });
  // The latest closures, so the controller (made once) always reads and compares against what is on screen now.
  const readRef = useRef(read); readRef.current = read;
  const curRef = useRef(current); curRef.current = current;
  const ctl = useMemo(() => createFreshness({
    read: etag => readRef.current(etag),
    current: () => curRef.current(),
    now: () => Date.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: h => clearTimeout(h as ReturnType<typeof setTimeout>),
    isVisible: () => typeof document === 'undefined' || document.visibilityState === 'visible',
    poll,
    onChange: setState
  }), [poll]);

  useEffect(() => {
    if (!enabled) return;
    ctl.start();
    const visibility = () => ctl.visibility();
    // Local has no timer: the folder changes under git, so it is looked at when the window comes back.
    const focus = () => { if (!poll) void ctl.check(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', focus);
    return () => { ctl.stop(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('focus', focus); };
  }, [ctl, enabled, poll]);

  useEffect(() => { ctl.reset(); }, [ctl, resetKey]);

  return {
    newCount: state.newCount,
    checkedAt: state.checkedAt,
    stopped: state.stopped,
    /** Looks now and hands back what it found, if anything is new. */
    async refresh(): Promise<Highlight[] | null> { await ctl.check(); return ctl.apply(); },
    /** Hands back what was found, if anything is new; nothing is new afterwards. */
    apply: (): Highlight[] | null => ctl.apply()
  };
}
