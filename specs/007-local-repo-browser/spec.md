# Feature Specification: Local Repository Mode

**Feature Branch**: `feat/007-local-repo-browser`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "tôi muốn có mode hoạt động được trên local, hiển thị spec có trên local"

## User Scenarios & Testing

### User Story 1 - Open a local Spec Kit repository (Priority: P1)

As a user running Speckit Workspace locally, I want to choose a repository directory from my
computer so I can view the specs that are actually present there without configuring GitHub.

**Why this priority**: Showing the user's real local specs is the primary outcome of this feature.

**Independent Test**: Choose a synthetic repository containing a constitution and two spec
directories, then verify that the workspace displays those repository files and spec names.

**Acceptance Scenarios**:

1. **Given** Speckit Workspace is open and no GitHub connection is configured, **When** the user
   chooses a local repository directory, **Then** the workspace opens that repository and lists
   the specs found in its `specs/` directory.
2. **Given** a chosen repository contains spec documents, **When** the user opens a spec and a
   phase, **Then** the displayed title, Markdown content, and task state reflect the selected
   local files rather than demo content.
3. **Given** the user has a local repository open, **When** they choose a different directory,
   **Then** the workspace replaces the previous repository's content with the newly selected
   repository and does not mix their data.

### User Story 2 - Understand local mode boundaries (Priority: P2)

As a user viewing local files, I want to know what the app can and cannot do in this mode so I do
not mistake unavailable GitHub actions for failures.

**Why this priority**: Local viewing should be safe and predictable while preserving the existing
GitHub-backed approval workflow.

**Independent Test**: Open a local repository without credentials and verify that reading and
navigating work while GitHub-only approval actions are clearly unavailable.

**Acceptance Scenarios**:

1. **Given** a local repository is open without GitHub credentials, **When** the user views a
   phase with an approval gate, **Then** the workspace identifies that approval requires GitHub
   mode and does not claim that the gate was approved.
2. **Given** a local repository is selected, **When** it is loaded, refreshed, or closed, **Then**
   files are only read in the browser and no repository file is changed or sent to a remote
   service.

### Edge Cases

- The selected directory is not a repository or has no `specs/` directory: explain what is
  missing and let the user choose another directory.
- The directory has a `specs/` directory but no valid spec folders or supported documents: show
  an empty or partial state that identifies the missing content without falling back to demo data.
- A repository contains many specs or large Markdown files: keep navigation responsive and report
  files that cannot be read without hiding other readable specs.
- A local repository has no constitution, plan, analysis, tasks, or optional documents: show
  available files and mark absent material as unavailable rather than substituting sample content.
- The user switches repositories while local files are being read: discard the previous
  selection's late results.
- The browser does not support selecting a directory: explain the browser limitation and preserve
  the existing demo and GitHub options.

## Requirements

### Functional Requirements

- **FR-001**: The application MUST provide an explicit local-repository option that does not
  require GitHub or Anthropic credentials.
- **FR-002**: The user MUST explicitly choose a local repository directory through a directory
  selection dialog before its files are read.
- **FR-003**: The application MUST discover Spec Kit specifications under the selected
  repository's `specs/` directory and display their actual names and available documents.
- **FR-004**: The application MUST display local Markdown and task state from the selected files
  and MUST NOT substitute demo content when local files are absent or invalid.
- **FR-005**: The application MUST keep existing demo and GitHub repository workflows available
  alongside local mode.
- **FR-006**: Local mode MUST be read-only: it MUST NOT modify, create, or delete files in the
  selected repository. Single exception (specs/010-spec-annotations FR-016): saving a highlight may
  create or update `specs/*/highlights.json` in the selected folder, after the browser grants write
  access; nothing else is written, nothing is committed and nothing goes over the network.
- **FR-007**: Local mode MUST NOT send selected file contents or paths to a server, GitHub,
  Anthropic, or another network destination.
- **FR-008**: Local mode MUST clearly identify approval and other GitHub-only actions that are
  unavailable without connecting the selected repository through GitHub mode.
- **FR-009**: The user MUST be able to choose another local directory or leave local mode without
  restarting the application.
- **FR-010**: When a repository cannot be read or does not contain supported Spec Kit content,
  the application MUST show an actionable explanation and retain access to other modes.
- **FR-011**: Local repository contents MUST be treated as untrusted input and rendered without
  executing embedded markup or scripts.

### Key Entities

- **Local Repository**: The directory explicitly selected by the user, containing optional
  project-level configuration and a `specs/` collection.
- **Local Specification**: A spec directory and the supported Spec Kit documents available within
  it, including its title and phase/task information.
- **Local File Snapshot**: The in-memory set of files selected for the current browser session;
  it is not persisted or transmitted by local mode.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In a supported browser, a user can choose a local repository and reach its spec list
  in under 30 seconds without entering credentials.
- **SC-002**: For a fixture repository with at least three specs and five supported Markdown
  documents per spec, every available document is represented accurately in the workspace.
- **SC-003**: Across local-mode read, refresh, and repository-switch flows, zero files in the
  selected repository are modified and zero selected file contents are sent over the network.
- **SC-004**: In tests, invalid repository structures and unreadable files produce a visible
  actionable state without rendering demo project data.

## Assumptions

- A local repository is selected using a browser directory picker; users do not type an arbitrary
  filesystem path into a server endpoint.
- Local mode is an optional read-only way to inspect files. Gate approvals continue to require
  GitHub mode because approval state is stored in GitHub issues.
- The existing supported Spec Kit document conventions and project parser remain the source of
  document meaning; this feature does not define a new file format.
- Directory selection is available in current desktop browsers that support directory uploads.
  Unsupported browsers retain access to demo and GitHub modes.
- Local mode is available in the development app and static app; the server does not receive the
  selected directory or its contents.

## Modes Affected

- **Demo**: Keep the explicit demo experience and its design unchanged; add a separate route to
  local mode where the app offers mode selection.
- **Server**: Allow local repository viewing without GitHub configuration; GitHub server mode
  remains unchanged.
- **Static**: Allow users to select and inspect a local repository in the browser without sending
  its contents to network services.
