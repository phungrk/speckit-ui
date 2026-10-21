# Tasks: Local Spec Kit Flow UI

**Input**: Design documents from `specs/008-local-flow-ui/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/local-flow-ui.md`, and `quickstart.md`

**Tests**: Focused Vitest tasks are included because the specification defines independently
verifiable user stories and the implementation plan requires local workspace tests. Use synthetic
fixtures only; do not call GitHub or Anthropic.

**Organization**: Tasks are grouped by user story. Each story's independent test criteria follow
the feature specification.

## Phase 1: Setup

**Purpose**: No project initialization, dependency changes, or shared setup is required. The
existing local workspace, phase metadata, styles, and Vitest suite are the foundation.

## Phase 2: Foundational

**Purpose**: No additional shared infrastructure is needed. User-story implementation can begin
against the existing in-memory `Project` and `SpecFeature` model.

## Phase 3: User Story 1 - Navigate a local spec through the Spec Kit flow (Priority: P1) 🎯 MVP

**Goal**: Show the established seven-step horizontal rail in local mode and let the user navigate
local content for the selected spec while retaining existing file navigation.

**Independent Test**: Load a synthetic local project with stage documents and verify all seven
steps appear in order; selecting each step shows content for the selected spec, and selecting a
second spec updates the stage content without leaving local mode.

### Tests for User Story 1

- [X] T001 [US1] Add synthetic-fixture tests for the ordered seven-step rail, stage selection, selected-spec content, and retained document navigation in `tests/localMode.test.tsx`.

### Implementation for User Story 1

- [X] T002 [US1] Add the shared horizontal Spec Kit rail and selected-stage local content panel to `src/project/LocalWorkspace.tsx`, retaining the existing local spec/document browser and read-only notice.

**Checkpoint**: The local workspace exposes and navigates the complete Spec Kit flow using only
the currently selected local spec.

## Phase 4: User Story 2 - Understand local progress without mistaking it for GitHub approval (Priority: P2)

**Goal**: Display document-derived local stage status and explicit empty states without implying
remote approvals or substituting content.

**Independent Test**: Load synthetic complete and partial local specs; verify statuses reflect
local artifacts, missing stage content is explicitly unavailable/not run, no remote approval is
claimed, and absent content never falls back to demo or another spec.

### Tests for User Story 2

- [X] T003 [P] [US2] Add tests for complete and partial document sets, truthful local-only status labels, and explicit missing-stage content in `tests/localMode.test.tsx`.
- [X] T004 [P] [US2] Extend privacy coverage to verify switching workflow stages makes no network request and invokes no file-write behavior in `tests/localPrivacy.test.tsx`.

### Implementation for User Story 2

- [X] T005 [US2] Derive each rail status from the selected local project and selected spec using the shared rules, and show explicit stage-specific unavailable/not-run states without remote approval labels in `src/project/LocalWorkspace.tsx`.

**Checkpoint**: A local user can distinguish present, next, skipped, and missing work while
remaining within the read-only local boundary.

## Phase 5: User Story 3 - Use the flow at different screen sizes (Priority: P3)

**Goal**: Keep each workflow stage reachable by pointer and keyboard at desktop and phone-sized
widths without page-level horizontal overflow.

**Independent Test**: At 1280px and 390px viewport widths, use pointer and keyboard activation to
reach the first, middle, and last stages; confirm the active panel changes and the page does not
overflow horizontally.

### Tests for User Story 3

- [X] T006 [US3] Add keyboard activation and narrow-viewport navigation checks for the first, middle, and last rail steps in `tests/localMode.test.tsx`.

### Implementation for User Story 3

- [X] T007 [US3] Ensure the seven-step rail remains keyboard operable, visually consistent with the existing Modernist rail, and reachable without phone-width page overflow in `src/project/LocalWorkspace.tsx` and `src/styles/workspace.css`.

**Checkpoint**: All seven stages remain operable on desktop and narrow screens.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate all modes and the full project before merge.

- [X] T008 Run the scenarios in `specs/008-local-flow-ui/quickstart.md`, verify the demo remains unchanged at 1440x900 and 924x540, verify local navigation at 1280px and 390px, and pass `npm test`, `npm run typecheck`, `npm run build`, and `npm run build:pages`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks; no initialization or dependency changes are required.
- **Foundational (Phase 2)**: No tasks; the current local project model and shared phase rules
  provide all prerequisites.
- **User Stories (Phase 3+)**: US1 precedes US2 and US3 because their content/status and
  accessibility tests exercise the rail introduced in US1. Complete each story in priority
  order for independently verifiable increments.
- **Polish (Phase 6)**: Depends on all three user stories.

### User Story Dependencies

- **US1 (P1)**: No feature-story dependency; it is the MVP.
- **US2 (P2)**: Depends on US1's rail and stage selection.
- **US3 (P3)**: Depends on US1's rail; validate final responsive and keyboard behavior after
  US2's status states are integrated.

### Parallel Opportunities

- T003 and T004 touch different test files and can be authored in parallel after T002 provides
  the rail behavior to exercise.
- Within a story, tests should be written before their implementation and should fail first.
- Stories are otherwise sequenced because US2 and US3 validate behavior introduced by US1.

## Parallel Example: User Story 2

```text
Task: T003 local stage status and missing-content tests in tests/localMode.test.tsx
Task: T004 local no-network and no-write assertions in tests/localPrivacy.test.tsx
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 and confirm the local flow tests fail for the missing rail behavior.
2. Complete T002 using the existing shared phase labels and local parsed project.
3. **STOP and VALIDATE**: Run the focused local-mode test and verify the seven tabs, selection,
   and actual local stage content.
4. Keep the existing local file browser and ensure the demo route has not changed.

### Incremental Delivery

1. Deliver US1 as the local navigation MVP.
2. Add US2 status, missing-content, and privacy guarantees; validate with synthetic fixtures.
3. Add US3 keyboard and narrow-screen validation and any necessary responsive adjustment.
4. Complete T008 before merge; each step remains an additive local-mode enhancement.

### Task Format Validation

All tasks use an unchecked checkbox, sequential task ID, optional `[P]` only where independent,
the required story label for user-story tasks, and explicit repository-relative file paths.
