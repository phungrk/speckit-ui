// Changes made to comments and not saved yet (specs/016-deferred-save). At GitHub Pages and on the server every
// save is a commit, so the changes wait in the browser as a queue and one Save writes them all. Pure: no DOM, so the
// view, the tests and the saving share it (constitution III).
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
