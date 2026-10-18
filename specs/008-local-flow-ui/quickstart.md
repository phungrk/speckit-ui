# Local Spec Kit Flow UI Quickstart

## Prerequisites

- Node.js 22.18 or later and installed npm dependencies.
- A browser that supports selecting a directory.
- A synthetic repository fixture with at least two spec folders and varied stage documents.
- No GitHub or Anthropic credentials are required for local-mode validation.

## Run the application

```bash
npm run dev
```

Open `http://localhost:5173/`, choose **Open local repository**, and select a fixture containing
`specs/NNN-name/` folders.

## Manual validation

1. Confirm the local workspace displays the seven horizontal tabs in order: Constitution,
   Specify, Clarify, Plan, Tasks, Analyze, Implement.
2. Select each tab and verify its panel shows only content from the selected local repository
   and currently selected spec.
3. Select a second spec and verify stage content/status follows that spec.
4. Select a fixture missing several stage documents and verify each missing stage is explicitly
   marked unavailable/not run without demo fallback.
5. At 1280px and 390px widths, navigate to the first, middle, and last steps with pointer and
   keyboard input; ensure no page-level horizontal overflow.
6. Confirm local mode continues to show its read-only boundary and offers no approval, PR,
   command execution, or Copilot action.
7. Open `http://localhost:5173/?demo` and confirm the existing demo flow is unchanged.

## Automated validation

```bash
npm test
npm run typecheck
npm run build
npm run build:pages
```

Tests use synthetic fixtures only and mock any network behavior. See the
[local flow UI contract](./contracts/local-flow-ui.md) and [data model](./data-model.md).
