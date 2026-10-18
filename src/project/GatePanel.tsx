import { useRef, useState } from 'react';
import { Icon, Label } from '../ui';
import { blockedReason, canApprove, gateChecks } from './gates';
import { PHASES, type LiveStatus } from './phases';
import type { GateAction } from './trackingApi';
import { GATE_KEYS, type GateKey, type Project, type SpecFeature, type SpecPR, type Tracking } from './types';

const PR_STATE: Record<SpecPR['state'], string> = { open: 'Open', draft: 'Draft', merged: 'Merged', closed: 'Closed' };
/** How long after a decision further clicks in the gate are ignored. */
const QUIET_MS = 800;

interface Props {
  project: Project;
  f: SpecFeature;
  pi: number;
  status: LiveStatus;
  tracking: Tracking | null;
  trackingError: string | null;
  onDecide: (gate: GateKey, action: GateAction, note: string) => Promise<DecideResult>;
  /** The earlier gate that must be approved first (specs/004), if any. */
  blockedBy?: GateKey | null;
}

export interface DecideResult {
  error: string | null;
  /** The gate was already in the requested state (for example, approved by someone else). */
  unchanged: boolean;
}

export function GatePanel({ project, f, pi, status, tracking, trackingError, onDecide, blockedBy = null }: Props) {
  const [busy, setBusy] = useState(false);
  // Set synchronously, so a second click before React re-renders is ignored (specs/001 FR-003).
  const inFlight = useRef(false);
  // Clicks still arriving from a burst right after a decision must not hit the button that replaced it.
  const quietUntil = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [already, setAlready] = useState<GateKey | null>(null);
  const [noteFor, setNoteFor] = useState<'changes' | null>(null);
  const [note, setNote] = useState('');
  const phase = PHASES[pi];
  const gate = phase.k as GateKey;
  const hasGate = GATE_KEYS.includes(gate);
  const issue = tracking?.issues[f.slug] ?? null;
  const approval = hasGate ? issue?.gates[gate] : undefined;
  const prs = tracking?.prs[f.slug] ?? [];
  const checks = hasGate ? gateChecks(f, gate, prs, tracking ?? undefined) : [];
  const ok = canApprove(checks);
  const order = (tracking?.repos ?? []).map(r => r.repo);

  const decide = async (action: GateAction) => {
    if (inFlight.current || Date.now() < quietUntil.current) return;
    inFlight.current = true;
    setBusy(true); setError(null); setAlready(null);
    try {
      const r = await onDecide(gate, action, action === 'changes' ? note : '');
      if (r.error) setError(r.error);
      else {
        setNoteFor(null); setNote('');
        if (r.unchanged && action === 'approve') setAlready(gate);
      }
    } finally {
      inFlight.current = false;
      quietUntil.current = Date.now() + QUIET_MS;
      setBusy(false);
    }
  };

  return <>
    <div className="sk-pad">
      <Label>Gate · {phase.n}</Label>
      <p className="sk-what">{phase.what}</p>
      {!hasGate ? <p className="text-muted sk-sm">The constitution applies to every spec and has no per-spec gate.</p>
        : status === 'skipped' ? <p className="text-muted sk-sm">{phase.n} was not run for this spec, so there is nothing to approve.</p>
        : <>
          <ul className="sk-checks">{checks.map(c => <li key={c.label} className={c.ok ? 'ok' : c.required ? 'fail' : 'warn'}>
            <span className="sk-checkmark" aria-label={c.ok ? 'Pass' : c.required ? 'Fail' : 'Warning'}>{c.ok ? <Icon n="check" s={12} /> : c.required ? <Icon n="x" s={12} /> : '!'}</span>{c.label}
          </li>)}</ul>
          {trackingError ? <div className="sk-warn"><Icon n="alert" s={14} /><span>Approvals unavailable: {trackingError}</span></div>
            : !tracking ? <p className="sk-ns-cursor" style={{ fontSize: 'var(--fs-13)' }}>Loading approvals…</p>
            : approval?.approved
              ? <div className="sk-gateact">
                <div className="sk-pass" style={{ marginBottom: already === gate ? 'var(--space-1)' : 'var(--space-3)' }}><Icon n="check" s={14} />Approved{approval.by ? ` by @${approval.by}` : ''}{approval.at ? ` · ${approval.at}` : ''}</div>
                {already === gate && <p className="sk-meta" role="status" style={{ marginBottom: 'var(--space-3)' }}>Already approved. Nothing new was recorded.</p>}
                <button key="reopen" className="btn btn-secondary btn-block" disabled={busy} onClick={() => decide('reopen')}>{busy ? 'Saving…' : 'Reopen gate'}</button>
              </div>
              : <div className="sk-gateact">
                {blockedBy
                  ? <div className="sk-warn"><Icon n="lock" s={14} />{blockedReason(blockedBy)}</div>
                  : <>
                    {!ok && status === 'done' && <div className="sk-warn"><Icon n="alert" s={14} />Fix the failing checks before approving.</div>}
                    {status !== 'done' && <div className="sk-warn"><Icon n="alert" s={14} />{phase.n} has no output yet. Run {project.commandPrefix}{phase.k} first.</div>}
                  </>}
                <button key="approve" className="btn btn-primary btn-block" disabled={busy || !ok || status !== 'done' || !!blockedBy} onClick={() => decide('approve')}>{busy ? 'Saving…' : phase.k === 'implement' ? 'Verify & ship' : `Approve ${phase.n}`}<Icon n="arrow" s={14} /></button>
                {issue && (noteFor === 'changes'
                  ? <div className="sk-note">
                    <textarea className="input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="What needs to change?" aria-label="Requested changes" autoFocus></textarea>
                    <div className="sk-actions"><button className="btn btn-secondary" disabled={busy || !note.trim()} onClick={() => decide('changes')}>Post to issue</button><button className="btn btn-ghost" onClick={() => setNoteFor(null)}>Cancel</button></div>
                  </div>
                  : <button className="btn btn-secondary btn-block" disabled={busy} onClick={() => setNoteFor('changes')}>Request changes</button>)}
              </div>}
          {error && <div className="sk-warn" role="alert"><Icon n="alert" s={14} /><span>{error}</span></div>}
          {tracking && <p className="sk-meta">{issue
            ? <>Recorded in <a href={issue.url} target="_blank" rel="noreferrer">issue #{issue.number}</a>{issue.state === 'closed' ? ' (closed)' : ''}.</>
            : <>Approving creates a tracking issue in {project.repo}.</>}</p>}
        </>}
    </div>
    {tracking && <div className="sk-pad sk-rule"><Label>Pull requests · merge order</Label>
      {prs.length === 0
        ? <p className="text-muted sk-sm">No PRs linked to this spec. Put <b>specs/{f.slug}</b> in the PR description, or the slug in its branch name.</p>
        : <ul className="sk-prs">{[...prs].sort((a, b) => order.indexOf(a.repo) - order.indexOf(b.repo) || a.number - b.number).map(p => <li key={p.repo + p.number} className={p.state}>
          <div className="sk-prs-h"><span className="sk-id">{p.repo.split('/')[1]}</span><span className={'tag ' + (p.state === 'merged' ? 'tag-neutral' : p.state === 'closed' ? 'tag-outline' : 'tag-accent')}>{PR_STATE[p.state]}</span></div>
          <a href={p.url} target="_blank" rel="noreferrer">#{p.number} {p.title}</a>
          {p.bumped === false && <div className="sk-warn"><Icon n="alert" s={14} />Submodule pointer in {project.repo.split('/')[1]} doesn't include this merge yet.</div>}
        </li>)}</ul>}
      {order.length > 1 && <p className="sk-meta">Order: {order.map(r => r.split('/')[1]).join(' → ')}</p>}
    </div>}
    {tracking && tracking.warnings.length > 0 && <div className="sk-pad sk-rule"><Label>Tracking warnings</Label>
      {tracking.warnings.map(w => <div key={w} className="sk-warn"><Icon n="alert" s={14} />{w}</div>)}
    </div>}
  </>;
}

