import { useState } from 'react';
import { Icon } from '../ui';
import type { HighlightColor } from '../project/types';
import { HL_COLORS } from './colors';

// Selection toolbar and note editor (specs/010-spec-annotations contracts/annotations-ui.md),
// ported from the design prototype (speckit/reader.jsx HlToolbar).

export interface ToolbarState {
  mode: 'new' | 'edit';
  /** Edited highlight. */
  id?: string;
  text: string;
  color?: HighlightColor;
  noteText?: string;
  noting?: boolean;
  /** Selection box in viewport coordinates. */
  x: number;
  top: number;
  bottom: number;
}

/** Fixed position: 52px above the selection, below it when there is no room, clamped 8px inside the viewport. */
export function toolbarPosition(tb: Pick<ToolbarState, 'x' | 'top' | 'bottom'>, noting: boolean, viewport: { width: number; height: number }) {
  const width = noting ? 320 : 300;
  const left = Math.max(8, Math.min(viewport.width - width - 8, tb.x - width / 2));
  const top = noting ? Math.min(viewport.height - 190, tb.bottom + 10) : (tb.top - 52 < 8 ? tb.bottom + 10 : tb.top - 52);
  return { left, top: Math.max(8, top), width };
}

export const quotePreview = (text: string) => text.length > 90 ? text.slice(0, 90) + '…' : text;

export interface HlToolbarProps {
  tb: ToolbarState;
  /** The author may recolour, edit and remove; others get Copy and Ask only (FR-011). */
  canEdit: boolean;
  /** The store cannot save (read-only token, protected branch, read-only folder). */
  readOnly: string | null;
  busy?: boolean;
  error?: string | null;
  /** A draft whose spec or step is no longer on screen (spec edge case). */
  stale?: string | null;
  viewport?: { width: number; height: number };
  /** There is no rail to write in (narrow layout): Add comment opens the floating editor instead, until the sheet exists. */
  inline?: boolean;
  onColor: (c: HighlightColor) => void;
  /** Saves the text typed in the floating editor: a new plain comment (no room for the rail) or the note of a highlight. */
  onNote: (text: string) => void;
  /** "Add comment": opens the composer in the rail (specs/012 FR-001, FR-002). */
  onComment: () => void;
  onCopy: () => void;
  onAsk: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function HlToolbar({ tb, canEdit, readOnly, busy, error, stale, viewport, inline, onColor, onNote, onComment, onCopy, onAsk, onDelete, onClose }: HlToolbarProps) {
  const [txt, setTxt] = useState(tb.noteText ?? '');
  const [noting, setNoting] = useState(!!tb.noting && canEdit && !readOnly);
  const adding = tb.mode === 'new';
  const vp = viewport ?? (typeof window !== 'undefined' ? { width: window.innerWidth, height: window.innerHeight } : { width: 1440, height: 900 });
  const pos = toolbarPosition(tb, noting, vp);
  const writable = canEdit && !readOnly;
  return <div className="sk-tb" role="dialog" aria-label="Highlight" style={pos}
    onMouseDown={e => { if ((e.target as HTMLElement).tagName !== 'TEXTAREA') e.preventDefault(); }}>
    {!noting ? <div className="sk-tb-row">
      {adding && canEdit && <>
        {/* The first thing in the bar: a comment needs no colour. Off, with the reason, when saving is not possible. */}
        <button type="button" className="sk-tb-b sk-tb-primary" aria-label="Add comment" aria-disabled={readOnly ? true : undefined} title={readOnly ?? undefined} disabled={busy}
          onClick={() => { if (readOnly) return; if (inline) setNoting(true); else onComment(); }}>Add comment</button>
        {writable && <span className="sk-tb-sep"></span>}
      </>}
      {writable && <>
        {HL_COLORS.map(c => <button type="button" key={c.key} className={'sk-tb-c hl-' + c.key + (tb.color === c.key ? ' on' : '')} title={c.meaning} aria-label={'Highlight ' + c.meaning} disabled={busy} onClick={() => onColor(c.key)}></button>)}
        <span className="sk-tb-sep"></span>
        {!adding && <button type="button" className="sk-tb-b" disabled={busy} onClick={() => setNoting(true)}>Note</button>}
      </>}
      <button type="button" className="sk-tb-b" onClick={onCopy}>Copy</button>
      <button type="button" className="sk-tb-b sk-tb-ai" onClick={onAsk}><span className="sk-ai-badge">AI</span>Ask</button>
      {tb.mode === 'edit' && writable && <button type="button" className="sk-tb-b" aria-label="Remove highlight" disabled={busy} onClick={onDelete}><Icon n="x" s={14} /></button>}
    </div> : <div className="sk-tb-note">
      <div className="sk-tb-quote">{quotePreview(tb.text)}</div>
      <textarea autoFocus rows={3} value={txt} maxLength={2000} placeholder={adding ? 'Add a comment…' : 'Add a note for the team…'} aria-label={adding ? 'Comment' : 'Note'}
        onChange={e => setTxt(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onNote(txt); if (e.key === 'Escape') onClose(); }}></textarea>
      <div className="sk-tb-acts"><span>Visible to approvers</span>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onNote(txt)}>{adding ? 'Comment' : 'Save note'}</button>
      </div>
    </div>}
    {(readOnly && !noting) || error || stale ? <div className="sk-tb-msg" role="status">{stale ?? error ?? readOnly}</div> : null}
  </div>;
}
