import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App } from './App';
import { Connect } from './Connect';
import { STATIC, browserBackend, clearSettings, loadSettings, normalizeRepo, saveSettings, serverBackend, signOut, type Backend, type Settings } from './backend';
import type { CopilotMsg } from './copilot/Copilot';
import { LiveWorkspace } from './project/LiveWorkspace';
import { Overview } from './project/Overview';
import { prefsFor, type LastViewed, type PrefsStorage } from './project/prefs';
import { STALE, accessProblem, createRepoLoader } from './project/repoLoader';
import { RepoPicker } from './project/RepoPicker';
import { SessionNav, type SessionActions } from './project/SessionNav';
import { SignIn, TokenSetup } from './project/SignIn';
import { SignInRequired } from './project/trackingApi';
import type { AccessibleRepo, CurrentUser, Project, RepoListing, SessionResponse } from './project/types';
import { readUrl, writeUrl } from './project/urlState';
import { Icon } from './ui';

type Boot =
  | { kind: 'loading' }
  | { kind: 'demo' }
  | { kind: 'connect'; error: string | null; busy: boolean }
  | { kind: 'signin'; error?: string }
  | { kind: 'setup'; error: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; backend: Backend; user: CurrentUser; defaultRepo: string | null };

const forceDemo = () => new URLSearchParams(location.search).has('demo');
const message = (e: unknown, d: string) => (e instanceof Error ? e.message : d);

/** Who the user is decides everything they can see (FR-013). */
async function identify(backend: Backend): Promise<Boot> {
  const s: SessionResponse = await backend.session();
  if (s.mode === 'demo') return { kind: 'demo' };
  if (s.user) return { kind: 'ready', backend, user: { login: s.user.login, avatarUrl: s.user.avatarUrl, mode: s.mode }, defaultRepo: s.defaultRepo ?? null };
  if (s.mode === 'signin') return { kind: 'signin' };
  if (s.mode === 'token') return { kind: 'setup', error: s.error || 'GITHUB_TOKEN is not set.' };
  return { kind: 'connect', error: s.error ?? 'GitHub did not accept this token.', busy: false };
}

/**
 * Server build: the user signs in (sign-in mode) or uses the token in .env.local (token mode);
 * without any GitHub configuration it shows the sample workspace.
 * Static build (GitHub Pages): asks for the viewer's token, then reads GitHub from the browser.
 * `?demo` always opens the sample workspace.
 */
export function Root() {
  const [settings, setSettings] = useState<Settings | null>(() => (STATIC ? loadSettings() : null));
  const [boot, setBoot] = useState<Boot>(() => forceDemo() ? { kind: 'demo' } : STATIC && !settings ? { kind: 'connect', error: null, busy: false } : { kind: 'loading' });

  const start = () => {
    setBoot({ kind: 'loading' });
    const backend = STATIC ? browserBackend(settings!) : serverBackend;
    identify(backend).then(setBoot, e => setBoot(STATIC ? { kind: 'connect', error: message(e, 'Could not reach GitHub.'), busy: false } : { kind: 'error', message: message(e, 'Could not reach the speckit-ui server.') }));
  };
  useEffect(() => { if (boot.kind === 'loading') start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async (s: Settings) => {
    setBoot({ kind: 'connect', error: null, busy: true });
    const next = await identify(browserBackend(s)).catch((e): Boot => ({ kind: 'connect', error: message(e, 'Could not reach GitHub.'), busy: false }));
    if (next.kind === 'ready') { saveSettings(s); setSettings(s); }
    setBoot(next);
  };

  // Reloading drops every in-memory cache and Copilot thread; pins and positions stay (FR-017).
  const leave = (backend: Backend) => { backend.reset(); location.replace(location.pathname); };
  const disconnect = () => { if (boot.kind === 'ready') { clearSettings(); leave(boot.backend); } };
  const doSignOut = async () => { if (boot.kind === 'ready') { await signOut().catch(() => undefined); leave(boot.backend); } };

  if (boot.kind === 'demo') return <App />;
  if (boot.kind === 'connect') return <Connect initial={settings} error={boot.error} busy={boot.busy} onConnect={s => void connect(s)} />;
  if (boot.kind === 'signin') return <SignIn error={boot.error} />;
  if (boot.kind === 'setup') return <TokenSetup error={boot.error} onRetry={start} />;
  if (boot.kind === 'ready') {
    const actions: SessionActions = boot.backend.kind === 'browser'
      ? { onDisconnect: disconnect, onSettings: () => setBoot({ kind: 'connect', error: null, busy: false }) }
      : boot.user.mode === 'signin' ? { onSignOut: () => void doSignOut() } : {};
    const storage: PrefsStorage = STATIC && !settings?.remember ? 'session' : 'local';
    return <Session key={boot.user.login} backend={boot.backend} user={boot.user} defaultRepo={boot.defaultRepo} storage={storage} actions={actions}
      onAuthLost={() => { boot.backend.reset(); setBoot({ kind: 'signin', error: 'Your session ended. Sign in again.' }); }} />;
  }
  return <div className="sk-boot">
    <div className="nav-brand">Speckit</div>
    {boot.kind === 'loading'
      ? <p className="sk-ns-cursor">Loading…</p>
      : <div className="sk-boot-err">
        <div className="sk-warn"><Icon n="alert" s={16} /><span>{boot.message}</span></div>
        <div className="sk-actions">
          <button className="btn btn-primary" onClick={start}>Try again<Icon n="arrow" s={14} /></button>
          <a className="btn btn-secondary" href="?demo">Open the demo</a>
        </div>
      </div>}
  </div>;
}

type View = { kind: 'repos' } | { kind: 'overview' } | { kind: 'repo'; repo: string };
type Open = { repo: string; project: Project | null; error: string | null };

/** How many repos detection checks right after listing (R2). */
const FIRST_DETECT = 30;
const DETECT_BATCH = 30;

interface SessionProps {
  backend: Backend;
  user: CurrentUser;
  defaultRepo: string | null;
  storage: PrefsStorage;
  actions: SessionActions;
  onAuthLost: () => void;
}

/** Everything after the user is known: the repo list, the overview and one workspace at a time. */
function Session({ backend, user, defaultRepo, storage, actions, onAuthLost }: SessionProps) {
  const prefs = useMemo(() => prefsFor(user.login, storage), [user.login, storage]);
  const url = useRef(readUrl()).current;
  /** A deep link's spec and step apply to the first repo opened only. */
  const deepLink = useRef(url.repo ? { repo: normalizeRepo(url.repo), spec: url.spec, step: url.step } : null);
  const [view, setView] = useState<View>(() => {
    if (url.view) return { kind: url.view };
    const repo = (url.repo && normalizeRepo(url.repo)) || prefs.getLastRepo() || (defaultRepo && normalizeRepo(defaultRepo));
    return repo ? { kind: 'repo', repo } : { kind: 'repos' };
  });
  const [pins, setPins] = useState(() => prefs.getPins());
  const [recent, setRecent] = useState<string[]>([]);
  const [listing, setListing] = useState<RepoListing | null>(null);
  const [listingError, setListingError] = useState<string | null>(null);
  const [speckit, setSpeckit] = useState<Record<string, boolean>>({});
  const [unavailable, setUnavailable] = useState<Record<string, string>>({});
  const [threads, setThreads] = useState<Record<string, Record<string, CopilotMsg[]>>>({});
  const [open, setOpen] = useState<Open | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loader = useRef(createRepoLoader()).current;
  const requested = useRef(new Set<string>());
  const autoOpened = useRef(!!url.view || view.kind === 'repo');

  const failed = (e: unknown) => { if (e instanceof SignInRequired) { onAuthLost(); return true; } return false; };

  const loadListing = () => {
    setListingError(null);
    backend.repos().then(setListing, e => { if (!failed(e)) setListingError(message(e, 'GitHub did not answer.')); });
  };
  useEffect(loadListing, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Spec Kit checks, each repo at most once; the picker asks for visible rows first. */
  const detect = useCallback((targets: AccessibleRepo[]) => {
    const todo = targets.filter(r => !requested.current.has(r.fullName));
    todo.forEach(r => requested.current.add(r.fullName));
    for (let i = 0; i < todo.length; i += DETECT_BATCH) {
      const batch = todo.slice(i, i + DETECT_BATCH);
      backend.detect(batch.map(r => ({ fullName: r.fullName, pushedAt: r.pushedAt }))).then(
        d => setSpeckit(s => ({ ...s, ...d.results })),
        e => { if (!failed(e)) batch.forEach(r => requested.current.delete(r.fullName)); });
    }
  }, [backend]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pinned repos, then the most recently pushed (R2).
  useEffect(() => {
    if (!listing) return;
    detect([...listing.repos.filter(r => pins.includes(r.fullName)), ...listing.repos.slice(0, FIRST_DETECT)]);
  }, [listing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exactly one Spec Kit project among a fully checked list: open it (US1-AS3).
  useEffect(() => {
    if (autoOpened.current || view.kind !== 'repos' || !listing || listing.repos.some(r => !(r.fullName in speckit))) return;
    const found = listing.repos.filter(r => speckit[r.fullName]);
    autoOpened.current = true;
    if (found.length === 1) openRepo(found[0].fullName);
  }, [listing, speckit, view.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const openRepo = (repo: string, spec?: string, step?: number) => {
    const name = normalizeRepo(repo);
    if (!name) return;
    if (spec !== undefined) prefs.setLast(name, { spec, step: step ?? null });
    setView({ kind: 'repo', repo: name });
  };

  // Load the open repo; a late answer for a repo the user already left is dropped (FR-006).
  const current = view.kind === 'repo' ? view.repo : null;
  const loadRepo = (repo: string, refresh: boolean) => loader.run(repo, () => backend.project(repo, refresh)).then(project => {
    if (project === STALE) return;
    setOpen({ repo, project, error: project ? null : 'This server has no GitHub configuration.' });
    setUnavailable(u => (repo in u ? Object.fromEntries(Object.entries(u).filter(([k]) => k !== repo)) : u));
  }, e => {
    if (failed(e)) return;
    const gone = accessProblem(e, 'read', repo);
    if (gone) setUnavailable(u => ({ ...u, [repo]: gone }));
    setOpen(o => (refresh && o?.repo === repo && o.project ? o : { repo, project: null, error: gone ?? message(e, 'Could not load the project.') }));
  });
  useEffect(() => {
    loader.switchTo(current);
    setOpen(current ? { repo: current, project: null, error: null } : null);
    if (!current) { writeUrl({ view: view.kind === 'repo' ? null : view.kind }); return; }
    prefs.setLastRepo(current);
    setRecent(r => [current, ...r.filter(x => x !== current)].slice(0, 8));
    void loadRepo(current, false);
  }, [current, view.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => {
    if (!current) return;
    setRefreshing(true);
    await loadRepo(current, true);
    setRefreshing(false);
  };

  const togglePin = (repo: string) => setPins(prefs.togglePin(repo));

  if (view.kind === 'repos') return <RepoPicker user={user} listing={listing} listingError={listingError} speckit={speckit} unavailable={unavailable} pins={pins}
    onTogglePin={togglePin} onOpen={r => openRepo(r)} onDetect={detect} onOverview={() => setView({ kind: 'overview' })} onRetry={loadListing} {...actions} />;
  if (view.kind === 'overview') return <Overview user={user} backend={backend} pins={pins} onOpen={openRepo} onAllRepos={() => setView({ kind: 'repos' })} onAuthLost={onAuthLost} {...actions} />;

  const repo = view.repo;
  if (!open?.project || open.repo !== repo) return <div className="sk sk-page">
    <SessionNav title={repo} user={user} {...actions}>
      <button className="btn btn-secondary sk-small" onClick={() => setView({ kind: 'overview' })}>Overview</button>
      <button className="btn btn-secondary sk-small" onClick={() => setView({ kind: 'repos' })}>All repos</button>
    </SessionNav>
    <main className="sk-repos">
      {open?.repo === repo && open.error
        ? <div className="sk-boot-err">
          <div className="sk-warn" role="alert"><Icon n="alert" s={16} /><span>{open.error}</span></div>
          <div className="sk-actions">
            <button className="btn btn-primary" onClick={() => void loadRepo(repo, true)}>Try again<Icon n="arrow" s={14} /></button>
            <button className="btn btn-secondary" onClick={() => setView({ kind: 'repos' })}>All repos</button>
          </div>
        </div>
        : <p className="sk-ns-cursor">Loading {repo} from GitHub…</p>}
    </main>
  </div>;

  const link = deepLink.current?.repo === repo ? deepLink.current : null;
  const initial: LastViewed | null = link && (link.spec || link.step != null) ? { spec: link.spec, step: link.step } : prefs.getLast(repo);
  return <LiveWorkspace key={repo} project={open.project} backend={backend} user={user} refreshing={refreshing} onRefresh={() => void refresh()}
    initial={initial}
    onPosition={v => { deepLink.current = null; prefs.setLast(repo, v); writeUrl({ repo, spec: v.spec, step: v.step }); }}
    threads={threads[repo] ?? {}} onThreads={t => setThreads(x => ({ ...x, [repo]: t }))}
    repos={{ pinned: pins, recent, unavailable }}
    onSwitch={r => openRepo(r)} onAllRepos={() => setView({ kind: 'repos' })} onOverview={() => setView({ kind: 'overview' })} onAuthLost={onAuthLost}
    {...actions} />;
}
