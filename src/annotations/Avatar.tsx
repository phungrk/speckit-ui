// Initials avatar (specs/012 research R10). No picture is loaded: the Pages CSP only allows
// `img-src 'self' data:`, and a new image host would need a CSP and README change (constitution II).
// `src` is accepted so a later change can pass a picture without touching the callers.

export const initials = (name: string) => name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?';

export function Avatar({ name, src }: { name: string; src?: string }) {
  if (src) return <img className="sk-avatar sm" src={src} alt="" referrerPolicy="no-referrer" />;
  return <span className="sk-avatar sm" aria-hidden="true">{initials(name)}</span>;
}
