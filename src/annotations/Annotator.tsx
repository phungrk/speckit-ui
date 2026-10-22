import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Icon } from '../ui';
import type { Highlight, HighlightAuthor, HighlightChange, HighlightColor } from '../project/types';
import { anchorAt, caretOffset, offsetIn, textNodes, type Anchor } from './anchor';
import { authorLabel, pendingTarget, sameAuthor } from './brief';
import type { HighlightStore } from './store';
import { HlToolbar, type ToolbarState } from './Toolbar';
import { useHighlights } from './useHighlights';
import { Card, CommentRail, CommentSheet, useDocViewport, useRailRoom, type CardActions, type CardEditing, type RailDraft } from './CommentRail';
import { Composer } from './Composer';
import { draftKey, draftsElsewhere, draftsHere, pickOverlap, toCards, type CommentDraft } from './comments';

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
  /** The selected comment (specs/012 FR-008); the shell owns it so the sidebar's Highlights tab shares it. */
  selectedId?: string | null;
  onSelect?: (id: string | null, opts?: { jump?: boolean }) => void;
  /** Display name of an author, for the cards of the rail. */
  person?: (a: HighlightAuthor) => { name: string };
  /** Extra attributes of the .sk-doc element (role, id, aria). */
  docProps?: HTMLAttributes<HTMLDivElement>;
  /** The document shown in the reading column. */
  children: ReactNode;
}

const newId = () => 'h_' + Array.from({ length: 12 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('');

export function Annotator({ items, target, store, author, askAuthor, consent, focusId, clearFocus, onItems, onOutdated, onRefused, onAsk, selectedId = null, onSelect, person, docProps, children }: AnnotatorProps) {
  const colRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const shown = items.filter(h => h.phase === target.phase);
  // Comments being written (specs/012 FR-002, FR-005): kept in the page, by document and place in the text.
  const [drafts, setDrafts] = useState<Record<string, CommentDraft>>({});
  const [activeDraft, setActiveDraft] = useState<string | null>(null);
  const [discardAsk, setDiscardAsk] = useState<string | null>(null);
  const [needText, setNeedText] = useState<string | null>(null);
  // The note of a comment being edited in its card (specs/012 US2).
  const [editNote, setEditNote] = useState<{ id: string; text: string } | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const here = draftsHere(drafts, target);
  const { anchors, markers, outdated, tops, draftTops, unsupported } = useHighlights(colRef, docRef, shown, focusId, clearFocus, {
    selectedId,
    drafts: here.map(d => ({ key: d.key, start: d.anchor.startHint, end: d.anchor.startHint + d.anchor.quote.length }))
  });
  // The rail: cards beside the text, when `.sk-doc` is wide enough and there is a comment (specs/012 FR-007).
  const { room, left: railLeft } = useRailRoom(docRef, colRef);
  const viewport = useDocViewport(docRef);
  const cards = tops ? toCards(shown, tops, {}, author) : { cards: [], outdated: [] };
  const showRail = room && cards.cards.length + cards.outdated.length + here.length > 0;
  useEffect(() => { onOutdated?.(outdated); }, [outdated.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tb, setTb] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ change: HighlightChange; by: HighlightAuthor; after?: () => void } | null>(null);
  const [toast, setToast] = useState<{ sha: string; url: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const close = () => {
    // Keyboard users go back to the text they were reading.
    if (document.activeElement?.closest?.('.sk-tb')) docRef.current?.focus();
    setTb(null); setError(null); window.getSelection()?.removeAllRanges();
  };

  useEffect(() => {
    if (!tb) return;
    const down = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest?.('.sk-tb, .dialog')) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !asking) close(); };
    document.addEventListener('mousedown', down);
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key); };
  }, [tb, asking]);
  useEffect(() => { if (!toast && !notice) return; const t = setTimeout(() => { setToast(null); setNotice(null); }, 4000); return () => clearTimeout(t); }, [toast, notice]);

  // The toolbar belongs to the step it opened on: moving away closes it (what is typed is in a draft, which is kept).
  useEffect(() => { if (tb && pendingTarget(tb.target, target) === 'moved') close(); }, [target.slug, target.branch, target.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  // A selection that is not on this step any more is let go (a click on the Highlights tab switches step and selects together).
  const shownIds = shown.map(h => h.id).join(',');
  useEffect(() => { if (selectedId && !shown.some(h => h.id === selectedId)) onSelect?.(null); }, [selectedId, shownIds]); // eslint-disable-line react-hooks/exhaustive-deps
  // Escape lets go of the selected comment when nothing else is open.
  useEffect(() => {
    if (!selectedId) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !tb && !asking && !editNote) onSelect?.(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [selectedId, tb, asking, editNote]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (draft: Omit<Draft, 'target'>) => { setError(null); setTb({ ...draft, target }); };

  const openFor = (id: string) => {
    const a = anchors.current.find(x => x.h.id === id);
    if (!a) return;
    const b = a.range.getBoundingClientRect();
    open({ mode: 'edit', id, text: a.h.quote, color: a.h.color, x: b.left + b.width / 2, top: b.top, bottom: b.bottom });
  };

  const onUp = (x: number, y: number, target_: EventTarget | null) => {
    if ((target_ as HTMLElement | null)?.closest?.('button, input, textarea, .sk-tb, .sk-hl-pin, .sk-cm-rail')) return;
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
      // Pointer: the character under it; keyboard (x < 0): the caret.
      const o = x >= 0 ? caretOffset(root, x, y) : sel?.anchorNode && root.contains(sel.anchorNode) ? offsetIn(root, sel.anchorNode, sel.anchorOffset) : -1;
      // A comment under the click is selected (the newest, then the next on another click); a highlight with only a
      // colour keeps the toolbar of 010; a click elsewhere lets go of the selection (specs/012 FR-008).
      const commented = anchors.current.filter(a => a.h.note.trim()).map(a => ({ id: a.h.id, start: a.start, end: a.end, createdAt: a.h.createdAt }));
      const picked = pickOverlap(commented, o, selectedId);
      if (picked) { onSelect?.(picked); return; }
      const hit = anchors.current.find(a => o >= a.start && o < a.end);
      if (hit) { openFor(hit.h.id); return; }
      if (selectedId && o >= 0) onSelect?.(null);
    }, 0);
  };

  const run = async (change: HighlightChange, by: HighlightAuthor, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await store.save({ slug: tb?.target.slug ?? target.slug, branch: tb?.target.branch ?? target.branch }, change, by);
      onItems(saved.items, change);
      if (saved.commit) setToast(saved.commit);
      after?.();
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      if (/cannot commit to|no longer exists|read-only/.test(msg)) onRefused?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const save = (change: HighlightChange, after?: () => void) => {
    if (store.readOnly) return setError(store.readOnly);
    const by = author ?? askAuthor?.() ?? null;
    if (!by) return setError('Enter your name to save highlights.');
    if (store.kind === 'github' && consent?.needed) return setAsking({ change, by, after });
    void run(change, by, after);
  };

  const add = (color: HighlightColor, note = '') => {
    if (!tb?.anchor) return;
    const now = new Date().toISOString();
    save({ type: 'add', highlight: { id: newId(), phase: tb.target.phase, doc: tb.target.doc, ...tb.anchor, docSha: tb.target.docSha, color, note, author: author ?? { name: 'You', local: true }, createdAt: now, updatedAt: now } });
  };

  // ---- Add comment (specs/012 US1) ----
  const me = author ? (person?.(author).name ?? authorLabel(author)) : 'You';

  const startDraftAt = (anchor: Anchor, tgt: AnnotatorTarget, existingId?: string) => {
    const key = draftKey(tgt, anchor.startHint);
    setDrafts(d => d[key] ? d : { ...d, [key]: { key, id: newId(), existingId, slug: tgt.slug, branch: tgt.branch, phase: tgt.phase, doc: tgt.doc, docSha: tgt.docSha, anchor, text: '' } });
    setActiveDraft(key); setNeedText(null); setDiscardAsk(null); setError(null);
    close();
  };
  const startComment = () => {
    if (tb?.mode === 'new' && tb.anchor) return startDraftAt(tb.anchor, tb.target);
    // A highlight of yours that has only a colour gets its comment as a note on it, not a second highlight.
    const h = tb?.id ? items.find(x => x.id === tb.id) : undefined;
    if (h) startDraftAt({ quote: h.quote, prefix: h.prefix, suffix: h.suffix, startHint: h.startHint }, tb!.target, h.id);
  };

  const setDraftText = (key: string, text: string) => { setDrafts(d => d[key] ? { ...d, [key]: { ...d[key], text } } : d); if (needText === key && text.trim()) setNeedText(null); };
  const removeDraft = (key: string) => {
    setDrafts(d => { const next = { ...d }; delete next[key]; return next; });
    setDiscardAsk(null); setNeedText(null); setError(null);
    setActiveDraft(a => a === key ? null : a);
    docRef.current?.focus();
  };
  /** Cancel or Escape: nothing typed goes at once; typed text is asked about first (FR-005). */
  const cancelDraft = (d: CommentDraft) => { if (d.text.trim()) setDiscardAsk(d.key); else removeDraft(d.key); };
  const submitDraft = (d: CommentDraft) => {
    const note = d.text.trim();
    if (!note) { setNeedText(d.key); return; }
    setNeedText(null);
    setActiveDraft(d.key);
    if (d.existingId) { save({ type: 'update', id: d.existingId, note }, () => removeDraft(d.key)); return; }
    const now = new Date().toISOString();
    // A plain comment has no colour (n). The id was made with the draft, so a retry is the same comment.
    save({ type: 'add', highlight: { id: d.id ?? newId(), phase: d.phase, doc: d.doc, ...d.anchor, docSha: d.docSha ?? null, color: 'n', note, author: author ?? { name: 'You', local: true }, createdAt: now, updatedAt: now } }, () => removeDraft(d.key));
  };

  /** The text selected in the column, as an anchor and where it is on screen; null when there is none to comment on. */
  const readSelection = () => {
    const root = colRef.current, sel = window.getSelection();
    if (!root || !sel || sel.isCollapsed || !sel.rangeCount || !root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return null;
    const r = sel.getRangeAt(0);
    const { text } = textNodes(root);
    const anchor = anchorAt(text, offsetIn(root, r.startContainer, r.startOffset), offsetIn(root, r.endContainer, r.endOffset));
    if (!anchor) return null;
    const b = r.getBoundingClientRect();
    return { anchor, x: b.left + b.width / 2, top: b.top, bottom: b.bottom };
  };

  // Ctrl+Alt+M / Cmd+Option+M comments on the selection, like Google Docs (spec 012 research R4).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.altKey && (e.code === 'KeyM' || e.key.toLowerCase() === 'm'))) return;
      const s = readSelection();
      if (!s) return;
      e.preventDefault();
      // When saving is off the toolbar says why; otherwise the composer opens (in the rail, or in the sheet when narrow).
      if (store.readOnly) open({ mode: 'new', text: s.anchor.quote, anchor: s.anchor, x: s.x, top: s.top, bottom: s.bottom });
      else startDraftAt(s.anchor, target);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const composerFor = (d: CommentDraft, top?: number) => <Composer key={d.key} name={me} quote={d.anchor.quote} text={d.text} top={top} autoFocus={activeDraft === d.key}
    onText={t => setDraftText(d.key, t)} onSubmit={() => submitDraft(d)} onCancel={() => cancelDraft(d)}
    busy={busy && activeDraft === d.key} invalid={needText === d.key} error={activeDraft === d.key ? error : null}
    confirming={discardAsk === d.key} onKeep={() => setDiscardAsk(null)} onDiscard={() => removeDraft(d.key)} />;
  const railDrafts: RailDraft[] = here.filter(d => draftTops[d.key] !== undefined).map(d => ({ id: d.key, anchorTop: draftTops[d.key], render: top => composerFor(d, top) }));

  // What the author of the selected comment can do on its card, and the note being edited there (specs/012 US2).
  const actions: CardActions = {
    onColor: (id, color) => save({ type: 'update', id, color }),
    onEdit: id => { const h = items.find(x => x.id === id); if (h) { setEditNote({ id, text: h.note }); setEditErr(null); setError(null); } },
    onDelete: id => save({ type: 'remove', id }, () => onSelect?.(null))
  };
  const cardEditing: CardEditing | undefined = editNote ? {
    id: editNote.id, text: editNote.text, busy, error: editErr ?? error,
    onText: t => { setEditNote({ id: editNote.id, text: t }); setEditErr(null); },
    onSubmit: () => {
      const note = editNote.text.trim();
      if (!note) { setEditErr('Write a comment first'); return; }
      save({ type: 'update', id: editNote.id, note }, () => setEditNote(null));
    },
    onCancel: () => { setEditNote(null); setEditErr(null); setError(null); }
  } : undefined;

  // Without room for the rail, the selected comment or the comment being written opens in a sheet at the foot (research R9).
  const selectedCard = selectedId ? [...cards.cards, ...cards.outdated].find(c => c.id === selectedId) : undefined;
  const sheetDraft = here.find(d => d.key === activeDraft) ?? here[0];

  const editing = tb?.id ? items.find(h => h.id === tb.id) : undefined;
  const canEdit = tb?.mode === 'new' || (!!editing && sameAuthor(author, editing.author));

  return <>
    <div ref={docRef} {...docProps} className={'sk-doc' + (showRail ? ' has-rail' : '')}
      onMouseUp={e => onUp(e.clientX, e.clientY, e.target)}
      onTouchEnd={e => { const t = e.changedTouches[0]; setTimeout(() => onUp(t.clientX, t.clientY, e.target), 300); }}
      onKeyUp={e => { if (e.shiftKey || e.key === 'Shift' || e.key === 'Enter') onUp(-1, -1, e.target); }}
      onKeyDown={e => {
        if (e.key !== 'Tab' || e.shiftKey || !tb) return;
        const first = document.querySelector<HTMLElement>('.sk-tb button:not(:disabled), .sk-tb textarea');
        if (first) { e.preventDefault(); first.focus(); }
      }}
      onScroll={() => tb && close()}>
      {unsupported && items.length > 0 && <p className="sk-hlp-empty" role="note">This browser cannot draw highlights in the text; they are listed in the Highlights tab.</p>}
      <div className="sk-col" ref={colRef}>{children}</div>
      {showRail && <CommentRail cards={cards} selectedId={selectedId} onSelect={(id, o) => onSelect?.(id, o)} branch={target.branch} left={railLeft} viewport={viewport} docRef={docRef} person={person}
        actions={actions} editing={cardEditing} drafts={railDrafts} activeDraftId={activeDraft} draftsElsewhere={draftsElsewhere(drafts, target)} />}
      {!showRail && (sheetDraft || selectedCard) && <CommentSheet label="Comment" onClose={() => { if (sheetDraft) cancelDraft(sheetDraft); else onSelect?.(null); }}>
        {sheetDraft ? composerFor(sheetDraft)
          : <Card card={selectedCard!} selected person={person} onSelect={() => {}} actions={actions} editing={cardEditing} />}
      </CommentSheet>}
      {/* Where the rail is shown its cards take the place of the pins (spec FR-012). */}
      {!showRail && markers.map(m => <button type="button" key={m.id} className={'sk-hl-pin hl-' + m.color + '-solid'} style={{ top: m.top, left: m.left }}
        aria-label={`Note by ${authorLabel(m.author)}`} onClick={() => onSelect?.(m.id, { jump: true })}><Icon n="note" s={12} /></button>)}
    </div>
    {tb && <HlToolbar key={(tb.id ?? '') + tb.text} tb={tb} canEdit={canEdit} canComment={tb.mode === 'new' || (canEdit && !editing?.note.trim())} readOnly={store.readOnly} busy={busy} error={error}
      onColor={c => tb.mode === 'new' ? add(c) : save({ type: 'update', id: tb.id!, color: c })}
      onComment={startComment}
      onCopy={() => { void navigator.clipboard?.writeText(tb.text); close(); }}
      onAsk={() => { onAsk(tb.text); close(); }}
      onDelete={() => save({ type: 'remove', id: tb.id! })} />}
    {asking && consent && <ConsentDialog branch={consent.branch} login={consent.login} onCancel={() => setAsking(null)}
      onAccept={() => { const a = asking; consent.accept(); setAsking(null); void run(a.change, a.by, a.after); }} />}
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
