import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { usePopover } from './usePopover';

// The three-dot button and its menu on a comment or a reply (specs/014-comment-card-menu, contracts/card-menu-ui.md).

export interface MoreMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  /** Why the item cannot be used now (saving is off): it stays in the menu, off, with this as its tooltip. */
  disabledReason?: string | null;
}

export interface MenuListProps {
  items: MoreMenuItem[];
  onPick: (item: MoreMenuItem) => void;
  /** Where the menu sits on screen (fixed, so a card or the sheet that clips its content does not clip it). */
  style?: React.CSSProperties;
  listRef?: (el: HTMLDivElement | null) => void;
}

/** The menu itself, separate so it can be drawn open in tests. */
export function MenuList({ items, onPick, style, listRef }: MenuListProps) {
  return <div ref={listRef} className="sk-cm-menu" role="menu" aria-label="Actions" style={style}>
    {items.map(i => <button type="button" key={i.key} role="menuitem" className="sk-cm-menuitem" tabIndex={-1}
      aria-disabled={i.disabledReason ? true : undefined} title={i.disabledReason ?? undefined} onClick={() => onPick(i)}>{i.label}</button>)}
  </div>;
}

const MENU_W = 140;

export function MoreMenu({ label = 'More actions', items, tabbable = true }: { label?: string; items: MoreMenuItem[]; /** False on a closed card, whose controls stay out of the tab order (specs/017 R5). */ tabbable?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement | null>(null);

  const close = (focusButton = false) => { setOpen(false); if (focusButton) button.current?.focus(); };
  const options = () => [...(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
  const { pos, listRef, announce } = usePopover({ open, buttonRef: button, wrapRef: wrap, id, width: MENU_W, estimatedHeight: items.length * 36 + 8, close: () => close() });

  // The menu is drawn hidden until it has its place; the first item takes the focus once it is shown.
  useEffect(() => { if (open && pos) options()[0]?.focus({ preventScroll: true }); }, [open, pos !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    if (open) { close(); return; }
    announce();
    setOpen(true);
  };

  // The rail moves the selected comment with the arrow keys and the page lets go of it with Escape: not while this
  // menu has the keys (specs/014 K1).
  const keys = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (!open) { if (e.key === 'ArrowDown') { e.preventDefault(); toggle(); } return; }
    const all = options();
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); all[(at + 1) % all.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); all[(at <= 0 ? all.length : at) - 1]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); all[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); all[all.length - 1]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close();
  };

  return <span ref={wrap} className="sk-cm-more-wrap" onKeyDown={keys} onClick={e => e.stopPropagation()}>
    <button ref={button} type="button" className="sk-cm-more" tabIndex={tabbable ? undefined : -1} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
    </button>
    {open && <MenuList listRef={el => { list.current = el; listRef(el); }} items={items} style={pos ? { left: pos.left, top: pos.top, width: MENU_W } : { visibility: 'hidden', width: MENU_W }}
      onPick={i => { if (i.disabledReason) return; close(); i.onSelect(); }} />}
  </span>;
}
