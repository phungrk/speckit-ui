import { Fragment, useEffect, useState, type ReactNode, type RefObject } from 'react';
import type { HighlightAuthor } from '../project/types';
import { Avatar } from './Avatar';
import { authorLabel, relTime } from './brief';
import { meaningOf } from './colors';
import { CLOSED_CARD_HEIGHT, type CommentCard, type Cards } from './comments';
import { layoutCards, railPlacement } from './layout';

// The comment rail (specs/012-docs-style-comment-flow, contracts/comment-rail-ui.md): cards beside the text
// they comment on, inside the document's own scroll container so they scroll with it.

/** Height of the rail's header, the least `top` a card may have (plus the gap). */
export const RAIL_HEAD = 40;
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

export interface CardProps {
  card: CommentCard;
  /** Top in the scroll container; absent for a card in the Outdated group, which is not placed. */
  top?: number;
  selected: boolean;
  person?: (a: HighlightAuthor) => { name: string };
  now?: number;
  onSelect: (id: string) => void;
  onRetry?: (id: string) => void;
  /** Room for the replies, reactions and the resolve button of specs/011. */
  thread?: ReactNode;
}

function SaveLine({ card, onRetry }: { card: CommentCard; onRetry?: (id: string) => void }) {
  const s = card.save;
  if (s.state === 'idle') return null;
  return <div className="sk-cm-state" data-state={s.state} role={s.state === 'failed' ? 'alert' : undefined}>
    {s.state === 'sending' && 'Sending…'}
    {s.state === 'saved' && (s.commit ? <>Saved · <a href={s.commit.url} target="_blank" rel="noreferrer">commit {s.commit.sha.slice(0, 7)}</a></> : s.where === 'folder' ? 'Saved to folder' : s.where === 'browser' ? 'Saved in this browser' : 'Saved')}
    {s.state === 'failed' && <>Failed: {s.error}{onRetry && <button type="button" onClick={e => { e.stopPropagation(); onRetry(card.id); }}>Retry</button>}</>}
  </div>;
}

export function Card({ card, top, selected, person, now, onSelect, onRetry, thread }: CardProps) {
  const h = card.highlight;
  const name = person ? person(h.author).name : authorLabel(h.author);
  return <article className={'sk-cm-card' + (selected ? ' on' : '')} data-color={h.color} role="group"
    aria-label={`Comment by ${name} on “${quote40(h.quote)}”`} aria-current={selected ? 'true' : undefined}
    tabIndex={selected ? 0 : -1} style={top === undefined ? undefined : { top }} onClick={() => onSelect(card.id)}
    onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) onSelect(card.id); }}>
    <div className="sk-cm-who"><Avatar name={name} /><b>{name}</b><span className="sk-cm-time">{relTime(h.createdAt, now)}</span></div>
    <q className="sk-cm-quote">{h.quote}</q>
    <p className="sk-cm-note">{h.note}</p>
    {selected && <div className="sk-cm-meta"><i className={'hl-' + h.color + '-solid'}></i>{meaningOf(h.color)}</div>}
    <SaveLine card={card} onRetry={onRetry} />
    {thread && <div className="sk-cm-thread">{thread}</div>}
  </article>;
}

/** Room the composer needs in the rail: the layout keeps cards clear of it (a closed card is CLOSED_CARD_HEIGHT). */
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
  person?: (a: HighlightAuthor) => { name: string };
  now?: number;
  onRetry?: (id: string) => void;
  /** Comments being written, each beside its text; the one being written keeps its place and the cards make way. */
  drafts?: RailDraft[];
  activeDraftId?: string | null;
  /** Unsent drafts that belong to other documents, so the reader is told they are kept. */
  draftsElsewhere?: number;
}

export function CommentRail({ cards, selectedId, onSelect, branch, left, viewport, person, now, onRetry, drafts = [], activeDraftId = null, draftsElsewhere = 0 }: CommentRailProps) {
  const total = cards.cards.length + cards.outdated.length;
  if (total === 0 && drafts.length === 0) return null;
  const draftId = (d: RailDraft) => 'draft:' + d.id;
  const tops = layoutCards([
    ...cards.cards.map(c => ({ id: c.id, anchorTop: c.anchorTop ?? 0, height: c.height ?? CLOSED_CARD_HEIGHT, createdAt: c.highlight.createdAt })),
    ...drafts.map(d => ({ id: draftId(d), anchorTop: d.anchorTop, height: COMPOSER_HEIGHT, createdAt: '9999' }))
  ], activeDraftId ? 'draft:' + activeDraftId : selectedId, GAP, RAIL_HEAD + GAP);
  const near = (c: CommentCard) => {
    if (!viewport || c.id === selectedId) return true;
    const t = tops[c.id];
    return t + c.height >= viewport.top - viewport.height && t <= viewport.top + 2 * viewport.height;
  };
  const lastBottom = Math.max(cards.cards.reduce((m, c) => Math.max(m, tops[c.id] + c.height), RAIL_HEAD), ...drafts.map(d => tops[draftId(d)] + COMPOSER_HEIGHT));
  return <aside className="sk-cm-rail" role="complementary" aria-label="Comments" style={left === undefined ? undefined : { left }}>
    <header className="sk-cm-head"><b>Comments · {total}</b>{branch && <span className="sk-cm-branch">{branch}</span>}
      {draftsElsewhere > 0 && <span className="sk-cm-draftnote" role="status">{draftsElsewhere} unsent in another document</span>}</header>
    {drafts.map(d => <Fragment key={d.id}>{d.render(tops[draftId(d)])}</Fragment>)}
    {cards.cards.filter(near).map(c => <Card key={c.id} card={c} top={tops[c.id]} selected={c.id === selectedId} person={person} now={now} onSelect={id => onSelect(id, { jump: true })} onRetry={onRetry} />)}
    {cards.outdated.length > 0 && <section className="sk-cm-out" style={{ top: lastBottom + GAP * 2 }}>
      <h3>Outdated, text changed</h3>
      {cards.outdated.map(c => <Card key={c.id} card={c} selected={c.id === selectedId} person={person} now={now} onSelect={id => onSelect(id, { jump: true })} onRetry={onRetry} />)}
    </section>}
  </aside>;
}
