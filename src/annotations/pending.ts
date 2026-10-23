// Changes made to comments and not saved yet (specs/016-deferred-save). At GitHub Pages and on the server every
// save is a commit, so the changes wait in the browser as a queue and one Save writes them all. Pure: no DOM, so the
// view, the tests and the saving share it (constitution III).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Highlight, HighlightAuthor, HighlightChange } from '../project/types';
import { applyChange } from '../../server/highlightsFile';

/** One change the user made and has not saved. `at` keeps the order and is the time shown before the save. */
export interface PendingChange { id: string; change: HighlightChange; by: HighlightAuthor; at: string }

/**
 * What a change is about, for its save state: the highlight's own id for an add, the id it names otherwise, and for a
 * reply the reply itself, so each reply shows its own state (specs/011 R8).
 */
export const changeId = (change: HighlightChange): string => change.type === 'add' ? change.highlight.id
  : change.type === 'reply' ? change.reply.id
    : change.type === 'reply-edit' || change.type === 'reply-remove' ? change.replyId
      : change.type === 'react' ? `${change.replyId ?? change.id}:${change.emoji}` : change.id;

export const makePending = (change: HighlightChange, by: HighlightAuthor, at = new Date().toISOString()): PendingChange => ({ id: changeId(change), change, by, at });

export interface Folded { items: Highlight[]; /** Changes that changed something. */ applied: number; /** Ids of changes that could not be applied (their target is gone), left out of the view. */ skipped: string[] }

/**
 * The saved highlights with the queue applied on top, by the same pure `applyChange` the save uses, so what is shown
 * is what the save writes. A change that cannot be applied (the comment it is about was removed by someone else) is
 * skipped and does not stop the ones after it (spec FR-011). Each change is applied at the time it was made.
 */
export function foldPending(saved: Highlight[], queue: PendingChange[]): Folded {
  let items = saved;
  let applied = 0;
  const skipped: string[] = [];
  for (const q of queue) {
    try {
      const next = applyChange(items, q.change, q.by, q.at);
      if (next !== items) applied++;
      items = next;
    } catch { skipped.push(q.id); }
  }
  return { items, applied, skipped };
}

/** The target of a change: the comment (and, for replies and their emoji, the reply). */
const touches = (c: HighlightChange, id: string) => c.type === 'add' ? c.highlight.id === id : c.id === id;
const sameEmoji = (a: HighlightChange, b: HighlightChange) => a.type === 'react' && b.type === 'react' && a.id === b.id && a.replyId === b.replyId && a.emoji === b.emoji;
const aboutReply = (c: HighlightChange, id: string, replyId: string) => c.type !== 'add' && c.id === id && ((c.type === 'reply' && c.reply.id === replyId) || ((c.type === 'reply-edit' || c.type === 'reply-remove') && c.replyId === replyId) || (c.type === 'react' && c.replyId === replyId));

/**
 * Folds changes that make each other pointless into fewer, with the same outcome as applying them one by one
 * (spec FR-015, research R4): removing a comment never saved takes its add and everything on it away, two edits of one
 * thing become the last, an emoji put and then taken back is nothing, a reply sent and then removed or edited is nothing or
 * the edited reply. Order is kept; entries that stay keep their place.
 */
export function compactPending(queue: PendingChange[]): PendingChange[] {
  const out: PendingChange[] = [];
  for (const q of queue) {
    const c = q.change;
    if (c.type === 'remove') {
      const born = out.some(o => o.change.type === 'add' && o.change.highlight.id === c.id);
      for (let i = out.length - 1; i >= 0; i--) if (touches(out[i].change, c.id)) out.splice(i, 1);
      if (!born) out.push(q);
      continue;
    }
    if (c.type === 'update') {
      const at = out.findIndex(o => (o.change.type === 'add' && o.change.highlight.id === c.id) || (o.change.type === 'update' && o.change.id === c.id));
      if (at >= 0) {
        const o = out[at].change;
        const patch = { ...(c.color !== undefined ? { color: c.color } : {}), ...(c.note !== undefined ? { note: c.note } : {}) };
        out[at] = { ...out[at], change: o.type === 'add' ? { type: 'add', highlight: { ...o.highlight, ...patch } } : { ...o, ...patch } };
        continue;
      }
    }
    if (c.type === 'react') {
      // Against the last change of the same emoji on the same target: the same again is one; an emoji put and then taken back
      // is nothing; taken back and then put again is kept as it is (what the saved list holds decides the outcome).
      let at = -1;
      for (let i = out.length - 1; i >= 0 && at < 0; i--) if (sameEmoji(out[i].change, c)) at = i;
      if (at >= 0) {
        const was = (out[at].change as { on: boolean }).on;
        if (was === c.on) continue;
        if (was && !c.on) { out.splice(at, 1); continue; }
      }
    }
    if (c.type === 'reply-edit' || c.type === 'reply-remove') {
      const sent = out.findIndex(o => o.change.type === 'reply' && o.change.id === c.id && o.change.reply.id === c.replyId);
      if (c.type === 'reply-remove') {
        for (let i = out.length - 1; i >= 0; i--) if (aboutReply(out[i].change, c.id, c.replyId)) out.splice(i, 1);
        if (sent < 0) out.push(q);
        continue;
      }
      if (sent >= 0) { const o = out[sent].change as Extract<HighlightChange, { type: 'reply' }>; out[sent] = { ...out[sent], change: { ...o, reply: { ...o.reply, text: c.text } } }; continue; }
      const edited = out.findIndex(o => o.change.type === 'reply-edit' && o.change.id === c.id && o.change.replyId === c.replyId);
      if (edited >= 0) { out[edited] = { ...out[edited], change: c }; continue; }
    }
    out.push(q);
  }
  return out;
}

/** Ids of comments (added or edited) and of replies (sent or edited) that wait to be saved, for the "Not saved" mark. */
export function unsavedIds(queue: PendingChange[]): Set<string> {
  const ids = new Set<string>();
  for (const q of queue) {
    const c = q.change;
    if (c.type === 'add') ids.add(c.highlight.id);
    else if (c.type === 'update') ids.add(c.id);
    else if (c.type === 'reply') ids.add(c.reply.id);
    else if (c.type === 'reply-edit') ids.add(c.replyId);
  }
  return ids;
}

// ---- Where the queue waits: this browser (specs/016 research R5) ----

/** `local` when the user chose "Remember" (kept after the tab closes), `session` when not (kept for the tab, like the keys). */
export type PendingWhere = 'local' | 'session';

export const MAX_PENDING = 500;
const PREFIX = 'sk.pending.v1.';

/** One queue per account, repository, branch and spec. */
export const pendingKey = (login: string, repo: string, branch: string, slug: string) => `${PREFIX}${login}.${repo}@${branch}.${slug}`;

const TYPES = ['add', 'update', 'remove', 'reply', 'reply-edit', 'reply-remove', 'react'];
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const validEntry = (e: unknown): e is PendingChange => isObj(e) && typeof e.id === 'string' && typeof e.at === 'string' && isObj(e.by) && isObj(e.change) && TYPES.includes(e.change.type as string)
  && (e.change.type !== 'add' || (isObj(e.change.highlight) && typeof e.change.highlight.id === 'string'));

/** What is stored for a queue: its place and the changes, nothing else (no key, token or cookie). */
interface Stored { v: 1; branch: string; slug: string; changes: PendingChange[] }

/** The queue in `raw`; anything that is not the stored shape (damaged, other version, not JSON) is an empty queue. */
export function parsePending(raw: string | null): PendingChange[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!isObj(v) || v.v !== 1 || !Array.isArray(v.changes)) return [];
    return v.changes.filter(validEntry).slice(0, MAX_PENDING);
  } catch { return []; }
}

export interface PendingStorage {
  load(key: string): PendingChange[];
  /** True when the queue is kept in the browser; false when storage is blocked or full (it then lives in the tab only). */
  save(key: string, branch: string, slug: string, changes: PendingChange[]): boolean;
  clear(key: string): void;
  /** Queues of an account's repository, in every spec and branch, with how many changes each holds. */
  list(login: string, repo: string): { key: string; branch: string; slug: string; count: number }[];
}

export function pendingStorage(where: PendingWhere, storage?: () => Storage | null): PendingStorage {
  const area = storage ?? ((): Storage | null => { try { return where === 'local' ? localStorage : sessionStorage; } catch { return null; } });
  return {
    load: key => { try { return parsePending(area()?.getItem(key) ?? null); } catch { return []; } },
    save: (key, branch, slug, changes) => {
      try {
        const a = area();
        if (!a) return false;
        if (changes.length === 0) { a.removeItem(key); return true; }
        a.setItem(key, JSON.stringify({ v: 1, branch, slug, changes } satisfies Stored));
        return true;
      } catch { return false; }
    },
    clear: key => { try { area()?.removeItem(key); } catch { /* nothing to clear */ } },
    list: (login, repo) => {
      const out: { key: string; branch: string; slug: string; count: number }[] = [];
      try {
        const a = area();
        if (!a) return out;
        const head = `${PREFIX}${login}.${repo}@`;
        for (let i = 0; i < a.length; i++) {
          const key = a.key(i);
          if (!key?.startsWith(head)) continue;
          const raw = a.getItem(key);
          const v = raw ? JSON.parse(raw) as Partial<Stored> : null;
          const count = compactPending(parsePending(raw)).length;
          if (v && count > 0) out.push({ key, branch: String(v.branch ?? ''), slug: String(v.slug ?? ''), count });
        }
      } catch { /* an unreadable store lists nothing */ }
      return out;
    }
  };
}

const markOf = (c: PendingChange) => `${c.at}|${c.id}`;

/**
 * The queue with `entry` at the end. What is on its way to be saved (`sending`, by mark) does not take part in folding:
 * a later change must not vanish into an entry that is already being sent (specs/016 research R10).
 */
export function addToQueue(queue: PendingChange[], sending: ReadonlySet<string>, entry: PendingChange): PendingChange[] {
  const frozen = queue.filter(c => sending.has(markOf(c)));
  const rest = queue.filter(c => !sending.has(markOf(c)));
  return [...frozen, ...compactPending([...rest, entry])];
}

/** The queue without what was sent: what was done while the save ran stays. */
export function removeSent(queue: PendingChange[], sent: PendingChange[]): PendingChange[] {
  const gone = new Set(sent.map(markOf));
  return queue.filter(c => !gone.has(markOf(c)));
}

export interface PendingApi {
  queue: PendingChange[];
  /** True while the queue is kept in the browser. */
  persistent: boolean;
  /** Puts a change at the end (folding what it cancels); false when the queue is full. */
  add(change: HighlightChange, by: HighlightAuthor): boolean;
  /** Starts a save: the queue folded, as it is to be sent, and held apart from later changes. */
  begin(): PendingChange[];
  /** A save worked: takes out what was sent and keeps what was done since. */
  finish(sent: PendingChange[]): void;
  /** A save failed: everything stays, and later changes may fold into it again. */
  abort(): void;
  /** Throws all changes away. */
  discard(): void;
}

/**
 * The queue of one spec on one branch, kept in the browser. Reloaded when the key changes (another spec or branch) and
 * when another tab changes it. `key` null is no queue (nothing open).
 */
export function usePending(key: string | null, branch: string, slug: string, where: PendingWhere): PendingApi {
  const store = useMemo(() => pendingStorage(where), [where]);
  const [queue, setQueue] = useState<PendingChange[]>(() => key ? store.load(key) : []);
  const [persistent, setPersistent] = useState(true);
  const live = useRef(queue);
  const sending = useRef<Set<string>>(new Set());
  const write = useCallback((next: PendingChange[]) => {
    live.current = next;
    setQueue(next);
    if (key) setPersistent(store.save(key, branch, slug, next));
  }, [key, branch, slug, store]);

  useEffect(() => {
    sending.current = new Set();
    const next = key ? store.load(key) : [];
    live.current = next;
    setQueue(next);
  }, [key, store]);
  useEffect(() => {
    if (!key) return;
    const onStorage = (e: StorageEvent) => { if (e.key === key) { const next = store.load(key); live.current = next; setQueue(next); } };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, store]);

  return {
    queue,
    persistent,
    add: (change, by) => {
      if (live.current.length >= MAX_PENDING) return false;
      write(addToQueue(live.current, sending.current, makePending(change, by)));
      return true;
    },
    begin: () => {
      const folded = compactPending(live.current);
      write(folded);
      sending.current = new Set(folded.map(markOf));
      return folded;
    },
    finish: sent => {
      sending.current = new Set();
      write(removeSent(live.current, sent));
    },
    abort: () => { sending.current = new Set(); },
    discard: () => { sending.current = new Set(); live.current = []; setQueue([]); if (key) { store.clear(key); setPersistent(true); } }
  };
}
