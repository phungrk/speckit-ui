import { Fragment, useEffect, useRef, useState } from 'react';
import type { Feature, Phase, Role } from '../types';
import { Icon, Label } from '../ui';
import { CP_REF, CP_SUGGEST } from './context';

export interface CopilotMsg {
  r: 'user' | 'ai';
  t: string;
  /** Feature · phase · role the question was asked from. */
  ctx?: string;
  err?: boolean;
  offline?: boolean;
  shared?: boolean;
}

/** Answers a thread. Resolves with the reply, or rejects with a message to show. */
export type AskFn = (history: CopilotMsg[]) => Promise<Pick<CopilotMsg, 't' | 'offline'>>;

function RichText({ text, onRef }: { text: string; onRef: (id: string) => void }) {
  const inline = (s: string, k: number) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = part.startsWith('**') && part.endsWith('**');
    const body = bold ? part.slice(2, -2) : part;
    const bits = body.split(CP_REF).map((b, j) => j % 2 ? <button key={j} className="sk-ref" onClick={() => onRef(b)}>{b}</button> : b);
    return bold ? <b key={k + '-' + i}>{bits}</b> : <Fragment key={k + '-' + i}>{bits}</Fragment>;
  });
  const rows = text.trim().split('\n').filter(l => l.trim());
  return <div className="sk-rt">{rows.map((l, i) => /^\s*[-*•]\s+/.test(l)
    ? <div key={i} className="sk-rt-li">{inline(l.replace(/^\s*[-*•]\s+/, ''), i)}</div>
    : <p key={i}>{inline(l, i)}</p>)}</div>;
}

interface Props {
  role: Role;
  phase: Phase;
  f: Feature;
  msgs: CopilotMsg[];
  setMsgs: (m: CopilotMsg[]) => void;
  ask: AskFn;
  seed: string | null;
  clearSeed: () => void;
  onRef: (id: string) => void;
  onShare: (text: string) => void;
}

export function Copilot({ role, phase, f, msgs, setMsgs, ask, seed, clearSeed, onRef, onShare }: Props) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [msgs, busy]);

  const send = async (text?: string) => {
    const t = (text ?? q).trim();
    if (!t || busy) return;
    setQ(''); setBusy(true);
    const hist: CopilotMsg[] = [...msgs, { r: 'user', t, ctx: `${f.id} · ${phase.n} · ${role}` }];
    setMsgs(hist);
    try {
      const reply = await ask(hist);
      setMsgs([...hist, { r: 'ai', ...reply }]);
    } catch (e) {
      setMsgs([...hist, { r: 'ai', t: e instanceof Error ? e.message : 'Copilot could not reach the model. Try again in a moment.', err: true }]);
    }
    setBusy(false);
  };

  useEffect(() => { if (seed) { void send(seed); clearSeed(); } }, [seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = (i: number, t: string) => {
    navigator.clipboard?.writeText(t).then(() => { setCopied(i); setTimeout(() => setCopied(c => (c === i ? null : c)), 1500); }, () => {});
  };

  return <div className="sk-cp">
    <div className="sk-cp-ctx"><span className="sk-ai-badge">AI</span><span>Reading <b>{f.id}</b> · {phase.n} · as {role}</span></div>
    <div className="sk-cp-thread" ref={threadRef} aria-live="polite">
      {msgs.length === 0 && <div className="sk-cp-empty">
        <p>Ask about any artifact in this feature. Answers cite IDs you can open.</p>
        <Label>Suggested for {role}</Label>
        <div className="sk-cp-sugs">{CP_SUGGEST[role].map(s => <button key={s} className="sk-cp-sug" onClick={() => send(s)}>{s}<Icon n="arrow" s={12} /></button>)}</div>
      </div>}
      {msgs.map((m, i) => m.r === 'user'
        ? <div key={i} className="sk-cp-user"><span className="sk-cp-mctx">{m.ctx}</span>{m.t}</div>
        : <div key={i} className={'sk-cp-ai' + (m.err ? ' err' : '')}>
          <RichText text={m.t} onRef={onRef} />
          {!m.err && <div className="sk-cp-tools">
            <span>{m.offline ? 'Offline answer · from workspace data' : 'AI-generated · verify before acting'}</span>
            <button onClick={() => copy(i, m.t)}>{copied === i ? 'Copied' : 'Copy'}</button>
            <button onClick={() => onShare(m.t)} disabled={m.shared}>{m.shared ? 'Shared' : 'Share to activity'}</button>
          </div>}
        </div>)}
      {busy && <div className="sk-cp-ai sk-cp-busy" aria-label="Copilot is answering"><i></i><i></i><i></i></div>}
    </div>
    {msgs.length > 0 && <div className="sk-cp-quick">{CP_SUGGEST[role].slice(0, 2).map(s => <button key={s} className="sk-chip" onClick={() => send(s)} disabled={busy}>{s}</button>)}</div>}
    <form className="sk-cp-in" onSubmit={e => { e.preventDefault(); void send(); }}>
      <textarea className="input" rows={2} value={q} placeholder={`Ask about ${f.title.toLowerCase()}…`} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} aria-label="Ask Copilot"></textarea>
      <button className="btn btn-primary btn-icon" disabled={busy || !q.trim()} aria-label="Send"><Icon n="arrow" s={16} /></button>
    </form>
  </div>;
}

export function GateBrief({ items, onAsk }: { items: string[] | null; onAsk: () => void }) {
  if (!items) return null;
  return <div className="sk-brief">
    <div className="sk-brief-h"><span className="sk-ai-badge">AI</span><b>Before you approve</b></div>
    <ul>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    <button className="sk-brief-ask" onClick={onAsk}>Ask Copilot about this gate<Icon n="arrow" s={12} /></button>
  </div>;
}
