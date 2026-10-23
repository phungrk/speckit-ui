// Saving several changes at once, as one commit (specs/016-deferred-save, contracts/batch-save-api.md).
// Synthetic data only; nothing is written to real GitHub (constitution V).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveHighlights, serializeHighlights } from '../server/highlights';
import type { Highlight, HighlightChange } from '../src/project/types';
import { fakeGitHub, fakeReq, fakeRes, type FakeRepo } from './fakeGitHub';

const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: 'Then ', suffix: '. Later', startHint: 30,
  docSha: null, color: 'o', note: 'A note', author: { login: 'mai' }, createdAt: '2026-10-21T08:00:00.000Z', updatedAt: '2026-10-21T08:00:00.000Z', ...over
});
const lan = { login: 'lan' };
const path = 'specs/010-x/highlights.json';
const src = { owner: 'o', repo: 'r', token: 't' };
const setup = (repo: FakeRepo = {}) => { const r: FakeRepo = { specs: {}, ...repo }; const calls = fakeGitHub({ 'o/r': r }); return { r, calls }; };
const five = (): HighlightChange[] => [
  { type: 'add', highlight: H('h1') }, { type: 'add', highlight: H('h2', { note: 'Second' }) },
  { type: 'react', id: 'h1', emoji: '👍', on: true }, { type: 'react', id: 'h2', emoji: '🎉', on: true },
  { type: 'reply', id: 'h1', reply: { id: 'r_1', text: 'Self reply' } }
];

describe('saveHighlights', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('writes every change in one commit, one PUT, a message that ends with [skip ci]', async () => {
    const { r, calls } = setup();
    const out = await saveHighlights(src, { slug: '010-x', branch: 'main', changes: five(), user: 'mai' });
    expect(calls.filter(c => c.method === 'PUT')).toHaveLength(1);
    expect(r.commits).toHaveLength(1);
    expect(r.commits![0].message).toBe('mai saved 5 comment changes on 010-x [skip ci]');
    const file = JSON.parse(r.files!.main[path]);
    expect(file.version).toBe(2);
    expect(file.highlights.map((h: Highlight) => h.id)).toEqual(['h1', 'h2']);
    expect(file.highlights[0].reactions).toEqual([{ emoji: '👍', author: { login: 'mai' } }]);
    expect(file.highlights[0].replies[0]).toMatchObject({ id: 'r_1', text: 'Self reply', author: { login: 'mai' } });
    expect(out.commit?.url).toContain('/commit/');
    expect(out.skipped).toEqual([]);
    expect(out.items).toHaveLength(2);
  });

  it('keeps the message of one change as it was', async () => {
    const { r } = setup();
    await saveHighlights(src, { slug: '010-x', branch: 'main', changes: [{ type: 'add', highlight: H('h1') }], user: 'mai' });
    expect(r.commits![0].message).toMatch(/^mai noted on /);
    expect(r.commits![0].message.endsWith('[skip ci]')).toBe(true);
  });

  it('says who saved from the one who saves, not from what the changes carry', async () => {
    const { r } = setup();
    await saveHighlights(src, { slug: '010-x', branch: 'main', changes: [{ type: 'add', highlight: H('h1', { author: { login: 'forged' } }) }], user: 'mai' });
    expect(JSON.parse(r.files!.main[path]).highlights[0].author).toEqual({ login: 'mai' });
  });

  it('skips a change whose comment was removed by someone else and saves the rest', async () => {
    const { r } = setup({ files: { main: { [path]: serializeHighlights([H('h1', { author: lan })]) } } });
    const out = await saveHighlights(src, { slug: '010-x', branch: 'main', user: 'mai', changes: [
      { type: 'reply', id: 'gone', reply: { id: 'r_1', text: 'To nobody' } },
      { type: 'react', id: 'h1', emoji: '👍', on: true },
      { type: 'update', id: 'h1', note: 'Not mine to change' }
    ] });
    expect(out.skipped.map(s => s.index)).toEqual([0, 2]);
    expect(out.skipped[0].error).toMatch(/removed by someone else/);
    expect(out.skipped[1].error).toMatch(/Only lan can change/);
    const file = JSON.parse(r.files!.main[path]);
    expect(file.highlights[0].reactions).toEqual([{ emoji: '👍', author: { login: 'mai' } }]);
    expect(file.highlights[0].note).toBe('A note');
    expect(r.commits).toHaveLength(1);
    expect(r.commits![0].message).toMatch(/^mai reacted 👍 on /);
  });

  it('commits nothing when nothing would change, and says so', async () => {
    const { r, calls } = setup({ files: { main: { [path]: serializeHighlights([H('h1')]) } } });
    const out = await saveHighlights(src, { slug: '010-x', branch: 'main', user: 'mai', changes: [{ type: 'add', highlight: H('h1') }, { type: 'reply', id: 'gone', reply: { id: 'r', text: 'x' } }] });
    expect(out.commit).toBeNull();
    expect(out.skipped).toHaveLength(1);
    expect(calls.filter(c => c.method === 'PUT')).toHaveLength(0);
    expect(r.commits ?? []).toHaveLength(0);
  });

  it('commits nothing for a spec that has no file when every change is skipped', async () => {
    const { calls } = setup();
    const out = await saveHighlights(src, { slug: '010-x', branch: 'main', user: 'mai', changes: [{ type: 'reply', id: 'gone', reply: { id: 'r', text: 'x' } }] });
    expect(out.commit).toBeNull();
    expect(calls.filter(c => c.method === 'PUT')).toHaveLength(0);
  });

  it('re-reads and applies every change again after a concurrent commit, so both sides are kept', async () => {
    let raced = false;
    const { r } = setup({ beforePut: files => { if (raced) return; raced = true; (files.main ??= {})[path] = serializeHighlights([H('h9', { author: lan })]); } });
    await saveHighlights(src, { slug: '010-x', branch: 'main', changes: five(), user: 'mai' });
    expect(JSON.parse(r.files!.main[path]).highlights.map((h: Highlight) => h.id).sort()).toEqual(['h1', 'h2', 'h9']);
    expect(r.commits).toHaveLength(1);
  });

  it('stops at once on what is not a skip (a refused branch), with the same message as one change', async () => {
    setup({ putStatus: 403 });
    await expect(saveHighlights(src, { slug: '010-x', branch: 'main', changes: five(), user: 'mai' })).rejects.toThrow(/needs Contents: Read and write/);
  });
});

describe('POST /api/highlights with changes', () => {
  afterEach(() => vi.unstubAllGlobals());
  const env = { GITHUB_TOKEN: 't', GITHUB_REPO: 'o/r' };
  const base = { repo: 'o/r', slug: '010-x', branch: 'main' };
  const post = async (body: Record<string, unknown>) => {
    const { route } = await import('../server/routes');
    const res = fakeRes();
    await route(fakeReq('POST', {}, body), res, new URL('http://h/api/highlights'), env);
    return res.out;
  };

  it('takes a queue of changes and answers with the commit and what was skipped', async () => {
    const r: FakeRepo = { specs: {} };
    fakeGitHub({ 'o/r': r });
    const out = await post({ ...base, changes: [...five(), { type: 'reply', id: 'gone', reply: { id: 'r_9', text: 'Lost' } }] });
    expect(out.status).toBe(200);
    const json = JSON.parse(out.body);
    expect(json.commit.url).toContain('/commit/');
    expect(json.skipped).toHaveLength(1);
    expect(r.commits).toHaveLength(1);
  });

  it('refuses no changes, too many changes, or a change of the wrong shape before any GitHub call', async () => {
    const calls = fakeGitHub({ 'o/r': { specs: {} } });
    const ok = { type: 'react', id: 'h1', emoji: '👍', on: true };
    for (const changes of [[], Array.from({ length: 201 }, () => ok), [ok, { type: 'nope' }], [{ type: 'reply', id: 'h1' }]]) {
      const out = await post({ ...base, changes });
      expect(out.status, JSON.stringify(changes).slice(0, 60)).toBe(400);
      expect(JSON.parse(out.body).error).toMatch(/changes: 1 to 200/);
    }
    expect(calls).toEqual([]);
  });

  it('takes a body longer than the 8,000 characters other routes take (twenty long comments), and refuses one longer than the file may be', async () => {
    const r: FakeRepo = { specs: {} };
    const calls = fakeGitHub({ 'o/r': r });
    const long = Array.from({ length: 20 }, (_, i) => ({ type: 'add', highlight: H('h' + i, { note: 'x'.repeat(1900) }) }));
    expect(JSON.stringify(long).length).toBeGreaterThan(8000);
    expect((await post({ ...base, changes: long })).status).toBe(200);
    const before = calls.length;
    const huge = await post({ ...base, changes: Array.from({ length: 200 }, (_, i) => ({ type: 'add', highlight: H('g' + i, { note: 'y'.repeat(2000), quote: 'q'.repeat(2000) }) })) });
    expect(huge.status).toBe(400);
    expect(JSON.parse(huge.body).error).toMatch(/too large/i);
    expect(calls.length).toBe(before);
  });

  it('still takes one change the old way', async () => {
    const r: FakeRepo = { specs: {} };
    fakeGitHub({ 'o/r': r });
    const out = await post({ ...base, change: { type: 'add', highlight: H('h1') } });
    expect(out.status).toBe(200);
    expect(JSON.parse(out.body).commit.url).toContain('/commit/');
    expect(JSON.parse(out.body).skipped).toBeUndefined();
  });
});
