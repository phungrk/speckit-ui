// Pure logic of the comment rail (specs/012-docs-style-comment-flow): colours, brief order, cards,
// drafts, selection, save states and the freshness helpers. Synthetic data only.
import { describe, expect, it } from 'vitest';
import { HL_KEYS } from '../src/annotations/colors';
import { briefNotes, readOnlyReason } from '../src/annotations/brief';
import { toCards, CLOSED_CARD_HEIGHT, diffIncoming, draftKey, draftsElsewhere, draftsHere, nextPollDelay, nextSelection, pickOverlap, reducePending, type CommentDraft, type SaveState } from '../src/annotations/comments';
import type { Highlight } from '../src/project/types';

export const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'quoted text', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'y', note: '',
  author: { login: 'mai' }, createdAt: `2026-10-21T08:00:0${id.slice(-1)}.000Z`, updatedAt: `2026-10-21T08:00:0${id.slice(-1)}.000Z`, ...over
});

describe('colours (spec 012 FR-003)', () => {
  it('keeps every colour a file may hold, for painting; none of them is chosen in the interface (specs/014)', () => {
    expect(HL_KEYS).toEqual(['y', 'p', 'b', 'o', 'n']);
  });
});

describe('briefNotes order (specs/014: by time, no longer by colour)', () => {
  it('lists the notes of a step in the order they were written, whatever their colour', () => {
    const items = [
      H('h1', { color: 'y', note: 'key one' }),
      H('h2', { color: 'n', note: 'plain one' }),
      H('h3', { color: 'p', note: 'issue one' }),
      H('h4', { color: 'o', note: 'change one' }),
      H('h5', { color: 'n', note: 'plain two' }),
      H('h6', { color: 'p', note: 'issue two' }),
      H('h7', { color: 'b', note: '   ' }),
      H('h8', { color: 'b', note: 'other step', phase: 'plan' })
    ];
    expect(briefNotes(items, 'specify')).toEqual([
      'mai: key one', 'mai: plain one', 'mai: issue one', 'mai: change one', 'mai: plain two', 'mai: issue two'
    ]);
  });

  it('breaks a tie in time by id, so the order is the same every time', () => {
    const at = '2026-10-21T08:00:00.000Z';
    expect(briefNotes([H('b', { note: 'second', createdAt: at }), H('a', { note: 'first', createdAt: at })], 'specify')).toEqual(['mai: first', 'mai: second']);
  });
});

describe('toCards (data-model: CommentCard)', () => {
  const me = { login: 'mai' };
  const items = [
    H('h1', { color: 'n', note: 'Plain comment' }),
    H('h2', { color: 'p', note: 'An issue', author: { login: 'lan' } }),
    H('h3', { color: 'y', note: '' }),
    H('h4', { color: 'b', note: '   ' }),
    H('h5', { color: 'o', note: 'Changed text' })
  ];

  it('makes a card for each highlight that has a note, not for colour-only highlights', () => {
    const { cards, outdated } = toCards(items, { h1: 120, h2: 400, h5: 700 }, {}, me);
    expect(cards.map(c => c.id)).toEqual(['h1', 'h2', 'h5']);
    expect(outdated).toEqual([]);
  });

  it('sets anchorTop, the closed height, and who owns the card', () => {
    const { cards } = toCards(items, { h1: 120, h2: 400, h5: 700 }, {}, me);
    expect(cards[0]).toMatchObject({ id: 'h1', kind: 'comment', anchorTop: 120, height: CLOSED_CARD_HEIGHT, mine: true, outdated: false, save: { state: 'idle' } });
    expect(cards[1].mine).toBe(false);
  });

  it('moves a commented highlight whose text is gone to the outdated group, without a top', () => {
    const { cards, outdated } = toCards(items, { h1: 120 }, {}, me);
    expect(cards.map(c => c.id)).toEqual(['h1']);
    expect(outdated.map(c => c.id)).toEqual(['h2', 'h5']);
    expect(outdated[0]).toMatchObject({ outdated: true, anchorTop: null });
  });

  it('carries the save state of a pending change and nobody owns a card when nobody is signed in', () => {
    const { cards } = toCards(items, { h1: 120 }, { h1: { state: 'sending' } }, null);
    expect(cards[0].save).toEqual({ state: 'sending' });
    expect(cards[0].mine).toBe(false);
  });

  it('orders by position, then creation time', () => {
    const { cards } = toCards([H('h2', { note: 'b' }), H('h1', { note: 'a' })], { h1: 50, h2: 50 }, {}, me);
    expect(cards.map(c => c.id)).toEqual(['h1', 'h2']);
  });

  it('keeps notes as plain text in the card (constitution II)', () => {
    const evil = '<img src=x onerror=alert(1)> **bold**';
    const { cards } = toCards([H('h1', { note: evil })], { h1: 0 }, {}, me);
    expect(cards[0].highlight.note).toBe(evil);
  });
});

describe('comment drafts (spec 012 FR-005, research R5)', () => {
  const t = { slug: '003-x', branch: 'feat/003-x' as string | null, doc: 'spec.md' };
  const D = (startHint: number, text: string, over: Partial<CommentDraft> = {}): CommentDraft => ({
    key: draftKey(t, startHint), ...t, phase: 'specify', anchor: { quote: 'q', prefix: '', suffix: '', startHint }, text, ...over
  });

  it('keys a draft by spec, branch, document and where the text starts', () => {
    expect(draftKey(t, 120)).toBe('003-x|feat/003-x|spec.md|120');
    expect(draftKey({ ...t, branch: null }, 120)).toBe('003-x||spec.md|120');
    expect(draftKey(t, 120)).not.toBe(draftKey(t, 121));
  });

  it('shows the drafts of this document in place order, whatever the step, and keeps the rest', () => {
    const all = Object.fromEntries([D(300, 'b'), D(100, 'a'), D(50, 'x', { ...t, doc: 'plan.md', key: draftKey({ ...t, doc: 'plan.md' }, 50) }), D(70, 'y', { slug: '004-y', key: draftKey({ ...t, slug: '004-y' }, 70) })].map(d => [d.key, d]));
    expect(draftsHere(all, t).map(d => d.text)).toEqual(['a', 'b']);
    // A draft for another step of the same document is the same draft: the step is not part of the key.
    expect(draftsHere(all, { ...t }).length).toBe(2);
    expect(Object.keys(all)).toHaveLength(4);
  });

  it('counts the unsent drafts that are not on screen, ignoring empty ones, so the reader is told (edge case)', () => {
    const other = { ...t, doc: 'plan.md' };
    const all = Object.fromEntries([D(100, 'a'), D(50, 'x', { ...other, key: draftKey(other, 50) }), D(60, '   ', { ...other, key: draftKey(other, 60) })].map(d => [d.key, d]));
    expect(draftsElsewhere(all, t)).toBe(1);
    expect(draftsElsewhere(all, other)).toBe(1);
  });

  it('keeps a branch\'s drafts apart from the same spec on another branch', () => {
    const main = { ...t, branch: 'main' as string | null };
    const all = Object.fromEntries([D(100, 'on feat')].map(d => [d.key, d]));
    expect(draftsHere(all, main)).toEqual([]);
    expect(draftsElsewhere(all, main)).toBe(1);
  });
});

describe('why saving is off (spec 012 FR-016, research R16)', () => {
  const base = { pinned: false, ref: 'main', repo: 'o/a', canWrite: null as boolean | null };
  it('says nothing when nothing stops the user', () => {
    expect(readOnlyReason(base, null, null)).toBeNull();
    expect(readOnlyReason({ ...base, canWrite: true }, null, null)).toBeNull();
  });
  it('explains a read-only account before any write is tried, and how to fix it', () => {
    expect(readOnlyReason({ ...base, canWrite: false }, null, null)).toBe('Your GitHub account has read-only access to o/a. Ask for write access to comment.');
  });
  it('keeps the order: pinned, then a broken file, then a read-only account, then a refused save', () => {
    const all = { ...base, pinned: true, canWrite: false };
    expect(readOnlyReason(all, 'highlights.json cannot be read', 'refused')).toMatch(/pinned to main/);
    expect(readOnlyReason({ ...all, pinned: false }, 'highlights.json cannot be read', 'refused')).toBe('highlights.json cannot be read');
    expect(readOnlyReason({ ...all, pinned: false }, null, 'refused')).toMatch(/read-only access/);
    expect(readOnlyReason(base, null, 'Your token cannot commit to main.')).toBe('Your token cannot commit to main.');
  });
});

describe('pickOverlap (spec 012 research R13)', () => {
  const a = (id: string, start: number, end: number, createdAt: string) => ({ id, start, end, createdAt });
  const anchors = [a('c1', 10, 50, '2026-10-21T08:00:00.000Z'), a('c2', 30, 70, '2026-10-21T09:00:00.000Z'), a('c3', 100, 120, '2026-10-21T07:00:00.000Z')];

  it('finds nothing where no comment is', () => {
    expect(pickOverlap(anchors, 5, null)).toBeNull();
    expect(pickOverlap(anchors, 80, null)).toBeNull();
    expect(pickOverlap(anchors, -1, null)).toBeNull();
  });

  it('picks the only comment at a place', () => {
    expect(pickOverlap(anchors, 15, null)).toBe('c1');
    expect(pickOverlap(anchors, 110, null)).toBe('c3');
  });

  it('picks the newest where comments overlap, and goes to the next on another click, round and round', () => {
    expect(pickOverlap(anchors, 40, null)).toBe('c2');
    expect(pickOverlap(anchors, 40, 'c2')).toBe('c1');
    expect(pickOverlap(anchors, 40, 'c1')).toBe('c2');
  });

  it('starts again with the newest when the selected comment is not at that place', () => {
    expect(pickOverlap(anchors, 40, 'c3')).toBe('c2');
  });

  it('does not include the end offset, which belongs to the text after', () => {
    expect(pickOverlap(anchors, 50, null)).toBe('c2');
    expect(pickOverlap(anchors, 70, null)).toBeNull();
  });
});

describe('nextSelection (spec 012 FR-008, keyboard)', () => {
  const ids = ['c1', 'c2', 'c3'];
  it('moves down and up the rail and stops at the ends', () => {
    expect(nextSelection(ids, null, 'ArrowDown')).toBe('c1');
    expect(nextSelection(ids, 'c1', 'ArrowDown')).toBe('c2');
    expect(nextSelection(ids, 'c3', 'ArrowDown')).toBe('c3');
    expect(nextSelection(ids, 'c2', 'ArrowUp')).toBe('c1');
    expect(nextSelection(ids, 'c1', 'ArrowUp')).toBe('c1');
    expect(nextSelection(ids, null, 'ArrowUp')).toBe('c3');
  });
  it('lets go on Escape and ignores a selection that is not in the rail', () => {
    expect(nextSelection(ids, 'c2', 'Escape')).toBeNull();
    expect(nextSelection(ids, 'gone', 'ArrowDown')).toBe('c1');
    expect(nextSelection([], null, 'ArrowDown')).toBeNull();
  });
});

describe('closed card height', () => {
  it('is a number the CSS and the layout share (a closed card has exactly this height)', () => {
    expect(CLOSED_CARD_HEIGHT).toBeGreaterThanOrEqual(120);
  });
});

describe('reducePending (spec 012 FR-013, data-model SaveState)', () => {
  const sending: Record<string, SaveState> = { a: { state: 'sending' } };

  it('goes from sending to saved with the commit, or to failed with the reason', () => {
    let p = reducePending({}, { type: 'start', id: 'a' });
    expect(p).toEqual(sending);
    p = reducePending(p, { type: 'ok', id: 'a', commit: { sha: 'abc1234def', url: 'https://x/c/abc' } });
    expect(p.a).toEqual({ state: 'saved', commit: { sha: 'abc1234def', url: 'https://x/c/abc' } });
    const f = reducePending(sending, { type: 'fail', id: 'a', error: 'Your token cannot commit to main.' });
    expect(f.a).toEqual({ state: 'failed', error: 'Your token cannot commit to main.' });
  });

  it('says where a comment was saved when there is no commit (local folder, this browser)', () => {
    expect(reducePending(sending, { type: 'ok', id: 'a', where: 'folder' }).a).toEqual({ state: 'saved', where: 'folder' });
    expect(reducePending(sending, { type: 'ok', id: 'a', where: 'browser' }).a).toEqual({ state: 'saved', where: 'browser' });
  });

  it('never has two changes sending for one id: a second start changes nothing', () => {
    expect(reducePending(sending, { type: 'start', id: 'a' })).toBe(sending);
  });

  it('retries only what failed, on the same id', () => {
    const failed = reducePending(sending, { type: 'fail', id: 'a', error: 'x' });
    expect(reducePending(failed, { type: 'retry', id: 'a' }).a).toEqual({ state: 'sending' });
    expect(reducePending(sending, { type: 'retry', id: 'a' })).toBe(sending);
    expect(reducePending({}, { type: 'retry', id: 'zz' })).toEqual({});
  });

  it('keeps other ids as they are and forgets one on clear', () => {
    const two = reducePending(sending, { type: 'start', id: 'b' });
    expect(Object.keys(two)).toEqual(['a', 'b']);
    expect(Object.keys(reducePending(two, { type: 'clear', id: 'a' }))).toEqual(['b']);
  });

  it('does not change the object it was given', () => {
    const before = { a: { state: 'sending' } as SaveState };
    reducePending(before, { type: 'ok', id: 'a' });
    expect(before.a).toEqual({ state: 'sending' });
  });
});

describe('diffIncoming (spec 012 FR-014)', () => {
  const cur = [H('h1', { note: 'mine', updatedAt: '2026-10-21T08:00:01.000Z' }), H('h2', { note: 'theirs', updatedAt: '2026-10-21T08:00:02.000Z' })];

  it('counts nothing when nothing differs', () => {
    expect(diffIncoming(cur, cur.map(h => ({ ...h })))).toEqual({ added: [], changed: [], removed: [], newCount: 0 });
  });

  it('counts a new comment and a changed one, not a colour-only highlight or a removal', () => {
    const incoming = [
      cur[0],
      H('h2', { note: 'theirs, edited', updatedAt: '2026-10-21T09:00:00.000Z' }),
      H('h3', { note: 'brand new', updatedAt: '2026-10-21T09:05:00.000Z' }),
      H('h4', { note: '', color: 'y', updatedAt: '2026-10-21T09:06:00.000Z' })
    ];
    const d = diffIncoming(cur, incoming);
    expect(d.added.map(h => h.id)).toEqual(['h3', 'h4']);
    expect(d.changed.map(h => h.id)).toEqual(['h2']);
    expect(d.newCount).toBe(2);
    expect(diffIncoming(cur, [cur[0]]).removed).toEqual(['h2']);
    expect(diffIncoming(cur, [cur[0]]).newCount).toBe(0);
  });

  it('counts a reply or an emoji from somebody else as a change, because saving one touches updatedAt (specs/011 R7)', () => {
    const replied = { ...cur[1], updatedAt: '2026-10-22T09:00:00.000Z', replies: [{ id: 'r_1', author: { login: 'lan' }, createdAt: '2026-10-22T09:00:00.000Z', text: 'a reply' }] };
    const d = diffIncoming(cur, [cur[0], replied]);
    expect(d.changed.map(h => h.id)).toEqual(['h2']);
    expect(d.newCount).toBe(1);
    const reacted = { ...cur[1], updatedAt: '2026-10-22T09:05:00.000Z', reactions: [{ emoji: '👍', author: { login: 'lan' } }] };
    expect(diffIncoming(cur, [cur[0], reacted]).newCount).toBe(1);
    // What this user just saved is already on screen with the same updatedAt: nothing to report.
    expect(diffIncoming([cur[0], replied], [cur[0], { ...replied }]).newCount).toBe(0);
  });

  it('does not count what this user just saved, which the screen already has', () => {
    const mine = H('h9', { note: 'just saved', updatedAt: '2026-10-21T10:00:00.000Z' });
    expect(diffIncoming([...cur, mine], [...cur, { ...mine }]).newCount).toBe(0);
  });
});

describe('nextPollDelay (spec 012 FR-014, contracts/refresh-api.md)', () => {
  it('is 60 s when all is well, and nothing when the tab is hidden', () => {
    expect(nextPollDelay(0, true)).toBe(60_000);
    expect(nextPollDelay(0, false)).toBeNull();
    expect(nextPollDelay(5, false)).toBeNull();
  });
  it('doubles after each failure up to ten minutes', () => {
    expect([1, 2, 3, 4, 5, 9].map(n => nextPollDelay(n, true))).toEqual([120_000, 240_000, 480_000, 600_000, 600_000, 600_000]);
  });
});

