import type { Highlight, HighlightAuthor } from '../project/types';

export const authorLabel = (a: HighlightAuthor) => 'login' in a ? a.login : a.name;

export const sameAuthor = (a: HighlightAuthor | null, b: HighlightAuthor) =>
  !!a && authorLabel(a) === authorLabel(b) && ('login' in a) === ('login' in b);

/** "{Author}: {note}" for the notes of one step, Issue notes first (FR-022). */
export function briefNotes(items: Highlight[], phase: string, nameOf: (a: HighlightAuthor) => string = authorLabel): string[] {
  return items
    .filter(h => h.phase === phase && h.note.trim())
    .sort((a, b) => Number(b.color === 'p') - Number(a.color === 'p') || a.createdAt.localeCompare(b.createdAt))
    .map(h => `${nameOf(h.author)}: ${h.note.trim()}`);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Just now", "12 min ago", "3h ago", then "Oct 2". */
export function relTime(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = new Date(t);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Whether a draft opened for one spec, branch and step is still on screen (spec edge case). */
export function pendingTarget(draft: { slug: string; branch: string | null; phase: string }, current: { slug: string; branch: string | null; phase: string }): 'same' | 'moved' {
  return draft.slug === current.slug && draft.branch === current.branch && draft.phase === current.phase ? 'same' : 'moved';
}
