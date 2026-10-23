import { Fragment, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Icon } from '../ui';
import type { HighlightAuthor } from '../project/types';
import type { HighlightActions } from './highlightActions';
import { Avatar } from './Avatar';
import { authorLabel, relTime } from './brief';
import { CLOSED_CARD_HEIGHT, isMeasured, nextSelection, outdatedExtra, type CommentCard, type Cards, type SaveState } from './comments';
import { replyCount } from './reactions';
import { Composer } from './Composer';
import { MoreMenu } from './MoreMenu';
import { FreshBar, type FreshProps } from './FreshBar';
import { layoutCards, railPlacement } from './layout';

// The comment rail (specs/012-docs-style-comment-flow, contracts/comment-rail-ui.md): cards beside the text
// they comment on, inside the document's own scroll container so they scroll with it.

/** Height of the rail's header, the least `top` a card may have (plus the gap); taller with the line about new comments. */
export const RAIL_HEAD = 40;
export const RAIL_HEAD_FRESH = 76;
const GAP = 8;
const quote40 = (q: string) => (q.length > 40 ? q.slice(0, 40) + '…' : q);

/**
 * Whether `.sk-doc` has room for the reader's column plus the rail, and where the rail starts. Measured on the
 * element, not guessed from the window, because the sidebars come and go (research R1).
 */
export function useRailRoom(docRef: RefObject<HTMLElement | null>, colRef: RefObject<HTMLElement | null>): { room: boolean; left: number } {
  const [place, setPlace] = useState({ room: false, left: 0 });
  useEffect(() => {
    const doc = docRef.current, col = colRef.current;
    if (!doc || !col) return;
    const measure = () => {
      const measureWidth = parseFloat(getComputedStyle(col).maxWidth);
      const next = railPlacement(doc.clientWidth, Number.isFinite(measureWidth) ? measureWidth : 700);
      setPlace(p => (p.room === next.room && p.left === next.left ? p : next));
    };
    measure();
    window.addEventListener('resize', measure);
    if (typeof ResizeObserver === 'undefined') return () => window.removeEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(doc);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [docRef, colRef]);
  return place;
}

/** The part of `.sk-doc` on screen, to build only the cards near it (research R2). */
export function useDocViewport(docRef: RefObject<HTMLElement | null>): { top: number; height: number } | undefined {
  const [vp, setVp] = useState<{ top: number; height: number } | undefined>(undefined);
  useEffect(() => {
    const el = docRef.current;
    if (!el) return;
    let raf = 0;
    const read = () => { raf = 0; setVp(v => (v && v.top === el.scrollTop && v.height === el.clientHeight ? v : { top: el.scrollTop, height: el.clientHeight })); };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    el.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { el.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf); };
  }, [docRef]);
  return vp;
}

/** Whether the screen has no hover (touch): known only in the browser, so the first render, server or client, says no (specs/017 R2). */
function useCoarse(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const m = matchMedia('(hover: none), (pointer: coarse)');
    const sync = () => setCoarse(m.matches);
    sync();
    m.addEventListener?.('change', sync);
    return () => m.removeEventListener?.('change', sync);
  }, []);
  return coarse;
}

/** What can be done on a selected card: the author recolours, edits, deletes; everyone copies and asks (specs/013 FR-008). */
export type CardActions = HighlightActions;

/** The note of one card being edited in place: the box takes the card's place (research R5). */
export interface CardEditing {
  id: string;
  text: string;
  busy?: boolean;
  error?: string | null;
  onText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export interface CardProps {
  card: CommentCard;
  /** Top in the scroll container; absent for a card in the Outdated group, which is not placed. */
  top?: number;
  selected: boolean;
  person?: (a: HighlightAuthor) => { name: string };
  now?: number;
  onSelect: (id: string) => void;
  onRetry?: (id: string) => void;
  actions?: CardActions;
  editing?: CardEditing;
  /** Reports the height of the open card, which the layout needs (a closed card has a fixed height). */
  onMeasure?: (id: string, height: number) => void;
  /** The discussion under the comment (specs/011): shown when the card is open. */
  thread?: ReactNode;
  /** Floating tool on the comment's own content row, as the emoji button (specs/015): shown when the card is open. */
  rowTool?: ReactNode;
  /** The row of emoji already put on the comment, under its text, on every card (specs/017); absent when there are none. */
  chips?: ReactNode;
  /** The card is as tall as its content and reports its height, though closed: it has emoji, or the screen is a touch screen (specs/017). */
  measured?: boolean;
}

/** Sending, Saved or Failed with Retry: under a comment, and under each reply (specs/011 R8). */
export function SaveNote({ save: s, onRetry }: { save: SaveState; onRetry?: () => void }) {
  if (s.state === 'idle') return null;
  return <div className="sk-cm-state" data-state={s.state} role={s.state === 'failed' ? 'alert' : 'status'}>
    {s.state === 'sending' && 'Sending…'}
    {s.state === 'queued' && 'Not saved'}
    {s.state === 'saved' && (s.commit ? <>Saved · <a href={s.commit.url} target="_blank" rel="noreferrer">commit {s.commit.sha.slice(0, 7)}</a></> : s.where === 'folder' ? 'Saved to folder' : s.where === 'browser' ? 'Saved in this browser' : 'Saved')}
    {s.state === 'failed' && <>Failed: {s.error}{onRetry && <button type="button" onClick={e => { e.stopPropagation(); onRetry(); }}>Retry</button>}</>}
  </div>;
}

function SaveLine({ card, onRetry }: { card: CommentCard; onRetry?: (id: string) => void }) {
  return <SaveNote save={card.save} onRetry={onRetry ? () => onRetry(card.id) : undefined} />;
}

export function Card({ card, top, selected, person, now, onSelect, onRetry, actions, editing, onMeasure, thread, rowTool, chips, measured }: CardProps) {
  const h = card.highlight;
  const name = person ? person(h.author).name : authorLabel(h.author);
  const ref = useRef<HTMLElement>(null);
  const [confirming, setConfirming] = useState(false);
  const open = selected || editing?.id === card.id;
  const grows = open || !!measured;
  // An open card is as tall as its content, so the layout is told (a plain closed one has a fixed height).
  useEffect(() => {
    const el = ref.current;
    if (!grows || !el || !onMeasure) return;
    const report = () => onMeasure(card.id, Math.ceil(el.getBoundingClientRect().height));
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [grows, card.id, onMeasure]);
  useEffect(() => { if (!selected) setConfirming(false); }, [selected]);

  if (editing && editing.id === card.id) {
    return <Composer name={name} quote={h.quote} text={editing.text} onText={editing.onText} onSubmit={editing.onSubmit} onCancel={editing.onCancel}
      busy={editing.busy} error={editing.error} top={top} label="Edit comment" submitLabel="Save" />;
  }
  const style = top === undefined ? undefined : { top, ...(selected || measured ? {} : { height: card.height }) };
  return <article ref={ref} className={'sk-cm-card' + (selected ? ' on' : '')} data-color={h.color} role="group"
    aria-label={`Comment by ${name} on “${quote40(h.quote)}”`} aria-current={selected ? 'true' : undefined}
    tabIndex={selected ? 0 : -1} style={style} onClick={() => onSelect(card.id)}
    onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) onSelect(card.id); }}>
    {/* The comment is one item: hovering it (or the focus inside it) shows its row and its tools (specs/015). */}
    <div className="sk-cm-item">
    <div className="sk-cm-who"><Avatar name={name} /><b>{name}</b><span className="sk-cm-time">{relTime(h.createdAt, now)}</span>
      {!selected && replyCount(h) > 0 && <span className="sk-cm-count">{`${replyCount(h)} ${replyCount(h) === 1 ? 'reply' : 'replies'}`}</span>}
      {/* The tools of your own comment are on every card, closed or open, at the far right (specs/017). Delete on a closed card opens it and asks there. */}
      {card.mine && actions && <MoreMenu tabbable={open} items={[
        { key: 'edit', label: 'Edit', disabledReason: actions.readOnly, onSelect: () => actions.onEdit(card.id) },
        { key: 'delete', label: 'Delete', disabledReason: actions.readOnly, onSelect: () => { if (!selected) onSelect(card.id); setConfirming(true); } }]} />}</div>
    <q className="sk-cm-quote">{h.quote}</q>
    <div className="sk-cm-row"><p className="sk-cm-note">{h.note}</p>{rowTool}</div>
    {chips && <div className="sk-cm-chips" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>{chips}</div>}
    </div>
    {selected && actions && <>
      {card.mine && <>
        {confirming && <div className="sk-cm-acts"><span>{replyCount(h) > 0 ? `Delete this comment and its ${replyCount(h)} ${replyCount(h) === 1 ? 'reply' : 'replies'}?` : 'Delete this comment?'}</span>
          <button type="button" className="btn btn-secondary" onClick={e => { e.stopPropagation(); setConfirming(false); }}>Keep</button>
          <button type="button" className="btn btn-primary" onClick={e => { e.stopPropagation(); actions.onDelete(card.id); }}>Delete</button></div>}
      </>}
    </>}
    <SaveLine card={card} onRetry={onRetry} />
    {thread && <div className="sk-cm-thread">{thread}</div>}
  </article>;
}

/** Room the composer needs in the rail: the layout keeps cards clear of it. */
export const COMPOSER_HEIGHT = 224;

export interface RailDraft {
  id: string;
  /** Top of the text being commented on. */
  anchorTop: number;
  render: (top: number) => ReactNode;
}

export interface CommentRailProps {
  cards: Cards;
  selectedId: string | null;
  onSelect: (id: string | null, opts?: { jump?: boolean }) => void;
  /** The branch whose comments are shown; none in local and demo (FR-015). */
  branch: string | null;
  /** Where the rail starts in `.sk-doc` (from `useRailRoom`); the CSS default applies without it. */
  left?: number;
  /** The part of the document on screen. Without it every card is built (static markup, tests). */
  viewport?: { top: number; height: number };
  /** The scroll container: the selected card is kept on screen in it. */
  docRef?: RefObject<HTMLElement | null>;
  person?: (a: HighlightAuthor) => { name: string };
  now?: number;
  onRetry?: (id: string) => void;
  actions?: CardActions;
  editing?: CardEditing;
  /** The discussion of a card, drawn when it is open (specs/011). */
  threadFor?: (card: CommentCard) => ReactNode;
  /** The tool on the comment's own row (the emoji button); `open` tells whether the card is the open one (specs/015). */
  rowToolFor?: (card: CommentCard, open: boolean) => ReactNode;
  /** The row of emoji under the comment's text, for every card (specs/017). */
  chipsFor?: (card: CommentCard, open: boolean) => ReactNode;
  /** Comments being written, each beside its text; the one being written keeps its place and the cards make way. */
  drafts?: RailDraft[];
  activeDraftId?: string | null;
  /** Unsent drafts that belong to other documents, so the reader is told they are kept. */
  draftsElsewhere?: number;
  /** When comments were last looked for and the badge for new ones (FR-014). */
  fresh?: FreshProps;
}

export function CommentRail({ cards, selectedId, onSelect, branch, left, viewport, docRef, person, now, onRetry, actions, editing, threadFor, rowToolFor, chipsFor, drafts = [], activeDraftId = null, draftsElsewhere = 0, fresh }: CommentRailProps) {
  const head = fresh ? RAIL_HEAD_FRESH : RAIL_HEAD;
  const asideRef = useRef<HTMLElement>(null);
  const byKey = useRef(false);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const measure = useRef((id: string, h: number) => setHeights(m => (Math.abs((m[id] ?? 0) - h) < 2 ? m : { ...m, [id]: h }))).current;
  const coarse = useCoarse();
  const total = cards.cards.length + cards.outdated.length;
  const draftId = (d: RailDraft) => 'draft:' + d.id;
  const ids = [...cards.cards, ...cards.outdated].map(c => c.id);
  const heightOf = (c: CommentCard) => (isMeasured(c, { open: c.id === selectedId || c.id === editing?.id, coarse }) ? heights[c.id] ?? c.height : c.height ?? CLOSED_CARD_HEIGHT);
  const measuredClosed = (c: CommentCard) => isMeasured(c, { open: false, coarse });
  const tops = layoutCards([
    ...cards.cards.map(c => ({ id: c.id, anchorTop: c.anchorTop ?? 0, height: heightOf(c), createdAt: c.highlight.createdAt })),
    ...drafts.map(d => ({ id: draftId(d), anchorTop: d.anchorTop, height: COMPOSER_HEIGHT, createdAt: '9999' }))
  ], activeDraftId ? 'draft:' + activeDraftId : selectedId, GAP, head + GAP);

  // The selected card is kept on screen: a click on the text may leave its card pushed below the fold.
  const selTop = selectedId ? tops[selectedId] : undefined;
  useEffect(() => {
    const doc = docRef?.current;
    if (doc && selTop !== undefined) {
      const h = heights[selectedId!] ?? CLOSED_CARD_HEIGHT;
      if (selTop < doc.scrollTop + head || selTop + h > doc.scrollTop + doc.clientHeight) doc.scrollTop = Math.max(0, selTop - 80);
    }
    if (byKey.current) { asideRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus(); byKey.current = false; }
  }, [selectedId, selTop]); // eslint-disable-line react-hooks/exhaustive-deps

  if (total === 0 && drafts.length === 0 && !(fresh && fresh.newCount > 0)) return null;
  const near = (c: CommentCard) => {
    if (!viewport || c.id === selectedId || c.id === editing?.id) return true;
    const t = tops[c.id];
    return t + c.height >= viewport.top - viewport.height && t <= viewport.top + 2 * viewport.height;
  };
  const lastBottom = Math.max(cards.cards.reduce((m, c) => Math.max(m, tops[c.id] + heightOf(c)), head), ...drafts.map(d => tops[draftId(d)] + COMPOSER_HEIGHT));
  // The rail is as tall as its cards, so the document scrolls far enough to reach them even though the cards far
  // from the screen are not built (a dense document pushes later cards below its own text).
  const outdatedHeight = cards.outdated.length ? 40 + cards.outdated.reduce((n, c) => n + CLOSED_CARD_HEIGHT + 8 + outdatedExtra(c, coarse), 0) : 0;
  const railHeight = Math.ceil(lastBottom + GAP * 2 + outdatedHeight + 16);
  const pick = (id: string) => onSelect(id, { jump: true });
  const at = selectedId ? ids.indexOf(selectedId) : -1;
  const shared = { person, now, onRetry, actions, editing, onMeasure: measure };
  return <aside ref={asideRef} className="sk-cm-rail" role="complementary" aria-label="Comments" style={{ ...(left === undefined ? {} : { left }), height: railHeight }}
    onKeyDown={e => {
      if ((e.target as HTMLElement).closest('textarea, input')) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Escape') { e.preventDefault(); byKey.current = true; onSelect(nextSelection(ids, selectedId, e.key)); }
    }}>
    <header className="sk-cm-head" style={{ height: head }}><b>Comments · {total}</b>{branch && <span className="sk-cm-branch">{branch}</span>}
      {draftsElsewhere > 0 && <span className="sk-cm-draftnote" role="status">{draftsElsewhere} unsent in another document</span>}
      {fresh && <FreshBar {...fresh} />}</header>
    <div className="sk-cm-live" role="status" aria-live="polite">{at >= 0 ? `Comment ${at + 1} of ${ids.length} selected` : ''}</div>
    {drafts.map(d => <Fragment key={d.id}>{d.render(tops[draftId(d)])}</Fragment>)}
    {cards.cards.filter(near).map(c => <Card key={c.id} card={c} top={tops[c.id]} selected={c.id === selectedId} onSelect={pick} thread={c.id === selectedId ? threadFor?.(c) : undefined} rowTool={rowToolFor?.(c, c.id === selectedId)} chips={chipsFor?.(c, c.id === selectedId)} measured={measuredClosed(c)} {...shared} />)}
    {cards.outdated.length > 0 && <section className="sk-cm-out" style={{ top: lastBottom + GAP * 2 }}>
      <h3>Outdated, text changed</h3>
      {cards.outdated.map(c => <Card key={c.id} card={c} selected={c.id === selectedId} onSelect={pick} thread={c.id === selectedId ? threadFor?.(c) : undefined} rowTool={rowToolFor?.(c, c.id === selectedId)} chips={chipsFor?.(c, c.id === selectedId)} measured={measuredClosed(c)} {...shared} />)}
    </section>}
  </aside>;
}

/** Where a comment opens when there is no room for the rail: a sheet at the foot of the document (research R9). */
export function CommentSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  return <div className="sk-cm-sheet" role="dialog" aria-label={label}>
    <button type="button" className="sk-cm-sheet-close" aria-label="Close comment" onClick={onClose}><Icon n="x" s={16} /></button>
    {children}
  </div>;
}
