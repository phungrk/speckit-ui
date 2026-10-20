# Tasks: Persist Local Repository

**Input**: Design documents from `specs/009-persist-local-repository/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/local-repository-persistence.md`, `quickstart.md`

**Tests**: Focused tests are included to meet the project constitution's local-mode validation requirements.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other marked tasks because they touch separate files and have no dependency on unfinished work.
- **[Story]**: User story label from `spec.md`.
- Every task names its target file.

## Phase 1: Setup

**Purpose**: No project initialization is required; this feature extends the existing Vite/React application.

## Phase 2: Foundational

**Purpose**: The existing parser, browser setup, and test tooling provide the foundation; no separate foundational code change is needed.

## Phase 3: User Story 1 - Restore local repository after reload (Priority: P1) 🎯 MVP

**Goal**: Reload directly into local mode, reopen the latest repository when access is granted, and restore the last location.

**Independent Test**: Open a fixture repository, navigate to a non-default spec, reload, and verify the same repository and spec return without opening the folder picker when read access remains granted.

### Tests for User Story 1

- [x] T001 [P] [US1] Add unit tests for saving, loading, and forgetting a directory handle and last-view record in `tests/localRepositoryPersistence.test.ts`.
- [x] T002 [P] [US1] Add tests for reading supported files from a directory handle and preserving relative paths in `tests/localProject.test.ts`.

### Implementation for User Story 1

- [x] T003 [P] [US1] Implement browser capability detection and IndexedDB save/load/clear operations for the directory handle and last-view record in `src/project/localRepositoryPersistence.ts`.
- [x] T004 [P] [US1] Implement asynchronous traversal of a read-only directory handle, filtering through `isLocalProjectPath` and returning the existing `LocalFileSnapshot` shape in `src/project/localProject.ts`.
- [x] T005 [P] [US1] Update `src/Root.tsx` to enter local mode from a non-sensitive `?local` URL marker on startup and set/remove that marker when entering/exiting local mode.
- [x] T006 [US1] Add a File System Access API directory picker path to `src/project/LocalWorkspace.tsx`, persist a successfully opened directory handle, and keep the existing `webkitdirectory` input as the unsupported-browser fallback.
- [x] T007 [US1] Restore a saved handle with granted read permission and rebuild the current project from fresh files in `src/project/LocalWorkspace.tsx`.
- [x] T008 [US1] Save and restore the last selected spec, step, and supported document path through `src/project/LocalWorkspace.tsx` and `src/project/localRepositoryPersistence.ts`.

**Checkpoint**: With granted permission, reloading restores the selected local repository and view without asking the user to choose its folder again.

## Phase 4: User Story 2 - Recover safely when automatic restore is unavailable (Priority: P2)

**Goal**: Explain permission and folder failures, let the user resume or recover, and allow them to forget the saved selection.

**Independent Test**: Exercise prompt, denied, unavailable-directory, invalid-repository, fallback, and forget flows; verify no stale repository content appears as current and each state offers a clear next action.

### Tests for User Story 2

- [x] T009 [P] [US2] Add prompt/denied permission recovery action cases and fallback messaging checks in `tests/localMode.test.tsx`.

### Implementation for User Story 2

- [x] T010 Handle `granted`, `prompt`, and `denied` read permission states in `src/project/LocalWorkspace.tsx`; request permission only from a user-activated resume action.
- [x] T011 Add recovery states and actions for unavailable handles, missing/invalid repositories, and the file-input fallback in `src/project/LocalWorkspace.tsx`.
- [x] T012 Add a Forget saved folder action that clears the stored directory handle and view location in `src/project/LocalWorkspace.tsx` and `src/project/localRepositoryPersistence.ts`.
- [x] T013 Keep the previous saved handle until a newly selected directory has opened successfully, and discard late reads from superseded selections in `src/project/LocalWorkspace.tsx`.

**Checkpoint**: Permission denial, missing folders, unsupported persistence, and forgetting the selection never expose stale file content or silently switch repositories.

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Preserve local privacy, accessibility, and unaffected app modes.

- [x] T014 Verify resume, choose, and forget controls use existing Modernist styles, keyboard focus, and announced status/error states in `src/project/LocalWorkspace.tsx`.
- [x] T015 Update the runnable browser scenarios and fallback behavior in `specs/009-persist-local-repository/quickstart.md` to match the implementation.
- [x] T016 Run the local persistence/workspace tests and the repository quality gates (`npm test`, `npm run typecheck`, `npm run build`, and `npm run build:pages`); record any remaining failure against `specs/009-persist-local-repository/quickstart.md`.

## Dependencies & Execution Order

### Phase Dependencies

- Setup and Foundational require no code changes beyond the existing project baseline.
- User Story 1 can begin immediately; its tests are written before the storage and directory-reader implementation.
- User Story 2 depends on the US1 restore flow and shared persistence module.
- Polish depends on both user stories.

### User Story Dependencies

- **US1 (P1)**: Delivers the MVP reload restoration path.
- **US2 (P2)**: Depends on US1 because permission recovery and forget actions operate on its saved handle and restore states.

### Parallel Opportunities

- T001 and T002 can be authored in parallel because they cover separate modules.
- T003, T004, and T005 can proceed in parallel after the US1 test interfaces are clear because they touch different files.
- T009 is a test-only task and can be authored independently of UI implementation once the restore-state contract is stable.

## Implementation Strategy

### MVP First (User Story 1)

1. Add the focused storage and directory-reader tests.
2. Implement persistent handle storage and fresh directory reading.
3. Preserve local mode across reloads and connect handle selection/restoration to the workspace.
4. Validate the P1 reload scenario before adding the recovery controls.

### Incremental Delivery

1. Deliver US1 so supported browsers reopen the latest repository and view after reload.
2. Deliver US2 so permission prompts, revoked access, invalid folders, fallback browsers, and forgetting the saved folder are handled clearly.
3. Complete privacy, accessibility, regression, and build validation.

## Notes

- The saved handle is read-only; repository contents and parsed project data remain in memory.
- No file-system path, handle, or repository content may be sent over the network.
- The `?local` marker contains no repository identifier or sensitive data; `?demo` continues to take precedence.
- Tests use synthetic fixtures and mocked IndexedDB/directory permissions. Do not access a real user repository in automated tests.
