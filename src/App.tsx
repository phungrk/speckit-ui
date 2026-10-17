import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FR006, ROLES, RUN_LOG, SK, T018 } from './data';
import type { ActivityItem, Feature, QaResult, Role, Task } from './types';
import { Icon, Label } from './ui';
import { NewSpecDialog, type NewSpec } from './NewSpecDialog';
import { Copilot, GateBrief, type AskFn, type CopilotMsg } from './copilot/Copilot';
import { CP_REF, CP_SUGGEST, buildContext, gateBrief, refPhase, type WorkspaceState } from './copilot/context';
import { OfflineError, requestCopilot } from './copilot/api';
import { STATIC, browserCopilot, loadSettings } from './backend';
import { offlineAnswer } from './copilot/offline';
import { SpecView } from './views/SpecView';
import { AnalyzeView, ClarifyView, ConstitutionView, ImplementView, PlanView, SummaryView, TasksView } from './views/views';

const STATUS_LABEL = { done: 'Approved', review: 'In review', locked: 'Locked' };

// Per-viewer conveniences only; the app works when storage is unavailable.
const load = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem('sk.' + k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem('sk.' + k, JSON.stringify(v)); } catch { /* ignore */ } };

interface QueueItem { fid: string; pi: number; t: string; s: string }

export function App() {
  const [role, setRole] = useState<Role>(() => { const r = load<Role>('role', 'QA'); return ROLES.includes(r) ? r : 'QA'; });
  const [fid, setFid] = useState(() => load('fid', '003'));
  const [features, setFeatures] = useState<Feature[]>(SK.features);
  const [sel, setSel] = useState<number | null>(null);
  const [resolved, setResolved] = useState<Record<string, number>>({});
  const [done, setDone] = useState<Record<string, boolean>>({ T001: true });
  const [qa, setQa] = useState<Record<string, QaResult>>({});
  const [activity, setActivity] = useState<ActivityItem[]>(SK.activity);
  const [cmd, setCmd] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [nsOpen, setNsOpen] = useState(false);
  const [rtab, setRtab] = useState<'gate' | 'ai'>('gate');
  const [threads, setThreads] = useState<Record<string, CopilotMsg[]>>({});
  const [seed, setSeed] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => save('role', role), [role]);
  useEffect(() => save('fid', fid), [fid]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const f = features.find(x => x.id === fid) || features.find(x => x.detailed) || features[0];
  const current = f.status.indexOf('review') === -1 ? 6 : f.status.indexOf('review');
  const pi = sel ?? current;
  const phase = SK.phases[pi];
  const status = f.status[pi];
  const approvals = f.approvals[phase.k] || {};

  useEffect(() => { setCmd(phase.cmd); }, [phase.k, phase.cmd, f.id]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  // Resolving A1 with its first option adds FR-006 to the spec and T018 to the tasks.
  const tasks: Task[] = resolved.A1 === 0 ? [...SK.tasks.slice(0, 9), T018, ...SK.tasks.slice(9)] : SK.tasks;
  const extraFR = resolved.A1 === 0 ? FR006 : null;
  const blocking = !!f.detailed && phase.k === 'analyze' && SK.findings.some(x => (x.sev === 'HIGH' || x.sev === 'CRITICAL') && resolved[x.id] === undefined);
  const implBlock = !!f.detailed && phase.k === 'implement' && (tasks.some(t => !done[t.id]) || SK.spec.stories.some(u => u.ac.some((_, i) => qa[u.id + '-' + i] !== 'Pass')));

  const push = (r: Role, what: string) => setActivity(a => [[r, what, 'Just now'], ...a]);

  const approve = () => {
    setFeatures(fs => fs.map(x => {
      if (x.id !== f.id) return x;
      const ap = { ...(x.approvals[phase.k] || {}), [role]: true };
      const st = [...x.status];
      if (phase.gate.every(g => ap[g])) { st[pi] = 'done'; if (pi < 6) st[pi + 1] = 'review'; }
      return { ...x, approvals: { ...x.approvals, [phase.k]: ap }, status: st };
    }));
    push(role, phase.k === 'implement' ? `verified and shipped ${f.slug}` : `approved ${phase.n}`);
  };
  const requestChanges = () => push(role, `requested changes on ${phase.n}`);
  const resolve = (id: string, i: number) => { setResolved(r => ({ ...r, [id]: i })); push(role, `resolved ${id}`); };
  const toggle = (id: string) => setDone(d => ({ ...d, [id]: !d[id] }));
  const run = () => {
    if (running || status === 'locked') return;
    const lines = RUN_LOG[phase.k];
    const ran = cmd;
    setRunning(true); setLog(l => [...l, '› ' + ran]);
    lines.forEach((ln, i) => timers.current.push(window.setTimeout(() => {
      setLog(l => [...l, ln]);
      if (i === lines.length - 1) { setRunning(false); push(role, 'ran ' + ran); }
    }, 500 * (i + 1))));
  };

  const createSpec = (d: NewSpec) => {
    setFeatures(fs => [...fs, { ...d, status: ['done', 'review', 'locked', 'locked', 'locked', 'locked', 'locked'], approvals: {} }]);
    setFid(d.id); setSel(1); setNsOpen(false); setLog([]);
    push(role, `created ${d.slug} via /speckit.specify`);
  };
  const nextId = String(Math.max(...features.map(x => +x.id)) + 1).padStart(3, '0');

  const queue: QueueItem[] = [];
  features.forEach(x => {
    const i = x.status.indexOf('review');
    if (i < 0) return;
    const p = SK.phases[i];
    if (p.gate.includes(role) && !(x.approvals[p.k] || {})[role]) queue.push({ fid: x.id, pi: i, t: `Approve ${p.n}`, s: x.slug });
  });
  const detailed = features.find(x => x.detailed);
  if (detailed && (role === 'QA' || role === 'Engineer') && detailed.status[5] === 'review') {
    SK.findings.forEach(x => { if (resolved[x.id] === undefined) queue.push({ fid: detailed.id, pi: 5, t: `Resolve ${x.id} · ${x.sev}`, s: x.cat }); });
  }

  const state: WorkspaceState = { f, phase, role, resolved, done, qa, tasks, features };
  const msgs = threads[f.id] || [];
  const setMsgs = (m: CopilotMsg[]) => setThreads(t => ({ ...t, [f.id]: m }));
  const ask: AskFn = async hist => {
    try {
      // The static build has no server; use the viewer's own key if they gave one.
      const t = STATIC ? await browserCopilot(loadSettings()?.anthropicKey ?? '', buildContext(state), hist) : await requestCopilot(buildContext(state), hist);
      return { t };
    } catch (e) {
      if (e instanceof OfflineError) return { t: offlineAnswer(hist[hist.length - 1].t, state), offline: true };
      throw e;
    }
  };
  const onRef = (r: string) => setSel(refPhase(r, f.status[6] !== 'locked'));
  const onShare = (text: string) => {
    push(role, 'shared a Copilot answer: “' + text.replace(/\*\*/g, '').replace(/^\s*[-*•]\s+/, '').split('\n')[0].slice(0, 70) + '…”');
    setMsgs(msgs.map(m => (m.t === text ? { ...m, shared: true } : m)));
  };
  const brief = status === 'review' ? gateBrief(state) : null;

  let view: ReactNode;
  if (pi === 0) view = <ConstitutionView />;
  else if (!f.detailed) view = <SummaryView feature={f} phase={phase} status={status} />;
  else view = [null,
    <SpecView extraFR={extraFR} />,
    <ClarifyView />,
    <PlanView />,
    <TasksView tasks={tasks} />,
    <AnalyzeView findings={SK.findings} resolved={resolved} onResolve={resolve} role={role} />,
    <ImplementView locked={status === 'locked'} tasks={tasks} done={done} onToggle={toggle} role={role} qa={qa} onQa={(k, v) => setQa(q => ({ ...q, [k]: v }))} />
  ][pi];

  const mine = phase.gate.includes(role);
  const gateDone = status === 'done';

  return <div className="sk">
    <nav className="nav sk-nav">
      <div className="nav-brand">Speckit</div>
      <div className="sk-proj">{SK.project}<span className="text-muted">/ specs</span></div>
      <div className="sk-spacer"></div>
      <div className="sk-rolelabel" id="sk-role-label">Viewing as</div>
      <div className="seg" role="group" aria-labelledby="sk-role-label">{ROLES.map(r => <button key={r} className={'seg-opt sk-segbtn' + (role === r ? ' on' : '')} aria-pressed={role === r} onClick={() => setRole(r)}>{r}</button>)}</div>
      <div className="sk-avatar" title={SK.people[role].name}>{SK.people[role].ini}</div>
    </nav>
    <div className="sk-body">
      <aside className="sk-side">
        <div className="sk-pad"><Label>My queue · {role}</Label>
          {queue.length === 0 ? <p className="text-muted" style={{ fontSize: 13 }}>Nothing waiting on you.</p> :
            <ul className="sk-list">{queue.map((q, i) => <li key={i}><button className="sk-qitem" onClick={() => { setFid(q.fid); setSel(q.pi); }}><b>{q.t}</b><span>{q.s}</span><Icon n="arrow" s={14} /></button></li>)}</ul>}
        </div>
        <div className="sk-pad sk-rule"><div className="sk-rowh"><Label>Features</Label><button className="btn btn-ghost sk-small" onClick={() => setNsOpen(true)}>+ New spec</button></div>
          <ul className="sk-list">{features.map(x => {
            const i = x.status.indexOf('review');
            return <li key={x.id}><button className={'sk-feat' + (x.id === f.id ? ' on' : '')} aria-current={x.id === f.id ? 'true' : undefined} onClick={() => { setFid(x.id); setSel(null); }}>
              <span className="sk-id">{x.id}</span><b>{x.title}</b>
              <span className="sk-bar" aria-hidden="true">{x.status.map((s, j) => <i key={j} className={s}></i>)}</span>
              <span className="sk-featst">{i < 0 ? 'Shipped' : SK.phases[i].n}</span>
            </button></li>;
          })}</ul>
        </div>
      </aside>
      <main className="sk-main">
        <div className="sk-fhead">
          <div className="sk-file"><Icon n="branch" s={14} />{f.slug}</div>
          <h2>{f.title}</h2>
        </div>
        <div className="sk-rail" role="tablist" aria-label="Spec Kit phases">{SK.phases.map((p, i) => {
          const s = f.status[i];
          return <button key={p.k} role="tab" aria-selected={i === pi} className={'sk-cell ' + s} onClick={() => setSel(i)}>
            <span className="sk-num">{String(i + 1).padStart(2, '0')}</span>
            <b>{p.n}</b>
            <span className="sk-st">{s === 'done' ? <Icon n="check" s={12} /> : s === 'locked' ? <Icon n="lock" s={12} /> : <Icon n="dot" s={12} />}{p.k === 'implement' && s === 'review' ? 'Building' : STATUS_LABEL[s]}</span>
          </button>;
        })}</div>
        <div className="sk-doc" role="tabpanel">{view}</div>
        <div className="sk-cmd">
          {log.length > 0 && <div className="sk-log" ref={logRef} aria-live="polite">{log.map((l, i) => <div key={i} className={l.startsWith('›') ? 'in' : ''}>{l}</div>)}</div>}
          <div className="sk-cmdrow">
            <Icon n="terminal" s={16} />
            <input className="sk-cmdin" value={cmd} onChange={e => setCmd(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} aria-label="Command" />
            <button className="btn btn-primary" onClick={run} disabled={running || status === 'locked'}>{running ? 'Running…' : 'Run'}<Icon n="play" s={12} /></button>
          </div>
        </div>
      </main>
      <aside className={'sk-right' + (rtab === 'ai' ? ' is-ai' : '')}>
        <div className="sk-rtabs" role="tablist">
          <button role="tab" aria-selected={rtab === 'gate'} onClick={() => setRtab('gate')}>Gate & activity</button>
          <button role="tab" aria-selected={rtab === 'ai'} onClick={() => setRtab('ai')}><span className="sk-ai-badge">AI</span>Copilot{msgs.length > 0 && <span className="sk-rtab-n">{Math.ceil(msgs.length / 2)}</span>}</button>
        </div>
        {rtab === 'ai' ? <Copilot label={<>Reading <b>{f.id}</b> · {phase.n} · as {role}</>} tag={`${f.id} · ${phase.n} · ${role}`} audience={role} suggestions={CP_SUGGEST[role]} placeholder={`Ask about ${f.title.toLowerCase()}…`} refPattern={CP_REF} msgs={msgs} setMsgs={setMsgs} ask={ask} seed={seed} clearSeed={() => setSeed(null)} onRef={onRef} onShare={onShare} /> : <>
          <div className="sk-pad">
            <Label>Gate · {phase.n}</Label>
            <p className="sk-what">{phase.what}</p>
            <ul className="sk-approvers">{phase.gate.map(g => {
              const ok = gateDone || approvals[g];
              return <li key={g} className={ok ? 'ok' : ''}>
                <span className="sk-avatar sm">{SK.people[g].ini}</span>
                <div><b>{SK.people[g].name}</b><span>{g}</span></div>
                <span className="sk-apst">{ok ? <><Icon n="check" s={14} />Approved</> : status === 'locked' ? '—' : 'Pending'}</span>
              </li>;
            })}</ul>
            {mine && !approvals[role] && <GateBrief items={brief} onAsk={() => { setRtab('ai'); setSeed(`What should I check before approving ${phase.n}?`); }} />}
            {status === 'review' && <div className="sk-gateact">
              {blocking && <div className="sk-warn"><Icon n="alert" s={14} />Resolve HIGH findings before approving.</div>}
              {implBlock && <div className="sk-warn"><Icon n="alert" s={14} />All tasks done and every acceptance scenario passed before ship.</div>}
              {mine && !approvals[role]
                ? <><button className="btn btn-primary btn-block" disabled={blocking || implBlock} onClick={approve}>{phase.k === 'implement' ? 'Verify & ship' : `Approve as ${role}`}<Icon n="arrow" s={14} /></button>
                  <button className="btn btn-secondary btn-block" onClick={requestChanges}>Request changes</button></>
                : <p className="text-muted" style={{ fontSize: 13 }}>{mine ? 'You have approved. Waiting on others.' : `${role} is not an approver at this gate.`}</p>}
            </div>}
            {gateDone && <div className="sk-pass" style={{ marginTop: 12 }}><Icon n="check" s={14} />Gate passed</div>}
          </div>
          <div className="sk-pad sk-rule"><Label>Activity</Label>
            <ul className="sk-activity">{activity.slice(0, 9).map((a, i) => <li key={i}><span className="sk-avatar sm">{SK.people[a[0]].ini}</span><div><b>{SK.people[a[0]].name}</b> {a[1]}<span>{a[2]}</span></div></li>)}</ul>
          </div>
        </>}
      </aside>
    </div>
    {nsOpen && <NewSpecDialog nextId={nextId} features={features} onClose={() => setNsOpen(false)} onCreate={createSpec} />}
  </div>;
}
