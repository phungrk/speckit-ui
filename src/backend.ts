// Where GitHub mode gets its data: the speckit-ui server (npm run dev / npm start), or, in the
// static GitHub Pages build, GitHub and Claude called straight from the browser with the viewer's own keys.
import { getProject, type Source } from '../server/github';
import { decideGate, getTracking } from '../server/tracking';
import type { CopilotMsg } from './copilot/Copilot';
import { OfflineError, requestCopilot, toTurns } from './copilot/api';
import type { GateAction } from './project/trackingApi';
import { fetchTracking, postGate } from './project/trackingApi';
import type { GateKey, Project, ProjectResponse, Tracking } from './project/types';

/** Built for GitHub Pages: no server, keys come from the viewer. */
export const STATIC = import.meta.env.VITE_STATIC === '1';

export interface Backend {
  kind: 'server' | 'browser';
  /** null when the server has no GITHUB_REPO (demo mode). */
  project(refresh: boolean): Promise<Project | null>;
  tracking(refresh: boolean): Promise<Tracking | null>;
  decide(slug: string, gate: GateKey, action: GateAction, note: string): Promise<Tracking>;
  /** Throws OfflineError when no Claude credentials are available. */
  copilot(context: string, hist: CopilotMsg[]): Promise<string>;
}

export const serverBackend: Backend = {
  kind: 'server',
  async project(refresh) {
    let data: ProjectResponse;
    try { data = await (await fetch('/api/project' + (refresh ? '?refresh=1' : ''))).json() as ProjectResponse; } catch { throw new Error('Could not reach the speckit-ui server.'); }
    if (!data.configured) return null;
    if ('error' in data) throw new Error(data.error);
    return data.project;
  },
  tracking: fetchTracking,
  decide: postGate,
  copilot: requestCopilot
};

// ---- Viewer settings for the static build ----

export interface Settings {
  /** owner/repo */
  repo: string;
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
      if (v) { const p = JSON.parse(v) as Settings; if (p.repo && p.githubToken) return p; }
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

export function browserBackend(settings: Settings): Backend {
  const m = parseRepo(settings.repo);
  if (!m) throw new Error('Repository must look like owner/name.');
  const src: Source = { owner: m[1], repo: m[2], ref: settings.ref.trim() || undefined, token: settings.githubToken.trim() };
  return {
    kind: 'browser',
    project: refresh => getProject(src, refresh),
    async tracking(refresh) { return getTracking(src, await getProject(src), refresh); },
    async decide(slug, gate, action, note) {
      const project = await getProject(src);
      const f = project.specs.find(x => x.slug === slug);
      if (!f) throw new Error(`No spec ${slug} at ${project.sha.slice(0, 7)}.`);
      await decideGate(src, project, f, gate, action, note.trim().slice(0, 2000));
      return getTracking(src, project, true);
    },
    copilot: (context, hist) => browserCopilot(settings.anthropicKey, context, hist)
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
