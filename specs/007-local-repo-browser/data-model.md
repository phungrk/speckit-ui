# Data Model: Local Repository Mode

## Local Repository Snapshot

Represents the files the user selected for one active local-mode session.

| Field | Type | Validation / meaning |
|---|---|---|
| `displayName` | string | Root directory name reported by the browser; display-only and never sent over the network |
| `files` | map of relative path to file text | In-memory only; paths must be relative to the selected root |
| `project` | `Project` | Parsed project model produced from supported files in the snapshot |
| `selectedAt` | number | Browser timestamp used only for the current view lifecycle |

### Lifecycle

`unselected` → `reading` → `ready` or `invalid` → `unselected` on close/reselection.

Closing or replacing the selected repository drops references to the previous file map and
project. A reload starts in the unselected state.

## Local Specification

Represents one directory matching the existing Spec Kit folder convention beneath `specs/`.

| Field | Type | Validation / meaning |
|---|---|---|
| `slug` | string | Relative spec folder name matching the existing numeric-prefix naming rule |
| `files` | string array | Only supported documents and checklist Markdown files are included |
| `title` | string | Parsed from `spec.md`, or derived from the folder name when that file is absent |
| `documents` | parsed fields | Existing `SpecFeature` fields for spec, plan, tasks, analysis, checklists, and supporting Markdown |

## Derived Project

Local mode maps the selected snapshot to the existing `Project` shape so phase and task status
remain consistent. It is marked as local/read-only, has no GitHub branch variants or submodules,
and does not imply any approval issue exists. Local origin metadata is not a GitHub URL.

## Validation Rules

- File paths must be relative to the selected directory and must not escape the selected root.
- Only the constitution, supported project settings, and supported files beneath valid spec
  folders are read.
- Markdown is treated as untrusted text and rendered using the existing safe Markdown component.
- Failed file reads are surfaced as warnings; one unreadable document does not hide other specs.
- The local snapshot is not persisted, uploaded, or included in telemetry.
