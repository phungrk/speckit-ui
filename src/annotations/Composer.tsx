import { Avatar } from './Avatar';
import { quotePreview } from './Toolbar';

// The box a comment is written in (specs/012 contracts/comment-rail-ui.md, "Composer"): in the rail beside the
// text, with who is writing and what the comment is about. It is controlled: the Annotator keeps the drafts.

export interface ComposerProps {
  /** Who is writing: the signed-in user. */
  name: string;
  /** The text the comment is about. */
  quote: string;
  text: string;
  onText: (text: string) => void;
  onSubmit: () => void;
  /** Cancel or Escape. The Annotator asks before it throws away typed text. */
  onCancel: () => void;
  busy?: boolean;
  /** The user sent it empty: tell them, send nothing (FR-004). */
  invalid?: boolean;
  /** A save failed: the reason, with the text kept (010 FR-015). */
  error?: string | null;
  /** Cancel was pressed with text typed: ask before discarding (FR-005). */
  confirming?: boolean;
  onKeep?: () => void;
  onDiscard?: () => void;
  /** Top in the scroll container; absent when the composer sits in a sheet. */
  top?: number;
  autoFocus?: boolean;
  /** `aria-label` of the box and the label of the send button: a new comment, or an edit of one (specs/012 FR-002). */
  label?: string;
  submitLabel?: string;
}

export function Composer({ name, quote, text, onText, onSubmit, onCancel, busy, invalid, error, confirming, onKeep, onDiscard, top, autoFocus = true, label = 'New comment', submitLabel = 'Comment' }: ComposerProps) {
  return <article className="sk-cm-card sk-cm-draft" role="group" aria-label={label} style={top === undefined ? undefined : { top }}>
    <div className="sk-cm-who"><Avatar name={name} /><b>{name}</b></div>
    <q className="sk-cm-quote">{quotePreview(quote)}</q>
    <textarea rows={3} value={text} maxLength={2000} placeholder="Add a comment…" aria-label="Comment" autoFocus={autoFocus}
      aria-invalid={invalid ? true : undefined} aria-describedby={invalid ? 'sk-cm-need' : undefined}
      onChange={e => onText(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSubmit(); }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
      }}></textarea>
    {invalid && <p className="sk-cm-err" id="sk-cm-need">Write a comment first</p>}
    {error && <p className="sk-cm-err" role="alert">{error}</p>}
    {confirming
      ? <div className="sk-cm-acts"><span>Discard this comment?</span>
        <button type="button" className="btn btn-secondary" onClick={onKeep}>Keep editing</button>
        <button type="button" className="btn btn-primary" onClick={onDiscard}>Discard</button></div>
      : <div className="sk-cm-acts">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onSubmit}>{submitLabel}</button></div>}
  </article>;
}
