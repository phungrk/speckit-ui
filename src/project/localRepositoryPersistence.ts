export type LocalPermissionState = 'granted' | 'denied' | 'prompt';

export interface LocalFileHandle {
  readonly kind: 'file';
  getFile(): Promise<File>;
}

export interface LocalDirectoryHandle {
  readonly kind: 'directory';
  readonly name: string;
  entries(): AsyncIterable<[string, LocalFileHandle | LocalDirectoryHandle]>;
  queryPermission(options: { mode: 'read' }): Promise<LocalPermissionState>;
  requestPermission(options: { mode: 'read' }): Promise<LocalPermissionState>;
}

export interface LocalRepositoryView {
  selectedFeatureSlug: string | null;
  selectedFilePath: string | null;
  selectedStep: number;
  selectedDocumentPath: string | null;
}

export interface SavedLocalRepository {
  handle: LocalDirectoryHandle;
  name: string;
  view: LocalRepositoryView | null;
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options: { mode: 'read' }) => Promise<LocalDirectoryHandle>;
};

const DATABASE_NAME = 'speckit-ui-local-repository';
const DATABASE_VERSION = 1;
const STORE_NAME = 'selection';
const RECORD_KEY = 'last-opened';

export function supportsPersistentDirectoryAccess(): boolean {
  return typeof window !== 'undefined' &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function' &&
    typeof indexedDB !== 'undefined';
}

export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function';
}

export async function chooseLocalDirectory(): Promise<LocalDirectoryHandle> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error('Persistent directory selection is not available in this browser.');
  return picker.call(window, { mode: 'read' });
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Browser storage is unavailable.'));

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open browser storage.'));
    request.onblocked = () => reject(new Error('Browser storage is blocked by another open page.'));
  });
}

async function readRecord(database: IDBDatabase): Promise<SavedLocalRepository | null> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(RECORD_KEY);
    request.onsuccess = () => resolve((request.result as SavedLocalRepository | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read the saved repository.'));
  });
}

async function writeRecord(database: IDBDatabase, record: SavedLocalRepository | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = record ? store.put(record, RECORD_KEY) : store.delete(RECORD_KEY);
    request.onerror = () => reject(request.error ?? new Error('Could not save the repository selection.'));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the repository selection.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving the repository selection was cancelled.'));
  });
}

export async function loadLocalRepository(): Promise<SavedLocalRepository | null> {
  const database = await openDatabase();
  try {
    return await readRecord(database);
  } finally {
    database.close();
  }
}

export async function saveLocalRepository(
  handle: LocalDirectoryHandle,
  name: string,
  view: LocalRepositoryView | null = null
): Promise<void> {
  const database = await openDatabase();
  try {
    await writeRecord(database, { handle, name, view });
  } finally {
    database.close();
  }
}

export async function saveLocalView(view: LocalRepositoryView): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(RECORD_KEY);
      request.onsuccess = () => {
        const saved = request.result as SavedLocalRepository | undefined;
        if (saved) store.put({ ...saved, view }, RECORD_KEY);
      };
      request.onerror = () => reject(request.error ?? new Error('Could not read the saved repository.'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the repository view.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving the repository view was cancelled.'));
    });
  } finally {
    database.close();
  }
}

export async function clearLocalRepository(): Promise<void> {
  const database = await openDatabase();
  try {
    await writeRecord(database, null);
  } finally {
    database.close();
  }
}
