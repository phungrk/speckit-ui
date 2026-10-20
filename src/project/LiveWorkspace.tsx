import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Copilot, type AskFn, type CopilotMsg } from '../copilot/Copilot';
import { STATIC, type Backend } from '../backend';
import { OfflineError } from '../copilot/api';
import { Icon, Label } from '../ui';
import { LIVE_SUGGEST, buildLiveContext, liveOfflineAnswer, liveRefPattern, liveRefPhase } from './copilot';
import { GATE_NAME, blockingGates } from './gates';
import { GatePanel, type DecideResult } from './GatePanel';
import { buildOverview } from './overview';
import { LIVE_CLASS, LIVE_LABEL, PHASES, blobUrl, phaseStatus, type LiveStatus } from './phases';
import type { LastViewed, PrefsStorage } from './prefs';
import { ReaderMenu, SidebarToggle } from '../reader/ReaderControls';
import { useReader, useSidebarKeys } from '../reader/useReader';
import { accessProblem } from './repoLoader';
import { SessionButtons, type SessionActions } from './SessionNav';
import { SignInRequired, type GateAction } from './trackingApi';
import type { CurrentUser, GateKey, Project, SpecFeature, Tracking } from './types';
import { LiveAnalyze, LiveClarify, LiveConstitution, LiveImplement, LivePlan, LiveSpec, LiveTasks, NotStarted } from './views';

/** How to install the Claude Code gate check (specs/004 FR-012). */
const GATE_CHECK_HELP = 'https://github.com/phungrk/speckit-ui#approval-gates';

/** "feat/003-x" → "003-x" for compact labels; the full name stays in the title. */
const shortBranch = (b: string) => b.replace(/^feat\//, '');

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : `${Math.floor(s / 3600)} h ago`;
};

export interface RepoChoices {
  pinned: string[];
  recent: string[];
  /** Repos that could not be read, with the reason. */
  unavailable: Record<string, string>;
}

interface Props extends SessionActions {
  /** One workspace per repo: Root mounts a fresh one (key = repo) on every switch. */
  project: Project;
  backend: Backend;
  user: CurrentUser;
  /** Where this user's preferences live (Pages without Remember: the tab only). */
  storage: PrefsStorage;
  refreshing: boolean;
  onRefresh: () => void;
  /** Spec and step to open, restored from the URL or the last visit (FR-005). */
  initial: LastViewed | null;
  onPosition: (v: LastViewed) => void;
  /** Copilot threads for this repo, by spec slug. Kept by Root so they survive switching away. */
  threads: Record<string, CopilotMsg[]>;
  onThreads: (t: Record<string, CopilotMsg[]>) => void;
  repos: RepoChoices;
  onSwitch: (repo: string) => void;
  onAllRepos: () => void;
  onOverview: () => void;
  onAuthLost: () => void;
}

export function LiveWorkspace({ project, backend, user, storage, refreshing, onRefresh, initial, onPosition, threads, onThreads, repos, onSwitch, onAllRepos, onOverview, onAuthLost, ...actions }: Props) {
  const [slug, setSlug] = useState(() => initial?.spec ?? '');
  const [sel, setSel] = useState<number | null>(() => initial?.step ?? null);
  const rd = useReader(user.login, storage);
  const [aaOpen, setAaOpen] = useState(false);
  useSidebarKeys(rd.layout, rd.setLayout);
  const [rtab, setRtab] = useState<'spec' | 'ai'>('spec');
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [cmd, setCmd] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const logRef = useRef<HTMLDivElement>(null);

  const loadTracking = (refresh: boolean) => backend.tracking(project.repo, refresh).then(t => { setTracking(t); setTrackingError(null); }, (e: Error) => {
    if (e instanceof SignInRequired) onAuthLost();
    else setTrackingError(e.message);
  });
  useEffect(() => { void loadTracking(false); }, []);
  const refreshAll = () => { onRefresh(); void loadTracking(true); };
  const decide = async (gate: GateKey, action: GateAction, note: string): Promise<DecideResult> => {
    try {
      // The tracking that comes back already holds this decision, so the gate, the rail,
      // Next up and the progress bars all change in this one render (specs/001 FR-001, FR-005).
      const r = await backend.decide(project.repo, f!.slug, gate, action, note, f!.branch);
      setTracking(r.tracking);
      setTrackingError(null);
      return { error: null, unchanged: r.unchanged };
    } catch (e) {
      if (e instanceof SignInRequired) { onAuthLost(); return { error: 'Sign in again to approve.', unchanged: false }; }
      // Read access without Issues write: say so for this repo only, and leave Approve usable.
      return { error: accessProblem(e, 'write', project.repo) ?? (e instanceof Error ? e.message : 'Gate update failed.'), unchanged: false };
    }
  };
  const issueOf = (s: string) => tracking?.issues[s] ?? null;
  const gatesOn = project.approvalGates === 'block';
  /** The gate locking each step of a spec (specs/004 R1); nothing is locked until approvals load. */
  const locksOf = (st: LiveStatus[], slugOf: string): (GateKey | null)[] => (tracking ? blockingGates(st, issueOf(slugOf), project.approvalGates) : st.map(() => null));
  /** Rail label and class for step i, folding in gate approvals and locks once they have loaded. */
  const cell = (s: LiveStatus, i: number, slugOf: string, lock: GateKey | null = null): [string, string] => {
    const g = i > 0 ? issueOf(slugOf)?.gates[PHASES[i].k as GateKey] : undefined;
    if (lock && s !== 'done' && s !== 'skipped') return ['locked', 'Locked'];
    if (s !== 'done' || i === 0 || !tracking) return [LIVE_CLASS[s], LIVE_LABEL[s]];
    return g?.approved ? ['done', 'Approved'] : lock ? ['review', 'Ran early'] : ['review', 'To approve'];
  };
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  // Versions picked on other branches, by slug (specs/003 US3); otherwise the version chosen by the loader.
  const [versions, setVersions] = useState<Record<string, SpecFeature>>({});
  const listed = project.specs.find(x => x.slug === slug) || project.specs[project.specs.length - 1];
  const f = listed && versions[listed.slug] ? versions[listed.slug] : listed;
  const chooseVersion = (of: string, branch: string | null) => backend.spec(project.repo, of, branch).then(
    v => setVersions(x => ({ ...x, [of]: v })),
    (e: Error) => setLog(l => [...l, `Could not open ${of} on ${branch ?? project.ref}: ${e.message}`]));
  // A link to another branch's version opens that version.
  useEffect(() => { if (f && initial?.branch !== undefined && initial.spec === f.slug && (initial.branch ?? null) !== f.branch) void chooseVersion(f.slug, initial.branch ?? null); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // After a refresh, re-read the versions picked so they follow new pushes.
  useEffect(() => { for (const [of, v] of Object.entries(versions)) void chooseVersion(of, v.branch); }, [project]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onPosition({ spec: f?.slug ?? null, step: sel, branch: f?.branch ?? null }); }, [f?.slug, f?.branch, sel]); // eslint-disable-line react-hooks/exhaustive-deps
  const status: LiveStatus[] = f ? phaseStatus(project, f) : PHASES.map((_, i) => (i === 0 && project.constitution ? 'done' : 'pending'));
  const current = Math.max(0, status.indexOf('current') === -1 ? 6 : status.indexOf('current'));
  const pi = sel ?? (f ? current : 0);
  const phase = PHASES[pi];
  const st = status[pi];
  const locks = f ? locksOf(status, f.slug) : status.map(() => null);
  const lockedBy = locks[pi];
  // A locked step's command is never offered; without approvals we can't tell, so none is (specs/004 FR-003, SC-001).
  const cmdLocked = !!f && pi > 0 && (!!lockedBy || (gatesOn && !tracking));

  useEffect(() => { setCmd(project.commandPrefix + phase.k); }, [phase.k, project.commandPrefix, f?.slug]);

  const copy = () => {
    const c = cmd.trim();
    if (!c || cmdLocked) return;
    const where = `Paste it into Claude Code in ${project.repo}.`;
    navigator.clipboard?.writeText(c).then(
      () => setLog(l => [...l, '› ' + c, `Copied. ${where}`]),
      () => setLog(l => [...l, '› ' + c, `Copy failed. Select the command and copy it by hand. ${where}`]));
  };

  // Pending approvals come first, then the next command to run (same list as the overview).
  const next = buildOverview(project, tracking);

  let view: ReactNode;
  if (pi === 0) view = <LiveConstitution c={project.constitution} project={project} />;
  else if (!f) view = <div className="sk-empty"><Icon n="file" s={28} /><h4>No specs yet</h4><p>Run <b>{project.commandPrefix}specify</b> in Claude Code to create specs/001-…/spec.md.</p></div>;
  else if (st !== 'done') view = <NotStarted phase={phase} status={st} prefix={project.commandPrefix} spec={f} blockedBy={lockedBy && GATE_NAME[lockedBy]} onGoTo={lockedBy ? () => setSel(PHASES.findIndex(p => p.k === lockedBy)) : undefined} />;
  else {
    view = [null, <LiveSpec f={f} />, <LiveClarify f={f} />, <LivePlan f={f} project={project} />, <LiveTasks f={f} />, <LiveAnalyze f={f} />, <LiveImplement f={f} />][pi];
    // Work done before the gate before it was approved stays visible, marked (specs/004 FR-006).
    if (lockedBy) view = <><div className="sk-warn" role="status"><Icon n="alert" s={14} />Ran before {GATE_NAME[lockedBy]} was approved.</div>{view}</>;
  }

  const msgs = f ? threads[f.slug] || [] : [];
  const setMsgs = (m: CopilotMsg[]) => f && onThreads({ ...threads, [f.slug]: m });
  const copilotLocks = gatesOn && !tracking ? null : locks;
  const ask: AskFn = async hist => {
    try {
      return { t: await backend.copilot(buildLiveContext(project, f!, phase, copilotLocks), hist) };
    } catch (e) {
      if (e instanceof OfflineError) return { t: liveOfflineAnswer(hist[hist.length - 1].t, project, f!, copilotLocks), offline: true };
      throw e;
    }
  };

  const choices = {
    pinned: repos.pinned.filter(r => r !== project.repo),
    recent: repos.recent.filter(r => r !== project.repo && !repos.pinned.includes(r))
  };

  const fields = f?.spec ? Object.entries(f.spec.fields).filter(([k]) => k !== 'Input') : [];

  return <div className="sk sk-live">
    <nav className="nav sk-nav">
      <SidebarToggle side="left" open={rd.layout.left} onToggle={() => rd.setLayout({ ...rd.layout, left: !rd.layout.left })} />
      <div className="nav-brand" title={`Build ${__BUILD__}`}>Speckit</div>
      <div className="sk-proj">
        <select className="sk-repo-switch" aria-label="Repository" value={project.repo} onChange={e => e.target.value === '*' ? onAllRepos() : onSwitch(e.target.value)}>
          <option value={project.repo}>{project.repo}</option>
          {choices.pinned.length > 0 && <optgroup label="Pinned">{choices.pinned.map(r => <option key={r} value={r} disabled={!!repos.unavailable[r]}>{r}{repos.unavailable[r] ? ' (not accessible)' : ''}</option>)}</optgroup>}
          {choices.recent.length > 0 && <optgroup label="Recent">{choices.recent.map(r => <option key={r} value={r}>{r}</option>)}</optgroup>}
          <option value="*">All repos…</option>
        </select>
        <a className="sk-plain text-muted" href={`https://github.com/${project.repo}`} target="_blank" rel="noreferrer" title="Open on GitHub">/ specs</a>
      </div>
      <div className="sk-spacer"></div>
      <button className="btn btn-ghost sk-small" onClick={onOverview}>Overview</button>
      <button className="btn btn-ghost sk-small" onClick={onAllRepos}>All repos</button>
      <a className="sk-sync" href={`https://github.com/${project.repo}/commit/${project.sha}`} target="_blank" rel="noreferrer" title={`Loaded ${new Date(project.fetchedAt).toLocaleString()}`}>
        <Icon n="branch" s={14} />{project.ref} @ {project.sha.slice(0, 7)}<span className="text-muted"> · {ago(project.fetchedAt, now)}</span>
      </a>
      <button className="btn btn-secondary sk-small" onClick={refreshAll} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
      <SessionButtons user={user} {...actions} />
      <ReaderMenu reader={rd.reader} open={aaOpen} setOpen={setAaOpen} onChange={rd.setReader} onReset={rd.reset} />
      <SidebarToggle side="right" open={rd.layout.right} onToggle={() => rd.setLayout({ ...rd.layout, right: !rd.layout.right })} />
    </nav>
    <div className={'sk-body' + (rd.layout.left ? '' : ' no-left') + (rd.layout.right ? '' : ' no-right')}>
      {rd.layout.left && <aside className="sk-side">
        <div className="sk-pad"><Label>Next up</Label>
          {next.length === 0 ? <p className="text-muted sk-sm">Every spec is done.</p> :
            <ul className="sk-list">{next.map(n => <li key={n.slug}><button className="sk-qitem" onClick={() => { setSlug(n.slug); setSel(n.step); }}><b>{n.label}</b><span>{n.slug}{n.branch ? ` · ${shortBranch(n.branch)}` : ''}</span><Icon n="arrow" s={14} /></button></li>)}</ul>}
        </div>
        <div className="sk-pad sk-rule"><div className="sk-rowh"><Label>Specs · {project.specs.length}</Label></div>
          {project.pinned && <div className="sk-warn" role="status"><Icon n="alert" s={14} /><span>Pinned to <b>{project.ref}</b>, so specs on {project.branchPrefixes.join(', ') || 'feat/'} branches are not listed. {STATIC ? 'Clear Branch in Settings › Advanced' : 'Unset GITHUB_REF'} to list them.</span></div>}
          <ul className="sk-list">{project.specs.map(x => {
            const s = phaseStatus(project, x);
            const i = s.indexOf('current');
            const lx = locksOf(s, x.slug);
            return <li key={x.slug}><button className={'sk-feat' + (x === f ? ' on' : '')} aria-current={x === f ? 'true' : undefined} onClick={() => { setSlug(x.slug); setSel(null); }}>
              <span className="sk-id">{x.id}</span><b>{x.title}</b>
              <span className="sk-bar" aria-hidden="true">{s.map((v, j) => <i key={j} className={cell(v, j, x.slug, lx[j])[0]}></i>)}</span>
              <span className="sk-featst">{i < 0 ? 'Done' : PHASES[i].n}{x.spec?.fields.Status ? ` · ${x.spec.fields.Status}` : ''}
                {x.unmerged && x.branch && <span className="sk-branch" title={`${x.branch} · not merged into ${project.ref}`}>{shortBranch(x.branch)}</span>}</span>
            </button></li>;
          })}</ul>
        </div>
      </aside>}
      <main className="sk-main">
        <div className="sk-fhead">
          <div className="sk-file"><Icon n="branch" s={14} />{f ? <>{f.branch ? `${f.branch} · ` : ''}{f.slug}</> : project.repo}
            {f && f.variants.length > 1 && <select className="sk-repo-switch sk-version" aria-label={`Version of ${f.slug}`} value={f.variants[0].branches[0]}
              onChange={e => { const v = f.variants.find(x => x.branches[0] === e.target.value)!; void chooseVersion(f.slug, v.onDefault ? null : v.branches[0]); }}>
              {f.variants.map(v => <option key={v.treeSha} value={v.branches[0]}>{v.branches.join(', ')}{v.onDefault ? ' (default)' : ''}</option>)}
            </select>}
          </div>
          <h2>{f ? f.title : 'No specs yet'}</h2>
        </div>
        <div className="sk-rail" role="tablist" aria-label="Spec Kit steps">{PHASES.map((p, i) => {
          const s = status[i];
          const [cls, label] = f ? cell(s, i, f.slug, locks[i]) : [LIVE_CLASS[s], LIVE_LABEL[s]];
          return <button key={p.k} role="tab" aria-selected={i === pi} className={'sk-cell ' + cls} onClick={() => setSel(i)}>
            <span className="sk-num">{String(i + 1).padStart(2, '0')}</span>
            <b>{p.n}</b>
            <span className="sk-st">{cls === 'done' ? <Icon n="check" s={12} /> : s === 'pending' ? <Icon n="lock" s={12} /> : <Icon n="dot" s={12} />}{label}</span>
          </button>;
        })}</div>
        <div className="sk-doc" role="tabpanel"><div className="sk-col">{view}</div></div>
        <div className="sk-cmd">
          {log.length > 0 && <div className="sk-log" ref={logRef} aria-live="polite">{log.map((l, i) => <div key={i} className={l.startsWith('›') ? 'in' : ''}>{l}</div>)}</div>}
          {f?.unmerged && f.branch && !cmdLocked && <div className="sk-cmdhint">Run on <b>{f.branch}</b>: <code>git switch {f.branch}</code></div>}
          {lockedBy && <div className="sk-cmdhint" role="status"><Icon n="lock" s={12} /> <button className="sk-hintlink" onClick={() => setSel(PHASES.findIndex(p => p.k === lockedBy))}>Approve {GATE_NAME[lockedBy]} first</button>: {phase.n} opens once it is approved.</div>}
          {cmdLocked && !lockedBy && <div className="sk-cmdhint" role="status">{trackingError ? 'Approvals could not be checked, so no command is suggested.' : 'Loading approvals…'}</div>}
          {gatesOn && project.gateCheck === 'missing' && <div className="sk-cmdhint">Commands aren't blocked in Claude Code for this repo. <a href={GATE_CHECK_HELP} target="_blank" rel="noreferrer">Install the gate check →</a></div>}
          <div className="sk-cmdrow">
            <Icon n="terminal" s={16} />
            <input className="sk-cmdin" value={cmdLocked ? '' : cmd} readOnly={cmdLocked} placeholder={cmdLocked ? 'No command while this step is locked' : undefined} onChange={e => setCmd(e.target.value)} onKeyDown={e => e.key === 'Enter' && copy()} aria-label="Command" />
            <button className="btn btn-primary" onClick={copy} disabled={cmdLocked}>Copy<Icon n="arrow" s={12} /></button>
          </div>
        </div>
      </main>
      {rd.layout.right && <aside className={'sk-right' + (rtab === 'ai' ? ' is-ai' : '')}>
        <div className="sk-rtabs" role="tablist">
          <button role="tab" aria-selected={rtab === 'spec'} onClick={() => setRtab('spec')}>Gate & PRs</button>
          <button role="tab" aria-selected={rtab === 'ai'} onClick={() => setRtab('ai')} disabled={!f}><span className="sk-ai-badge">AI</span>Copilot{msgs.length > 0 && <span className="sk-rtab-n">{Math.ceil(msgs.length / 2)}</span>}</button>
        </div>
        {rtab === 'ai' && f ? <Copilot label={<>Reading <b>{f.id}</b> · {phase.n} · {project.repo}</>} tag={`${f.id} · ${phase.n}`} audience="this spec" suggestions={LIVE_SUGGEST}
          placeholder={`Ask about ${f.title}…`} refPattern={liveRefPattern(f)} msgs={msgs} setMsgs={setMsgs} ask={ask} seed={null} clearSeed={() => {}}
          onRef={r => setSel(liveRefPhase(f, r))} /> : <>
          {f && <GatePanel project={project} f={f} pi={pi} status={st} tracking={tracking} trackingError={trackingError} onDecide={decide} blockedBy={lockedBy} />}
          <div className={f ? 'sk-pad sk-rule' : 'sk-pad'}>
            {!f && <><Label>Step · {phase.n}</Label><p className="sk-what">{phase.what}</p></>}
            {f && <>
              <Label>Spec · {f.id}</Label>
              <ul className="sk-props">
                {fields.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}
                <li><span>Folder</span><b><a href={`https://github.com/${project.repo}/tree/${f.sha || project.sha}/specs/${encodeURIComponent(f.slug)}`} target="_blank" rel="noreferrer">specs/{f.slug}</a></b></li>
              </ul>
            </>}
          </div>
          {f && f.checklists.length > 0 && <div className="sk-pad sk-rule"><Label>Checklists</Label>
            <ul className="sk-props">{f.checklists.map(c => <li key={c.name}><span>{c.name}</span><b>{c.done} / {c.total}{c.done === c.total && <Icon n="check" s={12} />}</b></li>)}</ul>
          </div>}
          {f && <div className="sk-pad sk-rule"><Label>Files</Label>
            <ul className="sk-files">{f.files.map(x => <li key={x}><a href={blobUrl({ repo: project.repo, sha: f.sha || project.sha }, `specs/${f.slug}/${x}`)} target="_blank" rel="noreferrer"><Icon n="file" s={12} />{x}</a></li>)}</ul>
          </div>}
          {project.warnings.length > 0 && <div className="sk-pad sk-rule"><Label>Warnings</Label>
            {project.warnings.map(w => <div key={w} className="sk-warn"><Icon n="alert" s={14} />{w}</div>)}
          </div>}
        </>}
      </aside>}
    </div>
  </div>;
}
