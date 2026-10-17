import { useCallback, useEffect, useState } from 'react';
import { App } from './App';
import { LiveWorkspace } from './project/LiveWorkspace';
import type { Project, ProjectResponse } from './project/types';
import { Icon } from './ui';

type State =
  | { kind: 'loading' }
  | { kind: 'demo' }
  | { kind: 'live'; project: Project }
  | { kind: 'error'; message: string };

const forceDemo = () => new URLSearchParams(location.search).has('demo');

async function fetchProject(refresh: boolean): Promise<State> {
  try {
    const res = await fetch('/api/project' + (refresh ? '?refresh=1' : ''));
    const data = await res.json() as ProjectResponse;
    if (!data.configured) return { kind: 'demo' };
    if ('project' in data) return { kind: 'live', project: data.project };
    return { kind: 'error', message: data.error };
  } catch {
    return { kind: 'error', message: 'Could not reach the speckit-ui server.' };
  }
}

/** Shows the GitHub project when the server has GITHUB_REPO set, the sample workspace otherwise (or with ?demo). */
export function Root() {
  const [state, setState] = useState<State>(() => (forceDemo() ? { kind: 'demo' } : { kind: 'loading' }));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (!forceDemo()) void fetchProject(false).then(setState); }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const next = await fetchProject(true);
    // Keep showing the loaded project if a refresh fails.
    setState(s => (next.kind === 'error' && s.kind === 'live' ? s : next));
    setRefreshing(false);
  }, []);

  if (state.kind === 'demo') return <App />;
  if (state.kind === 'live') return <LiveWorkspace project={state.project} refreshing={refreshing} onRefresh={refresh} />;
  return <div className="sk-boot">
    <div className="nav-brand">Speckit</div>
    {state.kind === 'loading'
      ? <p className="sk-ns-cursor">Loading project from GitHub…</p>
      : <div className="sk-boot-err">
        <div className="sk-warn"><Icon n="alert" s={16} /><span>{state.message}</span></div>
        <div className="sk-actions">
          <button className="btn btn-primary" onClick={() => { setState({ kind: 'loading' }); void fetchProject(true).then(setState); }}>Try again<Icon n="arrow" s={14} /></button>
          <a className="btn btn-secondary" href="?demo">Open the demo</a>
        </div>
      </div>}
  </div>;
}
