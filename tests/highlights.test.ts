// highlights.json: parse, apply changes and commit through a fake GitHub (specs/010-spec-annotations).
// Synthetic data only; nothing is written to real GitHub (constitution V).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EMOJI, MAX_NOTE, MAX_REPLY, applyChange, commitMessage, parseHighlights, readHighlights, saveHighlight, serializeHighlights } from '../server/highlights';
import { GitHubError } from '../server/github';
import type { Highlight } from '../src/project/types';
import { fakeGitHub, fakeReq, fakeRes, type FakeRepo } from './fakeGitHub';

const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: 'Then ', suffix: '. Later', startHint: 30,
  docSha: null, color: 'y', note: '', author: { login: 'mai' }, createdAt: `2026-10-21T08:00:0${id.slice(-1)}.000Z`, updatedAt: '2026-10-21T08:00:00.000Z', ...over
});
const mai = { login: 'mai' }, lan = { login: 'lan' };

describe('parseHighlights', () => {
  it('reads an empty or missing file as no highlights', () => {
    expect(parseHighlights(null)).toEqual({ items: [], error: null });
    expect(parseHighlights('{"version":1,"highlights":[]}')).toEqual({ items: [], error: null });
  });

  it('drops malformed items and says how many', () => {
    const r = parseHighlights(JSON.stringify({ version: 1, highlights: [H('h1'), { id: 'bad' }, { ...H('h2'), color: 'red' }] }));
    expect(r.items.map(h => h.id)).toEqual(['h1']);
    expect(r.error).toMatch(/^2 highlights/);
  });

  it('reports broken JSON and unknown versions (FR-014)', () => {
    expect(parseHighlights('{oops').error).toMatch(/cannot be read/);
    expect(parseHighlights('{"version":3,"highlights":[]}').error).toMatch(/unknown format/);
    expect(parseHighlights('{"version":2,"highlights":[]}').error).toBeNull();
  });
});

describe('old colours stay as they were (specs/014 FR-003, SC-004)', () => {
  it('reads and writes back, byte for byte, a file whose comments have every colour', () => {
    const items = ['y', 'b', 'p', 'o', 'n'].map((c, i) => H('h' + i, { color: c as never, note: 'note ' + c }));
    const text = serializeHighlights(items);
    const read = parseHighlights(text);
    expect(read.error).toBeNull();
    expect(read.items.map(h => h.color)).toEqual(['y', 'b', 'p', 'o', 'n']);
    expect(serializeHighlights(read.items)).toBe(text);
  });

  it('still lets the write path change a colour: the interface no longer offers it, the data layer is the same (R2)', () => {
    const out = applyChange([H('h1', { color: 'p', note: 'x' })], { type: 'update', id: 'h1', color: 'o' }, { login: 'mai' });
    expect(out[0].color).toBe('o');
  });
});

describe('plain comments, colour n (specs/012)', () => {
  it('reads and writes a comment without a category, and still reads files that have none', () => {
    const r = parseHighlights(JSON.stringify({ version: 1, highlights: [H('h1', { color: 'n', note: 'Why?' }), H('h2')] }));
    expect(r.error).toBeNull();
    expect(r.items.map(h => h.color)).toEqual(['n', 'y']);
    expect(parseHighlights(serializeHighlights([H('h1', { color: 'n' })])).items[0].color).toBe('n');
    expect(parseHighlights(JSON.stringify({ version: 1, highlights: [H('h1', { color: 'z' as never })] })).error).toMatch(/^1 highlight/);
  });

  it('recolours to and from n like any other colour', () => {
    let items = applyChange([], { type: 'add', highlight: H('h1', { color: 'n', note: 'Why?' }) }, mai);
    items = applyChange(items, { type: 'update', id: 'h1', color: 'p' }, mai);
    expect(items[0].color).toBe('p');
    items = applyChange(items, { type: 'update', id: 'h1', color: 'n' }, mai);
    expect(items[0].color).toBe('n');
    expect(() => applyChange(items, { type: 'update', id: 'h1', color: 'x' as never }, mai)).toThrow(/Unknown colour/);
  });

  it('says "commented" for a plain comment and still ends with [skip ci]', () => {
    expect(commitMessage({ type: 'add', highlight: H('h1', { color: 'n', note: 'Why?' }) }, [], 'mai')).toBe('mai commented on Specify: "the cap applies daily" [skip ci]');
    expect(commitMessage({ type: 'update', id: 'h1', note: 'More' }, [H('h1', { color: 'n' })], 'mai')).toMatch(/^mai commented on Specify.*\[skip ci\]$/);
    expect(commitMessage({ type: 'add', highlight: H('h1', { color: 'y', note: 'n' }) }, [], 'mai')).toMatch(/^mai noted on/);
  });
});

describe('applyChange', () => {
  it('adds, recolours, edits notes and removes by id', () => {
    let items = applyChange([], { type: 'add', highlight: H('h1') }, mai);
    items = applyChange(items, { type: 'update', id: 'h1', color: 'p' }, mai, 'T1');
    expect(items[0]).toMatchObject({ color: 'p', updatedAt: 'T1' });
    items = applyChange(items, { type: 'update', id: 'h1', note: 'Why?' }, mai);
    expect(items[0].note).toBe('Why?');
    expect(applyChange(items, { type: 'remove', id: 'h1' }, mai)).toEqual([]);
  });

  it('sets the author from who saves, ignoring the author sent (FR-011)', () => {
    const items = applyChange([], { type: 'add', highlight: H('h1', { author: { login: 'someone-else' } }) }, mai);
    expect(items[0].author).toEqual(mai);
  });

  it('only lets the author change or remove a highlight', () => {
    const items = [H('h1')];
    expect(() => applyChange(items, { type: 'remove', id: 'h1' }, lan)).toThrow('Only mai can change this highlight.');
    expect(() => applyChange(items, { type: 'update', id: 'h1', note: 'x' }, lan)).toThrow('Only mai');
    const local = [H('h2', { author: { name: 'Mai', local: true } })];
    expect(() => applyChange(local, { type: 'remove', id: 'h2' }, { name: 'Lan', local: true })).toThrow('Only Mai');
    expect(applyChange(local, { type: 'remove', id: 'h2' }, { name: 'Mai', local: true })).toEqual([]);
  });

  it('refuses changes to a highlight that is gone, and long notes', () => {
    expect(() => applyChange([], { type: 'update', id: 'x', note: 'n' }, mai)).toThrow('removed by someone else');
    expect(() => applyChange([], { type: 'add', highlight: H('h1', { note: 'x'.repeat(MAX_NOTE + 1) }) }, mai)).toThrow(`limited to ${MAX_NOTE}`);
  });
});

describe('serialize and commit message', () => {
  it('sorts by creation, indents 2, ends with a newline, and keeps an empty file', () => {
    const text = serializeHighlights([H('h2'), H('h1')]);
    expect(text.endsWith('\n')).toBe(true);
    expect(text).toContain('\n  "highlights": [');
    expect(JSON.parse(text).highlights.map((h: Highlight) => h.id)).toEqual(['h1', 'h2']);
    expect(serializeHighlights(applyChange([H('h1')], { type: 'remove', id: 'h1' }, mai))).toBe('{\n  "version": 1,\n  "highlights": []\n}\n');
  });

  it('describes the change and ends with [skip ci] (FR-010)', () => {
    expect(commitMessage({ type: 'add', highlight: H('h1') }, [], 'mai')).toBe('mai highlighted on Specify: "the cap applies daily" [skip ci]');
    expect(commitMessage({ type: 'add', highlight: H('h1', { note: 'n' }) }, [], 'mai')).toMatch(/^mai noted on Specify/);
    expect(commitMessage({ type: 'update', id: 'h1', color: 'b' }, [H('h1')], 'mai')).toMatch(/recoloured.*\[skip ci\]$/);
    expect(commitMessage({ type: 'remove', id: 'h1' }, [H('h1', { quote: 'x'.repeat(100) })], 'mai')).toBe(`mai removed a highlight on Specify: "${'x'.repeat(60)}" [skip ci]`);
  });
});

describe('saveHighlight with a fake GitHub', () => {
  afterEach(() => vi.unstubAllGlobals());
  const src = { owner: 'o', repo: 'r', token: 't' };
  const path = 'specs/010-x/highlights.json';
  const setup = (repo: FakeRepo = {}) => { const r: FakeRepo = { specs: {}, ...repo }; const calls = fakeGitHub({ 'o/r': r }); return { r, calls }; };

  it('creates the file with one commit on the viewed branch, then updates it with the read sha', async () => {
    const { r, calls } = setup();
    const a = await saveHighlight(src, { slug: '010-x', branch: 'feat/010-x', change: { type: 'add', highlight: H('h1') }, user: 'mai' });
    expect(a.items).toHaveLength(1);
    expect(a.commit.url).toContain('/commit/');
    await saveHighlight(src, { slug: '010-x', branch: 'feat/010-x', change: { type: 'add', highlight: H('h2') }, user: 'mai' });
    const puts = calls.filter(c => c.method === 'PUT');
    expect(puts).toHaveLength(2);
    expect(puts[0].body!.sha).toBeUndefined();
    expect(puts[1].body!.sha).toMatch(/^blob-/);
    expect(r.commits!.map(c => [c.branch, c.path])).toEqual([['feat/010-x', path], ['feat/010-x', path]]);
    expect(r.commits!.every(c => c.message.endsWith('[skip ci]'))).toBe(true);
    expect(JSON.parse(r.files!['feat/010-x'][path]).highlights).toHaveLength(2);
    expect(calls.filter(c => c.method !== 'GET').every(c => c.path.endsWith('/contents/' + path))).toBe(true);
  });

  it('re-reads and re-applies after a concurrent commit, so both highlights are kept (FR-012)', async () => {
    let raced = false;
    const { r } = setup({
      beforePut: files => {
        if (raced) return;
        raced = true;
        (files.main ??= {})[path] = serializeHighlights([H('h9', { author: lan })]);
      }
    });
    await saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'add', highlight: H('h1') }, user: 'mai' });
    expect(JSON.parse(r.files!.main[path]).highlights.map((h: Highlight) => h.id).sort()).toEqual(['h1', 'h9']);
  });

  it('gives up after three conflicts with a clear message', async () => {
    let n = 0;
    setup({ beforePut: files => { (files.main ??= {})[path] = serializeHighlights([H('h' + (++n % 10), { author: lan })]); } });
    await expect(saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'add', highlight: H('h1') }, user: 'mai' }))
      .rejects.toThrow('Someone else saved highlights at the same time. Try again.');
  });

  it('explains a refused commit (403/404) and a missing branch (422)', async () => {
    setup({ putStatus: 403 });
    await expect(saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'add', highlight: H('h1') }, user: 'mai' }))
      .rejects.toThrow('Your token cannot commit to main (needs Contents: Read and write), or the branch is protected.');
    vi.unstubAllGlobals();
    setup({ putStatus: 422 });
    await expect(saveHighlight(src, { slug: '010-x', branch: 'gone', change: { type: 'add', highlight: H('h1') }, user: 'mai' }))
      .rejects.toThrow('gone no longer exists, so highlights here are read-only.');
  });

  it('never overwrites a broken file (FR-014)', async () => {
    const { r } = setup({ files: { main: { [path]: '{broken' } } });
    await expect(saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'add', highlight: H('h1') }, user: 'mai' })).rejects.toThrow(/cannot be read/);
    expect(r.files!.main[path]).toBe('{broken');
    expect(r.commits ?? []).toEqual([]);
  });

  it('refuses someone else\'s highlight before writing', async () => {
    const { r } = setup({ files: { main: { [path]: serializeHighlights([H('h1', { author: lan })]) } } });
    await expect(saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'remove', id: 'h1' }, user: 'mai' })).rejects.toThrow('Only lan can change this highlight.');
    expect(r.commits ?? []).toEqual([]);
  });
});



describe('reading highlights with a spec (T010, T030)', () => {
  it('parses highlights.json into the feature, keeps errors, and is empty without a file', async () => {
    const { buildFeature } = await import('../server/project');
    const { buildLocalProject } = await import('../src/project/localProject');
    const ok = buildFeature('010-x', ['spec.md', 'highlights.json'], f => f === 'highlights.json' ? serializeHighlights([H('h1')]) : '# Feature Specification: X', 'c1');
    expect(ok.highlights).toEqual({ items: [H('h1')], error: null });
    const broken = buildFeature('010-x', ['spec.md', 'highlights.json'], f => f === 'highlights.json' ? '{' : '# Feature Specification: X', 'c1');
    expect(broken.highlights!.error).toMatch(/cannot be read/);
    expect(buildFeature('010-x', ['spec.md'], f => f === 'spec.md' ? '# Feature Specification: X' : null, 'c1').highlights).toEqual({ items: [], error: null });
    const local = buildLocalProject('fixture', new Map([
      ['specs/010-x/spec.md', '# Feature Specification: X'],
      ['specs/010-x/highlights.json', serializeHighlights([H('h1', { author: { name: 'Mai', local: true } })])]
    ]));
    expect(local.specs[0].highlights!.items[0].author).toEqual({ name: 'Mai', local: true });
  });
});

describe('POST /api/highlights (T011, T026)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const env = { GITHUB_TOKEN: 't', GITHUB_REPO: 'o/r' };
  const body = { repo: 'o/r', slug: '010-x', branch: 'main', change: { type: 'add', highlight: H('h1', { author: { login: 'forged' } }) } };

  it('commits as the token\'s user, whatever author the page sends', async () => {
    const { route } = await import('../server/routes');
    const r: FakeRepo = { specs: {} };
    fakeGitHub({ 'o/r': r });
    const res = fakeRes();
    await route(fakeReq('POST', {}, body), res, new URL('http://h/api/highlights'), env);
    expect(res.out.status).toBe(200);
    const saved = JSON.parse(r.files!.main['specs/010-x/highlights.json']).highlights[0];
    expect(saved.author).toEqual({ login: 'mai' });
    expect(r.commits![0].message).toMatch(/^mai highlighted/);
  });

  it('takes the four reply and emoji changes, and refuses a change of the wrong shape before any GitHub call (specs/011)', async () => {
    const { route } = await import('../server/routes');
    const r: FakeRepo = { specs: {}, files: { main: { 'specs/010-x/highlights.json': serializeHighlights([H('h1', { note: 'n' })]) } } };
    const calls = fakeGitHub({ 'o/r': r });
    const post = async (change: unknown) => { const res = fakeRes(); await route(fakeReq('POST', {}, { ...body, change }), res, new URL('http://h/api/highlights'), env); return res.out; };
    expect((await post({ type: 'reply', id: 'h1', reply: { id: 'r_1', text: 'hello' } })).status).toBe(200);
    expect((await post({ type: 'react', id: 'h1', emoji: '👍', on: true })).status).toBe(200);
    expect((await post({ type: 'reply-edit', id: 'h1', replyId: 'r_1', text: 'hello again' })).status).toBe(200);
    expect((await post({ type: 'reply-remove', id: 'h1', replyId: 'r_1' })).status).toBe(200);
    const saved = JSON.parse(r.files!.main['specs/010-x/highlights.json']);
    expect(saved.version).toBe(2);
    expect(saved.highlights[0].replies ?? []).toEqual([]);
    expect(saved.highlights[0].reactions).toEqual([{ emoji: '👍', author: { login: 'mai' } }]);
    const before = calls.length;
    for (const bad of [{ type: 'reply', id: 'h1' }, { type: 'reply', id: 'h1', reply: { id: 'r', text: 'x'.repeat(5000) } }, { type: 'react', id: 'h1', emoji: '👍', on: 'yes' }, { type: 'react', id: 7, emoji: '👍', on: true }, { type: 'reply-remove', id: 'h1' }, { type: 'nope' }]) {
      const out = await post(bad);
      expect(out.status, JSON.stringify(bad)).toBe(400);
      expect(JSON.parse(out.body).error).toMatch(/reply \| reply-edit \| reply-remove \| react/);
    }
    expect(calls.length).toBe(before);
  });

  it('refuses another origin before any GitHub call', async () => {
    const { route } = await import('../server/routes');
    const calls = fakeGitHub({ 'o/r': { specs: {} } });
    const res = fakeRes();
    await route(fakeReq('POST', { origin: 'https://evil.example' }, body), res, new URL('http://h/api/highlights'), env);
    expect(res.out.status).toBe(403);
    expect(calls).toEqual([]);
  });

  it('returns the refusal as is', async () => {
    const { route } = await import('../server/routes');
    fakeGitHub({ 'o/r': { specs: {}, putStatus: 403 } });
    const res = fakeRes();
    await route(fakeReq('POST', {}, body), res, new URL('http://h/api/highlights'), env);
    expect(res.out.status).toBe(403);
    expect(JSON.parse(res.out.body).error).toMatch(/needs Contents: Read and write/);
  });
});

describe('localFileStore with a fake folder (T031, FR-016)', () => {
  type Dir = { kind: 'directory'; name: string; children: Map<string, Dir | File_> } & Record<string, unknown>;
  type File_ = { kind: 'file'; text: string } & Record<string, unknown>;
  const writes: string[] = [];
  const file = (path: string, text = ''): File_ => {
    const f: File_ = {
      kind: 'file', text,
      getFile: async () => ({ text: async () => f.text }),
      createWritable: async () => { let buf = ''; return { write: async (s: string) => { buf += s; }, close: async () => { f.text = buf; writes.push(path); } }; }
    };
    return f;
  };
  const dir = (name: string, path: string, grant: 'granted' | 'denied'): Dir => {
    const d: Dir = {
      kind: 'directory', name, children: new Map(),
      entries: async function* () { yield* d.children; },
      queryPermission: async () => 'prompt',
      requestPermission: async () => grant,
      getDirectoryHandle: async (n: string) => { const c = d.children.get(n); if (c?.kind !== 'directory') throw new Error('NotFoundError'); return c; },
      getFileHandle: async (n: string, o?: { create?: boolean }) => {
        let c = d.children.get(n);
        if (!c && o?.create) d.children.set(n, c = file(`${path}/${n}`));
        if (c?.kind !== 'file') throw new Error('NotFoundError');
        return c;
      }
    };
    return d;
  };
  const tree = (grant: 'granted' | 'denied' = 'granted') => {
    const root = dir('fixture', '', grant), specs = dir('specs', 'specs', grant), spec = dir('010-x', 'specs/010-x', grant);
    root.children.set('specs', specs); specs.children.set('010-x', spec); spec.children.set('spec.md', file('specs/010-x/spec.md', '# Spec'));
    return { root, spec };
  };
  const me = { name: 'Mai', local: true as const };
  afterEach(() => { writes.length = 0; });

  it('writes only specs/{slug}/highlights.json, creating it on the first save', async () => {
    const { localFileStore } = await import('../src/annotations/store');
    const { root, spec } = tree();
    const store = localFileStore(root as never);
    expect(store.readOnly).toBeNull();
    const r = await store.save({ slug: '010-x', branch: null }, { type: 'add', highlight: H('h1', { author: me }) }, me);
    expect(r.items.map(h => h.id)).toEqual(['h1']);
    await store.save({ slug: '010-x', branch: null }, { type: 'update', id: 'h1', note: 'check' }, me);
    expect(writes).toEqual(['specs/010-x/highlights.json', 'specs/010-x/highlights.json']);
    expect(parseHighlights((spec.children.get('highlights.json') as File_).text).items[0]).toMatchObject({ id: 'h1', note: 'check', author: me });
    expect((spec.children.get('spec.md') as File_).text).toBe('# Spec');
  });

  it('stays read-only without write handles, and writes nothing when write access is refused', async () => {
    const { localFileStore } = await import('../src/annotations/store');
    const msg = 'This folder was opened read-only. Choose it again with write access to save highlights.';
    expect(localFileStore(null).readOnly).toBe(msg);
    const { root } = tree('denied');
    await expect(localFileStore(root as never).save({ slug: '010-x', branch: null }, { type: 'add', highlight: H('h1', { author: me }) }, me)).rejects.toThrow(msg);
    expect(writes).toEqual([]);
  });

  it('keeps the author rule locally', async () => {
    const { localFileStore } = await import('../src/annotations/store');
    const { root } = tree();
    const store = localFileStore(root as never);
    await store.save({ slug: '010-x', branch: null }, { type: 'add', highlight: H('h1', { author: me }) }, me);
    await expect(store.save({ slug: '010-x', branch: null }, { type: 'remove', id: 'h1' }, { name: 'Lan', local: true })).rejects.toThrow('Only Mai');
  });
});

describe('readHighlights, a conditional read of highlights.json (spec 012 FR-014, research R15)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const src = { owner: 'o', repo: 'r', token: 't' };
  const path = 'specs/010-x/highlights.json';
  const withFile = (text?: string) => { const r: FakeRepo = { specs: {}, files: text === undefined ? {} : { main: { [path]: text } } }; return { r, calls: fakeGitHub({ 'o/r': r }) }; };

  it('reads the items and the etag of the file on the branch', async () => {
    withFile(serializeHighlights([H('h1', { note: 'Why?' })]));
    const r = await readHighlights(src, { slug: '010-x', branch: 'main' });
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(r.items.map(h => h.id)).toEqual(['h1']);
    expect(r.error).toBeNull();
    expect(r.etag).toMatch(/^"blob-/);
  });

  it('says unchanged, with no body to read, when the etag still matches, and sends it as If-None-Match', async () => {
    const { calls } = withFile(serializeHighlights([H('h1')]));
    const first = await readHighlights(src, { slug: '010-x', branch: 'main' });
    if (first.status !== 'ok') throw new Error('expected ok');
    const again = await readHighlights(src, { slug: '010-x', branch: 'main', etag: first.etag });
    expect(again).toEqual({ status: 'unchanged' });
    expect(calls.at(-1)!.ifNoneMatch).toBe(first.etag);
    expect(calls[0].ifNoneMatch).toBeNull();
  });

  it('reads the file again when somebody changed it', async () => {
    const { r } = withFile(serializeHighlights([H('h1')]));
    const first = await readHighlights(src, { slug: '010-x', branch: 'main' });
    if (first.status !== 'ok') throw new Error('expected ok');
    r.files!.main[path] = serializeHighlights([H('h1'), H('h2', { note: 'new' })]);
    const next = await readHighlights(src, { slug: '010-x', branch: 'main', etag: first.etag });
    expect(next.status).toBe('ok');
    if (next.status === 'ok') expect(next.items.map(h => h.id)).toEqual(['h1', 'h2']);
  });

  it('reads a spec with no file as no highlights', async () => {
    withFile();
    expect(await readHighlights(src, { slug: '010-x', branch: 'main' })).toEqual({ status: 'ok', items: [], error: null, etag: null });
  });

  it('reports a broken file instead of pretending, and keeps what it could read', async () => {
    withFile('{ nope');
    const r = await readHighlights(src, { slug: '010-x', branch: 'main' });
    expect(r.status === 'ok' && r.error).toMatch(/cannot be read/);
  });

  it.each([[401, /rejected the token/], [403, /refused/], [429, /rate limit/]])('throws GitHub\'s %i as it is, for the caller to back off', async (status, msg) => {
    fakeGitHub({ 'o/r': { specs: {} } }, u => u.pathname.includes('/contents/specs/') ? new Response('{}', { status, headers: status === 403 ? { 'x-ratelimit-remaining': '10' } : {} }) : undefined as unknown as Response);
    const err = await readHighlights(src, { slug: '010-x', branch: 'main' }).catch(e => e);
    expect(err).toBeInstanceOf(GitHubError);
    expect((err as GitHubError).status).toBe(status);
    expect((err as GitHubError).message).toMatch(msg);
  });
});

describe('GET /api/highlights (spec 012, contracts/refresh-api.md)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const env = { GITHUB_TOKEN: 'secret-token', GITHUB_REPO: 'o/r' };
  const url = 'http://h/api/highlights?repo=o/r&slug=010-x&branch=main';
  const path = 'specs/010-x/highlights.json';
  const get = async (u = url, headers: Record<string, string> = {}, method = 'GET') => {
    const { route } = await import('../server/routes');
    const res = fakeRes();
    await route(fakeReq(method, headers), res, new URL(u), env);
    return res.out;
  };

  it('answers with the items and the etag', async () => {
    fakeGitHub({ 'o/r': { specs: {}, files: { main: { [path]: serializeHighlights([H('h1', { note: 'Why?' })]) } } } });
    const out = await get();
    expect(out.status).toBe(200);
    const body = JSON.parse(out.body);
    expect(body.items.map((h: Highlight) => h.id)).toEqual(['h1']);
    expect(body.error).toBeNull();
    expect(body.etag).toMatch(/^"blob-/);
  });

  it('answers 304 with no body when If-None-Match matches, and passes it on to GitHub', async () => {
    const calls = fakeGitHub({ 'o/r': { specs: {}, files: { main: { [path]: serializeHighlights([H('h1')]) } } } });
    const etag = JSON.parse((await get()).body).etag;
    const out = await get(url, { 'if-none-match': etag });
    expect(out.status).toBe(304);
    expect(out.body).toBe('');
    expect(calls.at(-1)!.ifNoneMatch).toBe(etag);
  });

  it('answers an empty list for a spec with no file', async () => {
    fakeGitHub({ 'o/r': { specs: {} } });
    const out = await get();
    expect(out.status).toBe(200);
    expect(JSON.parse(out.body)).toEqual({ items: [], error: null, etag: null });
  });

  it('asks for repo, slug and branch, and checks the slug', async () => {
    fakeGitHub({ 'o/r': { specs: {} } });
    expect((await get('http://h/api/highlights?repo=o/r&slug=010-x')).status).toBe(400);
    expect((await get('http://h/api/highlights?repo=o/r&branch=main')).status).toBe(400);
    expect((await get('http://h/api/highlights?repo=o/r&slug=../etc&branch=main')).status).toBe(400);
  });

  it('refuses other methods, but still takes the POST that saves', async () => {
    fakeGitHub({ 'o/r': { specs: {} } });
    expect((await get(url, {}, 'PUT')).status).toBe(405);
    expect((await get(url, {}, 'DELETE')).status).toBe(405);
  });

  it('never puts the token or GitHub\'s own error text in the answer', async () => {
    fakeGitHub({ 'o/r': { specs: {} } }, u => u.pathname.includes('/contents/specs/') ? new Response('{"message":"Bad credentials: secret-token"}', { status: 403 }) : undefined as unknown as Response);
    const out = await get();
    expect(out.status).toBe(403);
    expect(out.body).not.toContain('secret-token');
    expect(out.body).not.toContain('Bad credentials');
  });
});


// ---- Replies and emoji (specs/011-replies-reactions) ----

const R = (id: string, over: Record<string, unknown> = {}) => ({ id, author: lan, createdAt: '2026-10-22T09:10:00.000Z', text: 'Because the cap is per day.', ...over });
const NOW = '2026-10-22T10:00:00.000Z';
const file = (highlights: unknown[], version = 2) => JSON.stringify({ version, highlights });

describe('replies and emoji in the file (contracts/highlights-file.md)', () => {
  it('reads version 1 and 2, replies, and emoji on the comment and on a reply', () => {
    const r = parseHighlights(file([H('h1', { note: 'Why?', reactions: [{ emoji: '👍', author: lan }], replies: [R('r_1', { reactions: [{ emoji: '🎉', author: mai }] })] } as never)]));
    expect(r.error).toBeNull();
    expect(r.items[0].replies![0]).toMatchObject({ id: 'r_1', text: 'Because the cap is per day.', reactions: [{ emoji: '🎉', author: mai }] });
    expect(r.items[0].reactions).toEqual([{ emoji: '👍', author: lan }]);
  });

  it('treats missing or non-array replies and reactions as none', () => {
    const r = parseHighlights(file([H('h1', { replies: 'x', reactions: 5 } as never)], 1));
    expect(r.error).toBeNull();
    expect(r.items[0].replies).toBeUndefined();
    expect(r.items[0].reactions).toBeUndefined();
  });

  it('ignores an emoji outside the set, a reaction without a readable author, and counts a person once (FR-013)', () => {
    const r = parseHighlights(file([H('h1', { reactions: [{ emoji: '🦄', author: lan }, { emoji: '👍' }, { emoji: '👍', author: lan }, { emoji: '👍', author: lan }, { emoji: '👍', author: { name: 'lan', local: true } }] } as never)]));
    expect(r.error).toBeNull();
    expect(r.items[0].reactions).toEqual([{ emoji: '👍', author: lan }, { emoji: '👍', author: { name: 'lan', local: true } }]);
  });

  it('blocks writing when a reply cannot be read, so it is not lost on the next save (FR-014)', () => {
    const r = parseHighlights(file([H('h1', { replies: [R('r_1'), { id: 'r_2' }, R('r_3', { text: 'x'.repeat(MAX_REPLY + 1) })] } as never)]));
    expect(r.items[0].replies!.map(x => x.id)).toEqual(['r_1']);
    expect(r.error).toMatch(/^2 replies in highlights.json could not be read/);
    expect(parseHighlights(file([H('h1', { replies: [{ id: 'bad' }] } as never)])).error).toMatch(/^1 reply in/);
  });

  it('writes version 1 while nothing has a reply or an emoji, and version 2 as soon as one does (R1)', () => {
    expect(JSON.parse(serializeHighlights([H('h1')])).version).toBe(1);
    expect(JSON.parse(serializeHighlights([H('h1', { replies: [], reactions: [] })])).version).toBe(1);
    expect(JSON.parse(serializeHighlights([H('h1', { reactions: [{ emoji: '👍', author: lan }] })])).version).toBe(2);
    expect(JSON.parse(serializeHighlights([H('h1'), H('h2', { replies: [R('r_1')] } as never)])).version).toBe(2);
  });

  it('writes a file from before this spec back byte for byte', () => {
    const old = serializeHighlights([H('h1', { note: 'n' }), H('h2')]);
    expect(serializeHighlights(parseHighlights(old).items)).toBe(old);
    expect(old).not.toContain('replies');
    expect(old).not.toContain('reactions');
  });

  it('orders replies by time then id and emoji by the set then by name, and leaves empty lists out', () => {
    const out = JSON.parse(serializeHighlights([H('h1', {
      reactions: [{ emoji: '🎉', author: mai }, { emoji: '👍', author: mai }, { emoji: '👍', author: lan }],
      replies: [R('r_b', { createdAt: '2026-10-22T09:30:00.000Z' }), R('r_a', { createdAt: '2026-10-22T09:30:00.000Z' }), R('r_0', { createdAt: '2026-10-22T09:00:00.000Z', reactions: [] })]
    } as never)])).highlights[0];
    expect(out.replies.map((r: { id: string }) => r.id)).toEqual(['r_0', 'r_a', 'r_b']);
    expect(out.replies[0]).not.toHaveProperty('reactions');
    expect(out.reactions.map((r: { emoji: string; author: { login: string } }) => r.emoji + r.author.login)).toEqual(['👍lan', '👍mai', '🎉mai']);
  });

  it('round trips through parse', () => {
    const items = [H('h1', { note: 'Why?', reactions: [{ emoji: '❤️', author: mai }], replies: [R('r_1', { editedAt: '2026-10-22T09:20:00.000Z', reactions: [{ emoji: '😕', author: mai }] })] } as never)];
    expect(parseHighlights(serializeHighlights(items)).items).toEqual(items);
  });

  it('an older build that knows only version 1 refuses the file instead of dropping what it does not know (R1)', () => {
    const v1Only = (text: string) => { const o = JSON.parse(text); return o.version !== 1 ? 'unknown format' : 'ok'; };
    expect(v1Only(serializeHighlights([H('h1', { reactions: [{ emoji: '👍', author: lan }] })]))).toBe('unknown format');
    expect(v1Only(serializeHighlights([H('h1')]))).toBe('ok');
  });

  it('keeps the emoji set small and fixed', () => {
    expect(EMOJI).toEqual(['👍', '❤️', '😄', '🎉', '😕', '👀']);
  });
});

describe('applyChange for replies and emoji (data-model.md, research R3, R4, R12)', () => {
  const base = () => [H('h1', { note: 'Why daily?' })];

  it('lets anyone who can save reply, setting the writer and the time themselves', () => {
    const out = applyChange(base(), { type: 'reply', id: 'h1', reply: { id: 'r_1', text: '  Because.  ', author: mai, createdAt: '1999-01-01T00:00:00.000Z' } as never }, lan, NOW);
    expect(out[0].replies).toEqual([{ id: 'r_1', author: lan, createdAt: NOW, text: 'Because.' }]);
    expect(out[0].updatedAt).toBe(NOW);
  });

  it('ignores a reply sent again with the same id', () => {
    const once = applyChange(base(), { type: 'reply', id: 'h1', reply: { id: 'r_1', text: 'a' } }, lan, NOW);
    expect(applyChange(once, { type: 'reply', id: 'h1', reply: { id: 'r_1', text: 'a' } }, lan, '2026-10-22T11:00:00.000Z')).toBe(once);
  });

  it('refuses an empty reply, one that is too long, and one without an id', () => {
    for (const text of ['', '   \n ']) expect(() => applyChange(base(), { type: 'reply', id: 'h1', reply: { id: 'r_1', text } }, lan)).toThrow(/Write a reply first/);
    expect(() => applyChange(base(), { type: 'reply', id: 'h1', reply: { id: 'r_1', text: 'x'.repeat(MAX_REPLY + 1) } }, lan)).toThrow(/limited to 2000/);
    expect(() => applyChange(base(), { type: 'reply', id: 'h1', reply: { id: '', text: 'a' } }, lan)).toThrow(/incomplete/);
    expect(applyChange(base(), { type: 'reply', id: 'h1', reply: { id: 'r_1', text: 'x'.repeat(MAX_REPLY) } }, lan)[0].replies).toHaveLength(1);
  });

  it('refuses a reply to a comment that is gone', () => {
    expect(() => applyChange(base(), { type: 'reply', id: 'nope', reply: { id: 'r_1', text: 'a' } }, lan)).toThrow(/removed by someone else/);
  });

  it('lets only the writer edit or remove their reply, even the comment\'s author cannot', () => {
    const withReply = [H('h1', { note: 'n', replies: [R('r_1')] } as never)];
    expect(() => applyChange(withReply, { type: 'reply-edit', id: 'h1', replyId: 'r_1', text: 'mine now' }, mai)).toThrow(/Only lan can change this reply/);
    expect(() => applyChange(withReply, { type: 'reply-remove', id: 'h1', replyId: 'r_1' }, mai)).toThrow(/Only lan/);
    try { applyChange(withReply, { type: 'reply-remove', id: 'h1', replyId: 'r_1' }, mai); } catch (e) { expect((e as { status: number }).status).toBe(403); }
    const edited = applyChange(withReply, { type: 'reply-edit', id: 'h1', replyId: 'r_1', text: ' better ' }, lan, NOW);
    expect(edited[0].replies![0]).toMatchObject({ text: 'better', editedAt: NOW, author: lan });
    expect(edited[0].updatedAt).toBe(NOW);
    expect(applyChange(withReply, { type: 'reply-remove', id: 'h1', replyId: 'r_1' }, lan, NOW)[0].replies).toEqual([]);
  });

  it('treats a login and a typed name as different people', () => {
    const withReply = [H('h1', { note: 'n', replies: [R('r_1', { author: { name: 'lan', local: true } })] } as never)];
    expect(() => applyChange(withReply, { type: 'reply-edit', id: 'h1', replyId: 'r_1', text: 'x' }, lan)).toThrow(/Only lan/);
  });

  it('refuses to change a reply that is gone', () => {
    expect(() => applyChange(base(), { type: 'reply-edit', id: 'h1', replyId: 'r_9', text: 'x' }, lan)).toThrow(/reply was removed/);
    expect(() => applyChange(base(), { type: 'reply-remove', id: 'h1', replyId: 'r_9' }, lan)).toThrow(/reply was removed/);
  });

  it('sets and clears an emoji for whoever saves, never for somebody else, and is safe to send twice', () => {
    const on = applyChange(base(), { type: 'react', id: 'h1', emoji: '👍', on: true }, lan, NOW);
    expect(on[0].reactions).toEqual([{ emoji: '👍', author: lan }]);
    expect(on[0].updatedAt).toBe(NOW);
    expect(applyChange(on, { type: 'react', id: 'h1', emoji: '👍', on: true }, lan, '2026-10-22T11:00:00.000Z')).toBe(on);
    const two = applyChange(on, { type: 'react', id: 'h1', emoji: '👍', on: true }, mai);
    expect(two[0].reactions).toHaveLength(2);
    const off = applyChange(two, { type: 'react', id: 'h1', emoji: '👍', on: false }, lan, NOW);
    expect(off[0].reactions).toEqual([{ emoji: '👍', author: mai }]);
    expect(applyChange(off, { type: 'react', id: 'h1', emoji: '👍', on: false }, lan)).toBe(off);
    expect(applyChange(base(), { type: 'react', id: 'h1', emoji: '👍', on: false }, lan)).toEqual(base());
  });

  it('puts an emoji on a reply, and refuses an emoji outside the set or a reply that is gone', () => {
    const withReply = [H('h1', { note: 'n', replies: [R('r_1')] } as never)];
    const out = applyChange(withReply, { type: 'react', id: 'h1', replyId: 'r_1', emoji: '🎉', on: true }, mai, NOW);
    expect(out[0].replies![0].reactions).toEqual([{ emoji: '🎉', author: mai }]);
    expect(out[0].reactions).toBeUndefined();
    expect(() => applyChange(withReply, { type: 'react', id: 'h1', emoji: '🦄', on: true }, mai)).toThrow(/Unknown emoji/);
    expect(() => applyChange(withReply, { type: 'react', id: 'h1', replyId: 'r_9', emoji: '🎉', on: true }, mai)).toThrow(/reply was removed/);
    expect(() => applyChange(withReply, { type: 'react', id: 'nope', emoji: '🎉', on: true }, mai)).toThrow(/removed by someone else/);
  });

  it('drops replies and emoji a client sends inside a new comment (R12)', () => {
    const forged = { ...H('h2', { note: 'new' }), replies: [R('r_x', { author: mai })], reactions: [{ emoji: '👍', author: mai }] } as never;
    const out = applyChange([], { type: 'add', highlight: forged }, lan);
    expect(out[0].replies).toBeUndefined();
    expect(out[0].reactions).toBeUndefined();
    expect(out[0].author).toEqual(lan);
  });

  it('removes the replies and emoji with the comment, and only its author may', () => {
    const items = [H('h1', { note: 'n', replies: [R('r_1')], reactions: [{ emoji: '👍', author: lan }] } as never)];
    expect(() => applyChange(items, { type: 'remove', id: 'h1' }, lan)).toThrow(/Only mai/);
    expect(applyChange(items, { type: 'remove', id: 'h1' }, mai)).toEqual([]);
  });

  it('keeps changing the note or colour to the author alone, as before', () => {
    const items = [H('h1', { note: 'n', replies: [R('r_1')] } as never)];
    expect(() => applyChange(items, { type: 'update', id: 'h1', note: 'x' }, lan)).toThrow(/Only mai/);
    expect(applyChange(items, { type: 'update', id: 'h1', color: 'p' }, mai)[0].replies).toHaveLength(1);
  });
});

describe('commit messages for replies and emoji (contracts/save-change-api.md)', () => {
  const items = [H('h1', { note: 'n' })];
  it('names what was done and ends with [skip ci]', () => {
    const m = (c: never) => commitMessage(c, items, 'lan');
    expect(m({ type: 'reply', id: 'h1', reply: { id: 'r', text: 'a' } } as never)).toBe('lan replied on Specify: "the cap applies daily" [skip ci]');
    expect(m({ type: 'reply-edit', id: 'h1', replyId: 'r', text: 'a' } as never)).toBe('lan edited a reply on Specify: "the cap applies daily" [skip ci]');
    expect(m({ type: 'reply-remove', id: 'h1', replyId: 'r' } as never)).toBe('lan removed a reply on Specify: "the cap applies daily" [skip ci]');
    expect(m({ type: 'react', id: 'h1', emoji: '👍', on: true } as never)).toBe('lan reacted 👍 on Specify: "the cap applies daily" [skip ci]');
    expect(m({ type: 'react', id: 'h1', emoji: '👍', on: false } as never)).toBe('lan removed a reaction on Specify: "the cap applies daily" [skip ci]');
  });
});

describe('saving replies and emoji through a fake GitHub (FR-008, FR-009, SC-002, SC-003)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const src = { owner: 'o', repo: 'r', token: 't' };
  const path = 'specs/010-x/highlights.json';
  const seed = serializeHighlights([H('h1', { note: 'Why daily?' })]);

  it('makes one commit that changes only highlights.json, and writes version 2', async () => {
    const r: FakeRepo = { specs: {}, files: { main: { [path]: seed } } };
    const calls = fakeGitHub({ 'o/r': r });
    const out = await saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'reply', id: 'h1', reply: { id: 'r_1', text: 'Because.' } }, user: 'lan' });
    expect(out.items[0].replies![0]).toMatchObject({ author: { login: 'lan' }, text: 'Because.' });
    expect(r.commits).toHaveLength(1);
    expect(r.commits![0].path).toBe(path);
    expect(r.commits![0].message).toBe('lan replied on Specify: "the cap applies daily" [skip ci]');
    expect(JSON.parse(r.files!.main[path]).version).toBe(2);
    expect(calls.filter(c => c.method !== 'GET').every(c => c.path.endsWith('/contents/' + path))).toBe(true);
  });

  it('keeps both replies when two people reply at once (the second save re-reads and re-applies)', async () => {
    let raced = false;
    const r: FakeRepo = {
      specs: {}, files: { main: { [path]: seed } },
      beforePut: files => {
        if (raced) return;
        raced = true;
        files.main[path] = serializeHighlights(applyChange(parseHighlights(files.main[path]).items, { type: 'reply', id: 'h1', reply: { id: 'r_lan', text: 'from lan' } }, lan));
      }
    };
    fakeGitHub({ 'o/r': r });
    await saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'reply', id: 'h1', reply: { id: 'r_mai', text: 'from mai' } }, user: 'mai' });
    const replies = JSON.parse(r.files!.main[path]).highlights[0].replies.map((x: { id: string }) => x.id).sort();
    expect(replies).toEqual(['r_lan', 'r_mai']);
  });

  it('counts both when two people react with the same emoji at once, and a person once when they send it twice', async () => {
    let raced = false;
    const r: FakeRepo = {
      specs: {}, files: { main: { [path]: seed } },
      beforePut: files => {
        if (raced) return;
        raced = true;
        files.main[path] = serializeHighlights(applyChange(parseHighlights(files.main[path]).items, { type: 'react', id: 'h1', emoji: '👍', on: true }, lan));
      }
    };
    fakeGitHub({ 'o/r': r });
    const change = { type: 'react', id: 'h1', emoji: '👍', on: true } as const;
    await saveHighlight(src, { slug: '010-x', branch: 'main', change, user: 'mai' });
    await saveHighlight(src, { slug: '010-x', branch: 'main', change, user: 'mai' });
    expect(JSON.parse(r.files!.main[path]).highlights[0].reactions).toHaveLength(2);
  });

  it('refuses a reply to a comment somebody deleted meanwhile, before writing', async () => {
    const r: FakeRepo = { specs: {}, files: { main: { [path]: seed } } };
    fakeGitHub({ 'o/r': r });
    await expect(saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'reply', id: 'gone', reply: { id: 'r_1', text: 'a' } }, user: 'lan' })).rejects.toThrow(/removed by someone else/);
    expect(r.commits ?? []).toHaveLength(0);
  });

  it('refuses to add more once the file is past its size limit (010 FR-013), replies included', async () => {
    const big = serializeHighlights(Array.from({ length: 8 }, (_, i) => H('h' + i, { note: 'n', replies: Array.from({ length: 40 }, (_, k) => R('r_' + i + '_' + k, { text: 'x'.repeat(2000) })) } as never)));
    const r: FakeRepo = { specs: {}, files: { main: { [path]: big } } };
    fakeGitHub({ 'o/r': r });
    await expect(saveHighlight(src, { slug: '010-x', branch: 'main', change: { type: 'reply', id: 'h0', reply: { id: 'r_new', text: 'one more' } }, user: 'lan' })).rejects.toThrow(/too many highlights/);
  });
});
