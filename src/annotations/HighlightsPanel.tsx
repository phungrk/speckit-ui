import { useState } from 'react';
import { Label } from '../ui';
import type { Highlight, HighlightAuthor, HighlightColor } from '../project/types';
import { authorLabel, relTime } from './brief';
import { initials } from './Avatar';
import { FreshBar, type FreshProps } from './FreshBar';
import { HL_COLORS, HL_NONE, meaningOf } from './colors';
import type { HighlightActions } from './highlightActions';

// The Highlights tab of the right sidebar (contracts/annotations-ui.md), from the design prototype.

export interface PanelPhase { key: string; name: string }

export interface HighlightsPanelProps {
  items: Highlight[];
  /** Steps in order, for the section labels "02 · Specify". */
  phases: readonly PanelPhase[];
  /** Highlights whose text is gone (Outdated) on the step on screen. */
  outdated: string[];
  /** The selected comment, shared with the reading column and its rail (specs/012 FR-012). */
  selectedId?: string | null;
  /** When comments were last looked for and the badge for new ones (specs/012 FR-014). */
  fresh?: FreshProps;
  onOpen: (h: Highlight) => void;
  /** What can be done with a highlight that has only a colour (no card): from the Annotator, null when there is none (specs/013 FR-008). */
  actions?: HighlightActions | null;
  /** Avatar initials and display name of an author. */
  person?: (a: HighlightAuthor) => { name: string; ini: string };
  /** The "Ask before committing highlights" switch, for GitHub stores only (FR-009a). */
  ask?: { on: boolean; set: (on: boolean) => void };
  /** Reason saving is off, shown under the list. */
  readOnly?: string | null;
  now?: number;
}

const defaultPerson = (a: HighlightAuthor) => { const name = authorLabel(a); return { name, ini: initials(name) }; };

/** The actions under an open entry that has only a colour (specs/013 FR-008): the author recolours and deletes, everyone copies and asks. */
export function EntryActions({ h, actions, confirming, onConfirm, onDeleted }: { h: Highlight; actions: HighlightActions; confirming: boolean; onConfirm: (on: boolean) => void; onDeleted: () => void }) {
  const mine = actions.mine(h);
  return <div className="sk-hlp-acts" role="group" aria-label="Highlight actions">
    {confirming
      ? <div className="sk-cm-acts"><span>Delete this highlight?</span>
        <button type="button" className="btn btn-secondary" onClick={() => onConfirm(false)}>Keep</button>
        <button type="button" className="btn btn-primary" onClick={() => { onConfirm(false); onDeleted(); actions.onDelete(h.id); }}>Delete</button></div>
      : <div className="sk-cm-acts sk-hlp-btns">
        <button type="button" className="btn btn-secondary" onClick={() => actions.onCopy(h.id)}>Copy</button>
        <button type="button" className="btn btn-secondary" onClick={() => actions.onAsk(h.id)}>Ask</button>
        {mine && <button type="button" className="btn btn-secondary" title={actions.readOnly ?? undefined} aria-disabled={actions.readOnly ? true : undefined}
          onClick={() => { if (!actions.readOnly) onConfirm(true); }}>Delete</button>}
      </div>}
    {actions.readOnly && mine && <span className="sk-hlp-why" role="status">{actions.readOnly}</span>}
  </div>;
}

export function HighlightsPanel({ items, phases, outdated, selectedId = null, fresh, onOpen, actions, person = defaultPerson, ask, readOnly, now }: HighlightsPanelProps) {
  const [flt, setFlt] = useState<'all' | HighlightColor>('all');
  // The entry whose actions are open, and the one waiting for "Delete this highlight?" (only entries without a note have actions here).
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const shown = items.filter(h => flt === 'all' || h.color === flt);
  const order = phases.map(p => p.key);
  const groups = order.map((k, i) => ({ k, i, list: shown.filter(h => h.phase === k) })).filter(g => g.list.length);
  return <div className="sk-hlp">
    {fresh && <FreshBar {...fresh} />}
    <div className="sk-hlp-flt" role="group" aria-label="Filter highlights">
      <button type="button" className={flt === 'all' ? 'on' : ''} aria-pressed={flt === 'all'} onClick={() => setFlt('all')}>All <b>{items.length}</b></button>
      {[...HL_COLORS, HL_NONE].map(c => <button type="button" key={c.key} className={flt === c.key ? 'on' : ''} aria-pressed={flt === c.key} onClick={() => setFlt(c.key)}>
        <i className={'hl-' + c.key}></i>{c.meaning} <b>{items.filter(h => h.color === c.key).length}</b>
      </button>)}
    </div>
    {items.length === 0 && <p className="sk-hlp-empty">Select text in any artifact to highlight it or leave a note for the team.</p>}
    {groups.map(g => <section key={g.k} className="sk-hlp-sec"><Label>{String(g.i + 1).padStart(2, '0')} · {phases[g.i].name}</Label>
      {g.list.map(h => {
        const p = person(h.author);
        const plain = !h.note.trim();
        const open = plain && !!actions && openId === h.id;
        return <div key={h.id} className="sk-hlp-row">
          <button type="button" className={'sk-hlp-item' + (h.id === selectedId ? ' on' : '')} aria-current={h.id === selectedId ? 'true' : undefined} aria-expanded={plain && actions ? open : undefined}
            onClick={() => { setOpenId(plain && openId !== h.id ? h.id : null); setConfirmId(null); onOpen(h); }}>
            <i className={'sk-hlp-bar hl-' + h.color + '-solid'}></i>
            <div>
              <q>{h.quote}</q>
              {h.note && <p>{h.note}</p>}
              <span className="sk-hlp-meta"><span className="sk-avatar sm">{p.ini}</span>{p.name} · {meaningOf(h.color)} · {relTime(h.createdAt, now)}{outdated.includes(h.id) && <span className="sk-hlp-out"> · Outdated, text changed</span>}</span>
            </div>
          </button>
          {open && actions && <EntryActions h={h} actions={actions} confirming={confirmId === h.id} onConfirm={on => setConfirmId(on ? h.id : null)} onDeleted={() => setOpenId(null)} />}
        </div>;
      })}
    </section>)}
    {(ask || readOnly) && <div className="sk-hlp-foot">
      {readOnly ? <span>{readOnly}</span> : ask && <label><input type="checkbox" checked={ask.on} onChange={e => ask.set(e.target.checked)} /> Ask before committing highlights</label>}
    </div>}
  </div>;
}
