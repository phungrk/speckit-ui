// Where highlights are saved (specs/010-spec-annotations research R14). Components only know
// HighlightStore, so the four modes behave the same: a commit (server, Pages), the selected folder
// (local) or this browser (demo).
import type { Backend } from '../backend';
import { applyChange, parseHighlights, serializeHighlights } from '../../server/highlightsFile';
import { requestWrite, type LocalDirectoryHandle } from '../project/localRepositoryPersistence';
import type { Highlight, HighlightAuthor, HighlightChange } from '../project/types';

export interface SaveTarget { slug: string; branch: string | null }
export interface Saved { items: Highlight[]; commit?: { sha: string; url: string } }

export interface HighlightStore {
  kind: 'github' | 'local' | 'demo';
  /** Why saving is not possible here, or null. */
  readOnly: string | null;
  save(target: SaveTarget, change: HighlightChange, author: HighlightAuthor): Promise<Saved>;
}

/** Server and Pages: one commit per save on the viewed branch. */
export function gitHubStore(backend: Pick<Backend, 'saveHighlight'>, repo: string, readOnly: string | null = null): HighlightStore {
  return {
    kind: 'github',
    readOnly,
    async save({ slug, branch }, change) {
      if (!branch) throw new Error('No branch to commit to.');
      return backend.saveHighlight(repo, slug, branch, change);
    }
  };
}

/** Local: writes specs/{slug}/highlights.json in the selected folder, nothing else; no commit, no network. */
export function localFileStore(root: LocalDirectoryHandle | null): HighlightStore {
  const readOnly = root?.getDirectoryHandle ? null : 'This folder was opened read-only. Choose it again with write access to save highlights.';
  return {
    kind: 'local',
    readOnly,
    async save({ slug }, change, author) {
      if (!root?.getDirectoryHandle || !(await requestWrite(root))) throw new Error('This folder was opened read-only. Choose it again with write access to save highlights.');
      const specs = await root.getDirectoryHandle('specs');
      const dir = await specs.getDirectoryHandle!(slug);
      const file = await dir.getFileHandle!('highlights.json', { create: true });
      const parsed = parseHighlights(await (await file.getFile()).text());
      if (parsed.error) throw new Error(parsed.error);
      const items = applyChange(parsed.items, change, author);
      const out = await file.createWritable!();
      await out.write(serializeHighlights(items));
      await out.close();
      return { items };
    }
  };
}

export const DEMO_KEY = 'sk.demo.highlights';

/** Demo: highlights per feature in this browser, seeded from the design; never calls GitHub. */
export function demoStore(seed: Record<string, Highlight[]>, storage: () => Storage | null = () => { try { return localStorage; } catch { return null; } }): HighlightStore & { list(featureId: string): Highlight[] } {
  const all = (): Record<string, Highlight[]> => {
    try { const v = storage()?.getItem(DEMO_KEY); if (v) return JSON.parse(v); } catch { /* fall back to the seed */ }
    return seed;
  };
  return {
    kind: 'demo',
    readOnly: null,
    list: featureId => all()[featureId] ?? [],
    async save({ slug }, change, author) {
      const data = all();
      const items = applyChange(data[slug] ?? [], change, author);
      try { storage()?.setItem(DEMO_KEY, JSON.stringify({ ...data, [slug]: items })); } catch { /* kept in memory by the caller */ }
      return { items };
    }
  };
}
