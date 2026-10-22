// highlights.json of a spec (specs/010-spec-annotations): parse, change and serialize. Pure, shared by
// the GitHub reader, the local reader, the write path and the browser (constitution III).
import type { Highlight, HighlightAuthor, HighlightChange, HighlightColor, HighlightsFile, SpecHighlights } from '../src/project/types.ts';

export const HIGHLIGHTS_FILE = 'highlights.json';
export const MAX_BYTES = 512 * 1024;
export const MAX_NOTE = 2000;
const COLORS: readonly HighlightColor[] = ['y', 'b', 'p', 'o', 'n'];
const PHASE_NAMES: Record<string, string> = { constitution: 'Constitution', specify: 'Specify', clarify: 'Clarify', plan: 'Plan', tasks: 'Tasks', analyze: 'Analyze', implement: 'Implement' };

/** A refused change: the message is shown to the user as is. */
export class HighlightError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

const str = (v: unknown): v is string => typeof v === 'string';

function validAuthor(a: unknown): a is HighlightAuthor {
  if (!a || typeof a !== 'object') return false;
  const o = a as Record<string, unknown>;
  return str(o.login) || (str(o.name) && (o.local === true || o.demo === true));
}

function validHighlight(h: unknown): h is Highlight {
  if (!h || typeof h !== 'object') return false;
  const o = h as Record<string, unknown>;
  return str(o.id) && str(o.phase) && str(o.doc) && str(o.quote) && o.quote.length >= 2 && str(o.prefix) && str(o.suffix)
    && typeof o.startHint === 'number' && (o.docSha === null || str(o.docSha)) && COLORS.includes(o.color as HighlightColor)
    && str(o.note) && o.note.length <= MAX_NOTE && validAuthor(o.author) && str(o.createdAt) && str(o.updatedAt);
}

/** Reads highlights.json. A broken file gives an error, which blocks writing (FR-014). */
export function parseHighlights(text: string | null | undefined): SpecHighlights {
  if (text == null || text.trim() === '') return { items: [], error: null };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { items: [], error: 'highlights.json cannot be read; fix the file first.' }; }
  const o = data as Partial<HighlightsFile> | null;
  if (!o || o.version !== 1 || !Array.isArray(o.highlights)) return { items: [], error: 'highlights.json has an unknown format; fix the file first.' };
  const items = o.highlights.filter(validHighlight);
  const dropped = o.highlights.length - items.length;
  return { items, error: dropped ? `${dropped} highlight${dropped > 1 ? 's' : ''} in highlights.json could not be read; fix the file before saving.` : null };
}

export function serializeHighlights(items: Highlight[]): string {
  const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const ordered = sorted.map(h => ({ id: h.id, phase: h.phase, doc: h.doc, quote: h.quote, prefix: h.prefix, suffix: h.suffix, startHint: h.startHint, docSha: h.docSha, color: h.color, note: h.note, author: h.author, createdAt: h.createdAt, updatedAt: h.updatedAt }));
  return JSON.stringify({ version: 1, highlights: ordered }, null, 2) + '\n';
}

export const authorName = (a: HighlightAuthor) => 'login' in a ? a.login : a.name;
const sameAuthor = (a: HighlightAuthor, b: HighlightAuthor) => authorName(a) === authorName(b) && ('login' in a) === ('login' in b);

/** Applies one change on top of the latest items (research R2). `by` is who is saving. */
export function applyChange(items: Highlight[], change: HighlightChange, by: HighlightAuthor, now = new Date().toISOString()): Highlight[] {
  if (change.type === 'add') {
    const h = change.highlight;
    if (typeof (h as { note?: unknown })?.note === 'string' && h.note.length > MAX_NOTE) throw new HighlightError(`Notes are limited to ${MAX_NOTE} characters.`);
    if (!validHighlight(h)) throw new HighlightError('This highlight is incomplete.');
    if (items.some(x => x.id === h.id)) return items;
    return [...items, { ...h, author: by }];
  }
  const cur = items.find(x => x.id === change.id);
  if (!cur) throw new HighlightError('This highlight was removed by someone else.', 409);
  if (!sameAuthor(cur.author, by)) throw new HighlightError(`Only ${authorName(cur.author)} can change this highlight.`, 403);
  if (change.type === 'remove') return items.filter(x => x.id !== change.id);
  if (change.note !== undefined && change.note.length > MAX_NOTE) throw new HighlightError(`Notes are limited to ${MAX_NOTE} characters.`);
  if (change.color !== undefined && !COLORS.includes(change.color)) throw new HighlightError('Unknown colour.');
  return items.map(x => x.id === change.id ? { ...x, ...(change.color ? { color: change.color } : {}), ...(change.note !== undefined ? { note: change.note } : {}), updatedAt: now } : x);
}

/** The commit message (research R16); it always ends with [skip ci] (FR-010). */
export function commitMessage(change: HighlightChange, items: Highlight[], who: string): string {
  const h = change.type === 'add' ? change.highlight : items.find(x => x.id === change.id);
  // A plain comment (colour n, specs/012) is "commented"; the other colours keep "noted".
  const note = h?.color === 'n' ? 'commented' : 'noted';
  const verb = change.type === 'add' ? (change.highlight.note ? note : 'highlighted')
    : change.type === 'remove' ? 'removed a highlight'
      : change.note !== undefined ? note : 'recoloured';
  const quote = (h?.quote ?? '').replace(/\s+/g, ' ').slice(0, 60);
  return `${who} ${verb} on ${PHASE_NAMES[h?.phase ?? ''] ?? h?.phase ?? 'spec'}: "${quote}" [skip ci]`;
}

