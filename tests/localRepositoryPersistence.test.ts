import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearLocalRepository,
  loadLocalRepository,
  saveLocalRepository,
  saveLocalView,
  type LocalDirectoryHandle,
  type LocalRepositoryView
} from '../src/project/localRepositoryPersistence';

const databaseValues = new Map<string, unknown>();
let databaseCreated = false;

const request = (result?: unknown) => {
  const value: Record<string, unknown> = { result };
  queueMicrotask(() => (value.onsuccess as (() => void) | undefined)?.());
  return value;
};

const database = {
  objectStoreNames: { contains: () => databaseCreated },
  createObjectStore: () => { databaseCreated = true; },
  close: () => undefined,
  transaction: () => {
    const value: Record<string, unknown> = {
      objectStore: () => ({
      get: (key: string) => {
        const value = { result: undefined as unknown, onsuccess: undefined as (() => void) | undefined };
        queueMicrotask(() => { value.result = databaseValues.get(key); value.onsuccess?.(); });
        return value;
      },
      put: (value: unknown, key: string) => {
        databaseValues.set(key, value);
        return request(key);
      },
      delete: (key: string) => {
        databaseValues.delete(key);
        return request(undefined);
      }
      })
    };
    setTimeout(() => (value.oncomplete as (() => void) | undefined)?.(), 0);
    return value;
  }
};

const fakeIndexedDB = {
  open: () => {
    const value: Record<string, unknown> = { result: database };
    queueMicrotask(() => {
      if (!databaseCreated) (value.onupgradeneeded as (() => void) | undefined)?.();
      (value.onsuccess as (() => void) | undefined)?.();
    });
    return value;
  }
};

const handle = {
  kind: 'directory' as const,
  name: 'fixture-repo',
  entries: async function* () {},
  queryPermission: async () => 'granted' as const,
  requestPermission: async () => 'granted' as const
} satisfies LocalDirectoryHandle;

describe('local repository persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    databaseValues.clear();
    databaseCreated = false;
  });

  it('saves and loads only the selected handle and last-view preference', async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDB);
    const view: LocalRepositoryView = {
      selectedFeatureSlug: '001-first-spec',
      selectedFilePath: 'specs/001-first-spec/plan.md',
      selectedStep: 3,
      selectedDocumentPath: null
    };

    await saveLocalRepository(handle, 'fixture-repo', view);

    expect(await loadLocalRepository()).toEqual({ handle, name: 'fixture-repo', view });
  });

  it('updates the last view without replacing the saved directory', async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDB);
    await saveLocalRepository(handle, 'fixture-repo');
    const view: LocalRepositoryView = {
      selectedFeatureSlug: '002-next-spec',
      selectedFilePath: 'specs/002-next-spec/spec.md',
      selectedStep: 1,
      selectedDocumentPath: null
    };

    await saveLocalView(view);

    expect(await loadLocalRepository()).toEqual({ handle, name: 'fixture-repo', view });
  });

  it('clears the remembered selection and returns null on the next load', async () => {
    vi.stubGlobal('indexedDB', fakeIndexedDB);
    await saveLocalRepository(handle, 'fixture-repo');

    await clearLocalRepository();

    expect(await loadLocalRepository()).toBeNull();
  });
});
