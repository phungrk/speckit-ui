// Vertical layout of the comment cards in the rail (specs/012 FR-007, research R2). Pure: no DOM.

export interface LayoutItem {
  id: string;
  /** Top of the commented text, in the scroll container's coordinates. */
  anchorTop: number;
  /** Height of the card: fixed for a closed card, measured for the selected one. */
  height: number;
  createdAt?: string;
}

/**
 * The `top` of every card: at the text it comments on, pushed down by the card above when they collide,
 * and never overlapping (the gap is kept). `floor` is the least `top` any card may have (the rail's header). The selected card keeps its own anchor when there is room above:
 * the cards before it move up, then the cards after it run on from it.
 */
export function layoutCards(items: LayoutItem[], selectedId: string | null, gap = 8, floor = 0): Record<string, number> {
  const sorted = [...items].sort((a, b) => a.anchorTop - b.anchorTop || (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id));
  const top = new Array<number>(sorted.length);
  const s = selectedId === null ? -1 : sorted.findIndex(c => c.id === selectedId);

  // Down from `from`, each card at its anchor or just below the one above it.
  const forward = (from: number, floor: number) => {
    let bottom = floor;
    for (let i = from; i < sorted.length; i++) {
      top[i] = Math.max(sorted[i].anchorTop, bottom);
      bottom = top[i] + sorted[i].height + gap;
    }
  };

  if (s <= 0) {
    forward(0, floor);
  } else {
    // The selected card stays at its anchor; the cards above are pushed up until they clear it.
    top[s] = sorted[s].anchorTop;
    let ceiling = top[s];
    for (let i = s - 1; i >= 0; i--) {
      top[i] = Math.min(sorted[i].anchorTop, ceiling - gap - sorted[i].height);
      ceiling = top[i];
    }
    // No room above the document: lay the first cards out from 0 and let the selected card give way.
    if (top[0] < floor) {
      let bottom = floor;
      for (let i = 0; i < s; i++) { top[i] = Math.max(top[i], bottom); bottom = top[i] + sorted[i].height + gap; }
      top[s] = Math.max(top[s], bottom);
    }
    forward(s + 1, top[s] + sorted[s].height + gap);
  }
  return Object.fromEntries(sorted.map((c, i) => [c.id, top[i]]));
}

/** Width of the rail, the space left of the reading column, and the gap between column and rail (reader.css). */
export const RAIL_W = 300;
const DOC_START = 32;
const RAIL_GAP = 24;
const DOC_END = RAIL_W + 2 * 32;

/**
 * Whether `.sk-doc` has room for the reading column AND the rail, and where the rail starts. The column keeps the
 * reader's chosen width (`measure`); the rail never squeezes it, it only appears when there is room (research R1).
 */
export function railPlacement(docWidth: number, measure: number): { room: boolean; left: number } {
  const content = docWidth - DOC_START - DOC_END;
  if (content < measure) return { room: false, left: 0 };
  return { room: true, left: DOC_START + (content - measure) / 2 + measure + RAIL_GAP };
}

