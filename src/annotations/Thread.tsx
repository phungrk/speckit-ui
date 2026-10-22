import { useState } from 'react';
import type { Highlight, HighlightAuthor, Reaction } from '../project/types';
import { MAX_REPLY } from '../../server/highlightsFile';
import { Avatar } from './Avatar';
import { authorLabel, relTime, sameAuthor } from './brief';
import { SaveNote } from './CommentRail';
import { MoreMenu } from './MoreMenu';
import type { SaveState } from './comments';
import { EMOJI_SET, groupReactions, reactionLabel } from './reactions';

// The discussion under a comment (specs/011-replies-reactions, contracts/thread-ui.md): emoji on the comment, the replies
// with their own emoji, and the box to answer. Drawn inside the card's `.sk-cm-thread`, in the rail or in the sheet.

export interface ReplyEditing {
  replyId: string;
  text: string;
  busy?: boolean;
  error?: string | null;
  onText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export interface ThreadProps {
  h: Highlight;
  me: HighlightAuthor | null;
  person?: (a: HighlightAuthor) => { name: string };
  now?: number;
  /** The save state of each reply and of each emoji on its way, by id. */
  save?: Record<string, SaveState>;
  /** Why saving is off (read-only token, protected branch, pinned commit), or null. Reading stays possible. */
  readOnly: string | null;
  /** The reply being written, and whether the last attempt to send it was empty. */
  draft: string;
  invalid?: boolean;
  onDraft: (text: string) => void;
  onSend: () => void;
  onRetry?: (replyId: string) => void;
  editing?: ReplyEditing | null;
  onEdit: (replyId: string) => void;
  onDelete: (replyId: string) => void;
  /** Sets (`on`) or clears the user's emoji on the comment (no `replyId`) or on one reply. */
  onReact: (replyId: string | undefined, emoji: string, on: boolean) => void;
  /** Said politely to a screen reader: reply sent, reaction added. */
  announce?: string;
}

export interface ReactionBarProps {
  list: Reaction[] | undefined;
  me: HighlightAuthor | null;
  person?: (a: HighlightAuthor) => { name: string };
  readOnly: string | null;
  /** What the "+" button says: the thing being reacted to. */
  what: string;
  onToggle: (emoji: string, on: boolean) => void;
}

/** The emoji on one comment or reply: a button for each emoji in use, and "+" for the set. */
export function ReactionBar({ list, me, person, readOnly, what, onToggle }: ReactionBarProps) {
  const [picking, setPicking] = useState(false);
  const name = person ? (a: HighlightAuthor) => person(a).name : authorLabel;
  const groups = groupReactions(list, me, name);
  const off = readOnly ? true : undefined;
  return <div className="sk-cm-react" role="group" aria-label={`Reactions on ${what}`}>
    {groups.map(g => <button type="button" key={g.emoji} className={'sk-cm-emoji' + (g.mine ? ' mine' : '')} aria-pressed={g.mine} aria-disabled={off}
      title={readOnly ?? reactionLabel(g)} aria-label={reactionLabel(g)} onClick={() => { if (!readOnly) onToggle(g.emoji, !g.mine); }}>{g.emoji}<b>{g.count}</b></button>)}
    <button type="button" className="sk-cm-emoji sk-cm-add" aria-label={`Add a reaction to ${what}`} aria-haspopup="true" aria-expanded={picking} aria-disabled={off} title={readOnly ?? 'Add a reaction'}
      onClick={() => { if (!readOnly) setPicking(p => !p); }}>+</button>
    {picking && <div className="sk-cm-picker" role="group" aria-label="Choose an emoji">
      {EMOJI_SET.map(e => {
        const mine = groups.some(g => g.emoji === e && g.mine);
        return <button type="button" key={e} className="sk-cm-emoji" aria-label={(mine ? 'Remove ' : 'React with ') + e} aria-pressed={mine}
          onClick={() => { setPicking(false); onToggle(e, !mine); }}>{e}</button>;
      })}
    </div>}
  </div>;
}

export function Thread({ h, me, person, now, save = {}, readOnly, draft, invalid, onDraft, onSend, onRetry, editing, onEdit, onDelete, onReact, announce }: ThreadProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [focused, setFocused] = useState(false);
  const replies = h.replies ?? [];
  const nameOf = (a: HighlightAuthor) => person ? person(a).name : authorLabel(a);
  const tooLong = draft.trim().length > MAX_REPLY;
  /** Cancel, and Escape: words in the box are asked about first; an empty box is just left. */
  const cancel = (box: HTMLElement | null) => { if (draft.trim()) setDiscarding(true); else { onDraft(''); setFocused(false); box?.blur(); } };
  const off = readOnly ? true : undefined;
  // Cancel and Reply are there while the box is being used: it has the focus or has words in it (specs/014 FR-010).
  const active = focused || draft.length > 0 || discarding;
  // Nothing in the thread is the card's own click: it must not select, or move the selection by arrow keys.
  return <div className="sk-cm-thr" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
    <ReactionBar list={h.reactions} me={me} person={person} readOnly={readOnly} what="this comment" onToggle={(emoji, on) => onReact(undefined, emoji, on)} />
    {replies.length > 0 && <ol className="sk-cm-replies" role="list" aria-label="Replies">
      {replies.map(r => {
        const mine = sameAuthor(me, r.author);
        const name = nameOf(r.author);
        const state = save[r.id];
        return <li key={r.id} className="sk-cm-reply">
          <div className="sk-cm-who"><Avatar name={name} /><b>{name}</b><span className="sk-cm-time">{relTime(r.createdAt, now)}</span>{r.editedAt && <span className="sk-cm-edited">edited</span>}
            {mine && editing?.replyId !== r.id && <MoreMenu label={`More actions for the reply by ${name}`} items={[
              { key: 'edit', label: 'Edit', disabledReason: readOnly, onSelect: () => onEdit(r.id) },
              { key: 'delete', label: 'Delete', disabledReason: readOnly, onSelect: () => setDeleting(r.id) }]} />}</div>
          {editing?.replyId === r.id
            ? <div className="sk-cm-reply-edit">
              <textarea aria-label="Edit reply" value={editing.text} rows={3} onChange={e => editing.onText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); editing.onSubmit(); } if (e.key === 'Escape') editing.onCancel(); }} />
              {editing.error && <div className="sk-cm-err" role="alert">{editing.error}</div>}
              <div className="sk-cm-acts">
                <button type="button" className="btn btn-secondary" onClick={editing.onCancel}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={editing.busy} onClick={editing.onSubmit}>Save</button>
              </div>
            </div>
            : <p className="sk-cm-text">{r.text}</p>}
          <ReactionBar list={r.reactions} me={me} person={person} readOnly={readOnly} what={`the reply by ${name}`} onToggle={(emoji, on) => onReact(r.id, emoji, on)} />
          {mine && deleting === r.id && <div className="sk-cm-acts"><span>Delete this reply?</span>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleting(null)}>Keep</button>
            <button type="button" className="btn btn-primary" onClick={() => { setDeleting(null); onDelete(r.id); }}>Delete</button></div>}
          {state && <SaveNote save={state} onRetry={onRetry ? () => onRetry(r.id) : undefined} />}
        </li>;
      })}
    </ol>}
    <div className={'sk-cm-reply-box' + (active ? ' active' : '')} onFocus={() => setFocused(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}>
      <textarea aria-label="Reply" placeholder="Reply…" value={draft} rows={active ? 3 : 1} aria-invalid={invalid || tooLong || undefined} disabled={!!readOnly} title={readOnly ?? undefined}
        onChange={e => { setDiscarding(false); onDraft(e.target.value); }}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (!readOnly && !tooLong) onSend(); }
          if (e.key === 'Escape') cancel(e.currentTarget);
        }} />
      {invalid && !draft.trim() && <div className="sk-cm-err" role="alert">Write a reply first</div>}
      {tooLong && <div className="sk-cm-err" role="alert">Replies are limited to {MAX_REPLY} characters ({draft.trim().length})</div>}
      {active && (discarding
        ? <div className="sk-cm-acts"><span>Discard this reply?</span>
          <button type="button" className="btn btn-secondary" onClick={() => setDiscarding(false)}>Keep editing</button>
          <button type="button" className="btn btn-primary" onClick={() => { setDiscarding(false); setFocused(false); onDraft(''); }}>Discard</button></div>
        : <div className="sk-cm-acts">
          <button type="button" className="btn btn-secondary" onClick={e => cancel(e.currentTarget.closest('.sk-cm-reply-box')?.querySelector('textarea') ?? null)}>Cancel</button>
          <button type="button" className="btn btn-primary" aria-disabled={off || (tooLong ? true : undefined)} title={readOnly ?? undefined}
            onClick={() => { if (!readOnly && !tooLong) onSend(); }}>Reply</button></div>)}
      {readOnly && <p className="sk-cm-why" role="status">{readOnly}</p>}
    </div>
    <div className="sk-cm-live" role="status" aria-live="polite">{announce ?? ''}</div>
  </div>;
}
