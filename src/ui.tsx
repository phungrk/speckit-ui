import type { ReactNode } from 'react';

// Lucide icon paths, as the Modernist system specifies.
const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  lock: '<rect width="18" height="11" x="3" y="11"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  branch: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  dot: '<circle cx="12" cy="12" r="4" fill="currentColor"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  panelL: '<rect x="3" y="4" width="18" height="16"/><path d="M9 4v16"/>',
  panelR: '<rect x="3" y="4" width="18" height="16"/><path d="M15 4v16"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>'
};
export type IconName = keyof typeof ICONS;

export function Icon({ n, s = 16 }: { n: IconName; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[n] }} />;
}

export const Label = ({ children }: { children: ReactNode }) => <div className="sk-label">{children}</div>;

export const DocHead = ({ file, title, meta }: { file: string; title: string; meta?: ReactNode }) => (
  <header className="sk-dochead">
    <div className="sk-file"><Icon n="file" s={14} />{file}</div>
    <h3>{title}</h3>
    {meta && <div className="sk-meta">{meta}</div>}
  </header>
);
