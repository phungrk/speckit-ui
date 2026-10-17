import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserBackend, browserCopilot, clearSettings, loadSettings, parseRepo, saveSettings, type Settings } from '../src/backend';
import { OfflineError } from '../src/copilot/api';
import { createReply } from '../server/claude';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

const settings = (over: Partial<Settings> = {}): Settings => ({ repo: 'acme/app', ref: '', githubToken: 'github_pat_x', anthropicKey: '', remember: false, ...over });

describe('settings storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps keys for the tab only unless asked to remember', () => {
    const session = new MemoryStorage(), local = new MemoryStorage();
    vi.stubGlobal('sessionStorage', session);
    vi.stubGlobal('localStorage', local);
    saveSettings(settings());
    expect(session.getItem('sk.settings')).not.toBeNull();
    expect(local.getItem('sk.settings')).toBeNull();
    saveSettings(settings({ remember: true }));
    expect(session.getItem('sk.settings')).toBeNull();
    expect(loadSettings()).toMatchObject({ repo: 'acme/app', remember: true });
    clearSettings();
    expect(loadSettings()).toBeNull();
  });

  it('survives blocked storage', () => {
    vi.stubGlobal('sessionStorage', { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } });
    vi.stubGlobal('localStorage', undefined);
    expect(loadSettings()).toBeNull();
    expect(() => saveSettings(settings())).not.toThrow();
    expect(() => clearSettings()).not.toThrow();
  });
});

describe('browser backend', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts owner/repo and GitHub URLs', () => {
    expect(parseRepo('acme/app')?.slice(1)).toEqual(['acme', 'app']);
    expect(parseRepo('https://github.com/acme/app.git')?.slice(1)).toEqual(['acme', 'app']);
    expect(parseRepo('acme')).toBeNull();
    expect(() => browserBackend(settings({ repo: 'nope' }))).toThrow(/owner\/name/);
  });

  it('calls GitHub with the viewer token and no User-Agent override in a browser', async () => {
    vi.stubGlobal('window', {});
    const fetch = vi.fn(async () => new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetch);
    await expect(browserBackend(settings({ repo: 'acme/browser-test' })).project(true)).rejects.toThrow(/404/);
    const headers = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer github_pat_x');
    expect(headers['User-Agent']).toBeUndefined();
  });

  it('Copilot is offline without an Anthropic key', async () => {
    await expect(browserCopilot('  ', 'ctx', [{ r: 'user', t: 'hi' }])).rejects.toBeInstanceOf(OfflineError);
  });
});

describe('createReply', () => {
  const client = (response: object) => ({ beta: { messages: { create: vi.fn(async () => response) } } });

  it('sends the context in the system prompt with refusal fallback on', async () => {
    const c = client({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: ' Hello ' }] });
    expect(await createReply(c as never, 'claude-opus-5-5', 'CTX', [{ role: 'user', content: 'q' }])).toBe('Hello');
    expect(c.beta.messages.create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-opus-5-5', fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'], system: expect.stringContaining('PROJECT CONTEXT\nCTX')
    }));
  });

  it('turns a refusal into a readable answer', async () => {
    expect(await createReply(client({ stop_reason: 'refusal', content: [] }) as never, 'm', 'c', [{ role: 'user', content: 'q' }])).toMatch(/can’t help/);
  });
});
