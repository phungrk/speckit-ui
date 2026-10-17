import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Copilot, type AskFn, type CopilotMsg } from '../copilot/Copilot';
import { OfflineError, requestCopilot } from '../copilot/api';
import { Icon, Label } from '../ui';
import { LIVE_SUGGEST, buildLiveContext, liveOfflineAnswer, liveRefPattern, liveRefPhase } from './copilot';
import { GatePanel } from './GatePanel';
import { GATE_NAME, unapprovedGates } from './gates';
import { LIVE_CLASS, LIVE_LABEL, PHASES, blobUrl, nextStep, phaseStatus, type LiveStatus } from './phases';
import { fetchTracking, postGate, type GateAction } from './trackingApi';
import type { GateKey, Project, Tracking } from './types';
import { LiveAnalyze, LiveClarify, LiveConstitution, LiveImplement, LivePlan, LiveSpec, LiveTasks, NotStarted } from './views';

const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem('sk.live.' + k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem('sk.live.' + k, JSON.stringify(v)); } catch { /* ignore */ } };

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : `${Math.floor(s / 3600)} h ago`;
};

interface Props { project: Project; refreshing: boolean; onRefresh: () => void }

export function LiveWorkspace({ project, refreshing, onRefresh }: Props) {
  const [slug, setSlug] = useState(() => load('slug', ''));
  const [sel, setSel] = useState<number | null>(null);
  const [rtab, setRtab] = useState<'spec' | 'ai'>('spec');
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, CopilotMsg[]>>({});
  const [cmd, setCmd] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => save('slug', slug), [slug]);
  const loadTracking = (refresh: boolean) => fetchTracking(refresh).then(t => { setTracking(t); setTrackingError(null); }, (e: Error) => setTrackingError(e.message));
  useEffect(() => { void loadTracking(false); }, []);
  const refreshAll = () => { onRefresh(); void loadTracking(true); };
  const decide = async (gate: GateKey, action: GateAction, note: string) => {
    try { setTracking(await postGate(f!.slug, gate, action, note)); return null; } catch (e) { return e instanceof Error ? e.message : 'Gate update failed.'; }
  };
  const issueOf = (s: string) => tracking?.issues[s] ?? null;
  /** Rail label and class for step i, folding in gate approvals once they have loaded. */
  const cell = (s: LiveStatus, i: number, slugOf: string): [string, string] => {
    const g = i > 0 ? issueOf(slugOf)?.gates[PHASES[i].k as GateKey] : undefined;
    if (s !== 'done' || i === 0 || !tracking) return [LIVE_CLASS[s], LIVE_LABEL[s]];
    return g?.approved ? ['done', 'Approved'] : ['review', 'To approve'];
  };
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const f = project.specs.find(x => x.slug === slug) || project.specs[project.specs.length - 1];
  const status: LiveStatus[] = f ? phaseStatus(project, f) : PHASES.map((_, i) => (i === 0 && project.constitution ? 'done' : 'pending'));
  const current = Math.max(0, status.indexOf('current') === -1 ? 6 : status.indexOf('current'));
  const pi = sel ?? (f ? current : 0);
  const phase = PHASES[pi];
  const st = status[pi];

  useEffect(() => { setCmd(project.commandPrefix + phase.k); }, [phase.k, project.commandPrefix, f?.slug]);

  const copy = () => {
    const c = cmd.trim();
    if (!c) return;
    const where = `Paste it into Claude Code in ${project.repo}.`;
    navigator.clipboard?.writeText(c).then(
      () => setLog(l => [...l, '› ' + c, `Copied. ${where}`]),
      () => setLog(l => [...l, '› ' + c, `Copy failed. Select the command and copy it by hand. ${where}`]));
  };

  // Pending approvals come first, then the next command to run.
  const next = project.specs.flatMap(x => {
    const todo = tracking ? unapprovedGates(phaseStatus(project, x), issueOf(x.slug)) : [];
    if (todo.length) return [{ x, n: { phase: PHASES.findIndex(p => p.k === todo[0]), text: `Approve ${GATE_NAME[todo[0]]}`, detail: '' } }];
    const n = nextStep(project, x);
    return n ? [{ x, n }] : [];
  });

  let view: ReactNode;
  if (pi === 0) view = <LiveConstitution c={project.constitution} project={project} />;
  else if (!f) view = <div className="sk-empty"><Icon n="file" s={28} /><h4>No specs yet</h4><p>Run <b>{project.commandPrefix}specify</b> in Claude Code to create specs/001-…/spec.md.</p></div>;
  else if (st !== 'done') view = <NotStarted phase={phase} status={st} prefix={project.commandPrefix} spec={f} />;
  else view = [null, <LiveSpec f={f} />, <LiveClarify f={f} />, <LivePlan f={f} project={project} />, <LiveTasks f={f} />, <LiveAnalyze f={f} />, <LiveImplement f={f} />][pi];

  const msgs = f ? threads[f.slug] || [] : [];
  const setMsgs = (m: CopilotMsg[]) => f && setThreads(t => ({ ...t, [f.slug]: m }));
  const ask: AskFn = async hist => {
    try {
      return { t: await requestCopilot(buildLiveContext(project, f!, phase), hist) };
    } catch (e) {
      if (e instanceof OfflineError) return { t: liveOfflineAnswer(hist[hist.length - 1].t, project, f!), offline: true };
      throw e;
    }
  };

  const fields = f?.spec ? Object.entries(f.spec.fields).filter(([k]) => k !== 'Input') : [];

  return <div className="sk">
    <nav className="nav sk-nav">
      <div className="nav-brand">Speckit</div>
      <div className="sk-proj"><a className="sk-plain" href={`https://github.com/${project.repo}`} target="_blank" rel="noreferrer">{project.repo}</a><span className="text-muted">/ specs</span></div>
      <div className="sk-spacer"></div>
      <a className="sk-sync" href={`https://github.com/${project.repo}/commit/${project.sha}`} target="_blank" rel="noreferrer" title={`Loaded ${new Date(project.fetchedAt).toLocaleString()}`}>
        <Icon n="branch" s={14} />{project.ref} @ {project.sha.slice(0, 7)}<span className="text-muted"> · {ago(project.fetchedAt, now)}</span>
      </a>
      <button className="btn btn-secondary sk-small" onClick={refreshAll} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
    </nav>
    <div className="sk-body">
      <aside className="sk-side">
        <div className="sk-pad"><Label>Next up</Label>
          {next.length === 0 ? <p className="text-muted" style={{ fontSize: 13 }}>Every spec is done.</p> :
            <ul className="sk-list">{next.map(({ x, n }) => <li key={x.slug}><button className="sk-qitem" onClick={() => { setSlug(x.slug); setSel(n.phase); }}><b>{n.text}</b><span>{x.slug}</span><Icon n="arrow" s={14} /></button></li>)}</ul>}
        </div>
        <div className="sk-pad sk-rule"><div className="sk-rowh"><Label>Specs · {project.specs.length}</Label></div>
          <ul className="sk-list">{project.specs.map(x => {
            const s = phaseStatus(project, x);
            const i = s.indexOf('current');
            return <li key={x.slug}><button className={'sk-feat' + (x === f ? ' on' : '')} aria-current={x === f ? 'true' : undefined} onClick={() => { setSlug(x.slug); setSel(null); }}>
              <span className="sk-id">{x.id}</span><b>{x.title}</b>
              <span className="sk-bar" aria-hidden="true">{s.map((v, j) => <i key={j} className={cell(v, j, x.slug)[0]}></i>)}</span>
              <span className="sk-featst">{i < 0 ? 'Done' : PHASES[i].n}{x.spec?.fields.Status ? ` · ${x.spec.fields.Status}` : ''}</span>
            </button></li>;
          })}</ul>
        </div>
      </aside>
      <main className="sk-main">
        <div className="sk-fhead">
          <div className="sk-file"><Icon n="branch" s={14} />{f ? f.slug : project.repo}</div>
          <h2>{f ? f.title : 'No specs yet'}</h2>
        </div>
        <div className="sk-rail" role="tablist" aria-label="Spec Kit steps">{PHASES.map((p, i) => {
          const s = status[i];
          const [cls, label] = f ? cell(s, i, f.slug) : [LIVE_CLASS[s], LIVE_LABEL[s]];
          return <button key={p.k} role="tab" aria-selected={i === pi} className={'sk-cell ' + cls} onClick={() => setSel(i)}>
            <span className="sk-num">{String(i + 1).padStart(2, '0')}</span>
            <b>{p.n}</b>
            <span className="sk-st">{cls === 'done' ? <Icon n="check" s={12} /> : s === 'pending' ? <Icon n="lock" s={12} /> : <Icon n="dot" s={12} />}{label}</span>
          </button>;
        })}</div>
        <div className="sk-doc" role="tabpanel">{view}</div>
        <div className="sk-cmd">
          {log.length > 0 && <div className="sk-log" ref={logRef} aria-live="polite">{log.map((l, i) => <div key={i} className={l.startsWith('›') ? 'in' : ''}>{l}</div>)}</div>}
          <div className="sk-cmdrow">
            <Icon n="terminal" s={16} />
            <input className="sk-cmdin" value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={e => e.key === 'Enter' && copy()} aria-label="Command" />
            <button className="btn btn-primary" onClick={copy}>Copy<Icon n="arrow" s={12} /></button>
          </div>
        </div>
      </main>
      <aside className={'sk-right' + (rtab === 'ai' ? ' is-ai' : '')}>
        <div className="sk-rtabs" role="tablist">
          <button role="tab" aria-selected={rtab === 'spec'} onClick={() => setRtab('spec')}>Gate & PRs</button>
          <button role="tab" aria-selected={rtab === 'ai'} onClick={() => setRtab('ai')} disabled={!f}><span className="sk-ai-badge">AI</span>Copilot{msgs.length > 0 && <span className="sk-rtab-n">{Math.ceil(msgs.length / 2)}</span>}</button>
        </div>
        {rtab === 'ai' && f ? <Copilot label={<>Reading <b>{f.id}</b> · {phase.n} · {project.repo}</>} tag={`${f.id} · ${phase.n}`} audience="this spec" suggestions={LIVE_SUGGEST}
          placeholder={`Ask about ${f.title}…`} refPattern={liveRefPattern(f)} msgs={msgs} setMsgs={setMsgs} ask={ask} seed={null} clearSeed={() => {}}
          onRef={r => setSel(liveRefPhase(f, r))} /> : <>
          {f && <GatePanel project={project} f={f} pi={pi} status={st} tracking={tracking} trackingError={trackingError} onDecide={decide} />}
          <div className={f ? 'sk-pad sk-rule' : 'sk-pad'}>
            {!f && <><Label>Step · {phase.n}</Label><p className="sk-what">{phase.what}</p></>}
            {f && <>
              <Label>Spec · {f.id}</Label>
              <ul className="sk-props">
                {fields.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}
                <li><span>Folder</span><b><a href={`https://github.com/${project.repo}/tree/${project.sha}/specs/${encodeURIComponent(f.slug)}`} target="_blank" rel="noreferrer">specs/{f.slug}</a></b></li>
              </ul>
            </>}
          </div>
          {f && f.checklists.length > 0 && <div className="sk-pad sk-rule"><Label>Checklists</Label>
            <ul className="sk-props">{f.checklists.map(c => <li key={c.name}><span>{c.name}</span><b>{c.done} / {c.total}{c.done === c.total && <Icon n="check" s={12} />}</b></li>)}</ul>
          </div>}
          {f && <div className="sk-pad sk-rule"><Label>Files</Label>
            <ul className="sk-files">{f.files.map(x => <li key={x}><a href={blobUrl(project, `specs/${f.slug}/${x}`)} target="_blank" rel="noreferrer"><Icon n="file" s={12} />{x}</a></li>)}</ul>
          </div>}
          {project.warnings.length > 0 && <div className="sk-pad sk-rule"><Label>Warnings</Label>
            {project.warnings.map(w => <div key={w} className="sk-warn"><Icon n="alert" s={14} />{w}</div>)}
          </div>}
        </>}
      </aside>
    </div>
  </div>;
}
