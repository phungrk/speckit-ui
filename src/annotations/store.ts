// Where highlights are saved (specs/010-spec-annotations research R14). Components only know
// HighlightStore, so the four modes behave the same: a commit (server, Pages), the selected folder
// (local) or this browser (demo).
import type { Backend } from '../backend';
import type { ReadResult } from './freshness';
import { applyChange, parseHighlights, serializeHighlights } from '../../server/highlightsFile';
import { requestWrite, type LocalDirectoryHandle } from '../project/localRepositoryPersistence';
import type { Highlight, HighlightAuthor, HighlightChange } from '../project/types';

export interface SaveTarget { slug: string; branch: string | null }
export interface Saved { items: Highlight[]; commit?: { sha: string; url: string } }

export interface HighlightStore {
  kind: 'github' | 'local' | 'demo';
  /**
   * Reads the file again, or says it is unchanged since `etag` (specs/012 FR-014). Absent where there is nothing to look
   * at: the demo's data is in this tab only.
   */
  refresh?(target: { slug: string; branch: string | null }, etag: string | null): Promise<ReadResult>;
  /** Why saving is not possible here, or null. */
  readOnly: string | null;
  /**
   * `save` only queues the change in the browser; nothing is committed until the user presses Save (specs/016-deferred-save).
   * Left out where a save is the write itself (local folder, demo, and GitHub when a commit is the save).
   */
  deferred?: boolean;
  save(target: SaveTarget, change: HighlightChange, author: HighlightAuthor): Promise<Saved>;
}

/** Server and Pages: one commit per save on the viewed branch. */
export function gitHubStore(backend: Pick<Backend, 'saveHighlight' | 'readHighlights'>, repo: string, readOnly: string | null = null): HighlightStore {
  return {
    kind: 'github',
    readOnly,
    async refresh({ slug, branch }, etag) {
      if (!branch) throw new Error('No branch to read.');
      const r = await backend.readHighlights(repo, slug, branch, etag);
      return r.status === 'unchanged' ? 'unchanged' : { items: r.items, error: r.error, etag: r.etag };
    },
    async save({ slug, branch }, change) {
      if (!branch) throw new Error('No branch to commit to.');
      return backend.saveHighlight(repo, slug, branch, change);
    }
  };
}

/** What the deferred store needs from the queue kept in the page (specs/016-deferred-save). */
export interface DeferredQueue {
  /** What is on the screen: the saved highlights with the queue on top. */
  view(): Highlight[];
  /** The saved highlights, without the queue. */
  saved(): Highlight[];
  /** Puts the change at the end of the queue; false when the queue is full. */
  add(change: HighlightChange, by: HighlightAuthor): boolean;
}

/**
 * Server and Pages with a queue: a save checks the change against what is on the screen, so a refused change (not the
 * writer's, comment removed, note too long) is told at once as before, then waits in the queue instead of becoming a
 * commit. It answers with the saved highlights unchanged; the screen shows the queue on top of them.
 */
export function deferredStore(inner: HighlightStore, queue: DeferredQueue): HighlightStore {
  return {
    kind: inner.kind,
    deferred: true,
    get readOnly() { return inner.readOnly; },
    refresh: inner.refresh ? (target, etag) => inner.refresh!(target, etag) : undefined,
    async save(_target, change, author) {
      applyChange(queue.view(), change, author);
      if (!queue.add(change, author)) throw new Error('Too many changes are waiting to be saved. Save or discard some first.');
      return { items: queue.saved() };
    }
  };
}

/** Local: writes specs/{slug}/highlights.json in the selected folder, nothing else; no commit, no network. */
export function localFileStore(root: LocalDirectoryHandle | null): HighlightStore {
  const readOnly = root?.getDirectoryHandle ? null : 'This folder was opened read-only. Choose it again with write access to save highlights.';
  return {
    kind: 'local',
    readOnly,
    // The folder is changed outside the app (git pull), so it is read again on focus and on the button. The file's
    // modification time is its etag.
    async refresh({ slug }, etag) {
      if (!root?.getDirectoryHandle) throw new Error('This folder cannot be read again.');
      try {
        const dir = await (await root.getDirectoryHandle('specs')).getDirectoryHandle!(slug);
        const file = await (await dir.getFileHandle!('highlights.json')).getFile();
        const tag = String((file as { lastModified?: number }).lastModified ?? '');
        if (etag !== null && tag === etag) return 'unchanged';
        const parsed = parseHighlights(await file.text());
        return { items: parsed.items, error: parsed.error, etag: tag };
      } catch (e) {
        if ((e as { name?: string }).name === 'NotFoundError') return { items: [], error: null, etag: null };
        throw e;
      }
    },
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
