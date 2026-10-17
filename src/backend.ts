// Where GitHub mode gets its data: the speckit-ui server (npm run dev / npm start), or, in the
// static GitHub Pages build, GitHub and Claude called straight from the browser with the viewer's own keys.
// Every call names its repository; the user's own access decides what they can open.
import { GitHubError, clearProjectCache, detectSpeckit, getProject, identityFor, json, listRepos, type Source } from '../server/github';
import { clearTrackingCache, decideGate, getTracking } from '../server/tracking';
import type { CopilotMsg } from './copilot/Copilot';
import { OfflineError, requestCopilot, toTurns } from './copilot/api';
import type { GateAction } from './project/trackingApi';
import { api, fetchTracking, postGate } from './project/trackingApi';
import type { DetectResult, DetectTarget, GateKey, Project, ProjectResponse, RepoListing, SessionResponse, Tracking } from './project/types';

/** Built for GitHub Pages: no server, keys come from the viewer. */
export const STATIC = import.meta.env.VITE_STATIC === '1';

export interface Backend {
  kind: 'server' | 'browser';
  /** Who the user is and how the app runs. Never includes a token. */
  session(): Promise<SessionResponse>;
  repos(): Promise<RepoListing>;
  detect(repos: DetectTarget[]): Promise<DetectResult>;
  /** null when the server has no GitHub configuration (demo mode). */
  project(repo: string, refresh: boolean): Promise<Project | null>;
  tracking(repo: string, refresh: boolean): Promise<Tracking | null>;
  decide(repo: string, slug: string, gate: GateKey, action: GateAction, note: string): Promise<Tracking>;
  /** Throws OfflineError when no Claude credentials are available. */
  copilot(context: string, hist: CopilotMsg[]): Promise<string>;
  /** Forget everything loaded in this tab (Disconnect, Sign out). */
  reset(): void;
}

const resetCaches = () => { clearProjectCache(); clearTrackingCache(); };

export const serverBackend: Backend = {
  kind: 'server',
  session: () => api<SessionResponse>('/api/session'),
  repos: () => api<RepoListing>('/api/repos'),
  detect: repos => api<DetectResult>('/api/repos/detect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repos }) }),
  async project(repo, refresh) {
    const data = await api<ProjectResponse>(`/api/project?repo=${encodeURIComponent(repo)}${refresh ? '&refresh=1' : ''}`);
    if (!data.configured) return null;
    if ('error' in data) throw new Error(data.error);
    return data.project;
  },
  tracking: fetchTracking,
  decide: postGate,
  copilot: requestCopilot,
  reset: resetCaches
};

/** Ends the server session; the browser never held the GitHub token. */
export const signOut = () => api<{ ok: true }>('/auth/logout', { method: 'POST' });

// ---- Viewer settings for the static build ----

export interface Settings {
  /** Optional owner/repo opened first (Advanced). */
  repo: string;
  /** Branch for `repo` only. */
  ref: string;
  githubToken: string;
  anthropicKey: string;
  /** Keep in localStorage (survives restarts) instead of sessionStorage (this tab only). */
  remember: boolean;
}

const KEY = 'sk.settings';
const stores = () => { const out: Storage[] = []; try { out.push(sessionStorage, localStorage); } catch { /* storage blocked */ } return out; };

export function loadSettings(): Settings | null {
  for (const s of stores()) {
    try {
      const v = s.getItem(KEY);
      if (v) { const p = JSON.parse(v) as Partial<Settings>; if (p.githubToken) return { repo: '', ref: '', anthropicKey: '', remember: false, ...p } as Settings; }
    } catch { /* ignore */ }
  }
  return null;
}

export function saveSettings(v: Settings) {
  clearSettings();
  try { (v.remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(v)); } catch { /* the session still works until reload */ }
}

export function clearSettings() {
  for (const s of stores()) { try { s.removeItem(KEY); } catch { /* ignore */ } }
}

export const parseRepo = (repo: string) => repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$|\/$/g, '').match(/^([\w.-]+)\/([\w.-]+)$/);

/** owner/name from anything parseRepo accepts, or null. */
export const normalizeRepo = (repo: string) => { const m = parseRepo(repo); return m ? `${m[1]}/${m[2]}` : null; };

export function browserBackend(settings: Settings): Backend {
  const token = settings.githubToken.trim();
  let identity: Promise<string> | null = null;
  const who = () => (identity ??= identityFor(token));
  const preferred = normalizeRepo(settings.repo);
  const source = async (repo: string): Promise<Source> => {
    const m = parseRepo(repo);
    if (!m) throw new Error('Repository must look like owner/name.');
    const ref = preferred === `${m[1]}/${m[2]}` ? settings.ref.trim() : '';
    return { owner: m[1], repo: m[2], ref: ref || undefined, token, identity: await who() };
  };
  return {
    kind: 'browser',
    async session() {
      try {
        const u = await json<{ login: string; avatar_url?: string }>({ owner: '', repo: '', token }, '/user');
        return { mode: 'pages', user: { login: u.login, avatarUrl: u.avatar_url ?? null }, defaultRepo: preferred };
      } catch (e) {
        if (e instanceof GitHubError && e.status === 401) return { mode: 'pages', user: null, error: 'GitHub rejected this token (401). Check that it is pasted in full and has not expired.' };
        throw e;
      }
    },
    repos: () => listRepos({ token }),
    async detect(repos) { return detectSpeckit({ token, identity: await who() }, repos); },
    async project(repo, refresh) { return getProject(await source(repo), refresh); },
    async tracking(repo, refresh) { const src = await source(repo); return getTracking(src, await getProject(src), refresh); },
    async decide(repo, slug, gate, action, note) {
      const src = await source(repo);
      const project = await getProject(src);
      const f = project.specs.find(x => x.slug === slug);
      if (!f) throw new Error(`No spec ${slug} at ${project.sha.slice(0, 7)}.`);
      await decideGate(src, project, f, gate, action, note.trim().slice(0, 2000));
      return getTracking(src, project, true);
    },
    copilot: (context, hist) => browserCopilot(settings.anthropicKey, context, hist),
    reset: resetCaches
  };
}

/** Calls Claude from the page with the viewer's own key. Loaded on demand to keep the SDK out of the main bundle. */
export async function browserCopilot(apiKey: string, context: string, hist: CopilotMsg[]): Promise<string> {
  if (!apiKey.trim()) throw new OfflineError();
  const [{ default: Anthropic }, { DEFAULT_MODEL, createReply }] = await Promise.all([import('@anthropic-ai/sdk'), import('../server/claude')]);
  const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true });
  try {
    return await createReply(client, DEFAULT_MODEL, context, toTurns(hist));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Anthropic rejected the API key. Check it under Settings.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('The model is busy or the key hit its rate limit. Try again in a moment.');
    if (e instanceof Anthropic.APIError) throw new Error(`Copilot could not reach the model (${e.status ?? 'network'}).`);
    throw e;
  }
}
