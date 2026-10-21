# Tasks: Local Repository Mode

**Input**: Design documents from `specs/007-local-repo-browser/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Add focused Vitest coverage for parsing and privacy behavior; run the existing full
validation commands before completion.

**Organization**: Tasks are grouped by user story to enable independently testable increments.

## Phase 1: Setup

**Purpose**: Establish the shared project-construction boundary used by GitHub and local readers.

- [x] T001 Extract pure spec feature construction and supported-document selection into `server/project.ts`, then update `server/github.ts` to use it without changing GitHub behavior.

---

## Phase 2: Foundational

**Purpose**: No separate server or persistence foundation is needed; local file access stays in
the browser and uses the existing project model.

**Checkpoint**: User story work can begin after T001 preserves existing GitHub project parsing.

---

## Phase 3: User Story 1 - Open a local Spec Kit repository (Priority: P1) 🎯 MVP

**Goal**: Choose a repository directory without credentials and view its actual specs and documents.

**Independent Test**: Select a synthetic directory containing multiple spec folders and verify the
workspace displays the selected files and parsed task state instead of demo data.

### Tests for User Story 1

- [x] T002 [P] [US1] Add a synthetic directory fixture with exactly three specs and at least five supported Markdown documents per spec, then verify every listed document plus empty, invalid, and partially unreadable inputs in `tests/localProject.test.ts`.

### Implementation for User Story 1

- [x] T003 [US1] Build a local `Project` from selected relative file paths using the shared parser in `src/project/localProject.ts`.
- [x] T004 [US1] Add a local workspace picker that reads browser-selected directory files into an in-memory snapshot and reports invalid selections in `src/project/LocalWorkspace.tsx`.
- [x] T005 [P] [US1] Add an explicit local-mode entry and preserve the explicit demo route in `src/Root.tsx`.
- [x] T006 [P] [US1] Expose the local-repository option on the GitHub connect screen without requiring credentials in `src/Connect.tsx`.
- [x] T007 [US1] Render actual local spec Markdown and supported documents in the dedicated read-only viewer in `src/project/LocalWorkspace.tsx`.

**Checkpoint**: User Story 1 is usable on its own without GitHub credentials or demo fallback.

---

## Phase 4: User Story 2 - Understand local mode boundaries (Priority: P2)

**Goal**: Keep local browsing read-only, private, and explicit about GitHub-only capabilities.

**Independent Test**: In local mode, verify gate approval, PR, and Copilot actions are unavailable,
local files and paths do not appear in network requests, and choosing another directory clears
the prior snapshot.

### Tests for User Story 2

- [x] T008 [P] [US2] Add local-mode UI rendering tests for credential-free read-only entry, unsupported-browser guidance, and absence of demo content in `tests/localMode.test.tsx`.
- [x] T009 [P] [US2] Assert parsing the selected local content invokes no network request in `tests/localPrivacy.test.tsx`; verify the browser selection flow sends no GitHub or Anthropic requests and invokes no write API.

### Implementation for User Story 2

- [x] T010 [US2] Clearly label local mode as read-only and explain that approvals, PR tracking, and Copilot require GitHub mode in `src/project/LocalWorkspace.tsx`.
- [x] T011 [US2] Clear the selected file snapshot on mode exit and repository reselection in `src/project/LocalWorkspace.tsx`.
- [x] T012 [US2] Render local Markdown with the existing safe Markdown component and keep file references as local UI labels in `src/project/LocalWorkspace.tsx`.

**Checkpoint**: User Story 2 demonstrates that local inspection does not write files or send selected content anywhere.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Document supported behavior and validate all existing modes.

- [x] T013 [P] Document local repository selection, browser support, read-only limits, and privacy guarantees in `README.md`.
- [x] T014 Run the quickstart and verify the selected multi-spec repository appears within 30 seconds; run `npm test`, `npm run typecheck`, `npm run build`, and `npm run build:pages`, fixing regressions in `src/`, `server/`, or `tests/`.
- [x] T015 Verify the explicit demo route remains visually unchanged at desktop (1280px) and mobile (390px) viewport widths using `src/App.tsx` and the existing Modernist styles.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 is the shared parser boundary and must preserve current GitHub behavior.
- **Foundational (Phase 2)**: No additional infrastructure is required.
- **User Story 1 (Phase 3)**: Depends on T001; T002 can be written once the local project shape is defined. T003 precedes T004/T007; T005/T006 provide entry points.
- **User Story 2 (Phase 4)**: Depends on the local view from User Story 1.
- **Polish (Phase 5)**: Depends on both user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after T001; provides the local browsing MVP.
- **US2 (P2)**: Depends on US1's local view so privacy and read-only behavior can be enforced across its actions.

### Parallel Opportunities

- T002 can proceed independently from implementation of the parser extraction.
- T005 and T006 can be implemented in parallel once the LocalWorkspace entry contract is established.
- T008 and T009 can be implemented in parallel after local-mode UI exists.
- T013 is independent of test implementation and can proceed during polish.

## Parallel Example: User Story 2

```text
Task: T008 local-mode entry and lifecycle UI tests in tests/localMode.test.tsx
Task: T009 no-network and no-write assertions in tests/localMode.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 to reuse the existing parser without changing GitHub results.
2. Complete T002-T007 to select a directory and display its real spec files.
3. Verify local mode without credentials and confirm malformed input never falls back to demo.
4. Complete User Story 2 to disable remote actions and prove the privacy/read-only guarantees.
5. Update documentation and run all four required validation commands.

### Task Format Validation

All tasks use checkboxes, sequential IDs, story labels on user-story tasks, and exact repository
file paths. `[P]` marks only tasks that can proceed independently of other incomplete tasks.
