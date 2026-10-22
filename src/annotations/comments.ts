// View model of the comment rail (specs/012-docs-style-comment-flow, data-model.md). Pure: no DOM, so the
// four modes and the tests share it (constitution III).
import type { Highlight, HighlightAuthor } from '../project/types';
import { sameAuthor } from './brief';

/** Height of a closed card in the rail: fixed, so the layout needs no measuring (research R2). */
export const CLOSED_CARD_HEIGHT = 96;

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
