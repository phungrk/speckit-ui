import { useState } from 'react';
import { parseRepo, type Settings } from './backend';
import { Icon, Label } from './ui';

interface Props {
  initial: Settings | null;
  error: string | null;
  busy: boolean;
  onConnect: (s: Settings) => void;
}

/** First screen of the static build: the viewer brings their own GitHub token (and optionally a Claude key). */
export function Connect({ initial, error, busy, onConnect }: Props) {
  const [repo, setRepo] = useState(initial?.repo ?? '');
  const [ref, setRef] = useState(initial?.ref ?? '');
  const [githubToken, setGithubToken] = useState(initial?.githubToken ?? '');
  const [anthropicKey, setAnthropicKey] = useState(initial?.anthropicKey ?? '');
  const [remember, setRemember] = useState(initial?.remember ?? false);
  const repoOk = !!parseRepo(repo);
  const submit = () => onConnect({ repo: repo.trim(), ref: ref.trim(), githubToken: githubToken.trim(), anthropicKey: anthropicKey.trim(), remember });

  return <div className="sk-connect">
    <div className="nav-brand">Speckit</div>
    <h2>Connect a Spec Kit repository</h2>
    <p className="sk-connect-lead">This page reads your project straight from GitHub with your own token. Nothing goes through a speckit-ui server: your keys stay in this browser and are only sent to api.github.com and api.anthropic.com.</p>
    <form className="sk-connect-form" onSubmit={e => { e.preventDefault(); if (repoOk && githubToken.trim()) submit(); }}>
      <div className="sk-connect-row">
        <div className="field"><label htmlFor="c-repo">Repository</label>
          <input id="c-repo" className="input" value={repo} onChange={e => setRepo(e.target.value)} placeholder="owner/repo" autoComplete="off" spellCheck={false} required />
        </div>
        <div className="field"><label htmlFor="c-ref">Branch <span className="text-muted">(optional)</span></label>
          <input id="c-ref" className="input" value={ref} onChange={e => setRef(e.target.value)} placeholder="default branch" autoComplete="off" spellCheck={false} />
        </div>
      </div>
      <div className="field"><label htmlFor="c-gh">GitHub token</label>
        <input id="c-gh" className="input" type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} placeholder="github_pat_…" autoComplete="off" spellCheck={false} required />
        <p className="sk-connect-hint">
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create a fine-grained token</a> for the repository and its submodule repos, with
          Contents: read, Pull requests: read, and Issues: read and write (Issues is only needed to approve gates).
        </p>
      </div>
      <div className="field"><label htmlFor="c-ai">Anthropic API key <span className="text-muted">(optional, for Copilot)</span></label>
        <input id="c-ai" className="input" type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" spellCheck={false} />
        <p className="sk-connect-hint">Without a key, Copilot answers the suggested questions from the project files.</p>
      </div>
      <label className="sk-connect-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember on this device <span className="text-muted">(otherwise forgotten when this tab closes)</span></label>
      {error && <div className="sk-warn" role="alert"><Icon n="alert" s={16} /><span>{error}</span></div>}
      <div className="sk-actions">
        <button className="btn btn-primary" disabled={busy || !repoOk || !githubToken.trim()}>{busy ? 'Connecting…' : 'Connect'}<Icon n="arrow" s={14} /></button>
        <a className="btn btn-secondary" href="?demo">Open the demo</a>
      </div>
    </form>
    <div className="sk-connect-foot"><Label>Good to know</Label>
      <ul>
        <li>Gate approvals are written to issues in the repository as the token's owner.</li>
        <li>Revoke the token on GitHub at any time to cut off access. <b>Disconnect</b> removes it from this browser.</li>
      </ul>
    </div>
  </div>;
}
