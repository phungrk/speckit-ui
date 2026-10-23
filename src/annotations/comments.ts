// View model of the comment rail (specs/012-docs-style-comment-flow, data-model.md). Pure: no DOM, so the
// four modes and the tests share it (constitution III).
import type { Highlight, HighlightAuthor } from '../project/types';
import type { Anchor } from './anchor';
import { sameAuthor } from './brief';

/** Height of a closed card in the rail: fixed by the CSS to this number, so the layout needs no measuring (research R2). */
export const CLOSED_CARD_HEIGHT = 124;

/** Room added to a closed card by a row of emoji, and by 44 px buttons on a touch screen (specs/017); only used to guess the height of the Outdated group, which is not placed. */
export const CHIPS_ROW_HEIGHT = 36;
export const CHIPS_ROW_HEIGHT_COARSE = 56;
export const CLOSED_COARSE_EXTRA = 30;

const hasEmoji = (card: CommentCard) => (card.highlight.reactions?.length ?? 0) > 0;

/**
 * Whether a card's height is measured (the open card, one being edited, one with a row of emoji, any on a touch screen)
 * or the fixed `CLOSED_CARD_HEIGHT` of a plain closed card (specs/017 research R2).
 */
export function isMeasured(card: CommentCard, { open, coarse }: { open: boolean; coarse: boolean }): boolean {
  return open || coarse || hasEmoji(card);
}

/** A guess of what a measured closed card adds to the Outdated group, over the fixed height. */
export function outdatedExtra(card: CommentCard, coarse: boolean): number {
  return (coarse ? CLOSED_COARSE_EXTRA : 0) + (hasEmoji(card) ? (coarse ? CHIPS_ROW_HEIGHT_COARSE : CHIPS_ROW_HEIGHT) : 0);
}

/** Where a change stands: reading from the file, being saved, saved (with where), or refused. */
export type SaveState =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'saved'; commit?: { sha: string; url: string }; where?: 'folder' | 'browser' }
  | { state: 'failed'; error: string };

export interface CommentCard {
  id: string;
  kind: 'comment';
  highlight: Highlight;
  /** Top of the commented text in the scroll container; null when the text is gone (Outdated, 010 FR-006). */
  anchorTop: number | null;
  height: number;
  outdated: boolean;
  save: SaveState;
  /** The signed-in author owns the card: only they edit or delete it (010 FR-011). */
  mine: boolean;
}

export interface Cards { cards: CommentCard[]; outdated: CommentCard[] }

/**
 * A comment is a highlight with a note; a highlight with only a colour has no card (spec FR-008).
 * `anchored` holds the top of each highlight whose text was found; the others are Outdated.
 */
export function toCards(items: Highlight[], anchored: Record<string, number>, pending: Record<string, SaveState>, me: HighlightAuthor | null): Cards {
  const make = (h: Highlight): CommentCard => ({
    id: h.id,
    kind: 'comment',
    highlight: h,
    anchorTop: anchored[h.id] ?? null,
    height: CLOSED_CARD_HEIGHT,
    outdated: anchored[h.id] === undefined,
    save: pending[h.id] ?? { state: 'idle' },
    mine: sameAuthor(me, h.author)
  });
  const commented = items.filter(h => h.note.trim()).map(make);
  const byPlace = (a: CommentCard, b: CommentCard) => (a.anchorTop ?? 0) - (b.anchorTop ?? 0) || a.highlight.createdAt.localeCompare(b.highlight.createdAt) || a.id.localeCompare(b.id);
  return {
    cards: commented.filter(c => !c.outdated).sort(byPlace),
    outdated: commented.filter(c => c.outdated).sort(byPlace)
  };
}

/** A comment being written and not sent yet. It lives in the page only (spec FR-005, research R5). */
export interface CommentDraft {
  key: string;
  /** The id the highlight gets when it is sent, kept across retries so a retry never makes a second comment. */
  id?: string;
  /** The comment is a note for a highlight that already exists (a colour-only one): sending it updates that highlight. */
  existingId?: string;
  slug: string;
  branch: string | null;
  phase: string;
  doc: string;
  anchor: Anchor;
  /** The version of the document the text was selected in (010 docSha). */
  docSha?: string | null;
  text: string;
}

type DraftPlace = { slug: string; branch: string | null; doc: string };

/** One draft per spec, branch, document and place in the text; the step is not part of it, a document is. */
export const draftKey = (t: DraftPlace, startHint: number) => `${t.slug}|${t.branch ?? ''}|${t.doc}|${startHint}`;

const same = (d: DraftPlace, t: DraftPlace) => d.slug === t.slug && d.branch === t.branch && d.doc === t.doc;

/** The drafts of the document on screen, in the order of the text. */
export const draftsHere = (drafts: Record<string, CommentDraft>, t: DraftPlace): CommentDraft[] =>
  Object.values(drafts).filter(d => same(d, t)).sort((a, b) => a.anchor.startHint - b.anchor.startHint);

/** How many unsent drafts with some text live in other documents, so the reader is told they are kept. */
export const draftsElsewhere = (drafts: Record<string, CommentDraft>, t: DraftPlace): number =>
  Object.values(drafts).filter(d => !same(d, t) && d.text.trim()).length;

/**
 * The comment under a click, among those whose text covers `offset`: the newest first, and the next one when the
 * same place is clicked again, round and round (research R13). Only commented highlights belong in `anchors`.
 */
export function pickOverlap(anchors: { id: string; start: number; end: number; createdAt: string }[], offset: number, current: string | null): string | null {
  const hits = anchors.filter(a => offset >= a.start && offset < a.end)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  if (hits.length === 0) return null;
  const at = hits.findIndex(h => h.id === current);
  return hits[at < 0 ? 0 : (at + 1) % hits.length].id;
}

/** The comment selected after a key on the rail: arrows move along it and stop at the ends; Escape lets go. */
export function nextSelection(ids: string[], current: string | null, key: 'ArrowUp' | 'ArrowDown' | 'Escape'): string | null {
  if (key === 'Escape' || ids.length === 0) return null;
  const at = current === null ? -1 : ids.indexOf(current);
  if (key === 'ArrowDown') return at < 0 ? ids[0] : ids[Math.min(at + 1, ids.length - 1)];
  return at < 0 ? ids[ids.length - 1] : ids[Math.max(at - 1, 0)];
}

// ---- Save states (spec FR-013) ----

export type PendingEvent =
  | { type: 'start' | 'retry' | 'clear'; id: string }
  | { type: 'ok'; id: string; commit?: { sha: string; url: string }; where?: 'folder' | 'browser' }
  | { type: 'fail'; id: string; error: string };

/**
 * The save state of each comment that is being saved or was just saved. A comment has at most one change in flight:
 * a second `start` changes nothing, and `retry` only restarts what failed, on the same id (so it is the same comment).
 */
export function reducePending(p: Record<string, SaveState>, e: PendingEvent): Record<string, SaveState> {
  const cur = p[e.id];
  switch (e.type) {
    case 'start': return cur?.state === 'sending' ? p : { ...p, [e.id]: { state: 'sending' } };
    case 'retry': return cur?.state === 'failed' ? { ...p, [e.id]: { state: 'sending' } } : p;
    case 'ok': return { ...p, [e.id]: { state: 'saved', ...(e.commit ? { commit: e.commit } : {}), ...(e.where ? { where: e.where } : {}) } };
    case 'fail': return { ...p, [e.id]: { state: 'failed', error: e.error } };
    case 'clear': { const next = { ...p }; delete next[e.id]; return next; }
  }
}

// ---- Other people's comments (spec FR-014) ----

export interface Incoming { added: Highlight[]; changed: Highlight[]; removed: string[]; newCount: number }

/**
 * What a newly read list has that the screen does not: new and changed highlights, and removed ones. `newCount` is
 * what the "New comments" badge shows: new or changed highlights that have a note (a colour is not a comment).
 */
export function diffIncoming(current: Highlight[], incoming: Highlight[]): Incoming {
  const have = new Map(current.map(h => [h.id, h]));
  const added = incoming.filter(h => !have.has(h.id));
  const changed = incoming.filter(h => have.has(h.id) && have.get(h.id)!.updatedAt !== h.updatedAt);
  const ids = new Set(incoming.map(h => h.id));
  return {
    added, changed,
    removed: current.filter(h => !ids.has(h.id)).map(h => h.id),
    newCount: [...added, ...changed].filter(h => h.note.trim()).length
  };
}

const POLL_MS = 60_000;
const POLL_MAX_MS = 600_000;

/** When to look again: a minute when all is well, twice as long after each failure up to ten minutes, never while hidden. */
export function nextPollDelay(failures: number, visible: boolean): number | null {
  if (!visible) return null;
  return Math.min(POLL_MS * 2 ** failures, POLL_MAX_MS);
}

