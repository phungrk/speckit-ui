// The store that queues instead of committing (specs/016-deferred-save). Synthetic data only.
import { describe, expect, it, vi } from 'vitest';
import { deferredStore, localFileStore, demoStore, gitHubStore, type HighlightStore } from '../src/annotations/store';
import type { Highlight, HighlightChange } from '../src/project/types';

const mai = { login: 'mai' }, lan = { login: 'lan' };
const H = (id: string, over: Partial<Highlight> = {}): Highlight => ({
  id, phase: 'specify', doc: 'spec.md', quote: 'the cap applies daily', prefix: '', suffix: '', startHint: 0, docSha: null, color: 'o', note: 'A note',
  author: mai, createdAt: '2026-10-21T08:30:00.000Z', updatedAt: '2026-10-21T08:30:00.000Z', ...over
});
const target = { slug: '010-x', branch: 'main' };
const inner = (over: Partial<HighlightStore> = {}): HighlightStore => ({ kind: 'github', readOnly: null, save: vi.fn(async () => { throw new Error('must not commit'); }), ...over });
const queue = (view: Highlight[], saved: Highlight[] = view, full = false) => {
  const added: [HighlightChange, unknown][] = [];
  return { added, q: { view: () => view, saved: () => saved, add: (c: HighlightChange, by: unknown) => { if (full) return false; added.push([c, by]); return true; } } };
};

describe('deferredStore', () => {
  it('queues the change and never saves through the inner store', async () => {
    const i = inner();
    const { added, q } = queue([H('h1')]);
    const out = await deferredStore(i, q).save(target, { type: 'react', id: 'h1', emoji: '👍', on: true }, mai);
    expect(i.save).not.toHaveBeenCalled();
    expect(added).toEqual([[{ type: 'react', id: 'h1', emoji: '👍', on: true }, mai]]);
    expect(out.commit).toBeUndefined();
  });

  it('answers with the saved highlights, not the queue on top of them', async () => {
    const saved = [H('h1')];
    const { q } = queue([...saved, H('h2')], saved);
    const out = await deferredStore(inner(), q).save(target, { type: 'react', id: 'h1', emoji: '👍', on: true }, mai);
    expect(out.items).toBe(saved);
  });

  it('tells at once a change that would be refused, and queues nothing', async () => {
    const { added, q } = queue([H('h1', { author: lan })]);
    const s = deferredStore(inner(), q);
    await expect(s.save(target, { type: 'update', id: 'h1', note: 'x' }, mai)).rejects.toThrow('Only lan can change this highlight.');
    await expect(s.save(target, { type: 'reply', id: 'gone', reply: { id: 'r', text: 'x' } }, mai)).rejects.toThrow(/removed by someone else/);
    await expect(s.save(target, { type: 'update', id: 'h1', note: 'x'.repeat(3000) }, lan)).rejects.toThrow(/limited to/);
    expect(added).toEqual([]);
  });

  it('checks against what is on the screen, so a change on a comment that waits in the queue is allowed', async () => {
    const { added, q } = queue([H('n1')], []);
    await deferredStore(inner(), q).save(target, { type: 'reply', id: 'n1', reply: { id: 'r', text: 'x' } }, mai);
    expect(added).toHaveLength(1);
  });

  it('says so when the queue is full', async () => {
    const { q } = queue([H('h1')], [H('h1')], true);
    await expect(deferredStore(inner(), q).save(target, { type: 'react', id: 'h1', emoji: '👍', on: true }, mai)).rejects.toThrow(/Too many changes/);
  });

  it('is a deferred GitHub store that follows the inner one for read-only and for reading again', async () => {
    let why: string | null = null;
    const refresh = vi.fn(async () => 'unchanged' as const);
    const base: HighlightStore = { kind: 'github', get readOnly() { return why; }, save: vi.fn(), refresh };
    const s = deferredStore(base, queue([]).q);
    expect(s.kind).toBe('github');
    expect(s.deferred).toBe(true);
    expect(s.readOnly).toBeNull();
    why = 'Read-only token';
    expect(s.readOnly).toBe('Read-only token');
    await s.refresh!(target, 'e1');
    expect(refresh).toHaveBeenCalledWith(target, 'e1');
  });
});

describe('only the deferred store defers (specs/016 FR-012)', () => {
  it('leaves the local folder, the demo and a plain GitHub store saving at once', () => {
    expect(localFileStore(null).deferred).toBeUndefined();
    expect(demoStore({}).deferred).toBeUndefined();
    expect(gitHubStore({ saveHighlight: vi.fn(), saveHighlights: vi.fn(), readHighlights: vi.fn() } as never, 'o/r').deferred).toBeUndefined();
  });
});
