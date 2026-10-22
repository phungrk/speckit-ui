import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Highlight } from '../project/types';
import { HL_KEYS } from './colors';
import { locate, rangeFor, textNodes } from './anchor';

const ALL_COLORS = HL_KEYS;

export interface Anchored { h: Highlight; start: number; end: number; range: Range }
export interface Marker { id: string; color: Highlight['color']; top: number; left: number; author: Highlight['author'] }

/** What the rail asks the column to draw besides the highlights (specs/012). */
export interface Extra {
  /** The selected comment: drawn stronger, as `sk-sel-{colour}` (FR-008). */
  selectedId?: string | null;
  /** Where each comment being written sits in the column's text: drawn as `sk-draft` (FR-002), and its top is returned. */
  drafts?: { key: string; start: number; end: number }[];
}

type HighlightRegistry = { set(name: string, h: unknown): void; delete(name: string): void };
const registry = (): HighlightRegistry | null => {
  const css = (globalThis as { CSS?: { highlights?: HighlightRegistry } }).CSS;
  return css?.highlights && typeof (globalThis as { Highlight?: unknown }).Highlight === 'function' ? css.highlights : null;
};
const makeHighlight = (ranges: Range[]) => new (globalThis as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight(...ranges);

const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Draws `items` over the reading column with the CSS Custom Highlight API (research R6), without
 * touching the DOM; computes note pins and jumps to `focusId`. Re-runs after every render and resize.
 */
export function useHighlights(colRef: RefObject<HTMLElement | null>, docRef: RefObject<HTMLElement | null>, items: Highlight[], focusId: string | null, clearFocus: () => void, extra: Extra = {}) {
  const anchors = useRef<Anchored[]>([]);
  const scrolled = useRef<string | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [outdated, setOutdated] = useState<string[]>([]);
  // Top of every found highlight in the scroll container, for the cards of the rail (specs/012 FR-007).
  // `null` until the first measurement, so nothing is called Outdated before it has been looked for.
  const [tops, setTops] = useState<Record<string, number> | null>(null);
  const [draftTops, setDraftTops] = useState<Record<string, number>>({});
  const [, setTick] = useState(0);
  // Known only in the browser, so server rendering and the first paint match.
  const [unsupported, setUnsupported] = useState(false);
  useEffect(() => setUnsupported(registry() === null), []);

  useEffect(() => {
    const r = () => setTick(t => t + 1);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  useEffect(() => () => { const reg = registry(); if (reg) { for (const k of [...ALL_COLORS, 'focus', 'draft']) reg.delete('sk-' + k); for (const c of ALL_COLORS) reg.delete('sk-sel-' + c); } }, []);

  useEffect(() => {
    const root = colRef.current, sc = docRef.current;
    if (!root || !sc) return;
    const { text } = textNodes(root);
    const out: Anchored[] = [];
    const lost: string[] = [];
    for (const h of items) {
      const at = locate(text, h);
      const range = at && rangeFor(root, at.start, at.end);
      if (at && range) out.push({ h, start: at.start, end: at.end, range }); else lost.push(h.id);
    }
    anchors.current = out;
    const reg = registry();
    if (reg) {
      for (const c of ALL_COLORS) reg.set('sk-' + c, makeHighlight(out.filter(a => a.h.color === c).map(a => a.range)));
      // One selected comment at a time, in its own colour (specs/012 FR-008); the other names are cleared.
      const sel = extra.selectedId ? out.find(a => a.h.id === extra.selectedId) : undefined;
      for (const c of ALL_COLORS) reg.set('sk-sel-' + c, makeHighlight(sel && sel.h.color === c ? [sel.range] : []));
      reg.set('sk-draft', makeHighlight((extra.drafts ?? []).flatMap(d => rangeFor(root, d.start, d.end) ?? [])));
      const fa = out.find(a => a.h.id === focusId);
      reg.set('sk-focus', fa && !reduceMotion() ? makeHighlight([fa.range]) : makeHighlight([]));
    }
    // Pins sit in the right margin of the column, inside the scroll container (research R7).
    const scR = sc.getBoundingClientRect(), colR = root.getBoundingClientRect();
    const maxLeft = sc.clientWidth - 26;
    const next = out.filter(a => a.h.note).map(a => {
      const rr = a.range.getClientRects()[0] ?? a.range.getBoundingClientRect();
      return { id: a.h.id, color: a.h.color, author: a.h.author, top: Math.round(rr.top - scR.top + sc.scrollTop), left: Math.min(maxLeft, Math.round(colR.right - scR.left + 12)) };
    });
    if (JSON.stringify(next) !== JSON.stringify(markers)) setMarkers(next);
    const nextTops: Record<string, number> = {};
    for (const a of out) {
      const rr = a.range.getClientRects()[0] ?? a.range.getBoundingClientRect();
      nextTops[a.h.id] = Math.round(rr.top - scR.top + sc.scrollTop);
    }
    if (tops === null || JSON.stringify(nextTops) !== JSON.stringify(tops)) setTops(nextTops);
    const nextDrafts: Record<string, number> = {};
    for (const d of extra.drafts ?? []) {
      const range = rangeFor(root, d.start, d.end);
      if (!range) continue;
      const rr = range.getClientRects()[0] ?? range.getBoundingClientRect();
      nextDrafts[d.key] = Math.round(rr.top - scR.top + sc.scrollTop);
    }
    if (JSON.stringify(nextDrafts) !== JSON.stringify(draftTops)) setDraftTops(nextDrafts);
    if (JSON.stringify(lost) !== JSON.stringify(outdated)) setOutdated(lost);
    if (focusId) {
      const fa = out.find(a => a.h.id === focusId);
      if (fa && scrolled.current !== focusId) {
        scrolled.current = focusId;
        sc.scrollTop += fa.range.getBoundingClientRect().top - scR.top - 120;
      }
      const t = setTimeout(clearFocus, 1600);
      return () => clearTimeout(t);
    }
    scrolled.current = null;
  });

  return { anchors, markers, outdated, tops, draftTops, unsupported };
}
