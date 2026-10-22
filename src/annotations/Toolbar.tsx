import { Icon } from '../ui';
import type { HighlightColor } from '../project/types';
import { HL_COLORS } from './colors';

// Selection toolbar (specs/010-spec-annotations contracts/annotations-ui.md, reshaped by specs/012: Add comment
// first, colours optional, no floating note editor: comments are written in the rail or the sheet).

export interface ToolbarState {
  mode: 'new' | 'edit';
  /** Edited highlight. */
  id?: string;
  text: string;
  color?: HighlightColor;
  /** Selection box in viewport coordinates. */
  x: number;
  top: number;
  bottom: number;
}

const WIDTH = 380;

/** Fixed position: 52px above the selection, below it when there is no room, clamped 8px inside the viewport. */
export function toolbarPosition(tb: Pick<ToolbarState, 'x' | 'top' | 'bottom'>, viewport: { width: number; height: number }) {
  const left = Math.max(8, Math.min(viewport.width - WIDTH - 8, tb.x - WIDTH / 2));
  const top = tb.top - 52 < 8 ? tb.bottom + 10 : tb.top - 52;
  return { left, top: Math.max(8, top), width: WIDTH };
}

export const quotePreview = (text: string) => text.length > 90 ? text.slice(0, 90) + '…' : text;

export interface HlToolbarProps {
  tb: ToolbarState;
  /** The author may recolour, comment and remove; others get Copy and Ask only (010 FR-011). */
  canEdit: boolean;
  /** Add comment is offered: for a new selection, and for a highlight of yours that has no note yet. */
  canComment?: boolean;
  /** The store cannot save (read-only token or account, protected branch, read-only folder). */
  readOnly: string | null;
  busy?: boolean;
  error?: string | null;
  viewport?: { width: number; height: number };
  onColor: (c: HighlightColor) => void;
  /** "Add comment": opens the composer in the rail or the sheet (specs/012 FR-001, FR-002). */
  onComment: () => void;
  onCopy: () => void;
  onAsk: () => void;
  onDelete: () => void;
}

export function HlToolbar({ tb, canEdit, canComment = tb.mode === 'new', readOnly, busy, error, viewport, onColor, onComment, onCopy, onAsk, onDelete }: HlToolbarProps) {
  const vp = viewport ?? (typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : { width: 1440, height: 900 });
  const pos = toolbarPosition(tb, vp);
  const writable = canEdit && !readOnly;
  return <div className="sk-tb" role="dialog" aria-label="Highlight" style={pos}
    onMouseDown={e => e.preventDefault()}>
    <div className="sk-tb-row">
      {canComment && canEdit && <>
        {/* The first thing in the bar: a comment needs no colour. Off, with the reason, when saving is not possible. */}
        <button type="button" className="sk-tb-b sk-tb-primary" aria-label="Add comment" aria-disabled={readOnly ? true : undefined} title={readOnly ?? undefined} disabled={busy}
          onClick={() => { if (!readOnly) onComment(); }}>Add comment</button>
        {writable && <span className="sk-tb-sep"></span>}
      </>}
      {writable && <>
        {HL_COLORS.map(c => <button type="button" key={c.key} className={'sk-tb-c hl-' + c.key + (tb.color === c.key ? ' on' : '')} title={c.meaning} aria-label={'Highlight ' + c.meaning} disabled={busy} onClick={() => onColor(c.key)}></button>)}
        <span className="sk-tb-sep"></span>
      </>}
      <button type="button" className="sk-tb-b" onClick={onCopy}>Copy</button>
      <button type="button" className="sk-tb-b sk-tb-ai" onClick={onAsk}><span className="sk-ai-badge">AI</span>Ask</button>
      {tb.mode === 'edit' && writable && <button type="button" className="sk-tb-b" aria-label="Remove highlight" disabled={busy} onClick={onDelete}><Icon n="x" s={14} /></button>}
    </div>
    {readOnly || error ? <div className="sk-tb-msg" role="status">{error ?? readOnly}</div> : null}
  </div>;
}
