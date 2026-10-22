// highlights.json of a spec (specs/010-spec-annotations): parse, change and serialize. Pure, shared by
// the GitHub reader, the local reader, the write path and the browser (constitution III).
import type { Highlight, HighlightAuthor, HighlightChange, HighlightColor, HighlightsFile, Reaction, Reply, SpecHighlights } from '../src/project/types.ts';

export const HIGHLIGHTS_FILE = 'highlights.json';
export const MAX_BYTES = 512 * 1024;
export const MAX_NOTE = 2000;
/** A reply is as long as a note may be (specs/011 FR-005). */
export const MAX_REPLY = MAX_NOTE;
/**
 * The emoji that can be put on a comment or a reply (specs/011 FR-007). Anything else in the file is ignored when read.
 * Changing this list needs a new file `version`: a build that does not know an emoji drops it on its next write.
 */
export const EMOJI: readonly string[] = ['👍', '❤️', '😄', '🎉', '😕', '👀'];
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

const authorName0 = (a: HighlightAuthor) => 'login' in a ? a.login : a.name;
/** One person, whichever way they sign in: a GitHub login and a typed name are not the same person. */
const personKey = (a: HighlightAuthor) => ('login' in a ? 'l:' : 'n:') + authorName0(a);

/** Emoji that are in the set and whose author is readable, once per (emoji, person). Anything else is left out. */
function readReactions(v: unknown): Reaction[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: Reaction[] = [];
  for (const r of v) {
    const o = r && typeof r === 'object' ? r as Record<string, unknown> : null;
    if (!o || !str(o.emoji) || !EMOJI.includes(o.emoji) || !validAuthor(o.author)) continue;
    const key = o.emoji + '|' + personKey(o.author);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ emoji: o.emoji, author: o.author });
  }
  return out;
}

/** A reply, or null when it cannot be read. */
function readReply(v: unknown): Reply | null {
  const o = v && typeof v === 'object' ? v as Record<string, unknown> : null;
  if (!o || !str(o.id) || !validAuthor(o.author) || !str(o.createdAt) || !str(o.text) || o.text.length > MAX_REPLY) return null;
  const reactions = readReactions(o.reactions);
  return { id: o.id, author: o.author, createdAt: o.createdAt, ...(str(o.editedAt) ? { editedAt: o.editedAt } : {}), text: o.text, ...(reactions.length ? { reactions } : {}) };
}

/** Reads highlights.json. A broken file gives an error, which blocks writing (FR-014). */
export function parseHighlights(text: string | null | undefined): SpecHighlights {
  if (text == null || text.trim() === '') return { items: [], error: null };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { items: [], error: 'highlights.json cannot be read; fix the file first.' }; }
  const o = data as Partial<HighlightsFile> | null;
  // 1 until a reply or an emoji was written, 2 after (specs/011 R1); an older build knows only 1 and refuses to write 2.
  if (!o || (o.version !== 1 && o.version !== 2) || !Array.isArray(o.highlights)) return { items: [], error: 'highlights.json has an unknown format; fix the file first.' };
  const items = o.highlights.filter(validHighlight);
  const dropped = o.highlights.length - items.length;
  let badReplies = 0;
  const read = items.map(h => {
    const raw = (h as unknown as { replies?: unknown }).replies;
    const replies: Reply[] = [];
    if (Array.isArray(raw)) for (const r of raw) { const x = readReply(r); if (x) replies.push(x); else badReplies++; }
    const reactions = readReactions((h as unknown as { reactions?: unknown }).reactions);
    const { replies: _r, reactions: _x, ...rest } = h as Highlight & { replies?: unknown; reactions?: unknown };
    return { ...rest, ...(replies.length ? { replies } : {}), ...(reactions.length ? { reactions } : {}) } as Highlight;
  });
  // A reply that cannot be read would be lost on the next write, so it blocks writing like an unreadable highlight (FR-014).
  const error = dropped ? `${dropped} highlight${dropped > 1 ? 's' : ''} in highlights.json could not be read; fix the file before saving.`
    : badReplies ? `${badReplies} repl${badReplies > 1 ? 'ies' : 'y'} in highlights.json could not be read; fix the file before saving.` : null;
  return { items: read, error };
}

const byEmoji = (a: Reaction, b: Reaction) => EMOJI.indexOf(a.emoji) - EMOJI.indexOf(b.emoji) || authorName0(a.author).localeCompare(authorName0(b.author));
const reactionsOut = (r: Reaction[] | undefined) => r?.length ? { reactions: [...r].sort(byEmoji).map(x => ({ emoji: x.emoji, author: x.author })) } : {};

export function serializeHighlights(items: Highlight[]): string {
  const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const ordered = sorted.map(h => ({
    id: h.id, phase: h.phase, doc: h.doc, quote: h.quote, prefix: h.prefix, suffix: h.suffix, startHint: h.startHint, docSha: h.docSha, color: h.color, note: h.note, author: h.author, createdAt: h.createdAt, updatedAt: h.updatedAt,
    ...reactionsOut(h.reactions),
    ...(h.replies?.length ? { replies: [...h.replies].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).map(r => ({ id: r.id, author: r.author, createdAt: r.createdAt, ...(r.editedAt ? { editedAt: r.editedAt } : {}), text: r.text, ...reactionsOut(r.reactions) })) } : {})
  }));
  const version = items.some(h => h.replies?.length || h.reactions?.length) ? 2 : 1;
  return JSON.stringify({ version, highlights: ordered }, null, 2) + '\n';
}

export const authorName = (a: HighlightAuthor) => 'login' in a ? a.login : a.name;
const sameAuthor = (a: HighlightAuthor, b: HighlightAuthor) => authorName(a) === authorName(b) && ('login' in a) === ('login' in b);

const touch = (items: Highlight[], id: string, now: string, fn: (h: Highlight) => Highlight) => items.map(x => x.id === id ? { ...fn(x), updatedAt: now } : x);
const cleanText = (text: unknown): string => {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) throw new HighlightError('Write a reply first.');
  if (t.length > MAX_REPLY) throw new HighlightError(`Replies are limited to ${MAX_REPLY} characters.`);
  return t;
};
const addReaction = (list: Reaction[] | undefined, emoji: string, by: HighlightAuthor): Reaction[] =>
  (list ?? []).some(r => r.emoji === emoji && sameAuthor(r.author, by)) ? list! : [...(list ?? []), { emoji, author: by }];
const dropReaction = (list: Reaction[] | undefined, emoji: string, by: HighlightAuthor): Reaction[] =>
  (list ?? []).filter(r => !(r.emoji === emoji && sameAuthor(r.author, by)));

/** Applies one change on top of the latest items (research R2). `by` is who is saving. */
export function applyChange(items: Highlight[], change: HighlightChange, by: HighlightAuthor, now = new Date().toISOString()): Highlight[] {
  if (change.type === 'add') {
    const h = change.highlight;
    if (typeof (h as { note?: unknown })?.note === 'string' && h.note.length > MAX_NOTE) throw new HighlightError(`Notes are limited to ${MAX_NOTE} characters.`);
    if (!validHighlight(h)) throw new HighlightError('This highlight is incomplete.');
    if (items.some(x => x.id === h.id)) return items;
    // A new comment starts with no replies and no emoji: those are other people's to give, never part of what a client sends in (specs/011 R12).
    const { replies: _r, reactions: _x, ...fresh } = h;
    return [...items, { ...fresh, author: by }];
  }
  const cur = items.find(x => x.id === change.id);
  if (!cur) throw new HighlightError('This highlight was removed by someone else.', 409);

  // Replies and emoji (specs/011): anyone who can save may reply and react; only the writer edits or removes a reply.
  if (change.type === 'reply') {
    const id = change.reply?.id;
    if (typeof id !== 'string' || !id || id.length > 64) throw new HighlightError('This reply is incomplete.');
    const text = cleanText(change.reply.text);
    if (cur.replies?.some(r => r.id === id)) return items;
    return touch(items, cur.id, now, h => ({ ...h, replies: [...(h.replies ?? []), { id, author: by, createdAt: now, text }] }));
  }
  if (change.type === 'reply-edit' || change.type === 'reply-remove') {
    const r = cur.replies?.find(x => x.id === change.replyId);
    if (!r) throw new HighlightError('This reply was removed by someone else.', 409);
    if (!sameAuthor(r.author, by)) throw new HighlightError(`Only ${authorName(r.author)} can change this reply.`, 403);
    if (change.type === 'reply-remove') return touch(items, cur.id, now, h => ({ ...h, replies: h.replies!.filter(x => x.id !== r.id) }));
    const text = cleanText(change.text);
    return touch(items, cur.id, now, h => ({ ...h, replies: h.replies!.map(x => x.id === r.id ? { ...x, text, editedAt: now } : x) }));
  }
  if (change.type === 'react') {
    if (typeof change.emoji !== 'string' || !EMOJI.includes(change.emoji)) throw new HighlightError('Unknown emoji.');
    const apply = (list: Reaction[] | undefined) => change.on ? addReaction(list, change.emoji, by) : dropReaction(list, change.emoji, by);
    if (change.replyId !== undefined) {
      const r = cur.replies?.find(x => x.id === change.replyId);
      if (!r) throw new HighlightError('This reply was removed by someone else.', 409);
      const next = apply(r.reactions);
      if (next.length === (r.reactions ?? []).length && (next === r.reactions || !change.on)) return items;
      return touch(items, cur.id, now, h => ({ ...h, replies: h.replies!.map(x => x.id === r.id ? { ...x, reactions: next } : x) }));
    }
    const next = apply(cur.reactions);
    if (next.length === (cur.reactions ?? []).length && (next === cur.reactions || !change.on)) return items;
    return touch(items, cur.id, now, h => ({ ...h, reactions: next }));
  }

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
      : change.type === 'reply' ? 'replied'
        : change.type === 'reply-edit' ? 'edited a reply'
          : change.type === 'reply-remove' ? 'removed a reply'
            : change.type === 'react' ? (change.on ? `reacted ${change.emoji}` : 'removed a reaction')
              : change.note !== undefined ? note : 'recoloured';
  const quote = (h?.quote ?? '').replace(/\s+/g, ' ').slice(0, 60);
  return `${who} ${verb} on ${PHASE_NAMES[h?.phase ?? ''] ?? h?.phase ?? 'spec'}: "${quote}" [skip ci]`;
}
