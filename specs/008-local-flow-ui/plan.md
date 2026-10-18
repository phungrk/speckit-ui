# Implementation Plan: Local Spec Kit Flow UI

**Branch**: `feat/008-local-flow-ui` | **Date**: 2026-10-18 | **Spec**:
[spec.md](./spec.md)

**Input**: Feature specification from `specs/008-local-flow-ui/spec.md`

## Summary

Add the existing horizontal seven-step Spec Kit rail to the selected-spec view in local mode.
Selecting a step will render its content from the current in-memory local project, using local
status derived from the parsed constitution and spec documents. Keep the current file browser and
read-only notice, show explicit empty states for absent documents, and leave GitHub mode, the
explicit demo, and all network behavior unchanged.

## Technical Context

**Language/Version**: TypeScript 7, React 18

**Primary Dependencies**: Existing Vite/React application, shared `PHASES` and `phaseStatus`,
existing parsed project views and safe `Markdown` renderer; no new dependencies

**Storage**: Existing local file snapshot held in browser memory only; no persistence changes

**Testing**: Vitest (`npm test`), focused local workspace tests, `npm run typecheck`,
`npm run build`, and `npm run build:pages`

**Target Platform**: Current desktop and phone-sized browsers in server and static deployments

**Project Type**: React web application with GitHub API server and static GitHub Pages build

**Performance Goals**: Selecting any of the seven stages updates the visible local view in the
same interaction, without additional network access or noticeable delay.

**Constraints**: Derive content and status only from the currently selected local project/spec;
never imply a GitHub gate approval; preserve read-only, no-upload/no-write behavior; retain the
current document browser; preserve demo and GitHub rendering; keep the flow keyboard accessible
and usable at narrow widths.

**Scale/Scope**: One local repository and one selected spec at a time; seven workflow stages;
changes are isolated to the local workspace and its tests/documentation.

## Constitution Check

- **I. Git is the source of truth**: Pass. Stage content and status remain derived from the
  selected repository files; no state is persisted or written.
- **II. Keys belong to the user**: Pass. No key handling or network destination changes. Local
  Markdown remains untrusted and uses the existing safe renderer.
- **III. Three modes, one behavior**: Pass. The selected flow order matches GitHub/demo.
  The UI-only enhancement is local-mode specific; GitHub/server and Pages remote behavior is not
  changed.
- **IV. Design fidelity**: Pass with a visual-preservation gate. Use the existing `sk-rail`,
  `sk-cell`, Modernist tokens, and responsive styles. Do not alter demo UI; validate the existing
  required demo viewports and local phone layout.
- **V. Test before merge**: Pass when the focused local behavior tests and the four required
  project commands pass. Use only synthetic fixtures; do not call GitHub or Anthropic.
- **VI. AI only proposes**: Pass. Local mode does not add Copilot or send local context to AI.
- **VII. Simplicity first**: Pass. Reuse current phase/status/view/rendering code; no dependency,
  server endpoint, persistence, or new service.

**Gate result**: No constitution violations. Proceed to research and design.

## Project Structure

### Documentation (this feature)

```text
specs/008-local-flow-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── local-flow-ui.md
└── tasks.md
```

### Source Code (repository root)

```text
src/project/
├── LocalWorkspace.tsx       # Local mode shell, selected spec, rail and stage content
├── localProject.ts          # Existing in-memory project construction and document paths
├── phases.ts                # Existing ordered workflow metadata and status labels
├── status.ts                # Existing document-derived stage status
└── views.tsx                # Existing safe renderers for parsed project stages

tests/
└── localMode.test.tsx       # Local flow navigation, content, missing states and isolation
```

**Structure Decision**: Keep this enhancement in the existing local workspace and reuse its
parsed `Project`/`SpecFeature`, the shared phase definitions/status derivation, and existing
safe rendering conventions. Retain its document-list navigation as a parallel way to inspect
files. Do not reuse remote action controls or add a new API.

## Complexity Tracking

No constitution violations or additional runtime complexity.

## Phase 0: Research

See [research.md](./research.md). The existing shared project phase metadata and status
calculation define the order and document-derived statuses used in GitHub mode. The local view
must map those stages to in-memory local Markdown and keep local-only status labels explicit.

## Phase 1: Design

- [Data model](./data-model.md) defines the relationship between selected local spec,
  workflow stage, file content, and derived status.
- [Local flow UI contract](./contracts/local-flow-ui.md) defines navigation, stage mapping,
  missing-document behavior, accessibility, and read-only boundaries.
- [Quickstart](./quickstart.md) gives synthetic-fixture and browser validation scenarios.

## Modes Affected

- **Demo**: No changes; `?demo` retains the existing seven-step rail and visual behavior.
- **Server**: Local mode gains the rail after a local repository is selected. GitHub-backed
  server behavior is unchanged.
- **Static**: Local mode gains the same rail in the Pages build. GitHub-backed Pages behavior
  is unchanged.

## Post-Design Constitution Check

- Local file data remains transient and browser-local; no files, credentials, or requests are
  added.
- User-controlled Markdown continues through the existing safe renderer.
- Local mode uses the shared step ordering/status rules without exposing GitHub-only actions.
- No demo styles or behaviors are changed; responsive and keyboard behavior are explicit
  validation targets.

**Post-design gate result**: Pass. No unresolved clarifications or unjustified complexity.
