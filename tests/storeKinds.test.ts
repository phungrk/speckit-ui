// Local and demo keep saving at once (specs/016-deferred-save FR-012): only the GitHub workspace queues changes.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (f: string) => readFileSync(f, 'utf8');
const ui = ['src/project/LocalWorkspace.tsx', 'src/project/localRepositoryPersistence.ts'];

describe('who uses the queue', () => {
  it('leaves the local workspace and its folder store out of it', () => {
    for (const f of ui) expect(read(f), f).not.toMatch(/deferredStore|usePending|SaveBar|annotations\/pending/);
  });

  it('is used by the GitHub workspace only, among the workspaces', () => {
    const users = readdirSync('src/project').filter(f => /\.tsx?$/.test(f) && /deferredStore|usePending|<SaveBar/.test(read('src/project/' + f)));
    expect(users).toEqual(['LiveWorkspace.tsx']);
  });

  it('keeps the demo store and the local folder store as they are: they do not know the queue', () => {
    const store = read('src/annotations/store.ts');
    const local = store.slice(store.indexOf('export function localFileStore'), store.indexOf('export const DEMO_KEY'));
    const demo = store.slice(store.indexOf('export function demoStore'));
    for (const part of [local, demo]) expect(part).not.toMatch(/deferred|queue|pending/i);
  });
});
