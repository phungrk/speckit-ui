import { useEffect, useRef, useState } from 'react';
import { NS_EXAMPLE, NS_LOG, SK, makeDraft, slugify } from './data';
import type { Draft, Feature } from './types';
import { Icon, Label } from './ui';
import { DraftSpec } from './views/DraftSpec';

export interface NewSpec { id: string; slug: string; title: string; draft: Draft; summary: string }

interface Props {
  nextId: string;
  features: Feature[];
  onClose: () => void;
  onCreate: (spec: NewSpec) => void;
}

const STEPS = ['Describe', 'Generate', 'Review draft'];

export function NewSpecDialog({ nextId, features, onClose, onCreate }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Recurring transfers');
  const [desc, setDesc] = useState(NS_EXAMPLE);
  const [deps, setDeps] = useState<Record<string, boolean>>({ '003': true });
  const [log, setLog] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const timers = useRef<number[]>([]);
  const branch = `${nextId}-${slugify(name) || 'untitled'}`;
  const short = desc.trim().length < 40;

  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => stop, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const generate = () => {
    stop(); setStep(1); setLog([]);
    NS_LOG.forEach((l, i) => timers.current.push(window.setTimeout(() => {
      setLog(x => [...x, l.replace('{b}', branch)]);
      if (i === NS_LOG.length - 1) timers.current.push(window.setTimeout(() => { setDraft(makeDraft(desc)); setStep(2); }, 450));
    }, 380 * (i + 1))));
  };

  return <div className="dialog-backdrop sk-ns-back" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="dialog sk-ns" role="dialog" aria-modal="true" aria-label="New spec">
      <header className="sk-ns-head">
        <div>
          <div className="sk-file"><Icon n="branch" s={14} />{branch}</div>
          <div className="dialog-title">New spec</div>
        </div>
        <ol className="sk-ns-steps">{STEPS.map((s, i) => <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')}</span>{s}</li>)}</ol>
        <button className="btn btn-icon btn-secondary" onClick={onClose} aria-label="Close"><Icon n="x" s={16} /></button>
      </header>

      <div className="sk-ns-body">
        {step === 0 && <div className="sk-ns-form">
          <div className="sk-ns-main">
            <div className="field"><label htmlFor="ns-desc">What do you want to build, and why?</label>
              <textarea id="ns-desc" className="input sk-ns-ta" value={desc} onChange={e => setDesc(e.target.value)} autoFocus></textarea>
            </div>
            <p className="sk-ns-hint">Describe who it is for and what changes for them. Leave stack and architecture for <b>Plan</b>.</p>
          </div>
          <div className="sk-ns-aside">
            <div className="field"><label htmlFor="ns-name">Short name</label>
              <input id="ns-name" className="input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div><Label>Related features</Label>
              <div className="sk-chips">{features.map(f => <button key={f.id} className={'sk-chip' + (deps[f.id] ? ' on' : '')} aria-pressed={!!deps[f.id]} onClick={() => setDeps(d => ({ ...d, [f.id]: !d[f.id] }))}>{f.id} {f.title}</button>)}</div>
            </div>
            <div><Label>Gate · Specify</Label>
              <ul className="sk-ns-gate">{SK.phases[1].gate.map(g => <li key={g}><span className="sk-avatar sm">{SK.people[g].ini}</span>{SK.people[g].name}<span className="text-muted">{g}</span></li>)}</ul>
            </div>
            <div className="sk-ns-const"><Icon n="file" s={14} />Checked against constitution {SK.constitution.version} · {SK.constitution.principles.length} principles</div>
          </div>
        </div>}

        {step === 1 && <div className="sk-ns-gen">
          <div className="sk-ns-loglist" aria-live="polite">{log.map((l, i) => <div key={i}><Icon n="check" s={14} />{l}</div>)}<div className="sk-ns-cursor">Working…</div></div>
          <div className="sk-ns-skel" aria-hidden="true">{[80, 100, 64, 92, 72, 100, 56].map((w, i) => <i key={i} style={{ width: w + '%' }}></i>)}</div>
        </div>}

        {step === 2 && draft && <div className="sk-ns-draft">
          <div className="sk-dochead"><div className="sk-file"><Icon n="file" s={14} />{`specs/${branch}/spec.md`}</div><h3>{name}</h3><div className="sk-meta">Draft · {draft.stories.length} user stories · {draft.frs.length} requirements</div></div>
          <DraftSpec draft={draft} />
        </div>}
      </div>

      <footer className="sk-ns-foot">
        {step === 0 && <>
          <code className="sk-ns-cmd"><Icon n="terminal" s={14} /><span>{`/speckit.specify "${desc.slice(0, 48)}${desc.length > 48 ? '…' : ''}"`}</span></code>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={short || !name.trim()} onClick={generate}>Generate spec<Icon n="play" s={12} /></button>
        </>}
        {step === 1 && <><span className="sk-ns-cmd">Running /speckit.specify</span><button className="btn btn-secondary" onClick={() => { stop(); setStep(0); }}>Stop</button></>}
        {step === 2 && draft && <>
          <span className="sk-ns-cmd">{`Saved as draft on ${branch}`}</span>
          <button className="btn btn-secondary" onClick={() => setStep(0)}>Edit description</button>
          <button className="btn btn-secondary" onClick={generate}>Regenerate</button>
          <button className="btn btn-primary" onClick={() => onCreate({ id: nextId, slug: branch, title: name, draft, summary: desc })}>Create & request review<Icon n="arrow" s={14} /></button>
        </>}
      </footer>
    </div>
  </div>;
}
