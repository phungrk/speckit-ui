// Sign-in mode: GitHub App web flow and an in-memory session store. GitHub tokens stay in this
// process; the browser only gets a random session id in an HttpOnly cookie (constitution II).
// The store lives in one process, so the server must run as a single process.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const SESSION_COOKIE = 'sk_session';
const STATE_COOKIE = 'sk_oauth';
export const SESSION_MAX_AGE_MS = 7 * 24 * 3600_000;
const SESSION_MAX_AGE_S = SESSION_MAX_AGE_MS / 1000;
const STATE_MAX_AGE_S = 600;
/** Refresh the access token this long before it expires. */
const REFRESH_EARLY_MS = 60_000;
const RETURN_KEYS = ['repo', 'spec', 'branch', 'step', 'view'];

export interface ServerSession {
  id: string;
  login: string;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
  /** ms since epoch; Infinity when the token does not expire */
  accessExpiresAt: number;
  createdAt: number;
}

export interface AppConfig { clientId: string; clientSecret: string; publicUrl?: string }

const sessions = new Map<string, ServerSession>();

export function appConfig(env: Record<string, string | undefined> = process.env): AppConfig | null {
  const clientId = env.GITHUB_APP_CLIENT_ID?.trim(), clientSecret = env.GITHUB_APP_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret, publicUrl: env.PUBLIC_URL?.trim().replace(/\/$/, '') || undefined } : null;
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export const serializeCookie = (name: string, value: string, maxAgeS: number) =>
  `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeS}; Path=/; HttpOnly; Secure; SameSite=Lax`;

const expired = (s: ServerSession, now = Date.now()) => now - s.createdAt > SESSION_MAX_AGE_MS;

export function createSession(user: { login: string; avatarUrl: string | null }, tokens: TokenSet): ServerSession {
  const now = Date.now();
  for (const [id, s] of sessions) if (expired(s, now)) sessions.delete(id);
  const s: ServerSession = { id: randomBytes(32).toString('hex'), ...user, ...tokens, createdAt: now };
  sessions.set(s.id, s);
  return s;
}

export function getSession(req: IncomingMessage): ServerSession | null {
  const id = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  const s = id ? sessions.get(id) : undefined;
  if (!s) return null;
  if (expired(s)) { sessions.delete(s.id); return null; }
  return s;
}

export const destroySession = (id: string) => void sessions.delete(id);

// ---- GitHub App user tokens ----

interface TokenSet { accessToken: string; refreshToken: string | null; accessExpiresAt: number }

async function tokenRequest(cfg: AppConfig, params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'speckit-ui' },
    body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...params })
  });
  const data = await res.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`GitHub did not issue a token (${data.error || res.status}).`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    accessExpiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : Infinity
  };
}

/** The session's access token, refreshed when it is about to expire. null ends the session. */
export async function sessionToken(s: ServerSession, cfg: AppConfig): Promise<string | null> {
  if (s.accessExpiresAt - REFRESH_EARLY_MS > Date.now()) return s.accessToken;
  if (!s.refreshToken) { destroySession(s.id); return null; }
  try {
    Object.assign(s, await tokenRequest(cfg, { grant_type: 'refresh_token', refresh_token: s.refreshToken }));
    return s.accessToken;
  } catch {
    destroySession(s.id);
    return null;
  }
}

// ---- Routes ----

const origin = (req: IncomingMessage, cfg: AppConfig) =>
  cfg.publicUrl || `${(req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] || 'http'}://${req.headers.host}`;

/** Only our own query parameters survive the trip through GitHub, so `return` can't redirect elsewhere. */
export function safeReturn(raw: string | null): string {
  const q = new URLSearchParams(raw || '');
  const out = new URLSearchParams();
  for (const k of RETURN_KEYS) { const v = q.get(k); if (v) out.set(k, v); }
  const s = out.toString();
  return s ? '/?' + s : '/';
}

const redirect = (res: ServerResponse, to: string, cookies: string[] = []) => {
  res.statusCode = 302;
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Location', to);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
};

export function handleLogin(req: IncomingMessage, res: ServerResponse, cfg: AppConfig, url: URL) {
  const state = randomBytes(16).toString('hex');
  const value = `${state}.${Date.now()}.${safeReturn(url.searchParams.get('return'))}`;
  const auth = new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id', cfg.clientId);
  auth.searchParams.set('redirect_uri', origin(req, cfg) + '/auth/callback');
  auth.searchParams.set('state', state);
  redirect(res, auth.toString(), [serializeCookie(STATE_COOKIE, value, STATE_MAX_AGE_S)]);
}

const errorPage = (res: ServerResponse, message: string) => {
  res.statusCode = 400;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', serializeCookie(STATE_COOKIE, '', 0));
  res.end(`<!doctype html><meta charset="utf-8"><title>Sign-in failed</title><body style="font-family:system-ui;padding:32px">
<h1>Sign-in failed</h1><p>${message}</p><p><a href="/auth/login">Sign in again</a></p></body>`);
};

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function handleCallback(req: IncomingMessage, res: ServerResponse, cfg: AppConfig, url: URL) {
  const code = url.searchParams.get('code'), state = url.searchParams.get('state');
  const [want, at, ...ret] = (parseCookies(req.headers.cookie)[STATE_COOKIE] || '').split('.');
  if (!code || !state || !want || !same(state, want) || !(Date.now() - Number(at) < STATE_MAX_AGE_S * 1000)) {
    return errorPage(res, 'The sign-in link was invalid or has expired.');
  }
  let tokens: TokenSet, user: { login: string; avatar_url?: string };
  try {
    tokens = await tokenRequest(cfg, { code, redirect_uri: origin(req, cfg) + '/auth/callback' });
    const u = await fetch('https://api.github.com/user', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${tokens.accessToken}`, 'User-Agent': 'speckit-ui' } });
    if (!u.ok) throw new Error(`GitHub /user returned ${u.status}`);
    user = await u.json() as typeof user;
  } catch (e) {
    console.error('Sign-in failed:', e instanceof Error ? e.message : e);
    return errorPage(res, 'GitHub did not complete the sign-in.');
  }
  const s = createSession({ login: user.login, avatarUrl: user.avatar_url ?? null }, tokens);
  redirect(res, safeReturn(ret.join('.').replace(/^\/\?/, '')), [
    serializeCookie(SESSION_COOKIE, s.id, SESSION_MAX_AGE_S),
    serializeCookie(STATE_COOKIE, '', 0)
  ]);
}


export function handleLogout(req: IncomingMessage, res: ServerResponse) {
  const s = getSession(req);
  if (s) destroySession(s.id);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, '', 0));
  res.end(JSON.stringify({ ok: true }));
}
