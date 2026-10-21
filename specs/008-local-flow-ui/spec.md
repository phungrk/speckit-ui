# Feature Specification: Local Spec Kit Flow UI

**Feature Branch**: `feat/008-local-flow-ui`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "hiện tại khi chay app ở local có giao diện thiếu UI speckit flow nằm ngang. mong muốn: UI ở local giống trên Github Pages or demo http://localhost:5173/?demo"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate a local spec through the Spec Kit flow (Priority: P1)

As a user viewing a local repository, I want the same horizontal, seven-step Spec Kit flow
navigation that I see in GitHub mode and the demo, so I can understand and move through a spec
by its workflow stages instead of only browsing a list of files.

**Why this priority**: The missing horizontal flow is the primary UI gap reported by the user.

**Independent Test**: Open a local repository with a spec and its supported documents; verify the
horizontal flow is visible and selecting each step shows content from the selected local spec.

**Acceptance Scenarios**:

1. **Given** a local repository has been selected and a spec is open, **When** the workspace
   renders, **Then** it shows the seven steps in order: Constitution, Specify, Clarify, Plan,
   Tasks, Analyze, and Implement, in a horizontal flow matching the established workspace
   navigation.
2. **Given** the horizontal flow is visible, **When** the user selects a step, **Then** the
   workspace selects that step and shows its content or an explicit unavailable/not-run state
   derived from the selected local repository.
3. **Given** more than one local spec is available, **When** the user switches the selected spec,
   **Then** the flow remains available and each step displays information for the newly selected
   spec.

### User Story 2 - Understand local progress without mistaking it for GitHub approval (Priority: P2)

As a user browsing local files, I want the flow to show which stages have source documents and
which are not yet represented, so I can understand local progress without believing that a
GitHub approval or remote action occurred.

**Why this priority**: The navigation is useful only if its status is accurate and consistent
with local read-only boundaries.

**Independent Test**: Open fixtures with complete, partial, and absent stage documents; verify
each step has a truthful status and missing content never comes from the demo.

**Acceptance Scenarios**:

1. **Given** a local spec contains some but not all workflow documents, **When** its flow is
   displayed, **Then** available steps are represented from those files and missing steps are
   visibly identified as not run or unavailable.
2. **Given** a local step has a status in the horizontal flow, **When** the user inspects that
   step, **Then** no status implies that a GitHub gate was approved or that a command was run.
3. **Given** the selected repository lacks a document for a step, **When** the user opens that
   step, **Then** the UI explains that local content is unavailable and does not show sample or
   another spec's content.

### User Story 3 - Use the flow at different screen sizes (Priority: P3)

As a user viewing local specs on a narrow screen, I want every flow step to remain reachable, so
the workflow is still useful on a phone-sized viewport.

**Why this priority**: The project requires usable phone layouts, and the additional horizontal
navigation must not hide workflow steps on small screens.

**Independent Test**: Open local mode at desktop and phone-sized widths and navigate to the first,
middle, and last workflow steps using pointer and keyboard input.

**Acceptance Scenarios**:

1. **Given** the local workspace is displayed at a narrow viewport, **When** the user navigates
   the horizontal flow, **Then** all seven steps remain reachable without clipping any step
   permanently off-screen.
2. **Given** keyboard focus is on a flow step, **When** the user activates it, **Then** that step
   becomes selected and its local content is shown.

### Edge Cases

- A selected spec has no `spec.md` but has other supported files: show the available local spec
  context without inventing Specify content.
- A spec has no constitution or one or more later-stage documents: retain the complete ordered
  flow and identify the missing content for each affected step.
- Clarification material appears within `spec.md` rather than a separate file: show the relevant
  local spec content and do not imply a separate clarification record exists.
- A spec contains task documents but no completed tasks: distinguish the presence of tasks from
  a completed implementation.
- Switching specs while a step is selected: keep the step selection only if it is meaningful for
  the new spec; otherwise open the new spec's appropriate initial step.
- The flow is shown at a phone-sized viewport: keep every step accessible and avoid horizontal
  page overflow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In local mode, the workspace MUST show the same seven Spec Kit workflow steps and
  order used by the existing GitHub and demo workspaces: Constitution, Specify, Clarify, Plan,
  Tasks, Analyze, and Implement.
- **FR-002**: The seven steps MUST be presented as a clearly horizontal workflow navigation
  associated with the currently selected local spec.
- **FR-003**: Selecting a workflow step MUST update the selected step and display content derived
  only from the currently selected local repository and spec.
- **FR-004**: The workspace MUST retain access to the existing local spec and supported-document
  navigation while adding workflow-step navigation.
- **FR-005**: Step status MUST be based on the available local project/spec documents and MUST
  distinguish available/completed stages from the next, not-started, or not-run stages without
  implying remote approval.
- **FR-006**: If a step has no corresponding local content, the workspace MUST show a clear
  unavailable or not-run state and MUST NOT substitute demo content or content from another spec.
- **FR-007**: The local workflow navigation and its content MUST remain usable with pointer and
  keyboard input and at phone-sized viewport widths.
- **FR-008**: Adding the local workflow MUST NOT change the rendered workflow or behavior of
  GitHub mode or the explicit demo route.
- **FR-009**: Local mode MUST remain read-only; the workflow MUST NOT enable gate approval,
  pull-request actions, command execution, or Copilot actions.

### Key Entities *(include if data involved)*

- **Local Specification**: The currently selected local spec and its supported documents, used
  as the sole source for the flow's content and status.
- **Workflow Step**: One of the seven ordered Spec Kit stages, with a selected state, a
  document-derived status, and local content or an explicit unavailable state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every local spec selection, all seven workflow steps appear in the established
  order and can be reached without leaving local mode.
- **SC-002**: In a fixture containing local content for each workflow stage, selecting each of
  the seven steps displays content belonging to that fixture's currently selected spec.
- **SC-003**: In all partial-content fixtures, every missing stage is identified, and zero
  missing stages display demo content or content from another spec.
- **SC-004**: At both 1280px and 390px viewport widths, users can select the first, a middle, and
  the last workflow step using pointer and keyboard input; no step is permanently inaccessible.
- **SC-005**: The GitHub workspace and explicit demo render the same workflow behavior and
  appearance as before the local-mode change.

## Assumptions

- The requested parity is focused on the missing horizontal seven-step flow and its navigation;
  it does not require local mode to gain remote-only workflow capabilities or every side panel
  interaction available in GitHub mode or the demo.
- The existing local repository and spec selectors remain available, and the selected workflow
  step applies to the currently selected local spec.
- The feature depends on the existing local mode successfully identifying the selected repository,
  its specs, and supported documents.
- Local files remain the source of truth. Statuses are informational descriptions of local
  artifacts, not approval records.
- Existing visual conventions and workflow labels from the GitHub workspace and demo are the
  reference; mode-specific read-only messaging remains visible in local mode.

## Modes Affected

- **Demo**: The explicit demo experience remains unchanged.
- **Server**: Local mode gains the horizontal workflow navigation; GitHub-backed behavior remains
  unchanged.
- **Static**: Local mode gains the same horizontal workflow navigation; GitHub Pages' existing
  GitHub-backed behavior remains unchanged.

## Non-Goals

- Enabling local edits, file writes, workflow command execution, GitHub gate approvals, PR
  tracking, or Copilot in local mode.
- Changing the content or visual behavior of the GitHub workspace or explicit demo route.
- Replacing the existing local repository selection, parsing, or privacy behavior.
