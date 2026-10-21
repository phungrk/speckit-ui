# Data Model: Local Spec Kit Flow UI

The feature adds no persisted entities. It presents a workflow view over the local in-memory
`Project` and its currently selected `SpecFeature`.

## Local workflow view

| Field | Source | Meaning |
|---|---|---|
| selected project | Existing `LocalView.project` | Parsed project built from the user-selected files |
| selected spec | Existing `SpecFeature` selected by the local document/spec browser | The sole feature whose content and statuses are shown |
| selected stage | Local UI selection, one of seven phase indexes | Controls the selected rail tab and visible stage panel |
| stage definition | Shared `PHASES` metadata | Stable key, label, order, and source file for each workflow stage |
| stage status | Shared document-derived status rules over project/spec files | Indicates completed, current, pending, or skipped/not-run based on local artifacts |
| stage content | Parsed spec/plan/tasks/analysis/constitution or supporting document in the selected snapshot | Safe-rendered content for the selected stage |

## Workflow stages

The stages are ordered as follows:

1. Constitution — project-level `.specify/memory/constitution.md`.
2. Specify — selected spec's `spec.md`.
3. Clarify — clarification records represented in the selected spec; if none exist, identify
   the stage as skipped/not recorded according to shared status rules.
4. Plan — selected spec's `plan.md`.
5. Tasks — selected spec's `tasks.md`.
6. Analyze — selected spec's `analysis.md`.
7. Implement — selected spec's task state; completion is not implied by the mere presence of
   `tasks.md`.

## Validation and state rules

- A selected stage may only read from the selected local `Project` and selected `SpecFeature`.
- A stage without source material has an explicit unavailable/not-run presentation and no
  substituted content.
- Switching specs updates stage data and derived statuses to the new feature.
- Selecting a stage changes view state only; it does not modify local files or persist status.
- Status is descriptive of local artifacts and is never described as a GitHub approval.
- The existing local selected-file snapshot remains in memory and is cleared by its current
  exit/reselection lifecycle.
