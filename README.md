# speckit-ui

Speckit Workspace: a web UI where a cross-functional team (Director, Designer, Engineer, QA) runs a project through the [Spec Kit](https://github.com/github/spec-kit) flow together. The flow is Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement, with an approval gate at each step and an AI Copilot.

Built from the Claude Design handoff `Speckit Workspace.html` (Modernist design system). It matches the prototype pixel for pixel.

## Run it

```bash
npm install
cp .env.example .env      # optional: add ANTHROPIC_API_KEY for AI answers
npm run dev               # http://localhost:5173 (app and Copilot API)
```

Production:

```bash
npm run build
npm start                 # serves dist/ and /api/copilot on PORT (default 8787)
```

Other scripts: `npm test` (Vitest) and `npm run typecheck`. Requires Node 22.18 or later, because the server runs TypeScript directly.

## What's in it

- **Phase rail**: the seven `/speckit.*` steps, each marked Approved, In review or Locked.
- **Left column**: *My queue* lists what is waiting on the selected role. The feature list shows a 7-step progress bar for each feature.
- **Centre**: the artifact for the selected phase (spec, clarifications, plan, tasks, analysis, implementation), plus a `/speckit.*` command bar with simulated output.
- **Right column**: the approval gate for the phase and team activity, or the **Copilot** tab.
- **+ New spec**: a 3-step `/speckit.specify` dialog (Describe → Generate → Review draft). The new feature then opens at Specify and appears in the approvers' queues.

Try this flow: as **QA**, resolve A1 on Analyze (this adds FR-006 and T018), approve, then approve as **Director**. Then as **Engineer**, check off the tasks. As **QA**, mark every scenario Pass and click **Verify & ship**.

## Copilot

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
  copilot/              Copilot panel, context builder, gate brief, API client, offline responder
  styles/               modernist.css (design system), workspace.css (app layout)
server/
  copilot.ts            /api/copilot handler (also mounted by the Vite dev server)
  index.ts              production static and API server
tests/                  unit tests for gate, context, Copilot and validation logic
```

## Status

All data is sample data in `src/data.ts`, and state lives in memory. Only feature 003 has full artifacts. The next step is to read real Spec Kit projects (`.specify/`, `specs/NNN-*/spec.md`, `plan.md`, `tasks.md`) instead.
