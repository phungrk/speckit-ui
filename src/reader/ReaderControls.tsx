import { useEffect, useRef, type RefObject } from 'react';
import { Icon, Label } from '../ui';
import { FONTS, LINE_HEIGHTS, SIZES, THEMES, WIDTHS, type ReaderSettings } from './settings';

// Header controls of the reading mode (specs/010 contracts §4–5): the Aa popover and the two
// sidebar toggles. Every control is a real button so the whole flow works from the keyboard.

/** `[` → left, `]` → right; nothing while typing in a field or with a modifier held (research R7). */
export function sidebarKey(e: KeyboardEvent): 'left' | 'right' | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const t = e.target as { tagName?: string; isContentEditable?: boolean } | null;
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName ?? '') || t.isContentEditable)) return null;
  return e.key === '[' ? 'left' : e.key === ']' ? 'right' : null;
}

/** A mousedown closes the popover unless it lands in the popover or on the Aa button (that one toggles). */
export const isOutside = (target: Node | null, panel: Node | null, button: Node | null): boolean =>
  !!target && !panel?.contains(target) && !button?.contains(target);

export function SidebarToggle({ side, open, onToggle }: { side: 'left' | 'right'; open: boolean; onToggle: () => void }) {
  return <button type="button" className={'sk-navbtn' + (open ? ' on' : '')} onClick={onToggle} aria-pressed={open}
    aria-label={`${open ? 'Hide' : 'Show'} ${side} sidebar`} title={side === 'left' ? 'Queue & features' : 'Gate, highlights & Copilot'}>
    <Icon n={side === 'left' ? 'panelL' : 'panelR'} s={18} />
  </button>;
}

export function AaButton({ open, onToggle, buttonRef }: { open: boolean; onToggle: () => void; buttonRef?: RefObject<HTMLButtonElement> }) {
  return <button type="button" ref={buttonRef} className={'sk-aa' + (open ? ' on' : '')} onClick={onToggle}
    aria-label="Reading settings" aria-expanded={open} aria-haspopup="dialog" title="Reading settings"><span>A</span>a</button>;
}

const lines = (gap: number) => [0, 1, 2].map(j => <rect key={j} x="1" y={2 + j * gap} width="16" height="1.6" />);
const widthLines = (i: number) => [0, 1, 2].map(j => <rect key={j} x={6 - i * 2.5} y={3 + j * 4} width={6 + i * 5} height="1.6" />);

export interface ReaderPanelProps {
  reader: ReaderSettings;
  onChange: (s: ReaderSettings) => void;
  onReset: () => void;
  onClose: (refocus: boolean) => void;
  buttonRef?: RefObject<HTMLButtonElement>;
}

export function ReaderPanel({ reader, onChange, onReset, onClose, buttonRef }: ReaderPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<ReaderSettings>) => onChange({ ...reader, ...patch });
  const si = SIZES.indexOf(reader.size);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('.sk-rdp-fonts button.on')?.focus();
    const down = (e: MouseEvent) => { if (isOutside(e.target as Node, ref.current, buttonRef?.current ?? null)) onClose(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(true); };
    document.addEventListener('mousedown', down);
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="sk-rdp" ref={ref} role="dialog" aria-label="Reading settings">
    <div><Label>Font</Label>
      <div className="sk-rdp-fonts">{FONTS.map(f => <button type="button" key={f.key} className={reader.font === f.key ? 'on' : ''} aria-pressed={reader.font === f.key} onClick={() => set({ font: f.key })}>
        <span style={{ fontFamily: f.css }}>Aa</span>{f.name}
      </button>)}</div>
    </div>
    <div><Label>Size · {reader.size}px</Label>
      <div className="sk-rdp-size">
        <button type="button" aria-label="Smaller" disabled={si <= 0} onClick={() => set({ size: SIZES[si - 1] })}><span className="sk-rdp-a sm">A</span></button>
        <div className="sk-rdp-ticks">{SIZES.map((s, i) => <button type="button" key={s} aria-label={`${s}px`} aria-pressed={s === reader.size} className={i <= si ? 'on' : ''} onClick={() => set({ size: s })}><i /></button>)}</div>
        <button type="button" aria-label="Larger" disabled={si >= SIZES.length - 1} onClick={() => set({ size: SIZES[si + 1] })}><span className="sk-rdp-a lg">A</span></button>
      </div>
    </div>
    <div className="sk-rdp-row">
      <div><Label>Spacing</Label>
        <div className="sk-rdp-seg">{LINE_HEIGHTS.map((v, i) => <button type="button" key={v} className={reader.lh === v ? 'on' : ''} aria-pressed={reader.lh === v} aria-label={`Line spacing ${v}`} onClick={() => set({ lh: v })}>
          <svg width="18" height="16" viewBox="0 0 18 16" fill="currentColor" aria-hidden="true">{lines(3 + i * 1.5)}</svg>
        </button>)}</div>
      </div>
      <div><Label>Width</Label>
        <div className="sk-rdp-seg">{WIDTHS.map((w, i) => <button type="button" key={w.key} className={reader.width === w.px ? 'on' : ''} aria-pressed={reader.width === w.px} aria-label={`${w.key} width`} onClick={() => set({ width: w.px })}>
          <svg width="18" height="16" viewBox="0 0 18 16" fill="currentColor" aria-hidden="true">{widthLines(i)}</svg>
        </button>)}</div>
      </div>
    </div>
    <div><Label>Page</Label>
      <div className="sk-rdp-themes">{THEMES.map(t => <button type="button" key={t.key} className={reader.theme === t.key ? 'on' : ''} aria-pressed={reader.theme === t.key} onClick={() => set({ theme: t.key })}>
        <span style={{ background: t.bg, color: t.text }}>Aa</span>{t.name}
      </button>)}</div>
    </div>
    <button type="button" className="sk-rdp-reset" onClick={onReset}>Reset to default</button>
  </div>;
}

/** Separator, Aa button and its popover, placed at the end of every workspace header. */
export function ReaderMenu({ reader, open, setOpen, onChange, onReset }: { reader: ReaderSettings; open: boolean; setOpen: (o: boolean) => void; onChange: (s: ReaderSettings) => void; onReset: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  return <>
    <div className="sk-navsep" aria-hidden="true" />
    <div className="sk-aawrap">
      <AaButton open={open} onToggle={() => setOpen(!open)} buttonRef={btn} />
      {open && <ReaderPanel reader={reader} onChange={onChange} onReset={onReset} buttonRef={btn}
        onClose={refocus => { setOpen(false); if (refocus) btn.current?.focus(); }} />}
    </div>
  </>;
}
