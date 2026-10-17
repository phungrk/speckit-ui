import { useEffect, useState } from 'react';
import { pool } from '../../server/github';
import type { Backend } from '../backend';
import { Icon, Label } from '../ui';
import { buildOverview } from './overview';
import { accessProblem } from './repoLoader';
import { SessionNav, type SessionActions } from './SessionNav';
import { SignInRequired } from './trackingApi';
import type { CurrentUser, OverviewItem } from './types';

/** Pinned repos loaded at once. */
const AT_ONCE = 3;

type Block = { state: 'loading' } | { state: 'ready'; items: OverviewItem[]; note: string | null } | { state: 'error'; message: string };

interface Props extends SessionActions {
  user: CurrentUser;
  backend: Backend;
  pins: string[];
  onOpen: (repo: string, spec?: string, step?: number) => void;
  onAllRepos: () => void;
  onAuthLost: () => void;
}

/** What waits for the user in every pinned repo, one block per repo (US4). */
export function Overview({ user, backend, pins, onOpen, onAllRepos, onAuthLost, ...actions }: Props) {
  const [blocks, setBlocks] = useState<Record<string, Block>>({});
  const [round, setRound] = useState(0);

  useEffect(() => {
    let live = true;
    setBlocks(Object.fromEntries(pins.map(p => [p, { state: 'loading' } as Block])));
    const set = (repo: string, b: Block) => live && setBlocks(x => ({ ...x, [repo]: b }));
    // One repo failing never affects the others (FR-019).
    void pool(pins, AT_ONCE, async repo => {
      try {
        const project = await backend.project(repo, round > 0);
        if (!project) return set(repo, { state: 'error', message: 'No project found.' });
        const [tracking] = await Promise.allSettled([backend.tracking(repo, round > 0)]);
        const t = tracking.status === 'fulfilled' ? tracking.value : null;
        set(repo, { state: 'ready', items: buildOverview(project, t), note: tracking.status === 'rejected' ? 'Approvals could not be loaded, so pending gates are not shown.' : null });
      } catch (e) {
        if (e instanceof SignInRequired) { onAuthLost(); return; }
        set(repo, { state: 'error', message: accessProblem(e, 'read', repo) ?? (e instanceof Error ? e.message : 'Could not load this repository.') });
      }
    });
    return () => { live = false; };
  }, [pins.join('\n'), round]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="sk sk-page">
    <SessionNav title="Overview" user={user} {...actions}>
      <button className="btn btn-secondary sk-small" onClick={() => setRound(r => r + 1)}>Refresh</button>
      <button className="btn btn-secondary sk-small" onClick={onAllRepos}>All repos</button>
    </SessionNav>
    <main className="sk-repos">
      <div className="sk-repos-head">
        <h2>Overview</h2>
        <p className="sk-connect-lead">What waits for you in each pinned repository: gates to approve first, then the next command to run.</p>
      </div>
      {pins.length === 0
        ? <div className="sk-empty"><Icon n="pin" s={28} /><h4>No pinned repositories</h4>
          <p>Open <b>All repos</b> and press the pin next to the repositories you follow. They will show up here.</p>
          <div><button className="btn btn-primary" onClick={onAllRepos}>All repos<Icon n="arrow" s={14} /></button></div>
        </div>
        : pins.map(repo => {
          const b = blocks[repo] ?? { state: 'loading' };
          return <section key={repo} className="sk-ov" aria-labelledby={`ov-${repo}`}>
            <div className="sk-rowh">
              <h3 id={`ov-${repo}`}><button className="sk-ov-repo" onClick={() => onOpen(repo)}>{repo}</button></h3>
              {b.state === 'ready' && <Label>{b.items.length ? `${b.items.length} to do` : 'Nothing to do'}</Label>}
            </div>
            {b.state === 'loading' && <p className="sk-ns-cursor" style={{ fontSize: 13 }}>Loading…</p>}
            {b.state === 'error' && <div className="sk-warn" role="status"><Icon n="alert" s={14} /><span>{b.message}</span></div>}
            {b.state === 'ready' && <>
              {b.note && <div className="sk-warn"><Icon n="alert" s={14} /><span>{b.note}</span></div>}
              {b.items.length === 0
                ? <p className="text-muted" style={{ fontSize: 13 }}>Every spec is done.</p>
                : <ul className="sk-list">{b.items.map(it => <li key={it.slug}>
                  <button className="sk-qitem" onClick={() => onOpen(repo, it.slug, it.step)}><b>{it.label}</b><span>{it.slug} · {it.title}</span><Icon n="arrow" s={14} /></button>
                </li>)}</ul>}
            </>}
          </section>;
        })}
    </main>
  </div>;
}
