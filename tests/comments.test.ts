// Pure logic of the comment rail (specs/012-docs-style-comment-flow): colours, brief order, cards,
// drafts, selection, save states and the freshness helpers. Synthetic data only.
import { describe, expect, it } from 'vitest';
import { HL_COLORS, HL_NONE, meaningOf } from '../src/annotations/colors';
import { briefNotes } from '../src/annotations/brief';
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

import { toCards, CLOSED_CARD_HEIGHT } from '../src/annotations/comments';

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
