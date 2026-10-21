// Per-user display preferences on this device: pinned repos, where the user was in each repo, and the
// reader settings and sidebar layout (specs/010).
// Not project state (constitution I). Keys are namespaced by login so people sharing a browser
// don't see each other's pins. Every access tolerates blocked storage.

import { parseLayout, parseReader, type LayoutPrefs, type ReaderSettings } from '../reader/settings';

export const MAX_PINS = 20;

export interface LastViewed {
  spec: string | null;
  step: number | null;
  /** Branch of the version being looked at, for specs on several branches (specs/003). */
  branch?: string | null;
}

/** local: kept across restarts · session: forgotten when the tab closes (Pages without Remember) */
export type PrefsStorage = 'local' | 'session';

export interface Prefs {
  getPins(): string[];
  /** Saves at most MAX_PINS unique repos and returns what was saved. */
  setPins(pins: string[]): string[];
  togglePin(repo: string): string[];
  getLast(repo: string): LastViewed | null;
  setLast(repo: string, v: LastViewed): void;
  getLastRepo(): string | null;
  setLastRepo(repo: string): void;
  /** null until this user has saved reader settings, so the device copy can be adopted (specs/010 data-model). */
  getReader(): ReaderSettings | null;
  setReader(s: ReaderSettings): void;
  getLayout(): LayoutPrefs;
  setLayout(l: LayoutPrefs): void;
  /** The user agreed that highlights are committed in this repo (specs/010-spec-annotations FR-009a). */
  getHighlightConsent(repo: string): boolean;
  setHighlightConsent(repo: string, on: boolean): void;
  /** The author name typed in local mode (FR-017). */
  getAuthorName(): string | null;
  setAuthorName(name: string): void;
}

export function prefsFor(login: string, where: PrefsStorage): Prefs {
  const store = (): Storage | null => { try { return where === 'local' ? localStorage : sessionStorage; } catch { return null; } };
  const key = (k: string) => `sk.u.${login}.${k}`;
  const read = <T,>(k: string): T | null => { try { const v = store()?.getItem(key(k)); return v ? JSON.parse(v) as T : null; } catch { return null; } };
  const write = (k: string, v: unknown) => { try { store()?.setItem(key(k), JSON.stringify(v)); } catch { /* preferences are best effort */ } };

  const getPins = () => { const v = read<unknown>('pins'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; };
  const setPins = (pins: string[]) => { const v = [...new Set(pins)].slice(0, MAX_PINS); write('pins', v); return v; };
  const lastAll = () => { const v = read<Record<string, LastViewed>>('last'); return v && typeof v === 'object' ? v : {}; };
  return {
    getPins,
    setPins,
    togglePin: repo => { const p = getPins(); return setPins(p.includes(repo) ? p.filter(x => x !== repo) : [...p, repo]); },
    getLast: repo => lastAll()[repo] ?? null,
    setLast: (repo, v) => write('last', { ...lastAll(), [repo]: v }),
    getLastRepo: () => { const v = read<unknown>('lastRepo'); return typeof v === 'string' ? v : null; },
    setLastRepo: repo => write('lastRepo', repo),
    getReader: () => { const v = read<unknown>('reader'); return v === null ? null : parseReader(v); },
    setReader: s => write('reader', s),
    getLayout: () => parseLayout(read<unknown>('layout')),
    setLayout: l => write('layout', l),
    getHighlightConsent: repo => { const v = read<Record<string, unknown>>('hlConsent'); return !!v && typeof v === 'object' && v[repo] === true; },
    setHighlightConsent: (repo, on) => { const v = read<Record<string, boolean>>('hlConsent'); const next = { ...(v && typeof v === 'object' ? v : {}) }; if (on) next[repo] = true; else delete next[repo]; write('hlConsent', next); },
    getAuthorName: () => { const v = read<unknown>('authorName'); return typeof v === 'string' && v.trim() ? v.trim() : null; },
    setAuthorName: name => write('authorName', name.trim())
  };
}
