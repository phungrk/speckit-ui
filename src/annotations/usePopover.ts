import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

// A small box that opens from a button and is placed from it: the three-dot menu and the emoji picker (specs/015 research R5).
// It is fixed, so a card or the sheet that clips its content does not clip it.

export interface Placement { left: number; top: number }

/** Under the button, right edges together; above it when there is no room below; kept 8 px inside the screen. */
export function placePopover(
  button: { left: number; right: number; top: number; bottom: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 4
): Placement {
  const left = Math.max(8, Math.min(viewport.width - size.width - 8, button.right - size.width));
  const top = button.bottom + gap + size.height > viewport.height - 8 ? Math.max(8, button.top - gap - size.height) : button.bottom + gap;
  return { left, top };
}

/** One popover is open at a time: opening one tells the others. */
export const POPOVER_OPENED = 'sk-popover-opened';

export interface UsePopover {
  open: boolean;
  buttonRef: RefObject<HTMLElement | null>;
  /** The wrapper of the button and its popover: a click inside it is not a click outside. */
  wrapRef: RefObject<HTMLElement | null>;
  /** Tells the popovers apart for the one-at-a-time rule. */
  id: string;
  width: number;
  /** Used until the popover is on screen and can be measured. */
  estimatedHeight: number;
  close: () => void;
}

export function usePopover({ open, buttonRef, wrapRef, id, width, estimatedHeight, close }: UsePopover) {
  const [pos, setPos] = useState<Placement | null>(null);
  const [listEl, setListEl] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const b = buttonRef.current?.getBoundingClientRect();
    if (!b) return;
    setPos(placePopover(b, { width, height: listEl?.offsetHeight || estimatedHeight }, { width: window.innerWidth, height: window.innerHeight }));
  }, [open, listEl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) close(); };
    const other = (e: Event) => { if ((e as CustomEvent).detail !== id) close(); };
    // Opening can scroll the page a little (the popover takes the focus, the sheet is at the foot): that is not the reader
    // leaving, so scrolling just after opening is ignored. Scrolling later closes it, since it is placed from the button.
    const openedAt = Date.now();
    const away = (e: Event) => { if (e.type === 'scroll' && Date.now() - openedAt < 400) return; close(); };
    document.addEventListener('mousedown', down);
    document.addEventListener(POPOVER_OPENED, other);
    window.addEventListener('resize', away);
    window.addEventListener('scroll', away, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener(POPOVER_OPENED, other); window.removeEventListener('resize', away); window.removeEventListener('scroll', away, true); };
  }, [open, id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    pos,
    /** Ref callback for the popover element, so its height is measured once it exists. */
    listRef: (el: HTMLElement | null) => setListEl(el),
    /** Call just before opening. */
    announce: () => document.dispatchEvent(new CustomEvent(POPOVER_OPENED, { detail: id }))
  };
}
