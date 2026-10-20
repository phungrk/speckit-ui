# Research: Persist Local Repository

## Decision: Persist a user-selected directory handle when supported

Use `window.showDirectoryPicker({ mode: 'read' })` for browsers that support the File System Access API. Store the returned `FileSystemDirectoryHandle` in IndexedDB, which supports serializing file system handles. On startup, load the saved handle and check read permission. If access is already granted, read supported files and rebuild the local project. If the browser reports that permission needs user activation, show a **Resume local repository** action and request permission only after the user activates it. The action reuses the saved handle and does not ask the user to choose the folder again.

**Rationale**: A directory handle is a reusable reference to the selected directory; the current directory input returns only a list of selected files. The handle lets the app re-read current repository contents after reload without persisting a stale copy. Read-only access maintains the existing local mode boundary.

The earlier local-mode design intentionally avoided persistence because it only needed a single-page session. This feature changes that requirement narrowly: persist the access handle and last-view preference, but continue to keep file contents and parsed project state in memory only.

## Decision: Keep the current directory input as a compatibility fallback

When the persistent directory picker is unavailable, retain the existing `<input type="file" webkitdirectory>` path. It can still read a selected folder, but its `File` list does not provide a reusable directory handle. Tell the user that this browser requires choosing the folder again after reload; do not claim automatic restoration in this fallback path.

**Rationale**: This preserves the existing local mode across browsers without adding a dependency or blocking local file viewing. Persisting file contents as a workaround would create stale copies and conflict with the requirement not to retain repository contents.

## Permission and recovery behavior

- The File System Access API is available only in secure contexts and supporting browsers.
- Handle permission can be `granted`, `prompt`, or `denied`. A saved handle does not guarantee that permission is still granted when the page is reopened.
- Request permission only from a user action. When permission is not granted, keep the user on a recovery state with actions to resume, choose another directory, or forget the saved directory.
- If browser storage is cleared, a handle is unavailable, or the directory is moved/deleted, report the problem and offer directory selection. Never display an old in-memory snapshot as if it had just been read.
- Read only supported Spec Kit files, as the current `localProject` module does. Do not write to the directory or send paths, handles, or contents over the network.

## Alternatives considered

- **Keep `webkitdirectory` and persist the returned `File` objects**: Rejected. The input does not yield a reusable directory reference, and storing file contents would retain a stale snapshot that can diverge from the repository.
- **Persist only the directory name/path**: Rejected. A name or path cannot grant access or re-read the directory and can be ambiguous.
- **Use a server endpoint to read local files**: Rejected. A remote server cannot safely address the user's local filesystem and this would violate the local-only privacy boundary.
- **Require re-selection on every reload**: Rejected for browsers with persistent directory handles because it does not meet the main user goal.

## Sources

- [MDN: File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) — user-selected file system handles and IndexedDB serialization.
- [MDN: showDirectoryPicker()](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker) — secure-context and user-interaction requirements.
- [MDN: FileSystemHandle.queryPermission()](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission) — checking current read permission.
- [WICG: File System Access API](https://wicg.github.io/file-system-access/) — handle serialization and permission behavior.
- [Chrome for Developers: Persistent permissions for the File System Access API](https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api) — storing handles and handling renewed permission.
- [MDN: HTMLInputElement.webkitdirectory](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory) — directory input returns files with relative paths.
