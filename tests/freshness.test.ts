// The controller that checks for other people's new comments (specs/012 FR-014, research R8, contracts/refresh-api.md).
// Pure: the clock, the read and the screen are handed in, so no timers or network are involved. Synthetic data only.
import { describe, expect, it } from 'vitest';
import { createFreshness, type FreshnessDeps, type FreshnessState, type ReadResult } from '../src/annotations/freshness';
import type { Highlight } from '../src/project/types';

const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'q', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'n', note: 'a note',
  author: { login: 'mai' }, createdAt: '2026-10-21T08:00:00.000Z', updatedAt: '2026-10-21T08:00:00.000Z', ...over
});

/** A clock whose timers run when the test says so. */
function fakeClock() {
  let t = 0, id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => t,
    setTimer: (fn: () => void, ms: number) => { timers.set(++id, { at: t + ms, fn }); return id; },
    clearTimer: (h: unknown) => { timers.delete(h as number); },
    pending: () => [...timers.values()].map(x => x.at - t).sort((a, b) => a - b),
    async advance(ms: number) {
      const end = t + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, x]) => x.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        t = due[1].at;
        due[1].fn();
        // Let the read and what follows it finish before the next timer is looked at.
        await new Promise(r => setImmediate(r));
      }
      t = end;
    }
  };
}

function setup(over: Partial<FreshnessDeps> & { reads?: (ReadResult | Error)[]; screen?: Highlight[] } = {}) {
  const clock = fakeClock();
  const seen: (string | null)[] = [];
  const queue = [...(over.reads ?? [])];
  const changes: FreshnessState[] = [];
  let visible = true;
  const deps: FreshnessDeps = {
    read: async etag => {
      seen.push(etag);
      const next = queue.length ? queue.shift()! : 'unchanged' as ReadResult;
      if (next instanceof Error) throw next;
      return next;
    },
    current: () => over.screen ?? [],
    now: clock.now, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    isVisible: () => visible,
    poll: true,
    onChange: s => changes.push({ ...s }),
    ...over
  };
  const f = createFreshness(deps);
  return { f, clock, seen, changes, hide: () => { visible = false; }, show: () => { visible = true; } };
}

const ok = (items: Highlight[], etag: string | null = '"e1"'): ReadResult => ({ items, error: null, etag });
const httpError = (status: number) => Object.assign(new Error('x'), { status });

describe('schedule', () => {
  it('checks once a minute while the tab is visible', async () => {
    const { f, clock, seen } = setup();
    f.start();
    expect(clock.pending()).toEqual([60_000]);
    await clock.advance(59_999);
    expect(seen).toEqual([]);
    await clock.advance(1);
    expect(seen).toEqual([null]);
    expect(clock.pending()).toEqual([60_000]);
    await clock.advance(60_000);
    expect(seen).toHaveLength(2);
  });

  it('sends the etag it was given last time, so GitHub can answer 304', async () => {
    const { f, clock, seen } = setup({ reads: [ok([], '"e1"'), 'unchanged'] });
    f.start();
    await clock.advance(60_000);
    await clock.advance(60_000);
    expect(seen).toEqual([null, '"e1"']);
  });

  it('does not schedule anything when it does not poll (local: checks on focus and on the button only)', async () => {
    const { f, clock, seen } = setup({ poll: false });
    f.start();
    expect(clock.pending()).toEqual([]);
    await f.check();
    expect(seen).toEqual([null]);
    expect(clock.pending()).toEqual([]);
  });

  it('stops asking when the tab is hidden, and asks at once when it is visible again', async () => {
    const { f, clock, seen, hide, show } = setup();
    f.start();
    hide();
    await clock.advance(60_000);
    expect(seen).toEqual([]);
    expect(f.state().paused).toBe(true);
    expect(clock.pending()).toEqual([]);
    show();
    f.visibility();
    await clock.advance(0);
    expect(seen).toEqual([null]);
    expect(f.state().paused).toBe(false);
    expect(clock.pending()).toEqual([60_000]);
  });

  it('stop clears the timer', async () => {
    const { f, clock } = setup();
    f.start();
    f.stop();
    expect(clock.pending()).toEqual([]);
  });

  it('never runs two reads at once', async () => {
    let release: (r: ReadResult) => void = () => {};
    const seen: (string | null)[] = [];
    const clock = fakeClock();
    const f = createFreshness({ read: etag => { seen.push(etag); return new Promise<ReadResult>(r => { release = r; }); }, current: () => [], ...clock, isVisible: () => true, poll: true, onChange: () => {} });
    const a = f.check();
    const b = f.check();
    expect(seen).toHaveLength(1);
    release('unchanged');
    await Promise.all([a, b]);
    expect(seen).toHaveLength(1);
  });
});

describe('what it finds', () => {
  it('records the time of every check, including a 304', async () => {
    const { f, clock } = setup({ reads: ['unchanged'] });
    f.start();
    await clock.advance(60_000);
    expect(f.state().checkedAt).toBe(60_000);
    expect(f.state().newCount).toBe(0);
  });

  it('stores the etag and says nothing when the file has nothing new', async () => {
    const screen = [H('h1')];
    const { f, clock, changes } = setup({ screen, reads: [ok([H('h1')], '"e7"')] });
    f.start();
    await clock.advance(60_000);
    expect(f.state()).toMatchObject({ etag: '"e7"', incoming: null, newCount: 0 });
    expect(changes.at(-1)!.newCount).toBe(0);
  });

  it('keeps somebody else\'s new comment aside and counts it, and never touches what is on screen', async () => {
    const screen = [H('h1')];
    const { f, clock } = setup({ screen, reads: [ok([H('h1'), H('h2', { note: 'new from lan', author: { login: 'lan' } })])] });
    f.start();
    await clock.advance(60_000);
    expect(f.state().newCount).toBe(1);
    expect(f.state().incoming!.map(h => h.id)).toEqual(['h1', 'h2']);
    expect(screen.map(h => h.id)).toEqual(['h1']);
  });

  it('counts again against what is on screen at the next check (nothing piles up twice)', async () => {
    const screen = [H('h1')];
    const first = [H('h1'), H('h2', { note: 'two' })];
    const second = [H('h1'), H('h2', { note: 'two' }), H('h3', { note: 'three' })];
    const { f, clock } = setup({ screen, reads: [ok(first, '"a"'), ok(second, '"b"')] });
    f.start();
    await clock.advance(60_000);
    expect(f.state().newCount).toBe(1);
    await clock.advance(60_000);
    expect(f.state().newCount).toBe(2);
  });

  it('hands the new list over on apply, once, and then there is nothing new', async () => {
    const { f, clock } = setup({ screen: [H('h1')], reads: [ok([H('h1'), H('h2')])] });
    f.start();
    await clock.advance(60_000);
    expect(f.apply()!.map(h => h.id)).toEqual(['h1', 'h2']);
    expect(f.state()).toMatchObject({ incoming: null, newCount: 0 });
    expect(f.apply()).toBeNull();
  });

  it('does not report a read that came back with a broken file as new comments', async () => {
    const { f, clock } = setup({ screen: [H('h1')], reads: [{ items: [], error: 'highlights.json cannot be read', etag: '"x"' }] });
    f.start();
    await clock.advance(60_000);
    expect(f.state().newCount).toBe(0);
    expect(f.state().incoming).toBeNull();
  });
});

describe('failures (contracts/refresh-api.md)', () => {
  it('waits twice as long after each failure, up to ten minutes, and goes back to a minute after a success', async () => {
    const { f, clock } = setup({ reads: [httpError(500), httpError(429), httpError(403), httpError(500), httpError(500), 'unchanged'] });
    f.start();
    const waits: number[] = [];
    for (let i = 0; i < 6; i++) {
      const next = clock.pending()[0];
      waits.push(next);
      await clock.advance(next);
    }
    expect(waits).toEqual([60_000, 120_000, 240_000, 480_000, 600_000, 600_000]);
    expect(f.state().failures).toBe(0);
    expect(clock.pending()).toEqual([60_000]);
  });

  it('stops for good on a 401: the sign-in screen the app already has takes over', async () => {
    const { f, clock } = setup({ reads: [httpError(401)] });
    f.start();
    await clock.advance(60_000);
    expect(f.state().stopped).toBe(true);
    expect(clock.pending()).toEqual([]);
    await f.check();
    expect(f.state().stopped).toBe(true);
  });
});

describe('reset (another spec or branch)', () => {
  it('forgets the etag, what it was holding and the failures, and starts counting again', async () => {
    const { f, clock, seen } = setup({ screen: [], reads: [ok([H('h2')], '"e1"'), httpError(500)] });
    f.start();
    await clock.advance(60_000);
    await clock.advance(60_000);
    expect(f.state().failures).toBe(1);
    f.reset();
    expect(f.state()).toMatchObject({ etag: null, incoming: null, newCount: 0, failures: 0, stopped: false });
    expect(clock.pending()).toEqual([60_000]);
    await clock.advance(60_000);
    expect(seen.at(-1)).toBeNull();
  });
});
