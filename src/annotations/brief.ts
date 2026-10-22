import type { Highlight, HighlightAuthor } from '../project/types';

export const authorLabel = (a: HighlightAuthor) => 'login' in a ? a.login : a.name;

export const sameAuthor = (a: HighlightAuthor | null, b: HighlightAuthor) =>
  !!a && authorLabel(a) === authorLabel(b) && ('login' in a) === ('login' in b);

/** Issue notes first, then plain comments, then the other colours (specs/012). */
const briefRank = (c: Highlight['color']) => c === 'p' ? 0 : c === 'n' ? 1 : 2;

/** "{Author}: {note}" for the notes of one step: Issue, plain comments, then the rest (010 FR-022, 012 FR-003). */
export function briefNotes(items: Highlight[], phase: string, nameOf: (a: HighlightAuthor) => string = authorLabel): string[] {
  return items
    .filter(h => h.phase === phase && h.note.trim())
    .sort((a, b) => briefRank(a.color) - briefRank(b.color) || a.createdAt.localeCompare(b.createdAt))
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

/**
 * Why saving is off, or null (spec 012 FR-016). In this order: the app is pinned to a branch, the file cannot be
 * read, GitHub says the account has no write access (before any write is tried), a save was refused.
 */
export function readOnlyReason(p: { pinned: boolean; ref: string; repo: string; canWrite?: boolean | null }, fileError: string | null | undefined, refused: string | null): string | null {
  if (p.pinned) return `Highlights are read-only while the app is pinned to ${p.ref}.`;
  if (fileError) return fileError;
  if (p.canWrite === false) return `Your GitHub account has read-only access to ${p.repo}. Ask for write access to comment.`;
  return refused;
}

