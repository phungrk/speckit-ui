// Where the queue of unsaved changes waits, and how a save takes out only what it sent (specs/016-deferred-save).
// Synthetic data only; a fake Storage stands for the browser's.
import { describe, expect, it } from 'vitest';
import { MAX_PENDING, addToQueue, compactPending, makePending, parsePending, pendingKey, pendingStorage, removeSent, type PendingChange } from '../src/annotations/pending';
import type { Highlight } from '../src/project/types';

class FakeStorage implements Storage {
  data = new Map<string, string>();
  full = false;
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(k: string) { return this.data.get(k) ?? null; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) { if (this.full) throw new Error('QuotaExceededError'); this.data.set(k, v); }
}
const mai = { login: 'mai' };
const H = (id: string, note = 'A note'): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'o', note,
  author: mai, createdAt: '2026-10-21T08:30:00.000Z', updatedAt: '2026-10-21T08:30:00.000Z'
});
let tick = 0;
const at = () => new Date(Date.UTC(2026, 9, 23, 9, 0, tick++)).toISOString();
const add = (id: string) => makePending({ type: 'add', highlight: H(id) }, mai, at());
const react = (on: boolean) => makePending({ type: 'react', id: 's1', emoji: '👍', on }, mai, at());
const area = () => new FakeStorage();
const KEY = pendingKey('mai', 'o/r', 'main', '003-transfer-limits');

describe('pendingKey', () => {
  it('is one queue per account, repository, branch and spec', () => {
    const keys = new Set([KEY, pendingKey('lan', 'o/r', 'main', '003-transfer-limits'), pendingKey('mai', 'o/s', 'main', '003-transfer-limits'), pendingKey('mai', 'o/r', 'feat/x', '003-transfer-limits'), pendingKey('mai', 'o/r', 'main', '004-card-freeze')]);
    expect(keys.size).toBe(5);
  });
});

describe('pendingStorage', () => {
  it('loads what it saved, and nothing for a queue never saved', () => {
    const a = area(), s = pendingStorage('local', () => a);
    expect(s.load(KEY)).toEqual([]);
    const q = [add('n1'), react(true)];
    expect(s.save(KEY, 'main', '003-transfer-limits', q)).toBe(true);
    expect(s.load(KEY)).toEqual(q);
  });

  it('stores only the version, the place and the changes: no key, token or cookie', () => {
    const a = area(), s = pendingStorage('session', () => a);
    s.save(KEY, 'main', '003-transfer-limits', [add('n1')]);
    expect(Object.keys(JSON.parse(a.getItem(KEY)!)).sort()).toEqual(['branch', 'changes', 'slug', 'v']);
  });

  it('removes the entry when the queue is empty, and on clear', () => {
    const a = area(), s = pendingStorage('local', () => a);
    s.save(KEY, 'main', 'x', [add('n1')]);
    s.save(KEY, 'main', 'x', []);
    expect(a.getItem(KEY)).toBeNull();
    s.save(KEY, 'main', 'x', [add('n1')]);
    s.clear(KEY);
    expect(a.getItem(KEY)).toBeNull();
  });

  it('keeps the changes in the tab only (false) when storage is full or blocked', () => {
    const full = area(); full.full = true;
    expect(pendingStorage('local', () => full).save(KEY, 'main', 'x', [add('n1')])).toBe(false);
    expect(pendingStorage('local', () => null).save(KEY, 'main', 'x', [add('n1')])).toBe(false);
    expect(pendingStorage('local', () => { throw new Error('blocked'); }).load(KEY)).toEqual([]);
  });

  it('reads damaged, foreign or old-version values as an empty queue', () => {
    for (const raw of ['not json', '[]', '{"v":2,"changes":[]}', '{"v":1}', '{"v":1,"changes":"x"}', null]) expect(parsePending(raw as string | null)).toEqual([]);
    const good = add('n1');
    expect(parsePending(JSON.stringify({ v: 1, changes: [good, { id: 1 }, { id: 'x', at: 'y', by: {}, change: { type: 'nope' } }] }))).toEqual([good]);
  });

  it('holds at most MAX_PENDING changes', () => {
    const many = Array.from({ length: MAX_PENDING + 20 }, (_, i) => add('n' + i));
    expect(parsePending(JSON.stringify({ v: 1, changes: many }))).toHaveLength(MAX_PENDING);
  });

  it('lists the queues of a repository in every spec and branch, for one account only', () => {
    const a = area(), s = pendingStorage('local', () => a);
    s.save(KEY, 'main', '003-transfer-limits', [add('n1'), add('n2')]);
    s.save(pendingKey('mai', 'o/r', 'feat/x', '004-card-freeze'), 'feat/x', '004-card-freeze', [add('n3')]);
    s.save(pendingKey('lan', 'o/r', 'main', '003-transfer-limits'), 'main', '003-transfer-limits', [add('n4')]);
    s.save(pendingKey('mai', 'o/other', 'main', '003-transfer-limits'), 'main', '003-transfer-limits', [add('n5')]);
    a.setItem('sk.u.mai.pins', '[]');
    const l = s.list('mai', 'o/r').sort((x, y) => x.slug.localeCompare(y.slug));
    expect(l.map(x => [x.branch, x.slug, x.count])).toEqual([['main', '003-transfer-limits', 2], ['feat/x', '004-card-freeze', 1]]);
  });

  it('counts a list after folding, and leaves out a queue that folds to nothing', () => {
    const a = area(), s = pendingStorage('local', () => a);
    s.save(KEY, 'main', '003-transfer-limits', [react(true), react(false)]);
    expect(s.list('mai', 'o/r')).toEqual([]);
  });

  it('keeps the two kinds of storage apart', () => {
    const local = area(), session = area();
    pendingStorage('local', () => local).save(KEY, 'main', 'x', [add('n1')]);
    expect(pendingStorage('session', () => session).load(KEY)).toEqual([]);
  });
});

describe('a save that takes out only what it sent (research R10)', () => {
  const sent = (q: PendingChange[]) => compactPending(q);

  it('keeps what was done while the save ran', () => {
    const queue = [add('n1'), react(true)];
    const inFlight = sent(queue);
    const sending = new Set(inFlight.map(c => `${c.at}|${c.id}`));
    const during = add('n2');
    const grown = addToQueue(queue, sending, during);
    expect(removeSent(grown, inFlight)).toEqual([during]);
  });

  it('does not fold a later change into an entry on its way', () => {
    const n1 = add('n1');
    const sending = new Set([`${n1.at}|${n1.id}`]);
    const edit = makePending({ type: 'update', id: 'n1', note: 'edited after sending' }, mai, at());
    const grown = addToQueue([n1], sending, edit);
    expect(grown).toEqual([n1, edit]);
    // After the save worked, the edit is what is left to save.
    expect(removeSent(grown, [n1])).toEqual([edit]);
  });

  it('still folds changes that were not sent', () => {
    const grown = addToQueue([], new Set(), react(true));
    expect(addToQueue(grown, new Set(), react(false))).toEqual([]);
  });

  it('keeps everything when the save failed (nothing removed)', () => {
    const queue = [add('n1'), add('n2')];
    expect(removeSent(queue, [])).toEqual(queue);
  });
});
