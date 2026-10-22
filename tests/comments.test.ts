// Pure logic of the comment rail (specs/012-docs-style-comment-flow): colours, brief order, cards,
// drafts, selection, save states and the freshness helpers. Synthetic data only.
import { describe, expect, it } from 'vitest';
import { HL_COLORS, HL_NONE, meaningOf } from '../src/annotations/colors';
import { briefNotes, readOnlyReason } from '../src/annotations/brief';
import { toCards, CLOSED_CARD_HEIGHT, draftKey, draftsElsewhere, draftsHere, type CommentDraft } from '../src/annotations/comments';
import type { Highlight } from '../src/project/types';

export const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'quoted text', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'y', note: '',
  author: { login: 'mai' }, createdAt: `2026-10-21T08:00:0${id.slice(-1)}.000Z`, updatedAt: `2026-10-21T08:00:0${id.slice(-1)}.000Z`, ...over
});

describe('colours (spec 012 FR-003)', () => {
  it('keeps four toolbar colours and adds a plain comment named Comment', () => {
    expect(HL_COLORS.map(c => c.key)).toEqual(['y', 'p', 'b', 'o']);
    expect(HL_NONE).toEqual({ key: 'n', meaning: 'Comment' });
    expect(meaningOf('n')).toBe('Comment');
    expect(meaningOf('p')).toBe('Issue');
  });
});

describe('briefNotes order (spec 012 FR-003, extends 010 FR-022)', () => {
  it('puts Issue first, then plain comments, then the other colours, each by creation time', () => {
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
      'mai: issue one', 'mai: issue two', 'mai: plain one', 'mai: plain two', 'mai: key one', 'mai: change one'
    ]);
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

