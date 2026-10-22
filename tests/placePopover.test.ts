// Where a popover opens from its button (specs/015 research R5): the three-dot menu and the emoji picker.
import { describe, expect, it } from 'vitest';
import { placePopover } from '../src/annotations/usePopover';

const vp = { width: 1440, height: 900 };
const btn = (over: Partial<{ left: number; right: number; top: number; bottom: number }> = {}) => ({ left: 700, right: 728, top: 300, bottom: 328, ...over });
const size = { width: 140, height: 84 };

describe('placePopover', () => {
  it('opens under the button with the right edges together', () => {
    expect(placePopover(btn(), size, vp)).toEqual({ left: 728 - 140, top: 328 + 4 });
  });

  it('opens above the button when there is no room below', () => {
    const p = placePopover(btn({ top: 850, bottom: 878 }), size, vp);
    expect(p.top).toBe(850 - 4 - 84);
    expect(p.top + size.height).toBeLessThanOrEqual(850);
  });

  it('keeps 8 px inside the screen on the left and the right', () => {
    expect(placePopover(btn({ left: 0, right: 28 }), size, vp).left).toBe(8);
    expect(placePopover(btn({ left: 1420, right: 1448 }), size, vp).left).toBe(1440 - 140 - 8);
  });

  it('fits a 320 px phone', () => {
    for (const right of [20, 160, 320]) {
      const p = placePopover(btn({ left: right - 28, right }), size, { width: 320, height: 640 });
      expect(p.left).toBeGreaterThanOrEqual(8);
      expect(p.left + size.width).toBeLessThanOrEqual(320 - 8);
    }
  });

  it('never goes above the top edge when it is taller than the room on both sides', () => {
    const tall = { width: 140, height: 700 };
    expect(placePopover(btn({ top: 100, bottom: 128 }), tall, { width: 1440, height: 600 }).top).toBeGreaterThanOrEqual(8);
  });

  it('honours a bigger gap', () => {
    expect(placePopover(btn(), size, vp, 10).top).toBe(328 + 10);
  });
});
