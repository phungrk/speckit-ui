# Data Model: Persist Local Repository

## Remembered Local Repository

Represents the most recently opened local directory for the current app origin and browser profile.

| Field | Meaning | Persistence |
|-------|---------|-------------|
| directoryHandle | Browser reference to the explicitly selected directory; read access only | Browser IndexedDB when the File System Access API is available |
| displayName | Friendly directory name shown in local mode | Stored alongside the reference; not used as an access credential |
| selectedFeatureSlug | Spec feature selected when the user last left local mode | Browser IndexedDB |
| selectedFilePath | Supported repository-relative file currently selected, if any | Browser IndexedDB |
| selectedStep | Current workflow stage | Browser IndexedDB |
| selectedDocumentPath | Optional additional document selected in the file browser | Browser IndexedDB |

The saved record contains no file text, parsed project data, authentication material, absolute file path, or approval/task state. The stored handle is usable only through the browser's permission model and is not sent to a server.

## In-Memory Local Snapshot

The existing local workspace representation rebuilt from the selected directory after access is granted.

| Field | Meaning | Lifetime |
|-------|---------|----------|
| name | Directory display name | Current page session |
| files | Map of supported repository-relative paths to file text | Current page session only |
| project | Parsed Spec Kit project model produced by `buildLocalProject` | Current page session only |
| warnings | Read or parsing warnings for the current load | Current page session only |

This snapshot is discarded when the page unloads. The next load reads the selected directory again so changed files are reflected.

## Restore State

The local workspace uses these user-visible states while resolving the remembered selection:

- **No selection**: No remembered handle exists; offer the current choose-folder flow.
- **Restoring**: A saved handle exists and the app is checking permission and reading supported files.
- **Resume required**: Permission is not currently granted; offer a user-activated resume action and the option to choose another folder or forget this one.
- **Ready**: The directory is readable and contains supported specs; show the project and restore the last location when it still exists.
- **Recovery required**: The saved handle is unavailable, permission is denied, or the directory is no longer valid; explain the issue and offer choose/forget actions.
- **Fallback selected**: A directory was opened through the existing file input; show it for this page session and explain that it must be selected again after reload.

## State Transitions

1. Choose a directory → obtain read handle where supported → save handle → read files → Ready.
2. App startup with saved handle → permission granted → read current files → Ready.
3. App startup with saved handle → permission requires user action → Resume required → user activates resume → request read access → read files → Ready or Recovery required.
4. App startup with saved handle → access fails or directory is invalid → Recovery required.
5. Choose through fallback file input → read files into memory → Fallback selected/Ready for this page session.
6. Choose another directory → replace the saved handle and last view only after the new directory is successfully opened.
7. Forget saved directory → delete the remembered handle and view state → No selection.
