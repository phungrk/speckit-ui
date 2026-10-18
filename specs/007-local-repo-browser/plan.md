# Implementation Plan: Local Repository Mode

**Branch**: `feat/007-local-repo-browser` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-local-repo-browser/spec.md`

## Summary

Add a read-only local repository mode that lets a user explicitly choose a project directory and
inspect its real Spec Kit documents without credentials. Read selected files in the browser,
reuse the existing project parsers, and keep the selected snapshot in memory. Preserve existing
GitHub workflows and the explicit pixel-identical demo; never send local content or paths over
the network.

## Technical Context

**Language/Version**: TypeScript 7, React 18

**Primary Dependencies**: Existing Vite app, browser directory input, shared Spec Kit parsers

**Storage**: In-memory selected File snapshot only; no local or server persistence

**Testing**: Vitest with synthetic File fixtures; `npm run typecheck`, `npm test`,
`npm run build`, and `npm run build:pages`

**Target Platform**: Current desktop browsers running the development app or static site;
existing server and GitHub flows remain supported

**Project Type**: React web application with a Node.js API for GitHub mode

**Performance Goals**: Show a repository with at least three spec folders and five supported
Markdown documents per spec within 30 seconds of folder selection

**Constraints**: Directory access requires explicit user selection; only supported project and
spec documents are read; local paths and content stay in the browser; no local file writes;
GitHub gate approvals remain unavailable in local mode; unsupported directory selection fails
with a useful message

**Scale/Scope**: One selected repository and its supported documents per tab; no background
filesystem polling and no persistent permission

## Constitution Check

- **I. Git is the source of truth**: Pass. Local mode reads repository files and creates no second
  project state or writes.
- **II. Keys belong to the user**: Pass. Local mode needs no keys and sends no selected paths or
  contents to any network destination.
- **III. Three modes, one behavior**: Pass with a bounded local-only read path. Demo remains
  unchanged; server and static deployments both offer the browser-local viewer; GitHub behavior
  remains shared and unchanged.
- **IV. Design fidelity**: Pass. New mode selection and local status use existing Modernist tokens
  and classes. The explicit demo view must remain pixel-identical.
- **V. Test before merge**: Pass. Parser, directory-selection, error states, and local no-network
  behavior receive synthetic-fixture unit tests; all four project validation commands are run.
- **VI. AI only proposes**: Pass. Local content is not sent to Copilot; local mode makes no AI
  request.
- **VII. Simplicity first**: Pass. Use browser file selection and in-memory data; add no runtime
  dependency, server endpoint, persistence, or new network destination.

## Project Structure

### Documentation (this feature)

```text
specs/007-local-repo-browser/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── local-mode.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── Root.tsx                         # Select local mode without changing explicit demo
├── Connect.tsx                      # Offer local browsing without requiring credentials
└── project/
    ├── LocalWorkspace.tsx           # Directory selection and read-only local view
    └── localProject.ts              # Build a Project from selected files

server/
└── project.ts                       # Shared pure construction of spec/project models

tests/
├── localProject.test.ts
├── localMode.test.tsx
└── localPrivacy.test.tsx
```

**Structure Decision**: Keep file selection and local lifecycle in the browser. Extract only the
pure spec construction needed by both GitHub loading and local file loading into a shared module;
use a dedicated local viewer so GitHub-only interactions and links are not exposed. Do not add a
filesystem-reading API to the server.

## Complexity Tracking

No constitution violations or additional runtime complexity.

## Phase 0: Research

See [research.md](./research.md). The browser directory input is the selected mechanism because
it grants access only after an explicit user action, supplies relative paths for the selected
directory tree, and works without a server filesystem endpoint.

## Phase 1: Design

- [Data model](./data-model.md) defines the in-memory repository snapshot and parsed project.
- [Local mode contract](./contracts/local-mode.md) defines folder selection, supported paths,
  privacy, and UI state behavior.
- [Quickstart](./quickstart.md) provides fixture-based validation scenarios.

## Modes Affected

- **Demo**: Preserve the explicit demo (`?demo`) and its rendered design. Local mode is a separate
  choice; never use demo data as a local-mode fallback.
- **Server**: Provide local viewing even when GitHub credentials are not configured. Existing
  GitHub server mode is unchanged.
- **Static**: Read the selected folder in the browser without transmitting its contents or paths.
