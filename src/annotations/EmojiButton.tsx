import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { HighlightAuthor, Reaction } from '../project/types';
import { groupReactions } from './reactions';
import { EMOJI_SET } from './reactions';
import { usePopover } from './usePopover';

// The round button that floats at the right edge of a comment or a reply while it is under the pointer, and the six
// emoji it opens (specs/015-comment-hover, contracts/hover-ui.md). It replaces the "+" of specs/011.

export interface EmojiButtonProps {
  list: Reaction[] | undefined;
  me: HighlightAuthor | null;
  /** Why saving is off (read-only token, protected branch, pinned commit), or null. */
  readOnly: string | null;
  /** What the button is for: "this comment" or "the reply by NAME". */
  what: string;
  /** Sets (`on`) or clears the user's emoji. */
  onToggle: (emoji: string, on: boolean) => void;
  /** False on a closed card, whose controls stay out of the tab order (the open card has them). */
  tabbable?: boolean;
}

const PICKER_W = 212;

export interface PickerProps {
  mine: (emoji: string) => boolean;
  onPick: (emoji: string) => void;
  style?: React.CSSProperties;
  listRef?: (el: HTMLDivElement | null) => void;
}

/** The six emoji, drawn apart so a test can show them open. */
export function EmojiPicker({ mine, onPick, style, listRef }: PickerProps) {
  return <div ref={listRef} className="sk-cm-picker" role="group" aria-label="Choose an emoji" style={style}>
    {EMOJI_SET.map(e => <button type="button" key={e} className="sk-cm-emoji" aria-label={(mine(e) ? 'Remove ' : 'React with ') + e} aria-pressed={mine(e)} onClick={() => onPick(e)}>{e}</button>)}
  </div>;
}

export function EmojiButton({ list, me, readOnly, what, onToggle, tabbable = true }: EmojiButtonProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listEl = useRef<HTMLDivElement | null>(null);
  const close = (focusButton = false) => { setOpen(false); if (focusButton) button.current?.focus(); };
  const { pos, listRef, announce } = usePopover({ open, buttonRef: button, wrapRef: wrap, id, width: PICKER_W, estimatedHeight: 44, close: () => close() });
  const mine = (e: string) => groupReactions(list, me).some(g => g.emoji === e && g.mine);
  const choices = () => [...(listEl.current?.querySelectorAll<HTMLElement>('button') ?? [])];

  // The picker is drawn hidden until it has its place; then the first emoji takes the focus.
  useEffect(() => { if (open && pos) choices()[0]?.focus({ preventScroll: true }); }, [open, pos !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Not the card's: a click here must not select the card (and jump to its text), and the keys must not move the
  // selection on the rail or let go of it (specs/015 K1).
  const keys = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (!open) return;
    const all = choices();
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); all[(at + 1) % all.length]?.focus(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); all[(at <= 0 ? all.length : at) - 1]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close();
  };

  return <span ref={wrap} className={'sk-cm-float-wrap' + (open ? ' open' : '')} onKeyDown={keys} onClick={e => e.stopPropagation()}>
    <button ref={button} type="button" className="sk-cm-float" tabIndex={tabbable ? undefined : -1} aria-label={`Add a reaction to ${what}`} aria-haspopup="true" aria-expanded={open}
      aria-disabled={readOnly ? true : undefined} title={readOnly ?? 'Add a reaction'}
      onClick={() => { if (readOnly) return; if (open) { close(); return; } announce(); setOpen(true); }}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="11" cy="13" r="8" /><path d="M7.5 15.2c1 1.6 2.2 2.3 3.5 2.3s2.5-.7 3.5-2.3" /><circle cx="8.6" cy="11.4" r=".6" fill="currentColor" /><circle cx="13.4" cy="11.4" r=".6" fill="currentColor" />
        <path d="M19 2.5v5M16.5 5h5" />
      </svg>
    </button>
    {open && <EmojiPicker listRef={el => { listEl.current = el; listRef(el); }} mine={mine}
      style={pos ? { left: pos.left, top: pos.top, width: PICKER_W } : { visibility: 'hidden', width: PICKER_W }}
      onPick={emoji => { setOpen(false); onToggle(emoji, !mine(emoji)); }} />}
  </span>;
}
