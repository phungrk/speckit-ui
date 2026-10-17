import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PINS, prefsFor } from '../src/project/prefs';
import { paramToStep, queryFor, readUrl, stepToParam } from '../src/project/urlState';

class MemoryStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

const stores = () => {
  const local = new MemoryStorage(), session = new MemoryStorage();
  vi.stubGlobal('localStorage', local);
  vi.stubGlobal('sessionStorage', session);
  return { local, session };
};

describe('prefs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps each login separate', () => {
    stores();
    prefsFor('mai', 'local').setPins(['o/a']);
    prefsFor('lan', 'local').setPins(['o/b']);
    expect(prefsFor('mai', 'local').getPins()).toEqual(['o/a']);
    expect(prefsFor('lan', 'local').getPins()).toEqual(['o/b']);
  });

  it('uses sessionStorage for Pages without Remember and localStorage otherwise', () => {
    const { local, session } = stores();
    prefsFor('mai', 'session').setLastRepo('o/a');
    expect(session.getItem('sk.u.mai.lastRepo')).toBe('"o/a"');
    expect(local.getItem('sk.u.mai.lastRepo')).toBeNull();
    prefsFor('mai', 'local').setLast('o/a', { spec: '001-x', step: 3 });
    expect(JSON.parse(local.getItem('sk.u.mai.last')!)).toEqual({ 'o/a': { spec: '001-x', step: 3 } });
    expect(prefsFor('mai', 'local').getLast('o/a')).toEqual({ spec: '001-x', step: 3 });
    expect(prefsFor('mai', 'local').getLast('o/b')).toBeNull();
  });

  it('works when storage is blocked', () => {
    const thrower = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    vi.stubGlobal('localStorage', thrower);
    vi.stubGlobal('sessionStorage', undefined);
    for (const where of ['local', 'session'] as const) {
      const p = prefsFor('mai', where);
      expect(p.getPins()).toEqual([]);
      expect(() => p.togglePin('o/a')).not.toThrow();
      expect(p.getLastRepo()).toBeNull();
      expect(() => p.setLast('o/a', { spec: null, step: null })).not.toThrow();
    }
  });

  it(`drops duplicates and keeps at most ${MAX_PINS} pins`, () => {
    stores();
    const p = prefsFor('mai', 'local');
    expect(p.setPins(['o/a', 'o/a', 'o/b'])).toEqual(['o/a', 'o/b']);
    expect(p.setPins(Array.from({ length: 25 }, (_, i) => `o/r${i}`))).toHaveLength(MAX_PINS);
    expect(p.getPins()).toHaveLength(MAX_PINS);
    expect(p.togglePin('o/r0')).not.toContain('o/r0');
  });

  it('ignores corrupted values', () => {
    const { local } = stores();
    local.setItem('sk.u.mai.pins', '{"not":"a list"}');
    local.setItem('sk.u.mai.lastRepo', '42');
    expect(prefsFor('mai', 'local').getPins()).toEqual([]);
    expect(prefsFor('mai', 'local').getLastRepo()).toBeNull();
  });
});

describe('url state', () => {
  it('maps step indexes to names and back', () => {
    expect(stepToParam(3)).toBe('plan');
    expect(stepToParam(0)).toBe('constitution');
    expect(stepToParam(null)).toBeNull();
    expect(paramToStep('implement')).toBe(6);
    expect(paramToStep('bogus')).toBeNull();
    expect(paramToStep(null)).toBeNull();
  });

  it('reads repo, spec, step and view', () => {
    expect(readUrl('?repo=o/a&spec=001-x&step=plan')).toEqual({ repo: 'o/a', spec: '001-x', branch: null, step: 3, view: null });
    expect(readUrl('?view=overview')).toMatchObject({ view: 'overview' });
    expect(readUrl('?view=evil')).toMatchObject({ view: null });
  });

  it('never writes anything but repo, spec, step and view', () => {
    const q = queryFor({ repo: 'o/a', spec: '001-x', step: 4, view: null, token: 'github_pat_secret', anthropicKey: 'sk-ant-x' } as never);
    expect(q).toBe('repo=o%2Fa&spec=001-x&step=tasks');
    expect([...new URLSearchParams(q).keys()].every(k => ['repo', 'spec', 'step', 'view'].includes(k))).toBe(true);
  });
});
