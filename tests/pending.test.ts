// The queue of changes not saved yet (specs/016-deferred-save): the view it makes, and how it folds changes that cancel each
// other. Synthetic data only.
import { describe, expect, it } from 'vitest';
import { changeId, compactPending, foldPending, makePending, unsavedIds, type PendingChange } from '../src/annotations/pending';
import type { Highlight, HighlightChange } from '../src/project/types';

const mai = { login: 'mai' }, lan = { login: 'lan' };
const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'o', note: 'Why daily?',
  author: mai, createdAt: '2026-10-21T08:30:00.000Z', updatedAt: '2026-10-21T08:30:00.000Z', ...over
});
let tick = 0;
const q = (change: HighlightChange, by = mai): PendingChange => makePending(change, by, new Date(Date.UTC(2026, 9, 23, 9, 0, tick++)).toISOString());
const add = (id: string, note = 'A new note') => q({ type: 'add', highlight: H(id, { note }) });
const saved = [H('s1', { replies: [{ id: 'sr1', author: mai, createdAt: '2026-10-21T09:00:00.000Z', text: 'First' }] })];
// Times of editing do not matter, and an empty list is no list.
const strip = (items: Highlight[]) => JSON.parse(JSON.stringify(items, (k, v) => k === 'updatedAt' || k === 'editedAt' || (Array.isArray(v) && v.length === 0 && (k === 'reactions' || k === 'replies')) ? undefined : v));

describe('changeId', () => {
  it('names what a change is about', () => {
    expect(changeId({ type: 'add', highlight: H('h1') })).toBe('h1');
    expect(changeId({ type: 'update', id: 'h1', note: 'x' })).toBe('h1');
    expect(changeId({ type: 'reply', id: 'h1', reply: { id: 'r1', text: 'x' } })).toBe('r1');
    expect(changeId({ type: 'reply-edit', id: 'h1', replyId: 'r1', text: 'x' })).toBe('r1');
    expect(changeId({ type: 'react', id: 'h1', emoji: '👍', on: true })).toBe('h1:👍');
    expect(changeId({ type: 'react', id: 'h1', replyId: 'r1', emoji: '👍', on: true })).toBe('r1:👍');
  });
});

describe('foldPending', () => {
  it('is the saved list itself when nothing waits', () => {
    expect(foldPending(saved, []).items).toBe(saved);
  });

  it('applies each change on top of the saved list, in order', () => {
    const f = foldPending(saved, [add('n1'), q({ type: 'react', id: 's1', emoji: '👍', on: true }), q({ type: 'reply', id: 'n1', reply: { id: 'r1', text: 'Self reply' } })]);
    expect(f.items.map(h => h.id)).toEqual(['s1', 'n1']);
    expect(f.items[0].reactions).toEqual([{ emoji: '👍', author: mai }]);
    expect(f.items[1].replies?.map(r => r.text)).toEqual(['Self reply']);
    expect(f.applied).toBe(3);
    expect(f.skipped).toEqual([]);
  });

  it('skips a change whose target is gone and goes on with the others', () => {
    const f = foldPending(saved, [q({ type: 'reply', id: 'gone', reply: { id: 'r1', text: 'Lost' } }), q({ type: 'react', id: 's1', emoji: '❤️', on: true })]);
    expect(f.skipped).toEqual(['r1']);
    expect(f.applied).toBe(1);
    expect(f.items[0].reactions?.map(r => r.emoji)).toEqual(['❤️']);
  });

  it('does not count a change that changes nothing (already saved)', () => {
    const f = foldPending([H('n1')], [add('n1')]);
    expect(f.applied).toBe(0);
  });

  it('shows each change at the time it was made', () => {
    const at = '2026-10-23T09:00:00.000Z';
    const f = foldPending(saved, [makePending({ type: 'reply', id: 's1', reply: { id: 'r1', text: 'Early' } }, lan, at)]);
    const r = f.items[0].replies!.find(x => x.id === 'r1')!;
    expect(r.createdAt).toBe(at);
    expect(r.author).toEqual(lan);
  });

  it('does not change the saved list', () => {
    const before = JSON.stringify(saved);
    foldPending(saved, [q({ type: 'react', id: 's1', emoji: '👍', on: true })]);
    expect(JSON.stringify(saved)).toBe(before);
  });
});

describe('compactPending', () => {
  it('drops a comment that was never saved, with everything done on it', () => {
    expect(compactPending([add('n1'), q({ type: 'update', id: 'n1', note: 'x' }), q({ type: 'react', id: 'n1', emoji: '👍', on: true }), q({ type: 'remove', id: 'n1' })])).toEqual([]);
  });

  it('keeps the remove of a saved comment and drops what was queued on it before', () => {
    const r = compactPending([q({ type: 'update', id: 's1', note: 'x' }), q({ type: 'react', id: 's1', emoji: '👍', on: true }), q({ type: 'remove', id: 's1' })]);
    expect(r.map(x => x.change.type)).toEqual(['remove']);
  });

  it('folds an edit of a new comment into its add, and two edits of a saved one into one', () => {
    const a = compactPending([add('n1', 'first'), q({ type: 'update', id: 'n1', note: 'second' })]);
    expect(a).toHaveLength(1);
    expect(a[0].change).toMatchObject({ type: 'add', highlight: { id: 'n1', note: 'second' } });
    const b = compactPending([q({ type: 'update', id: 's1', note: 'one' }), q({ type: 'update', id: 's1', note: 'two' })]);
    expect(b).toHaveLength(1);
    expect(b[0].change).toMatchObject({ type: 'update', id: 's1', note: 'two' });
  });

  it('drops an emoji put and then taken back, and one put twice is one', () => {
    expect(compactPending([q({ type: 'react', id: 's1', emoji: '👍', on: true }), q({ type: 'react', id: 's1', emoji: '👍', on: false })])).toEqual([]);
    expect(compactPending([q({ type: 'react', id: 's1', emoji: '👍', on: true }), q({ type: 'react', id: 's1', emoji: '👍', on: true })])).toHaveLength(1);
  });

  it('keeps an emoji taken back and put again (the saved list decides), and follows the last change of the same emoji', () => {
    expect(compactPending([q({ type: 'react', id: 's1', emoji: '👍', on: false }), q({ type: 'react', id: 's1', emoji: '👍', on: true })])).toHaveLength(2);
    const r = compactPending([q({ type: 'react', id: 's1', emoji: '👍', on: false }), q({ type: 'react', id: 's1', emoji: '👍', on: true }), q({ type: 'react', id: 's1', emoji: '👍', on: false })]);
    expect(r.map(x => (x.change as { on: boolean }).on)).toEqual([false]);
  });

  it('keeps emoji on different targets or of different kinds apart', () => {
    const r = compactPending([q({ type: 'react', id: 's1', emoji: '👍', on: true }), q({ type: 'react', id: 's1', emoji: '❤️', on: false }), q({ type: 'react', id: 's1', replyId: 'sr1', emoji: '👍', on: false })]);
    expect(r).toHaveLength(3);
  });

  it('drops a reply sent and removed, and turns a reply sent and edited into the edited reply', () => {
    expect(compactPending([q({ type: 'reply', id: 's1', reply: { id: 'r1', text: 'a' } }), q({ type: 'react', id: 's1', replyId: 'r1', emoji: '👍', on: true }), q({ type: 'reply-remove', id: 's1', replyId: 'r1' })])).toEqual([]);
    const r = compactPending([q({ type: 'reply', id: 's1', reply: { id: 'r1', text: 'a' } }), q({ type: 'reply-edit', id: 's1', replyId: 'r1', text: 'b' })]);
    expect(r).toHaveLength(1);
    expect(r[0].change).toMatchObject({ type: 'reply', reply: { id: 'r1', text: 'b' } });
  });

  it('keeps the edit or the removal of a saved reply, one edit for two', () => {
    const e = compactPending([q({ type: 'reply-edit', id: 's1', replyId: 'sr1', text: 'one' }), q({ type: 'reply-edit', id: 's1', replyId: 'sr1', text: 'two' })]);
    expect(e).toHaveLength(1);
    expect(e[0].change).toMatchObject({ type: 'reply-edit', text: 'two' });
    const r = compactPending([q({ type: 'reply-edit', id: 's1', replyId: 'sr1', text: 'one' }), q({ type: 'reply-remove', id: 's1', replyId: 'sr1' })]);
    expect(r.map(x => x.change.type)).toEqual(['reply-remove']);
  });

  it('keeps the order of what stays', () => {
    const r = compactPending([add('n1'), q({ type: 'react', id: 's1', emoji: '👍', on: true }), add('n2')]);
    expect(r.map(x => x.id)).toEqual(['n1', 's1:👍', 'n2']);
  });

  it('gives the same comments and words as applying every change (every possible queue of up to 4 changes)', () => {
    const pool = (): PendingChange[] => [
      add('n1'), q({ type: 'update', id: 'n1', note: 'edited' }), q({ type: 'remove', id: 'n1' }),
      q({ type: 'react', id: 's1', emoji: '👍', on: true }), q({ type: 'react', id: 's1', emoji: '👍', on: false }),
      q({ type: 'reply', id: 's1', reply: { id: 'r9', text: 'sent' } }), q({ type: 'reply-edit', id: 's1', replyId: 'r9', text: 'edited reply' }), q({ type: 'reply-remove', id: 's1', replyId: 'r9' }),
      q({ type: 'update', id: 's1', note: 'changed' }), q({ type: 'react', id: 's1', replyId: 'sr1', emoji: '❤️', on: true }), q({ type: 'react', id: 's1', replyId: 'sr1', emoji: '❤️', on: false })
    ];
    // Only queues the page can make: a comment or reply is acted on while it exists, and an emoji is put when it is not there
    // and taken back when it is (the saved list has none of these emoji yet).
    const possible = (seq: PendingChange[]) => {
      let n1 = 'none', r9 = 'none';
      const on: Record<string, boolean> = {};
      for (const { change: c } of seq) {
        if (c.type === 'add') { if (n1 !== 'none') return false; n1 = 'live'; }
        else if (c.type === 'update' && c.id === 'n1') { if (n1 !== 'live') return false; }
        else if (c.type === 'remove') { if (n1 !== 'live') return false; n1 = 'dead'; }
        else if (c.type === 'reply') { if (r9 !== 'none') return false; r9 = 'live'; }
        else if (c.type === 'reply-edit') { if (r9 !== 'live') return false; }
        else if (c.type === 'reply-remove') { if (r9 !== 'live') return false; r9 = 'dead'; }
        else if (c.type === 'react') { const k = `${c.replyId ?? ''}${c.emoji}`; if (!!on[k] === c.on) return false; on[k] = c.on; }
      }
      return true;
    };
    const ops = pool();
    let checked = 0;
    const walk = (seq: PendingChange[], depth: number) => {
      if (!possible(seq)) return;
      if (seq.length) {
        expect(strip(foldPending(saved, compactPending(seq)).items), JSON.stringify(seq.map(s => s.change))).toEqual(strip(foldPending(saved, seq).items));
        checked++;
      }
      if (depth === 4) return;
      for (const o of ops) walk([...seq, o], depth + 1);
    };
    walk([], 0);
    expect(checked).toBeGreaterThan(500);
  });
});

describe('unsavedIds', () => {
  it('lists the comments and replies that wait, not the emoji', () => {
    const ids = unsavedIds([add('n1'), q({ type: 'update', id: 's1', note: 'x' }), q({ type: 'reply', id: 's1', reply: { id: 'r1', text: 'a' } }), q({ type: 'reply-edit', id: 's1', replyId: 'sr1', text: 'b' }), q({ type: 'react', id: 's1', emoji: '👍', on: true })]);
    expect([...ids].sort()).toEqual(['n1', 'r1', 's1', 'sr1']);
  });
});
