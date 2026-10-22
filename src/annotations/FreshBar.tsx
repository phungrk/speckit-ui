import { relTime } from './brief';

// The line that tells the reader when comments were last looked for, offers a refresh, and shows the badge when other
// people have added or changed some (specs/012 FR-014). It sits in the head of the rail and at the top of the Highlights tab.

export interface FreshProps {
  /** How many comments by others are waiting to be shown. */
  newCount: number;
  /** When the page last looked, in ms; null before the first look. */
  checkedAt: number | null;
  /** Shows what is waiting (the badge). */
  onApply: () => void;
  /** Looks now and shows what it finds. */
  onRefresh: () => void;
  now?: number;
}

export function FreshBar({ newCount, checkedAt, onApply, onRefresh, now }: FreshProps) {
  const rel = checkedAt === null ? null : relTime(new Date(checkedAt).toISOString(), now);
  return <div className="sk-cm-fresh">
    <span className="sk-cm-upd">{rel === null ? 'Not checked yet' : `Updated ${rel === 'Just now' ? 'just now' : rel}`}</span>
    <button type="button" aria-label="Refresh comments" onClick={onRefresh}>↻ Refresh</button>
    {newCount > 0 && <button type="button" className="sk-cm-new" onClick={onApply}>New comments ({newCount})</button>}
  </div>;
}
