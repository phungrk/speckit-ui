import { Icon, Label } from '../ui';
import { URL_KEYS } from './urlState';

/** The query to come back to after signing in, limited to our own parameters. */
const returnQuery = () => {
  const q = new URLSearchParams(location.search), out = new URLSearchParams();
  for (const k of URL_KEYS) { const v = q.get(k); if (v) out.set(k, v); }
  return out.toString();
};

/** Server sign-in mode: nothing about any repo shows until the user signs in with GitHub (US5-AS1). */
export function SignIn({ error, onLocal }: { error?: string | null; onLocal: () => void }) {
  return <div className="sk-connect">
    <div className="nav-brand">Speckit</div>
    <h2>Sign in to Speckit Workspace</h2>
    <p className="sk-connect-lead">You see and approve only what your own GitHub account can access. Your GitHub token stays on this server and is never sent to the browser.</p>
    {error && <div className="sk-warn" role="alert"><Icon n="alert" s={16} /><span>{error}</span></div>}
    <div className="sk-actions">
      <a className="btn btn-primary" href={`/auth/login?return=${encodeURIComponent(returnQuery())}`}>Sign in with GitHub<Icon n="arrow" s={14} /></a>
      <button className="btn btn-secondary" onClick={onLocal}>Open local repository</button>
      <a className="btn btn-secondary" href="?demo">Open the demo</a>
    </div>
    <div className="sk-connect-foot"><Label>Good to know</Label>
      <ul>
        <li>If your organization uses single sign-on, GitHub asks you to pass it during sign-in.</li>
        <li>Organization repositories appear once an owner has installed the app for that organization.</li>
      </ul>
    </div>
  </div>;
}

/** Local token mode without a usable GITHUB_TOKEN: say exactly where to put one (FR-016). */
export function TokenSetup({ error, onRetry, onLocal }: { error: string; onRetry: () => void; onLocal: () => void }) {
  return <div className="sk-connect">
    <div className="nav-brand">Speckit</div>
    <h2>Add your GitHub token</h2>
    <div className="sk-warn" role="alert"><Icon n="alert" s={16} /><span>{error}</span></div>
    <ol className="sk-steps-list">
      <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create a fine-grained token</a> for the repositories you work on, with Contents: read, Pull requests: read, and Issues: read and write (Issues is only needed to approve gates).</li>
      <li>Put it in <b>.env.local</b> at the root of speckit-ui as <code>GITHUB_TOKEN=github_pat_…</code>. Git ignores this file.</li>
      <li>Restart <code>npm run dev</code> or <code>npm start</code>.</li>
    </ol>
    <div className="sk-actions">
      <button className="btn btn-primary" onClick={onRetry}>Check again<Icon n="arrow" s={14} /></button>
      <button className="btn btn-secondary" onClick={onLocal}>Open local repository</button>
      <a className="btn btn-secondary" href="?demo">Open the demo</a>
    </div>
  </div>;
}
