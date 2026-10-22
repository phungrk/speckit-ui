import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';

// The three-dot button and its menu on a comment or a reply (specs/014-comment-card-menu, contracts/card-menu-ui.md).

export interface MoreMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  /** Why the item cannot be used now (saving is off): it stays in the menu, off, with this as its tooltip. */
  disabledReason?: string | null;
}

/** One menu is open at a time: opening one tells the others. */
const OPENED = 'sk-more-menu-opened';

export interface MenuListProps {
  items: MoreMenuItem[];
  onPick: (item: MoreMenuItem) => void;
  /** Where the menu sits on screen (fixed, so a card or the sheet that clips its content does not clip it). */
  style?: React.CSSProperties;
  listRef?: React.Ref<HTMLDivElement>;
}

/** The menu itself, separate so it can be drawn open in tests. */
export function MenuList({ items, onPick, style, listRef }: MenuListProps) {
  return <div ref={listRef} className="sk-cm-menu" role="menu" aria-label="Actions" style={style}>
    {items.map(i => <button type="button" key={i.key} role="menuitem" className="sk-cm-menuitem" tabIndex={-1}
      aria-disabled={i.disabledReason ? true : undefined} title={i.disabledReason ?? undefined} onClick={() => onPick(i)}>{i.label}</button>)}
  </div>;
}

const MENU_W = 140;

export function MoreMenu({ label = 'More actions', items }: { label?: string; items: MoreMenuItem[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const close = (focusButton = false) => { setOpen(false); if (focusButton) button.current?.focus(); };
  const options = () => [...(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

  // Under the button, right edges together; above it when there is no room below, 8 px inside the screen.
  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const b = button.current.getBoundingClientRect();
    const h = list.current?.offsetHeight ?? items.length * 36 + 8;
    const top = b.bottom + 4 + h > window.innerHeight - 8 ? Math.max(8, b.top - 4 - h) : b.bottom + 4;
    setPos({ left: Math.max(8, Math.min(window.innerWidth - MENU_W - 8, b.right - MENU_W)), top });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // The menu is drawn hidden until it has its place; the first item takes the focus once it is shown.
  useEffect(() => { if (open && pos) options()[0]?.focus({ preventScroll: true }); }, [open, pos !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) close(); };
    const other = (e: Event) => { if ((e as CustomEvent).detail !== id) close(); };
    // Opening can scroll the page a little (the menu takes the focus, the sheet is at the foot): that is not the reader
    // leaving, so scrolling just after opening is ignored. Scrolling later closes the menu, which is placed from the button.
    const openedAt = Date.now();
    const away = (e: Event) => { if (e.type === 'scroll' && Date.now() - openedAt < 400) return; close(); };
    document.addEventListener('mousedown', down);
    document.addEventListener(OPENED, other);
    window.addEventListener('resize', away);
    window.addEventListener('scroll', away, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener(OPENED, other); window.removeEventListener('resize', away); window.removeEventListener('scroll', away, true); };
  }, [open, id]);

  const toggle = () => {
    if (open) { close(); return; }
    document.dispatchEvent(new CustomEvent(OPENED, { detail: id }));
    setPos(null);
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
    <button ref={button} type="button" className="sk-cm-more" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
    </button>
    {open && <MenuList listRef={list} items={items} style={pos ? { left: pos.left, top: pos.top, width: MENU_W } : { visibility: 'hidden', width: MENU_W }}
      onPick={i => { if (i.disabledReason) return; close(); i.onSelect(); }} />}
  </span>;
}
