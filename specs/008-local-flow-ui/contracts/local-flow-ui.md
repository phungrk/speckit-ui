# Local Flow UI Contract

## Scope

This is a user-facing navigation contract for the local workspace. It does not add an HTTP
endpoint, file format, permission, or network interaction.

## Navigation

- When a local repository has loaded and a spec is selected, show seven horizontal tabs in this
  exact order: Constitution, Specify, Clarify, Plan, Tasks, Analyze, Implement.
- The selected tab is programmatically identified as selected and exposes its content panel.
- Activating a tab with pointer or keyboard input selects it and displays that stage for the
  currently selected local spec.
- Existing spec/document browsing, repository reselection, exit action, and read-only notice
  remain available.
- At phone-sized widths, all seven tabs remain reachable; the page must not permanently clip
  any stage or introduce horizontal page overflow.

## Stage data

| Stage | Local source | Missing-content behavior |
|---|---|---|
| Constitution | `.specify/memory/constitution.md` | Explain that the repository has no local constitution |
| Specify | `specs/<selected-spec>/spec.md` | Explain that no local spec document is available |
| Clarify | Clarifications parsed from the selected spec | Explain that no clarification is recorded; do not invent a session |
| Plan | `specs/<selected-spec>/plan.md` | Explain that no local plan is available |
| Tasks | `specs/<selected-spec>/tasks.md` | Explain that no local task document is available |
| Analyze | `specs/<selected-spec>/analysis.md` | Explain that no local analysis is available/not run |
| Implement | Tasks parsed from the selected spec's task document | Show local task state; no remote implementation action is offered |

Any content shown must come from the current selected repository snapshot. Render Markdown using
the existing safe Markdown behavior; never render raw HTML or scripts.

## Status semantics

- Use the established shared stage order and document-derived status behavior.
- In local mode, a completed artifact/status means the local source exists or satisfies the
  existing file-derived rule. It does not mean a gate was approved remotely.
- Missing and skipped stages have an explicit, user-readable state.

## Local-mode restrictions

The flow is read-only. It offers no gate approval, pull-request action, command execution, or
Copilot request. Selecting a tab or changing specs causes no network request and writes no files.

## Compatibility

The existing GitHub workspace and explicit demo route retain their current rail behavior,
content, and appearance.
