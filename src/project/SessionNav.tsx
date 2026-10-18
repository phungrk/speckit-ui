import type { ReactNode } from 'react';
import type { CurrentUser } from './types';

export interface SessionActions {
  /** Pages: forget the stored keys. */
  onDisconnect?: () => void;
  /** Pages: back to the connect screen. */
  onSettings?: () => void;
  /** Server sign-in: end the session. */
  onSignOut?: () => void;
  /** Open a user-selected local repository without using GitHub. */
  onLocal?: () => void;
}

/** Who is signed in and the session buttons, shared by every screen after sign-in. */
export function SessionButtons({ user, onDisconnect, onSettings, onSignOut, onLocal }: SessionActions & { user: CurrentUser }) {
  return <>
    <span className="sk-who" title={user.mode === 'token' ? 'GITHUB_TOKEN in .env.local' : undefined}>@{user.login}</span>
    {onLocal && <button className="btn btn-ghost sk-small" onClick={onLocal}>Local repository</button>}
    {onSettings && <button className="btn btn-ghost sk-small" onClick={onSettings}>Settings</button>}
    {onDisconnect && <button className="btn btn-ghost sk-small" onClick={onDisconnect} title="Remove the stored keys from this browser">Disconnect</button>}
    {onSignOut && <button className="btn btn-ghost sk-small" onClick={onSignOut}>Sign out</button>}
  </>;
}

/** Top bar for the repo list and the overview. */
export function SessionNav({ title, user, children, ...actions }: SessionActions & { title: string; user: CurrentUser; children?: ReactNode }) {
  return <nav className="nav sk-nav">
    <div className="nav-brand" title={`Build ${__BUILD__}`}>Speckit</div>
    <div className="sk-proj">{title}</div>
    <div className="sk-spacer"></div>
    {children}
    <SessionButtons user={user} {...actions} />
  </nav>;
}
