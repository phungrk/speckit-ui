# Local Repository Mode Quickstart

## Prerequisites

- Node.js 22.18 or later and the repository's installed npm dependencies.
- A desktop browser that supports selecting a directory from a file input.
- No GitHub token or Anthropic API key is needed for the local flow.

## Run the application

```bash
npm run dev
```

Open `http://localhost:5173/`, choose **Open local repository**, and select a fixture or project
directory containing `specs/NNN-name/spec.md`.

## Expected behavior

1. The workspace shows the selected repository's actual spec folders and document content.
2. Selecting a spec displays data parsed from its local Markdown files.
3. Missing or unsupported content produces a local error/empty state and never shows Wallet App
   demo data.
4. Gate approval, PR, and Copilot actions are clearly unavailable in local mode.
5. Selecting a different folder replaces the prior project's data.
6. No request includes selected file contents or paths, and repository files remain unchanged.

## Automated validation

```bash
npm test
npm run typecheck
npm run build
npm run build:pages
```

Use synthetic fixture files as defined by the [local mode contract](./contracts/local-mode.md).
