// highlights.json: parse, apply changes and commit through a fake GitHub (specs/010-spec-annotations).
// Synthetic data only; nothing is written to real GitHub (constitution V).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_NOTE, applyChange, commitMessage, parseHighlights, readHighlights, saveHighlight, serializeHighlights } from '../server/highlights';
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
    expect(parseHighlights('{"version":2,"highlights":[]}').error).toMatch(/unknown format/);
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

