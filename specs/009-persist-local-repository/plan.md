# Implementation Plan: Persist Local Repository

**Branch**: `feat/009-persist-local-repository` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-persist-local-repository/spec.md`

## Summary

Remember the most recently opened local repository and its current view across reloads, without retaining repository file contents. Preserve local mode in the page URL so the app returns to `LocalWorkspace` on reload. Where the browser supports persistent directory handles, use its directory picker and save the user-selected read-only handle in browser storage. On startup, reopen automatically if read permission is already granted; if the browser requires user confirmation, show a resume action that does not require picking the directory again. Keep the current directory-upload input as a fallback when persistent handles are unavailable; that fallback continues to require re-selection after reload.

## Technical Context

**Language/Version**: TypeScript 7, React 18

**Primary Dependencies**: Existing Vite/React application; native File System Access API and IndexedDB where supported; existing `webkitdirectory` file input fallback; no new runtime dependency

**Storage**: Persist only the selected directory handle and the last local view location in browser IndexedDB. Keep the parsed repository snapshot in memory; do not store selected file contents.

**Testing**: Vitest with synthetic file fixtures and mocked browser directory/permission APIs; project quality gates are `npm test`, `npm run typecheck`, `npm run build`, and `npm run build:pages`.

**Target Platform**: Browser-local mode in the server and static deployments. Persistent directory access requires a secure context and a supporting browser; the existing directory input remains available where supported as a fallback.

**Project Type**: React web application with a Node.js API for GitHub mode

**Performance Goals**: With an already granted permission, restore begins during startup and renders the selected repository as soon as supported files are read; with permission requiring user activation, show a clear resume action without opening the directory picker again.

**Constraints**: Request read permission only; never write to the selected directory or transmit its handle, path, or contents. Do not persist file snapshots. Browser storage can be cleared and permissions can be revoked. The fallback file input cannot provide a reusable directory handle, so its user must choose the folder again after a reload.

**Scale/Scope**: One remembered local repository and one last-view location per browser profile and app origin; GitHub mode and demo mode are unchanged.

## Constitution Check

- **I. Git is the source of truth**: Pass. Persisted data is limited to a browser-local repository selection and view preference. Project documents, task state, and approval state continue to come from the repository; no project content or workflow status is stored as a second source of truth.
- **II. Keys belong to the user**: Pass. No tokens or API keys are involved. Local file handles, paths, and contents remain in the browser and are not sent over the network. The directory handle is read-only.
- **III. Three modes, one behavior**: Pass with a bounded local-mode change. The behavior applies to browser-local mode in both server and static deployments. GitHub behavior and demo behavior remain unchanged.
- **IV. Design fidelity**: Pass. Reuse the current Modernist local-workspace states and controls; keep the feature keyboard accessible and preserve demo rendering.
- **V. Test before merge**: Pass when local restore, permission recovery, fallback, clear-selection, no-network, and current project quality-gate checks pass. Use synthetic fixtures only.
- **VI. AI only proposes**: Pass. Local repository content is not sent to Copilot or other AI services.
- **VII. Simplicity first**: Pass. Use built-in browser APIs and the existing fallback; add no runtime package, server endpoint, or network destination. IndexedDB stores only the browser-native handle and view preference required for restoration.

## Project Structure

### Documentation (this feature)

```text
specs/009-persist-local-repository/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── local-repository-persistence.md
```

### Source Code (repository root)

```text
src/Root.tsx                       # Restore local mode when the URL marks it as active

src/project/
├── LocalWorkspace.tsx            # Restore, resume, choose, forget, and view-state UI
├── localProject.ts               # Continue parsing supported local files into Project
└── localRepositoryPersistence.ts # IndexedDB handle and view-preference persistence

tests/
├── localProject.test.ts                # Read-only traversal of selected directory handles
├── localRepositoryPersistence.test.ts  # Persistence and clear-selection cases
└── localMode.test.tsx                  # Local workspace restore/recovery UI scenarios
```

**Structure Decision**: Use the URL as the reload-stable signal that local mode is active, with no repository path or content in the URL. Keep directory persistence in a browser-only project module next to the existing `LocalWorkspace` and `localProject` modules. Keep directory traversal and file parsing in the existing local mode, and do not add server filesystem access. Add only the storage module needed to save/retrieve the directory handle and last view.

## Complexity Tracking

No constitution violations. IndexedDB is browser-provided storage for a local selection reference, not a project database; no dependency or service is added.

## Phase 0: Research

See [research.md](./research.md). Use a user-selected `FileSystemDirectoryHandle` where available, store the handle in IndexedDB, query permission on restore, and defer any permission prompt to a user gesture. Preserve the existing `webkitdirectory` file input as the fallback. The fallback supplies selected `File` objects but no reusable directory handle, so it cannot meet automatic restore across reloads by itself.

## Phase 1: Design

- [Data model](./data-model.md) describes the persisted directory reference and last local view, plus the in-memory file snapshot and restore states.
- [Local repository persistence contract](./contracts/local-repository-persistence.md) defines the permission, restore, fallback, and forget interactions.
- [Quickstart](./quickstart.md) lists runnable validation scenarios for reload, reauthorization, directory changes, fallback, and privacy.

## Modes Affected

- **Browser-local mode in server deployment**: Remember the selected directory in this browser origin and profile; read content directly in the browser.
- **Browser-local mode in static deployment**: Same behavior when served in a secure context and the browser supports persistent directory handles.
- **GitHub mode**: No changes to repository selection, authentication, API access, or approval behavior.
- **Demo mode**: No changes to demo data or rendered demo view.

## Post-Design Constitution Check

- The only persistent values are the browser-selected directory handle and last-view preference; repository file contents and project workflow state remain transient or derived from the repository.
- The handle is used for read access only. No path, handle, or file contents are sent to network services.
- GitHub and demo modes remain unchanged, and both server-hosted and static local mode follow the same restore and recovery behavior when browser capabilities permit it.
- No runtime dependency, server endpoint, or new network destination is introduced.
- The fallback explicitly reports that re-selection is required after reload; permission denial, missing directories, and cleared browser data have recovery paths.

**Post-design gate result**: Pass. No unresolved technical decisions block task generation.
