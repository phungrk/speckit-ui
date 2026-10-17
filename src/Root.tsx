import { useCallback, useEffect, useState } from 'react';
import { App } from './App';
import { Connect } from './Connect';
import { STATIC, browserBackend, clearSettings, loadSettings, saveSettings, serverBackend, type Backend, type Settings } from './backend';
import { LiveWorkspace } from './project/LiveWorkspace';
import type { Project } from './project/types';
import { Icon } from './ui';

type State =
  | { kind: 'loading' }
  | { kind: 'demo' }
  | { kind: 'connect'; error: string | null; busy: boolean }
  | { kind: 'live'; project: Project; backend: Backend }
  | { kind: 'error'; message: string };

const forceDemo = () => new URLSearchParams(location.search).has('demo');

async function open(backend: Backend, refresh = false): Promise<State> {
  try {
    const project = await backend.project(refresh);
    return project ? { kind: 'live', project, backend } : { kind: 'demo' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Could not load the project.';
    return backend.kind === 'browser' ? { kind: 'connect', error: message, busy: false } : { kind: 'error', message };
  }
}

/**
 * Server build: shows the GitHub project when the server has GITHUB_REPO set, the sample workspace otherwise.
 * Static build (GitHub Pages): asks for a repository and token, then reads GitHub from the browser.
 * `?demo` always opens the sample workspace.
 */
export function Root() {
  const [settings, setSettings] = useState<Settings | null>(() => (STATIC ? loadSettings() : null));
  const [state, setState] = useState<State>(() => forceDemo() ? { kind: 'demo' } : STATIC && !loadSettings() ? { kind: 'connect', error: null, busy: false } : { kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (state.kind !== 'loading') return;
    if (!STATIC) { void open(serverBackend).then(setState); return; }
    try { void open(browserBackend(settings!)).then(setState); } catch (e) { setState({ kind: 'connect', error: (e as Error).message, busy: false }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = async (s: Settings) => {
    setState({ kind: 'connect', error: null, busy: true });
    let backend: Backend;
    try { backend = browserBackend(s); } catch (e) { setState({ kind: 'connect', error: (e as Error).message, busy: false }); return; }
    const next = await open(backend, true);
    if (next.kind === 'live') { saveSettings(s); setSettings(s); }
    setState(next.kind === 'demo' ? { kind: 'connect', error: 'No project found.', busy: false } : next);
  };

  const refresh = useCallback(async () => {
    if (state.kind !== 'live') return;
    setRefreshing(true);
    const next = await open(state.backend, true);
    // Keep showing the loaded project if a refresh fails.
    setState(s => (next.kind === 'live' ? next : s));
    setRefreshing(false);
  }, [state]);

  // Module-level caches hold the old repository's data, so start clean.
  const disconnect = () => { clearSettings(); location.replace(location.pathname); };

  if (state.kind === 'demo') return <App />;
  if (state.kind === 'live') return <LiveWorkspace project={state.project} backend={state.backend} refreshing={refreshing} onRefresh={refresh}
    {...(state.backend.kind === 'browser' ? { onDisconnect: disconnect, onSettings: () => setState({ kind: 'connect', error: null, busy: false }) } : {})} />;
  if (state.kind === 'connect') return <Connect initial={settings} error={state.error} busy={state.busy} onConnect={s => void connect(s)} />;
  return <div className="sk-boot">
    <div className="nav-brand">Speckit</div>
    {state.kind === 'loading'
      ? <p className="sk-ns-cursor">Loading project from GitHub…</p>
      : <div className="sk-boot-err">
        <div className="sk-warn"><Icon n="alert" s={16} /><span>{state.message}</span></div>
        <div className="sk-actions">
          <button className="btn btn-primary" onClick={() => { setState({ kind: 'loading' }); void open(serverBackend, true).then(setState); }}>Try again<Icon n="arrow" s={14} /></button>
          <a className="btn btn-secondary" href="?demo">Open the demo</a>
        </div>
      </div>}
  </div>;
}
