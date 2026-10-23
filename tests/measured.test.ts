// Which cards the rail measures and which keep the fixed closed height (specs/017-comment-item-layout, research R2). Synthetic data only.
import { describe, expect, it } from 'vitest';
import { CHIPS_ROW_HEIGHT, CHIPS_ROW_HEIGHT_COARSE, CLOSED_COARSE_EXTRA, isMeasured, outdatedExtra, toCards } from '../src/annotations/comments';
import type { Highlight } from '../src/project/types';

const H = (over: Partial<Highlight> = {}): Highlight => ({
  id: 'h1', phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'o', note: 'Why daily?',
  author: { login: 'mai' }, createdAt: '2026-10-21T08:30:00.000Z', updatedAt: '2026-10-21T08:30:00.000Z', ...over
});
const card = (over: Partial<Highlight> = {}) => toCards([H(over)], { h1: 100 }, {}, { login: 'mai' }).cards[0];
const plain = { open: false, coarse: false };

describe('isMeasured', () => {
  it('leaves a plain closed card at the fixed height', () => {
    expect(isMeasured(card(), plain)).toBe(false);
  });
  it('measures the open card or the one being edited (both are `open` for the card)', () => {
    expect(isMeasured(card(), { ...plain, open: true })).toBe(true);
  });
  it('measures a closed card that has emoji', () => {
    expect(isMeasured(card({ reactions: [{ emoji: '👍', author: { login: 'lan' } }] }), plain)).toBe(true);
  });
  it('measures every card on a touch screen', () => {
    expect(isMeasured(card(), { ...plain, coarse: true })).toBe(true);
  });
  it('an empty list of emoji does not count', () => {
    expect(isMeasured(card({ reactions: [] }), plain)).toBe(false);
  });
});

describe('outdatedExtra', () => {
  it('is 0 for a plain card', () => {
    expect(outdatedExtra(card(), false)).toBe(0);
  });
  it('adds a row for emoji, a taller one on a touch screen', () => {
    const withEmoji = card({ reactions: [{ emoji: '👍', author: { login: 'lan' } }] });
    expect(outdatedExtra(withEmoji, false)).toBe(CHIPS_ROW_HEIGHT);
    expect(outdatedExtra(withEmoji, true)).toBe(CLOSED_COARSE_EXTRA + CHIPS_ROW_HEIGHT_COARSE);
  });
  it('adds only the touch room to a card without emoji', () => {
    expect(outdatedExtra(card(), true)).toBe(CLOSED_COARSE_EXTRA);
  });
});
