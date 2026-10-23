import { useState } from 'react';

// The bar that says changes wait in this browser and offers Save and Discard (specs/016-deferred-save,
// contracts/save-bar-ui.md). Shown only at GitHub Pages and on the server, where a save is a commit.

export interface SaveBarProps {
  /** Changes waiting in this spec on this branch. */
  count: number;
  /** Changes waiting in other specs or branches of the repository. */
  elsewhere?: number;
  saving?: boolean;
  /** Why the last save did not work. */
  error?: string | null;
  /** Why saving is off (read-only token, protected branch, pinned commit), or null. */
  readOnly?: string | null;
  /** False when the browser could not keep the queue: the changes are in this tab only. */
  persistent?: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

const plural = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`;

export function SaveBar({ count, elsewhere = 0, saving = false, error = null, readOnly = null, persistent = true, onSave, onDiscard }: SaveBarProps) {
  const [confirming, setConfirming] = useState(false);
  if (count === 0 && elsewhere === 0) return null;
  const off = readOnly ? true : undefined;
  return <div className="sk-savebar" role="status" aria-live="polite">
    <div className="sk-savebar-row">
      {count > 0 && <span className="sk-savebar-msg"><b>{plural(count)}</b> not saved</span>}
      {elsewhere > 0 && <span className="sk-savebar-else">{elsewhere} unsaved in other specs</span>}
      {count > 0 && (confirming
        ? <span className="sk-savebar-acts" role="group" aria-label="Discard changes">
          <span>Discard {plural(count)}?</span>
          <button type="button" className="btn btn-secondary" autoFocus onClick={() => setConfirming(false)}>Keep</button>
          <button type="button" className="btn btn-primary" onClick={() => { setConfirming(false); onDiscard(); }}>Discard</button>
        </span>
        : <span className="sk-savebar-acts">
          <button type="button" className="btn btn-primary" disabled={saving} aria-disabled={off} title={readOnly ?? undefined}
            onClick={() => { if (!readOnly && !saving) onSave(); }}>{saving ? 'Saving…' : error ? 'Retry' : 'Save'}</button>
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setConfirming(true)}>Discard</button>
        </span>)}
    </div>
    {error && <div className="sk-savebar-err" role="alert">{error}</div>}
    {count > 0 && !persistent && <div className="sk-savebar-warn">These changes are only in this tab and are lost if you close it.</div>}
  </div>;
}
