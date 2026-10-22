import { useEffect, useReducer, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { Icon } from '../ui';
import type { Highlight, HighlightAuthor, HighlightChange } from '../project/types';
import { anchorAt, caretOffset, offsetIn, textNodes, type Anchor } from './anchor';
import { authorLabel, pendingTarget, sameAuthor } from './brief';
import type { HighlightStore } from './store';
import { HlToolbar, type ToolbarState } from './Toolbar';
import { useHighlights } from './useHighlights';
import type { FreshProps } from './FreshBar';
import type { HighlightActions } from './highlightActions';
import { Card, CommentRail, CommentSheet, useDocViewport, useRailRoom, type CardActions, type CardEditing, type RailDraft } from './CommentRail';
import { Composer } from './Composer';
import { applyChange } from '../../server/highlightsFile';
import { Thread } from './Thread';
import { draftKey, draftsElsewhere, draftsHere, pickOverlap, reducePending, toCards, type CommentCard, type CommentDraft, type SaveState } from './comments';

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
  /** Hands the shell what can be done with a selected highlight, for the Highlights tab; null when this Annotator goes away (specs/013 FR-008). */
  onActions?: (a: HighlightActions | null) => void;
  /** The selected comment (specs/012 FR-008); the shell owns it so the sidebar's Highlights tab shares it. */
  selectedId?: string | null;
  onSelect?: (id: string | null, opts?: { jump?: boolean }) => void;
  /** When comments were last looked for and the badge for new ones (specs/012 FR-014); the shell runs the check. */
  fresh?: FreshProps;
  /** Display name of an author, for the cards of the rail. */
  person?: (a: HighlightAuthor) => { name: string };
  /** Extra attributes of the .sk-doc element (role, id, aria). */
  docProps?: HTMLAttributes<HTMLDivElement>;
  /** The document shown in the reading column. */
  children: ReactNode;
}

const newId = () => 'h_' + Array.from({ length: 12 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('');

export function Annotator({ items, target, store, author, askAuthor, consent, focusId, clearFocus, onItems, onOutdated, onRefused, onAsk, onActions, selectedId = null, onSelect, person, fresh, docProps, children }: AnnotatorProps) {
  const colRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  // A comment that was just sent shows at once, as Sending, and stays (as Failed, with Retry) if the save is refused:
  // what was typed is never lost (specs/012 FR-013, 010 FR-015).
  const [pending, dispatchPending] = useReducer(reducePending, {} as Record<string, SaveState>);
  const [optimistic, setOptimistic] = useState<Record<string, Highlight>>({});
  const inFlight = useRef<Record<string, { change: HighlightChange; by: HighlightAuthor; after?: () => void }>>({});
  // What is on its way (a reply, an emoji) is shown as if saved: the same pure change the save applies, on top of what
  // was last read. It goes when the save answers: for good on success (the saved list replaces it), and on failure for an
  // emoji or an edit, while a reply that failed stays, as Failed with Retry (specs/011 R8).
  const [overlay, setOverlay] = useState<Record<string, { change: HighlightChange; by: HighlightAuthor }>>({});
  const confirmed = [...items, ...Object.values(optimistic).filter(o => !items.some(h => h.id === o.id))];
  const all = Object.values(overlay).reduce((acc, o) => { try { return applyChange(acc, o.change, o.by); } catch { return acc; } }, confirmed);
  const shown = all.filter(h => h.phase === target.phase);
  // Comments being written (specs/012 FR-002, FR-005): kept in the page, by document and place in the text.
  const [drafts, setDrafts] = useState<Record<string, CommentDraft>>({});
  const [activeDraft, setActiveDraft] = useState<string | null>(null);
  const [discardAsk, setDiscardAsk] = useState<string | null>(null);
  const [needText, setNeedText] = useState<string | null>(null);
  // The note of a comment being edited in its card (specs/012 US2).
  const [editNote, setEditNote] = useState<{ id: string; text: string } | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  // Replies being written, by comment; the reply being edited; what a screen reader is told (specs/011 R10).
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyNeed, setReplyNeed] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<{ id: string; replyId: string; text: string } | null>(null);
  const [replyErr, setReplyErr] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const here = draftsHere(drafts, target);
  const { anchors, markers, outdated, tops, draftTops, unsupported } = useHighlights(colRef, docRef, shown, focusId, clearFocus, {
    selectedId,
    drafts: here.map(d => ({ key: d.key, start: d.anchor.startHint, end: d.anchor.startHint + d.anchor.quote.length }))
  });
  // The rail: cards beside the text, when `.sk-doc` is wide enough and there is a comment (specs/012 FR-007).
  const { room, left: railLeft } = useRailRoom(docRef, colRef);
  const viewport = useDocViewport(docRef);
  const cards = tops ? toCards(shown, tops, pending, author) : { cards: [], outdated: [] };
  const showRail = room && cards.cards.length + cards.outdated.length + here.length + (fresh?.newCount ?? 0) > 0;
  useEffect(() => { onOutdated?.(outdated); }, [outdated.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tb, setTb] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ id: string; change: HighlightChange; by: HighlightAuthor; after?: () => void } | null>(null);
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
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !tb && !asking && !editNote && !(document.activeElement as HTMLElement | null)?.closest?.('.sk-cm-thread, .sk-cm-more-wrap, .sk-cm-menu')) onSelect?.(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [selectedId, tb, asking, editNote]); // eslint-disable-line react-hooks/exhaustive-deps

  // The popup was placed for one window size: when the window is resized or turned it goes, rather than being left off screen.
  useEffect(() => {
    if (!tb) return;
    window.addEventListener('resize', close);
    window.addEventListener('orientationchange', close);
    return () => { window.removeEventListener('resize', close); window.removeEventListener('orientationchange', close); };
  }, [tb]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (draft: Omit<Draft, 'target'>) => { setError(null); setTb({ ...draft, target }); };

  const openFor = (id: string) => {
    const a = anchors.current.find(x => x.h.id === id);
    if (!a) return;
    const b = a.range.getBoundingClientRect();
    open({ mode: 'edit', id, text: a.h.quote, x: b.left + b.width / 2, top: b.top, bottom: b.bottom });
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
      // A comment under the click is selected (the newest, then the next on another click); a highlight of yours with
      // only a colour opens the popup, whose Comment adds the note to it; somebody else's colour-only highlight does
      // nothing (specs/013 FR-009); a click elsewhere lets go of the selection (specs/012 FR-008).
      const commented = anchors.current.filter(a => a.h.note.trim()).map(a => ({ id: a.h.id, start: a.start, end: a.end, createdAt: a.h.createdAt }));
      const picked = pickOverlap(commented, o, selectedId);
      if (picked) { onSelect?.(picked); return; }
      const hit = anchors.current.find(a => o >= a.start && o < a.end);
      if (hit && sameAuthor(author, hit.h.author)) { openFor(hit.h.id); return; }
      if (selectedId && o >= 0) onSelect?.(null);
    }, 0);
  };

  /**
   * What a change is about, for its save state: the highlight's own id for an add, the id it names otherwise, and for a
   * reply the reply itself, so each reply shows Sending, Saved or Failed on its own (specs/011 R8).
   */
  const changeId = (change: HighlightChange) => change.type === 'add' ? change.highlight.id
    : change.type === 'reply' ? change.reply.id
      : change.type === 'reply-edit' || change.type === 'reply-remove' ? change.replyId
        : change.type === 'react' ? `${change.replyId ?? change.id}:${change.emoji}` : change.id;
  const isThread = (c: HighlightChange) => c.type === 'reply' || c.type === 'reply-edit' || c.type === 'reply-remove' || c.type === 'react';
  const dropOverlay = (id: string) => setOverlay(o => { if (!(id in o)) return o; const n = { ...o }; delete n[id]; return n; });
  const forget = (id: string) => setOptimistic(o => { if (!(id in o)) return o; const n = { ...o }; delete n[id]; return n; });

  const run = async (change: HighlightChange, by: HighlightAuthor, after?: () => void) => {
    const id = changeId(change);
    inFlight.current[id] = { change, by, after };
    dispatchPending({ type: 'start', id });
    setBusy(true);
    setError(null);
    try {
      const saved = await store.save({ slug: tb?.target.slug ?? target.slug, branch: tb?.target.branch ?? target.branch }, change, by);
      dispatchPending({ type: 'ok', id, commit: saved.commit, where: store.kind === 'local' ? 'folder' : store.kind === 'demo' ? 'browser' : undefined });
      delete inFlight.current[id];
      onItems(saved.items, change);
      forget(id);
      dropOverlay(id);
      if (saved.commit) setToast(saved.commit);
      after?.();
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      dispatchPending({ type: 'fail', id, error: msg });
      setError(msg);
      // A comment that could not be saved is selected, so its card (or the sheet, when narrow) shows why and offers Retry.
      if (change.type === 'add') onSelect?.(id);
      // A reply that failed stays, with Retry; an emoji or an edit that failed goes back to what it was, and says why.
      if (isThread(change) && change.type !== 'reply') { dropOverlay(id); setToast(null); setNotice(`Not saved: ${msg}`); setAnnounce(`Not saved: ${msg}`); }
      if (/cannot commit to|no longer exists|read-only/.test(msg)) onRefused?.(msg);
    } finally {
      setBusy(false);
    }
  };

  /** Retry on a card that failed: the same change on the same id, so a retry is never a second comment. */
  const retry = (id: string) => {
    const f = inFlight.current[id];
    if (!f) return;
    dispatchPending({ type: 'retry', id });
    void run(f.change, f.by, f.after);
  };

  const save = (change: HighlightChange, after?: () => void, byArg?: HighlightAuthor) => {
    if (store.readOnly) return setError(store.readOnly);
    const by = byArg ?? author ?? askAuthor?.() ?? null;
    if (!by) return setError('Enter your name to save highlights.');
    if (isThread(change)) setOverlay(o => ({ ...o, [changeId(change)]: { change, by } }));
    if (store.kind === 'github' && consent?.needed) { dispatchPending({ type: 'start', id: changeId(change) }); return setAsking({ id: changeId(change), change, by, after }); }
    void run(change, by, after);
  };

  // Saved states fade after a while; a failed one stays until retried.
  useEffect(() => {
    const done = Object.entries(pending).filter(([, s]) => s.state === 'saved').map(([id]) => id);
    if (!done.length) return;
    const t = setTimeout(() => done.forEach(id => dispatchPending({ type: 'clear', id })), 10_000);
    return () => clearTimeout(t);
  }, [pending]);


  // ---- Comment (specs/012 US1, specs/013) ----
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
    // Whether saving can start at all is settled before the card is shown, so a card is never left Sending for nothing.
    if (store.readOnly) { setError(store.readOnly); return; }
    const by = author ?? askAuthor?.() ?? null;
    if (!by) { setError('Enter your name to save highlights.'); return; }
    const now = new Date().toISOString();
    // A plain comment has no colour (n). The id was made with the draft, so a retry is the same comment.
    const highlight: Highlight = { id: d.id ?? newId(), phase: d.phase, doc: d.doc, ...d.anchor, docSha: d.docSha ?? null, color: 'n', note, author: by, createdAt: now, updatedAt: now };
    // The comment shows at once as Sending, in its place beside the text; the box it was written in closes.
    setOptimistic(o => ({ ...o, [highlight.id]: highlight }));
    removeDraft(d.key);
    save({ type: 'add', highlight }, undefined, by);
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
  const byId = (id: string) => items.find(x => x.id === id);
  const actions: CardActions = {
    onCopy: id => { const h = byId(id); if (h) { void navigator.clipboard?.writeText(h.quote); setNotice('Copied'); } },
    onAsk: id => { const h = byId(id); if (h) onAsk(h.quote); },
    onColor: (id, color) => save({ type: 'update', id, color }),
    onEdit: id => { const h = byId(id); if (h) { setEditNote({ id, text: h.note }); setEditErr(null); setError(null); } },
    onDelete: id => save({ type: 'remove', id }, () => onSelect?.(null)),
    mine: h => sameAuthor(author, h.author),
    readOnly: store.readOnly
  };
  // The Highlights tab sits outside this component, so it gets the same actions through a stable object that
  // always reaches the newest ones (no stale closure), and is told when this Annotator is gone.
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  useEffect(() => {
    if (!onActions) return;
    onActions({
      onCopy: id => actionsRef.current.onCopy(id), onAsk: id => actionsRef.current.onAsk(id),
      onColor: (id, c) => actionsRef.current.onColor(id, c), onEdit: id => actionsRef.current.onEdit(id), onDelete: id => actionsRef.current.onDelete(id),
      mine: h => actionsRef.current.mine(h),
      get readOnly() { return actionsRef.current.readOnly; }
    });
    return () => onActions(null);
  }, [onActions]);
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

  // ---- Replies and emoji (specs/011) ----
  const newReplyId = () => 'r_' + Array.from({ length: 12 }, () => '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]).join('');
  const sendReply = (hid: string) => {
    const text = (replyDrafts[hid] ?? '').trim();
    if (!text) { setReplyNeed(hid); return; }
    // Whether saving can start at all is settled before the text leaves the box, so nothing typed is lost for nothing.
    if (store.readOnly) { setError(store.readOnly); return; }
    const by = author ?? askAuthor?.() ?? null;
    if (!by) { setError('Enter your name to save highlights.'); return; }
    setReplyNeed(null);
    setReplyDrafts(d => { const n = { ...d }; delete n[hid]; return n; });
    setAnnounce('Sending reply');
    save({ type: 'reply', id: hid, reply: { id: newReplyId(), text } }, () => setAnnounce('Reply sent'), by);
  };
  const react = (hid: string, replyId: string | undefined, emoji: string, on: boolean) => {
    setAnnounce(`${on ? 'Added' : 'Removed'} reaction ${emoji}`);
    save({ type: 'react', id: hid, ...(replyId ? { replyId } : {}), emoji, on });
  };
  const threadFor = (c: CommentCard) => <Thread h={c.highlight} me={author} person={person} save={pending} readOnly={store.readOnly}
    draft={replyDrafts[c.id] ?? ''} invalid={replyNeed === c.id}
    onDraft={text => { setReplyDrafts(d => ({ ...d, [c.id]: text })); if (replyNeed === c.id) setReplyNeed(null); }}
    onSend={() => sendReply(c.id)} onRetry={retry}
    editing={editingReply?.id === c.id ? {
      replyId: editingReply.replyId, text: editingReply.text, busy, error: replyErr,
      onText: text => { setEditingReply({ ...editingReply, text }); setReplyErr(null); },
      onSubmit: () => {
        const text = editingReply.text.trim();
        if (!text) { setReplyErr('Write a reply first'); return; }
        save({ type: 'reply-edit', id: c.id, replyId: editingReply.replyId, text }, () => { setEditingReply(null); setAnnounce('Reply saved'); });
      },
      onCancel: () => { setEditingReply(null); setReplyErr(null); setError(null); }
    } : null}
    onEdit={replyId => { const r = c.highlight.replies?.find(x => x.id === replyId); if (r) { setEditingReply({ id: c.id, replyId, text: r.text }); setReplyErr(null); setError(null); } }}
    onDelete={replyId => save({ type: 'reply-remove', id: c.id, replyId }, () => setAnnounce('Reply deleted'))}
    onReact={(replyId, emoji, on) => react(c.id, replyId, emoji, on)} announce={announce} />;

  // A reply being written for a comment that was removed elsewhere is not kept silently (specs/011 U2).
  const knownIds = all.map(h => h.id).join(',');
  useEffect(() => {
    const gone = Object.keys(replyDrafts).filter(id => replyDrafts[id].trim() && !all.some(h => h.id === id));
    if (!gone.length) return;
    setReplyDrafts(d => { const n = { ...d }; gone.forEach(id => delete n[id]); return n; });
    setNotice('A reply you were writing belonged to a comment that was removed.');
  }, [knownIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Without room for the rail, the selected comment or the comment being written opens in a sheet at the foot (research R9).
  const selectedCard = selectedId ? [...cards.cards, ...cards.outdated].find(c => c.id === selectedId) : undefined;
  const sheetDraft = here.find(d => d.key === activeDraft) ?? here[0];

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
        actions={actions} editing={cardEditing} threadFor={threadFor} onRetry={retry} fresh={fresh} drafts={railDrafts} activeDraftId={activeDraft} draftsElsewhere={draftsElsewhere(drafts, target)} />}
      {!showRail && (sheetDraft || selectedCard) && <CommentSheet label="Comment" onClose={() => { if (sheetDraft) cancelDraft(sheetDraft); else onSelect?.(null); }}>
        {sheetDraft ? composerFor(sheetDraft)
          : <Card card={selectedCard!} selected person={person} onSelect={() => {}} actions={actions} editing={cardEditing} thread={threadFor(selectedCard!)} />}
      </CommentSheet>}
      {/* Where the rail is shown its cards take the place of the pins (spec FR-012). */}
      {!showRail && markers.map(m => <button type="button" key={m.id} className={'sk-hl-pin hl-' + m.color + '-solid'} style={{ top: m.top, left: m.left }}
        aria-label={`Note by ${authorLabel(m.author)}`} onClick={() => onSelect?.(m.id, { jump: true })}><Icon n="note" s={12} /></button>)}
    </div>
    {tb && <HlToolbar key={(tb.id ?? '') + tb.text} tb={tb} readOnly={store.readOnly} busy={busy} error={error} onComment={startComment} />}
    {asking && consent && <ConsentDialog branch={consent.branch} login={consent.login}
      onCancel={() => { dispatchPending({ type: 'fail', id: asking.id, error: 'Not saved: confirm that highlights are committed to this branch.' }); if (isThread(asking.change) && asking.change.type !== 'reply') dropOverlay(asking.id); inFlight.current[asking.id] = { change: asking.change, by: asking.by, after: asking.after }; setAsking(null); }}
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
