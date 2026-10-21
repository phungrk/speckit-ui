// Text-quote anchoring for highlights (specs/010-spec-annotations research R5). Offsets are over
// the reading column's textContent; the string functions are pure so they run in tests.

export interface Anchor { quote: string; prefix: string; suffix: string; startHint: number }

export const CONTEXT = 32;

/** At least two characters that are not whitespace (FR-001, toolbar trigger). */
export const selectionOk = (text: string) => text.replace(/\s/g, '').length >= 2;

/** The anchor for text[start, end), trimmed of surrounding whitespace; null when too short. */
export function anchorAt(text: string, start: number, end: number): Anchor | null {
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  const quote = text.slice(start, end);
  if (!selectionOk(quote)) return null;
  return { quote, prefix: text.slice(Math.max(0, start - CONTEXT), start), suffix: text.slice(end, end + CONTEXT), startHint: start };
}

/** Where the anchor is in `text`, or null when the quote is gone (Outdated). */
export function locate(text: string, a: Pick<Anchor, 'quote' | 'prefix' | 'suffix' | 'startHint'>): { start: number; end: number } | null {
  if (!a.quote) return null;
  let best: { start: number; score: number } | null = null;
  for (let i = text.indexOf(a.quote); i >= 0; i = text.indexOf(a.quote, i + 1)) {
    const before = text.slice(Math.max(0, i - a.prefix.length), i);
    const after = text.slice(i + a.quote.length, i + a.quote.length + a.suffix.length);
    // Context that matches outweighs distance; distance only breaks ties.
    const score = common(before, a.prefix, true) + common(after, a.suffix, false) - Math.abs(i - a.startHint) / 1e6;
    if (!best || score > best.score) best = { start: i, score };
  }
  return best ? { start: best.start, end: best.start + a.quote.length } : null;
}

/** Length of the shared run at the end (prefix) or start (suffix) of two strings. */
function common(x: string, y: string, fromEnd: boolean): number {
  let n = 0;
  const m = Math.min(x.length, y.length);
  while (n < m && (fromEnd ? x[x.length - 1 - n] === y[y.length - 1 - n] : x[n] === y[n])) n++;
  return n;
}

/** A short, synchronous version tag for a document's text (local and demo docSha): FNV-1a 32-bit. */
export function contentHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return 'h:' + (h >>> 0).toString(16).padStart(8, '0');
}

// DOM helpers over the reading column.

/** The column's text nodes in order with their start offsets. */
export function textNodes(root: Node): { text: string; nodes: { node: Text; start: number }[] } {
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let text = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { nodes.push({ node: n as Text, start: text.length }); text += (n as Text).data; }
  return { text, nodes };
}

/** A DOM range for text[start, end) of the column. */
export function rangeFor(root: Node, start: number, end: number): Range | null {
  const { nodes } = textNodes(root);
  const r = root.ownerDocument!.createRange();
  let started = false;
  for (const { node, start: s } of nodes) {
    const e = s + node.data.length;
    if (!started && start < e) { r.setStart(node, start - s); started = true; }
    if (started && end <= e) { r.setEnd(node, end - s); return r; }
  }
  return null;
}

/** The text offset of (node, offset) inside root, or -1. */
export function offsetIn(root: Node, node: Node, offset: number): number {
  if (!root.contains(node)) return -1;
  const pre = root.ownerDocument!.createRange();
  pre.selectNodeContents(root);
  try { pre.setEnd(node, offset); } catch { return -1; }
  return pre.toString().length;
}

/** The text offset under a point, via caretPositionFromPoint or caretRangeFromPoint. */
export function caretOffset(root: Node, x: number, y: number): number {
  const doc = root.ownerDocument as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  if (doc.caretPositionFromPoint) { const p = doc.caretPositionFromPoint(x, y); return p ? offsetIn(root, p.offsetNode, p.offset) : -1; }
  const r = doc.caretRangeFromPoint?.(x, y);
  return r ? offsetIn(root, r.startContainer, r.startOffset) : -1;
}
