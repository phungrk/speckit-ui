import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Icon } from '../ui';
import type { Highlight, HighlightAuthor, HighlightChange, HighlightColor } from '../project/types';
import { anchorAt, caretOffset, offsetIn, textNodes } from './anchor';
import { authorLabel, pendingTarget, sameAuthor } from './brief';
import type { HighlightStore } from './store';
import { HlToolbar, type ToolbarState } from './Toolbar';
import { useHighlights } from './useHighlights';

// The reading column with highlights (specs/010-spec-annotations): selection → toolbar → save
// through a HighlightStore; pins in the margin; one-time commit consent and the saved toast.

export interface AnnotatorTarget { slug: string; branch: string | null; phase: string; doc: string; docSha: string | null }

export interface Consent { needed: boolean; branch: string; login: string; accept(): void }

interface Draft extends ToolbarState {
  anchor?: { quote: string; prefix: string; suffix: string; startHint: number };
  target: AnnotatorTarget;
}

export interface AnnotatorProps {
  /** Every highlight of the spec; only those of `target.phase` are drawn. */
  items: Highlight[];
  target: AnnotatorTarget;
  store: HighlightStore;
  /** Who saves; null when nobody can (no login). */
  author: HighlightAuthor | null;
  /** Asks the local user for a name on the first save (FR-017). */
  askAuthor?: () => HighlightAuthor | null;
  consent?: Consent;
  focusId: string | null;
  clearFocus: () => void;
  onItems: (items: Highlight[], change: HighlightChange) => void;
  /** Ids of highlights on this step whose text is gone (Outdated), for the panel. */
  onOutdated?: (ids: string[]) => void;
  /** A save was refused for good (no permission, protected or missing branch): stay read-only. */
  onRefused?: (reason: string) => void;
  onAsk: (text: string) => void;
  /** Extra attributes of the .sk-doc element (role, id, aria). */
  docProps?: HTMLAttributes<HTMLDivElement>;
  /** The document shown in the reading column. */
  children: ReactNode;
}

const newId = () => 'h_' + Array.from({ length: 12 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('');

export function Annotator({ items, target, store, author, askAuthor, consent, focusId, clearFocus, onItems, onOutdated, onRefused, onAsk, docProps, children }: AnnotatorProps) {
  const colRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const shown = items.filter(h => h.phase === target.phase);
  const { anchors, markers, outdated, unsupported } = useHighlights(colRef, docRef, shown, focusId, clearFocus);
  useEffect(() => { onOutdated?.(outdated); }, [outdated.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tb, setTb] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ change: HighlightChange; by: HighlightAuthor } | null>(null);
  const [toast, setToast] = useState<{ sha: string; url: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const close = () => { setTb(null); setError(null); window.getSelection()?.removeAllRanges(); };

  useEffect(() => {
    if (!tb) return;
    const down = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.('.sk-tb, .dialog')) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !asking) close(); };
    document.addEventListener('mousedown', down);
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key); };
  }, [tb, asking]);
  useEffect(() => { if (!toast && !notice) return; const t = setTimeout(() => { setToast(null); setNotice(null); }, 4000); return () => clearTimeout(t); }, [toast, notice]);

  // A draft follows its own spec and step; moving away keeps it but says so (spec edge case).
  const stale = tb && pendingTarget(tb.target, target) === 'moved'
    ? (tb.noteText || tb.mode === 'new' ? `Discard this note? It belongs to ${tb.target.slug} · ${tb.target.phase}. Save keeps it there.` : null)
    : null;
  useEffect(() => { if (tb && pendingTarget(tb.target, target) === 'moved' && !tb.noting) close(); }, [target.slug, target.branch, target.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (draft: Omit<Draft, 'target'>) => { setError(null); setTb({ ...draft, target }); };

  const openFor = (id: string, noting = false) => {
    const a = anchors.current.find(x => x.h.id === id);
    if (!a) return;
    const b = a.range.getBoundingClientRect();
    open({ mode: 'edit', id, text: a.h.quote, color: a.h.color, noteText: a.h.note, noting, x: b.left + b.width / 2, top: b.top, bottom: b.bottom });
  };

  const onUp = (x: number, y: number, target_: EventTarget | null) => {
    if ((target_ as HTMLElement | null)?.closest?.('button, input, textarea, .sk-tb, .sk-hl-pin')) return;
    setTimeout(() => {
      const root = colRef.current, sel = window.getSelection();
      if (!root) return;
      if (sel && !sel.isCollapsed && sel.rangeCount) {
        if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) {
          if (root.contains(sel.anchorNode) || root.contains(sel.focusNode)) setNotice('Select text inside one document to highlight it.');
          return;
        }
        const r = sel.getRangeAt(0);
        const { text } = textNodes(root);
        const anchor = anchorAt(text, offsetIn(root, r.startContainer, r.startOffset), offsetIn(root, r.endContainer, r.endOffset));
        if (!anchor) return;
        const b = r.getBoundingClientRect();
        open({ mode: 'new', text: anchor.quote, anchor, x: b.left + b.width / 2, top: b.top, bottom: b.bottom });
        return;
      }
      const o = caretOffset(root, x, y);
      const hit = anchors.current.find(a => o >= a.start && o < a.end);
      if (hit) openFor(hit.h.id);
    }, 0);
  };

  const run = async (change: HighlightChange, by: HighlightAuthor) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await store.save({ slug: tb?.target.slug ?? target.slug, branch: tb?.target.branch ?? target.branch }, change, by);
      onItems(saved.items, change);
      if (saved.commit) setToast(saved.commit);
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (/cannot commit to|no longer exists|read-only/.test(msg)) onRefused?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const save = (change: HighlightChange) => {
    if (store.readOnly) return setError(store.readOnly);
    const by = author ?? askAuthor?.() ?? null;
    if (!by) return setError('Enter your name to save highlights.');
    if (store.kind === 'github' && consent?.needed) return setAsking({ change, by });
    void run(change, by);
  };

  const add = (color: HighlightColor, note = '') => {
    if (!tb?.anchor) return;
    const now = new Date().toISOString();
    save({ type: 'add', highlight: { id: newId(), phase: tb.target.phase, doc: tb.target.doc, ...tb.anchor, docSha: tb.target.docSha, color, note, author: author ?? { name: 'You', local: true }, createdAt: now, updatedAt: now } });
  };

  const editing = tb?.id ? items.find(h => h.id === tb.id) : undefined;
  const canEdit = tb?.mode === 'new' || (!!editing && sameAuthor(author, editing.author));

  return <>
    <div className="sk-doc" ref={docRef} {...docProps}
      onMouseUp={e => onUp(e.clientX, e.clientY, e.target)}
      onTouchEnd={e => { const t = e.changedTouches[0]; setTimeout(() => onUp(t.clientX, t.clientY, e.target), 300); }}
      onKeyUp={e => { if (e.shiftKey) onUp(-1, -1, e.target); }}
      onScroll={() => tb && !tb.noting && close()}>
      {unsupported && items.length > 0 && <p className="sk-hlp-empty" role="note">This browser cannot draw highlights in the text; they are listed in the Highlights tab.</p>}
      <div className="sk-col" ref={colRef}>{children}</div>
      {markers.map(m => <button type="button" key={m.id} className={'sk-hl-pin hl-' + m.color + '-solid'} style={{ top: m.top, left: m.left }}
        aria-label={`Note by ${authorLabel(m.author)}`} onClick={() => openFor(m.id, true)}><Icon n="note" s={12} /></button>)}
    </div>
    {tb && <HlToolbar key={(tb.id ?? '') + tb.text} tb={tb} canEdit={canEdit} readOnly={store.readOnly} busy={busy} error={error} stale={stale}
      onColor={c => tb.mode === 'new' ? add(c) : save({ type: 'update', id: tb.id!, color: c })}
      onNote={t => tb.mode === 'new' ? add(tb.color ?? 'y', t.trim()) : save({ type: 'update', id: tb.id!, note: t.trim() })}
      onCopy={() => { void navigator.clipboard?.writeText(tb.text); close(); }}
      onAsk={() => { onAsk(tb.text); close(); }}
      onDelete={() => save({ type: 'remove', id: tb.id! })}
      onClose={close} />}
    {asking && consent && <ConsentDialog branch={consent.branch} login={consent.login} onCancel={() => setAsking(null)}
      onAccept={() => { const a = asking; consent.accept(); setAsking(null); void run(a.change, a.by); }} />}
    {notice && !toast && <div className="sk-hl-toast" role="status">{notice}</div>}
    {toast && <SavedToast {...toast} />}
  </>;
}

/** Asked once per repo before the first commit (FR-009a). */
export function ConsentDialog({ branch, login, onCancel, onAccept }: { branch: string; login: string; onCancel: () => void; onAccept: () => void }) {
  return <div className="dialog-backdrop" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="sk-hl-consent">
      <div className="dialog-title" id="sk-hl-consent">Commit highlights?</div>
      <div className="dialog-body">Highlights are committed to <code>{branch}</code> as {login}. Every save is a commit ending in [skip ci].</div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" autoFocus onClick={onAccept}>Commit highlights</button>
      </div>
    </div>
  </div>;
}

export function SavedToast({ sha, url }: { sha: string; url: string }) {
  return <div className="sk-hl-toast" role="status">Saved · <a href={url} target="_blank" rel="noreferrer">commit {sha.slice(0, 7)}</a></div>;
}
