# Research: Local Spec Kit Flow UI

## Workflow order and statuses

- **Decision**: Use the existing shared `PHASES` ordering and `phaseStatus()` document-derived
  status semantics for the local rail.
- **Rationale**: GitHub and demo already establish the seven-step order and labels. Reusing the
  shared calculation prevents local progress from diverging from the repository artifacts.
- **Alternatives considered**: Create a local-only list of step names/statuses (rejected because
  it duplicates product behavior and can drift); infer statuses from filenames in the component
  (rejected because shared status rules also account for skipped/light tracks and task completion).

## Stage content and missing documents

- **Decision**: Map each selected step to the current parsed project/spec's available data and
  render supported Markdown through the existing safe renderer. For missing source documents,
  show an explicit local unavailable/not-run state rather than demo content.
- **Rationale**: The local project already contains the selected spec and file snapshot, and the
  existing project views define how parsed documents are presented. The local viewer must not
  introduce GitHub links/actions or imply that absent content exists.
- **Alternatives considered**: Show a raw file list only (rejected because it does not satisfy
  the requested stage navigation); reuse the full GitHub workspace (rejected because it includes
  remote tracking/actions unavailable in local mode).

## Responsive navigation

- **Decision**: Reuse the established horizontal rail classes and responsive workspace styles;
  confirm each stage remains reachable at desktop and phone-sized widths.
- **Rationale**: Existing CSS already styles the seven-step rail and adapts the workspace below
  the phone breakpoint. No new design system or dependency is needed.
- **Alternatives considered**: Add a separate navigation design or permanently hide overflow
  steps (rejected because it causes visual inconsistency or inaccessible stages).

## Privacy and mode boundaries

- **Decision**: Keep the flow entirely within local workspace state. Do not call backend,
  GitHub, or Anthropic endpoints and do not enable writes or command execution.
- **Rationale**: This is a presentation/navigation enhancement to an existing read-only local
  mode; the project constitution requires its selected paths/content to remain local.
- **Alternatives considered**: Fetch stage data remotely or reuse GitHub-only controls (rejected
  because local repositories may not be remotely configured and this would violate the mode's
  privacy/read-only boundary).

## Research outcome

All technical choices are supported by existing repository patterns. No external technology
choice or unresolved clarification remains.
