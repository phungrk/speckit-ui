import { useEffect, useMemo, useState } from 'react';
import { sortRepos } from '../../server/github';
import { normalizeRepo } from '../backend';
import { Icon, Label } from '../ui';
import { SessionNav, type SessionActions } from './SessionNav';
import type { AccessibleRepo, CurrentUser, RepoListing } from './types';

const PAGE = 50;

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return !iso ? '' : d < 1 ? 'pushed today' : d === 1 ? 'pushed yesterday' : d < 60 ? `pushed ${d} days ago` : `pushed ${new Date(iso).toLocaleDateString()}`;
};

interface Props extends SessionActions {
  user: CurrentUser;
  listing: RepoListing | null;
  listingError: string | null;
  /** Spec Kit check results so far; missing means not checked yet. */
  speckit: Record<string, boolean>;
  /** Repos that could not be read, with the reason (FR-012). */
  unavailable: Record<string, string>;
  pins: string[];
  onTogglePin: (repo: string) => void;
  onOpen: (repo: string) => void;
  /** Asks for a Spec Kit check of these rows (visible rows first). */
  onDetect: (repos: AccessibleRepo[]) => void;
  onOverview: () => void;
  onRetry: () => void;
}

/** Every repo the user can read: Spec Kit projects first, pinned on top (US1, US3). */
export function RepoPicker({ user, listing, listingError, speckit, unavailable, pins, onTogglePin, onOpen, onDetect, onOverview, onRetry, ...actions }: Props) {
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState('');
  const [shown, setShown] = useState(PAGE);
  const manualRepo = normalizeRepo(manual);

  const all = useMemo(() => {
    const listed = (listing?.repos ?? []).map(r => ({ ...r, speckit: speckit[r.fullName] ?? null }));
    // Pinned repos that left the listing (access removed) stay visible so they can be unpinned.
    const gone = pins.filter(p => !listed.some(r => r.fullName === p)).map((p): AccessibleRepo => ({ fullName: p, private: false, defaultBranch: '', pushedAt: '', speckit: null, pinned: true }));
    return sortRepos([...listed, ...(listing ? gone : [])], pins);
  }, [listing, speckit, pins]);
  const q = query.trim().toLowerCase();
  const matches = q ? all.filter(r => r.fullName.toLowerCase().includes(q)) : all;
  const rows = matches.slice(0, shown);
  const missing = (r: AccessibleRepo) => !!listing && !listing.repos.some(x => x.fullName === r.fullName);

  useEffect(() => { if (listing) onDetect(rows.filter(r => !missing(r))); }, [listing, q, shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const checked = listing ? listing.repos.filter(r => r.fullName in speckit) : [];
  const allChecked = !!listing && checked.length === listing.repos.length;
  const noSpeckit = allChecked && !listing!.repos.some(r => speckit[r.fullName]);

  return <div className="sk sk-page">
    <SessionNav title="Repositories" user={user} {...actions}>
      <button className="btn btn-secondary sk-small" onClick={onOverview}>Overview</button>
    </SessionNav>
    <main className="sk-repos">
      <div className="sk-repos-head">
        <h2>Open a repository</h2>
        <p className="sk-connect-lead">The repositories your GitHub access can read. Spec Kit projects come first; pin the ones you follow to keep them on top and on the overview.</p>
      </div>
      <div className="sk-repos-tools">
        <div className="field"><label htmlFor="r-search">Find a repository</label>
          <input id="r-search" className="input" type="search" value={query} onChange={e => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Part of owner/name" autoComplete="off" spellCheck={false} />
        </div>
        <form className="field" onSubmit={e => { e.preventDefault(); if (manualRepo) onOpen(manualRepo); }}>
          <label htmlFor="r-manual">Or type owner/name</label>
          <div className="sk-repos-manual">
            <input id="r-manual" className="input" value={manual} onChange={e => setManual(e.target.value)} placeholder="owner/repo" autoComplete="off" spellCheck={false} />
            <button className="btn btn-primary" disabled={!manualRepo}>Open<Icon n="arrow" s={14} /></button>
          </div>
        </form>
      </div>

      {listingError && <div className="sk-warn" role="alert"><Icon n="alert" s={16} /><span>Could not list your repositories: {listingError} You can still type a repository above. <button className="btn btn-ghost sk-small" onClick={onRetry}>Try again</button></span></div>}
      {!listing && !listingError && <p className="sk-ns-cursor">Loading your repositories…</p>}
      {listing?.truncated && <p className="sk-meta">Showing your 1,000 most recently pushed repositories. Search or type a name to open an older one.</p>}
      {noSpeckit && <div className="sk-warn"><Icon n="alert" s={16} /><span>No Spec Kit project found among your repositories (none has a <b>.specify</b> folder). Type a repository above to open it anyway.</span></div>}

      {listing && <>
        <div className="sk-rowh"><Label>{q ? `${matches.length} matching` : `${all.length} repositories`}</Label></div>
        {matches.length === 0
          ? <p className="text-muted" style={{ fontSize: 13 }}>No repository matches “{query}”.{manualRepo ? '' : ' Type its full owner/name above to open it.'}</p>
          : <ul className="sk-list sk-repolist">{rows.map(r => {
            const off = unavailable[r.fullName] || (missing(r) ? 'No longer in your accessible repositories.' : null);
            return <li key={r.fullName} className={'sk-repo' + (off ? ' off' : '')}>
              <button className="sk-qitem" onClick={() => onOpen(r.fullName)} disabled={!!off} aria-describedby={off ? `off-${r.fullName}` : undefined}>
                <b>{r.fullName}</b>
                <span>{off ? <span id={`off-${r.fullName}`}>{off}</span> : [r.private ? 'Private' : 'Public', ago(r.pushedAt)].filter(Boolean).join(' · ')}</span>
                <span className={'tag sk-repo-tag ' + (off ? 'tag-outline' : r.speckit ? 'tag-accent' : 'tag-neutral')}>{off ? 'Unavailable' : r.speckit ? 'Spec Kit' : r.speckit === null ? 'Checking…' : 'Repository'}</span>
              </button>
              <button className={'sk-pin' + (r.pinned ? ' on' : '')} aria-pressed={r.pinned} aria-label={`${r.pinned ? 'Unpin' : 'Pin'} ${r.fullName}`} title={r.pinned ? 'Unpin' : 'Pin'} onClick={() => onTogglePin(r.fullName)}><Icon n="pin" s={14} /></button>
            </li>;
          })}</ul>}
        {matches.length > shown && <button className="btn btn-secondary" onClick={() => setShown(s => s + PAGE)}>Show more ({matches.length - shown})</button>}
      </>}
    </main>
  </div>;
}
