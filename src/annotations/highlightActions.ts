import type { Highlight } from '../project/types';

/**
 * What can be done with a highlight once it is selected: on its card in the rail or the sheet, and on its entry in the
 * Highlights tab (specs/013 FR-008). The selection popup only comments, so these live here. One shape for both places.
 */
export interface HighlightActions {
  /** Copy the quoted text. Reads only, so open to everyone. */
  onCopy: (id: string) => void;
  /** Ask Copilot about the quoted text. Reads only, so open to everyone. */
  onAsk: (id: string) => void;
  /** Edit the note: cards only, since a colour-only highlight has none. */
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** The current user wrote this highlight (010 FR-011). */
  mine: (h: Highlight) => boolean;
  /** Why saving is off (read-only token or account, protected branch, pinned commit), or null. */
  readOnly: string | null;
}
