# Local Mode UI Contract

## Entry and directory selection

- The user can enter local mode without GitHub or Anthropic credentials.
- An explicit **Open local repository** action opens a directory selection dialog.
- The browser-provided selection is read in the page. There is no server endpoint for accepting a
  filesystem path or file contents.
- If directory selection is unsupported, the app reports that limitation and keeps demo and
  GitHub choices accessible.

## Accepted repository contents

- Project-level files: `.specify/memory/constitution.md`, `.specify/integration.json`, and
  `.specify/speckit-ui.json`.
- Spec folders use the existing numeric-prefix naming convention directly beneath `specs/`.
- Each spec may include `spec.md`, `plan.md`, `tasks.md`, `analysis.md`, `research.md`,
  `data-model.md`, `quickstart.md`, and `checklists/*.md`.
- Unrecognized files are not displayed as supported project documents.

## Local view behavior

- The title, file list, and available document content come from the selected local files.
- Missing files are represented as missing; local mode never fills them with demo data.
- Refresh means asking the user to reselect the directory; no background read permission is
  assumed.
- Choosing another directory replaces the active snapshot.
- Approval, PR, and Copilot actions are unavailable in local mode and are identified as
  GitHub-only capabilities.
- Local document references do not point to GitHub.

## Privacy and safety guarantees

- Read only files in the user-selected directory.
- Do not write, create, delete, or rename any selected file.
- Do not transmit selected paths or contents to the server, GitHub, Anthropic, or another
  destination.
- Render Markdown as untrusted content without raw HTML or script execution.
- Do not retain the snapshot after leaving local mode or reloading the page.

## Error states

- No supported `specs/` directory: explain the expected layout and offer reselection.
- No valid spec folders: show a local empty state, not demo content.
- Individual read failure: identify the relative file and continue with other readable content.
