// Card layout of the comment rail (specs/012 FR-007, SC-003, research R2). Pure: no DOM.
import { describe, expect, it } from 'vitest';
import { layoutCards, railPlacement, type LayoutItem } from '../src/annotations/layout';

const item = (id: string, anchorTop: number, height = 60, createdAt = `2026-10-21T08:00:${id.slice(-2).padStart(2, '0')}.000Z`): LayoutItem => ({ id, anchorTop, height, createdAt });
const overlaps = (items: LayoutItem[], tops: Record<string, number>, gap = 8) => {
  const s = [...items].sort((a, b) => tops[a.id] - tops[b.id]);
  return s.slice(1).some((c, i) => tops[c.id] < tops[s[i].id] + s[i].height + gap - 1e-9);
};

describe('layoutCards', () => {
  it('puts a card at its anchor when nothing is in the way', () => {
    const items = [item('c1', 100), item('c2', 400), item('c3', 900)];
    expect(layoutCards(items, null)).toEqual({ c1: 100, c2: 400, c3: 900 });
  });

  it('pushes a card down when two anchors are close, keeping the gap, and never overlaps', () => {
    const items = [item('c1', 100), item('c2', 110), item('c3', 120)];
    const tops = layoutCards(items, null, 8);
    expect(tops).toEqual({ c1: 100, c2: 168, c3: 236 });
    expect(overlaps(items, tops)).toBe(false);
  });

  it('orders cards with the same anchor by creation time, then id', () => {
    const items = [item('c2', 100, 60, '2026-10-21T09:00:00.000Z'), item('c1', 100, 60, '2026-10-21T08:00:00.000Z'), item('c3', 100, 60, '2026-10-21T09:00:00.000Z')];
    const tops = layoutCards(items, null, 8);
    expect(tops.c1).toBe(100);
    expect(tops.c2).toBe(168);
    expect(tops.c3).toBe(236);
  });

  it('keeps the selected card at its anchor and pushes the cards above it up', () => {
    const items = [item('c1', 300), item('c2', 310), item('c3', 320)];
    const tops = layoutCards(items, 'c3', 8);
    expect(tops.c3).toBe(320);
    expect(tops.c2).toBe(320 - 8 - 60);
    expect(tops.c1).toBe(tops.c2 - 8 - 60);
    expect(overlaps(items, tops)).toBe(false);
  });

  it('runs the cards below the selected one after it', () => {
    const items = [item('c1', 100), item('c2', 110, 200), item('c3', 120)];
    const tops = layoutCards(items, 'c2', 8);
    expect(tops.c2).toBe(110);
    expect(tops.c3).toBe(110 + 200 + 8);
    expect(overlaps(items, tops)).toBe(false);
  });

  it('never moves a card above the top of the document, even for a selected card near the top', () => {
    const items = [item('c1', 0), item('c2', 10), item('c3', 20)];
    const tops = layoutCards(items, 'c3', 8);
    expect(Math.min(...Object.values(tops))).toBeGreaterThanOrEqual(0);
    expect(overlaps(items, tops)).toBe(false);
    // With no room above, the selected card gives way instead of overlapping.
    expect(tops.c3).toBeGreaterThanOrEqual(20);
  });

  it('keeps every card below the floor, for plain and selected layouts', () => {
    const items = [item('c1', 0), item('c2', 10), item('c3', 500)];
    for (const sel of [null, 'c1', 'c3']) {
      const tops = layoutCards(items, sel, 8, 44);
      expect(Math.min(...Object.values(tops))).toBeGreaterThanOrEqual(44);
      expect(overlaps(items, tops)).toBe(false);
    }
    expect(layoutCards([item('c1', 0)], null, 8, 44)).toEqual({ c1: 44 });
  });

  it('ignores a selected id that has no card', () => {
    const items = [item('c1', 100), item('c2', 110)];
    expect(layoutCards(items, 'missing', 8)).toEqual(layoutCards(items, null, 8));
  });

  it('returns nothing for no cards', () => {
    expect(layoutCards([], null)).toEqual({});
  });

  it('handles 200 random cards without overlap, in linear time (SC-006)', () => {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const items = Array.from({ length: 200 }, (_, i) => item('c' + String(i).padStart(3, '0'), Math.floor(rnd() * 6000), 60 + Math.floor(rnd() * 3) * 40));
    for (const sel of [null, 'c000', 'c100', 'c199']) {
      const t0 = performance.now();
      const tops = layoutCards(items, sel, 8);
      expect(performance.now() - t0).toBeLessThan(50);
      expect(Object.keys(tops)).toHaveLength(200);
      expect(overlaps(items, tops)).toBe(false);
      expect(Math.min(...Object.values(tops))).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('railPlacement (research R1)', () => {
  it('needs room for the whole reading column plus the rail, so the column keeps the reader\'s width', () => {
    // 32 start + 700 column + 364 end (300 rail + 2 x 32).
    expect(railPlacement(1095, 700).room).toBe(false);
    expect(railPlacement(1096, 700).room).toBe(true);
    expect(railPlacement(856, 700).room).toBe(false);
    expect(railPlacement(856, 500).room).toBe(false);
    expect(railPlacement(1336, 700).room).toBe(true);
  });

  it('starts the rail 24px after the column, which is centred in the space the rail leaves', () => {
    const { left } = railPlacement(1336, 700);
    const content = 1336 - 32 - 364;
    const colStart = 32 + (content - 700) / 2;
    expect(left).toBe(colStart + 700 + 24);
    expect(left + 300).toBeLessThanOrEqual(1336);
  });

  it('follows a narrower reading column', () => {
    expect(railPlacement(1000, 600).room).toBe(true);
    expect(railPlacement(1000, 700).room).toBe(false);
  });
});

