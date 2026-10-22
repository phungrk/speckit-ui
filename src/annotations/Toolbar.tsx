import { Icon } from '../ui';

// The box that appears when text is selected (specs/013-comment-button-popup, contracts/selection-popup-ui.md):
// one button, Comment, on a light surface, like Google Docs. Colours, Copy, Ask and Delete live on the comment's card
// and on its entry in the Highlights tab. Specs/010 had a dark bar with all of them; specs/012 put Add comment first.

export interface ToolbarState {
  /** `new`: a selection. `edit`: a highlight of yours that has only a colour, to which Comment adds the note. */
  mode: 'new' | 'edit';
  /** The highlight a comment is added to (mode `edit`). */
  id?: string;
  text: string;
  /** Selection box in viewport coordinates. */
  x: number;
  top: number;
  bottom: number;
}

/** About as wide as the button: icon, gap, the word Comment, padding. */
const BUTTON_WIDTH = 132;
/** With a line of explanation under the button (saving is off, or a save failed). */
const NOTE_WIDTH = 260;
const HEIGHT = 44;

/** Fixed position: above the selection, below it when there is no room, kept 8px inside the viewport. */
export function toolbarPosition(tb: Pick<ToolbarState, 'x' | 'top' | 'bottom'>, viewport: { width: number; height: number }, withNote = false) {
  const width = Math.min(withNote ? NOTE_WIDTH : BUTTON_WIDTH, viewport.width - 16);
  const left = Math.max(8, Math.min(viewport.width - width - 8, tb.x - width / 2));
  const top = tb.top - HEIGHT < 8 ? tb.bottom + 10 : tb.top - HEIGHT;
  return { left, top: Math.max(8, top), ...(withNote ? { width } : {}) };
}

export const quotePreview = (text: string) => text.length > 90 ? text.slice(0, 90) + '…' : text;

export interface HlToolbarProps {
  tb: ToolbarState;
  /** The store cannot save (read-only token or account, protected branch, read-only folder): the button is off and says why. */
  readOnly: string | null;
  busy?: boolean;
  error?: string | null;
  viewport?: { width: number; height: number };
  /** Opens the composer in the rail, or in the sheet when narrow (specs/012 FR-001, FR-002). */
  onComment: () => void;
}

export function HlToolbar({ tb, readOnly, busy, error, viewport, onComment }: HlToolbarProps) {
  const vp = viewport ?? (typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : { width: 1440, height: 900 });
  const msg = error ?? readOnly;
  const pos = toolbarPosition(tb, vp, !!msg);
  return <div className="sk-tb" role="dialog" aria-label="Comment" style={pos}
    onMouseDown={e => e.preventDefault()}>
    <button type="button" className="sk-tb-b" aria-label="Comment" aria-disabled={readOnly ? true : undefined} title={readOnly ?? undefined} disabled={busy}
      onClick={() => { if (!readOnly) onComment(); }}><Icon n="note" s={14} />Comment</button>
    {msg ? <div className="sk-tb-msg" role="status">{msg}</div> : null}
  </div>;
}
