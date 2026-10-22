import { useState } from 'react';
import { Label } from '../ui';
import type { Highlight, HighlightAuthor, HighlightColor } from '../project/types';
import { authorLabel, relTime } from './brief';
import { initials } from './Avatar';
import { HL_COLORS, HL_NONE, meaningOf } from './colors';

// The Highlights tab of the right sidebar (contracts/annotations-ui.md), from the design prototype.

export interface PanelPhase { key: string; name: string }

export interface HighlightsPanelProps {
  items: Highlight[];
  /** Steps in order, for the section labels "02 · Specify". */
  phases: readonly PanelPhase[];
  /** Highlights whose text is gone (Outdated) on the step on screen. */
  outdated: string[];
  onOpen: (h: Highlight) => void;
  /** Avatar initials and display name of an author. */
  person?: (a: HighlightAuthor) => { name: string; ini: string };
  /** The "Ask before committing highlights" switch, for GitHub stores only (FR-009a). */
  ask?: { on: boolean; set: (on: boolean) => void };
  /** Reason saving is off, shown under the list. */
  readOnly?: string | null;
  now?: number;
}

const defaultPerson = (a: HighlightAuthor) => { const name = authorLabel(a); return { name, ini: initials(name) }; };

export function HighlightsPanel({ items, phases, outdated, onOpen, person = defaultPerson, ask, readOnly, now }: HighlightsPanelProps) {
  const [flt, setFlt] = useState<'all' | HighlightColor>('all');
  const shown = items.filter(h => flt === 'all' || h.color === flt);
  const order = phases.map(p => p.key);
  const groups = order.map((k, i) => ({ k, i, list: shown.filter(h => h.phase === k) })).filter(g => g.list.length);
  return <div className="sk-hlp">
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
        return <button type="button" key={h.id} className="sk-hlp-item" onClick={() => onOpen(h)}>
          <i className={'sk-hlp-bar hl-' + h.color + '-solid'}></i>
          <div>
            <q>{h.quote}</q>
            {h.note && <p>{h.note}</p>}
            <span className="sk-hlp-meta"><span className="sk-avatar sm">{p.ini}</span>{p.name} · {meaningOf(h.color)} · {relTime(h.createdAt, now)}{outdated.includes(h.id) && <span className="sk-hlp-out"> · Outdated, text changed</span>}</span>
          </div>
        </button>;
      })}
    </section>)}
    {(ask || readOnly) && <div className="sk-hlp-foot">
      {readOnly ? <span>{readOnly}</span> : ask && <label><input type="checkbox" checked={ask.on} onChange={e => ask.set(e.target.checked)} /> Ask before committing highlights</label>}
    </div>}
  </div>;
}
