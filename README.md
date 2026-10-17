# speckit-ui

Speckit Workspace: a web UI where a cross-functional team (Director, Designer, Engineer, QA) runs a project through the [Spec Kit](https://github.com/github/spec-kit) flow together. The flow is Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement, with an approval gate at each step and an AI Copilot.

Built from the Claude Design handoff `Speckit Workspace.html` (Modernist design system). It matches the prototype pixel for pixel.

It runs in two modes:

- **GitHub mode**: set `GITHUB_REPO` and the app reads a real Spec Kit project (constitution, `specs/NNN-*/`) from GitHub. Read-only.
- **Demo mode**: with no `GITHUB_REPO` (or with `?demo` in the URL), it shows the sample "Wallet App" workspace from the design, including approvals and the New spec flow.

## Run it

```bash
npm install
cp .env.example .env      # optional: add ANTHROPIC_API_KEY for AI answers
npm run dev               # http://localhost:5173 (app and API)
```

Production:

```bash
npm run build
npm start                 # serves dist/ and the API on PORT (default 8787)
```

Other scripts: `npm test` (Vitest) and `npm run typecheck`. Requires Node 22.18 or later, because the server runs TypeScript directly.

## GitHub mode

```bash
# .env (server-side only)
GITHUB_REPO=owner/repo      # the repository that holds .specify/ and specs/
GITHUB_REF=main             # optional; defaults to the repository's default branch
GITHUB_TOKEN=github_pat_…   # needed for private repos
```

For the token, use a fine-grained personal access token limited to that one repository, with **Contents: Read-only** permission.

How it reads the project:

- The server lists the repository tree through the GitHub REST API. It downloads only the files the UI shows: the constitution, `.specify/integration.json`, and for each spec `spec.md`, `plan.md`, `tasks.md`, `analysis.md`, `research.md`, `data-model.md`, `quickstart.md` and `checklists/*.md`.
- It parses them on the server (`server/parse.ts`) and serves the result at `GET /api/project`.
- The result is cached. After 30 seconds the next request checks the branch head and downloads again only if the commit changed. **Refresh** forces that check.
- Command names follow the project's integration: `/speckit-plan` when it invokes Claude skills with `-`, otherwise `/speckit.plan`.

How each step's status is derived from the files:

| Step | Done when | Shown as *Not run* when |
|---|---|---|
| Constitution | `.specify/memory/constitution.md` exists | |
| Specify | `spec.md` exists | |
| Clarify | `spec.md` has a `## Clarifications` section with answers | `plan.md` exists, or the spec has no `[NEEDS CLARIFICATION]` markers |
| Plan | `plan.md` exists | |
| Tasks | `tasks.md` exists | the spec sets `**Track**: light` |
| Analyze | `analysis.md` exists | tasks are already being checked off |
| Implement | every task in `tasks.md` is checked | the spec sets `**Track**: light` |

The first step that is not done is marked *Next*, and it is listed under **Next up**.

`/speckit-analyze` only prints its report in the terminal. Save it as `specs/NNN-…/analysis.md` to see the findings in the app.

**Security:** the server returns the repository's spec files to anyone who can reach it. For a private repository, run the app locally or put it behind authentication before deploying. The token itself never leaves the server.

In GitHub mode the command bar copies the command for you to paste into Claude Code. The app doesn't run commands or write to the repository yet.

## Demo mode

- **Phase rail**: the seven `/speckit.*` steps, each marked Approved, In review or Locked.
- **Left column**: *My queue* lists what is waiting on the selected role. The feature list shows a 7-step progress bar for each feature.
- **Centre**: the artifact for the selected phase (spec, clarifications, plan, tasks, analysis, implementation), plus a `/speckit.*` command bar with simulated output.
- **Right column**: the approval gate for the phase and team activity, or the **Copilot** tab.
- **+ New spec**: a 3-step `/speckit.specify` dialog (Describe → Generate → Review draft). The new feature then opens at Specify and appears in the approvers' queues.

Try this flow: as **QA**, resolve A1 on Analyze (this adds FR-006 and T018), approve, then approve as **Director**. Then as **Engineer**, check off the tasks. As **QA**, mark every scenario Pass and click **Verify & ship**.

## Copilot

In GitHub mode, Copilot reads the real files: the constitution, `spec.md`, `plan.md`, the parsed tasks and `analysis.md`, each capped at 20,000 characters.

The browser sends the current workspace context and the conversation to `POST /api/copilot`. The server, `server/copilot.ts`, adds the system prompt and calls the Claude API:

- Model: `claude-opus-5-5` (override with `COPILOT_MODEL`), at `effort: low` for short answers.
- Server-side refusal fallback is on (`fallbacks: "default"`).
- The API key stays on the server. Requests are validated (size, turn order) and limited to 15 per minute per client.
- **Without credentials**, the server replies `{ offline: true }` and the client answers from workspace data with a rule-based responder. Answers are labelled *Offline answer*, so the UI still works in demos.

AI only suggests. Approvals always stay with people. The *Before you approve* brief in the gate is computed from data and makes no model call.

## Layout

```
src/
  App.tsx               workspace shell, state, gates, queue
  data.ts / types.ts    sample project (Wallet App) and its types
  views/                one view per phase, plus the draft spec
  NewSpecDialog.tsx     /speckit.specify flow
  Root.tsx              picks GitHub mode or demo mode
  project/              GitHub mode: types, step derivation, views, Copilot context
  copilot/              Copilot panel, context builder, gate brief, API client, offline responder
  styles/               modernist.css (design system), workspace.css (app layout)
server/
  copilot.ts            /api/copilot handler (also mounted by the Vite dev server)
  github.ts             /api/project: loads and caches the project from GitHub
  parse.ts              parsers for constitution, spec, plan, tasks, analysis and checklists
  index.ts              production static and API server
tests/                  unit tests: parsers, step derivation, GitHub loader (mocked), Copilot logic
```

## Status

GitHub mode is read-only. Next on the roadmap:

- Gates as checklists, with approvals written back to the spec's `**Status**`.
- A per-spec view of the PRs across repositories and their merge order.
