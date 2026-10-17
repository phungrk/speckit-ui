# speckit-ui

Speckit Workspace: a web UI where a cross-functional team (Director, Designer, Engineer, QA) runs a project through the [Spec Kit](https://github.com/github/spec-kit) flow together. The flow is Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement, with an approval gate at each step and an AI Copilot.

Built from the Claude Design handoff `Speckit Workspace.html` (Modernist design system). It matches the prototype pixel for pixel.

It runs in two modes, with or without a server (see [GitHub Pages](#github-pages-no-server)):

- **GitHub mode**: set `GITHUB_REPO` and the app reads a real Spec Kit project (constitution, `specs/NNN-*/`) from GitHub. It also tracks gate approvals in GitHub issues and lists each spec's PRs across the repo and its submodules.
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

## GitHub Pages (no server)

The app can also be built as static files and published to GitHub Pages. There's no speckit-ui server: the page calls GitHub, and optionally Claude, straight from the browser with keys the viewer enters.

- **Connect screen:** the first visit asks for the repository (`owner/repo`), an optional branch, a GitHub token and an optional Anthropic API key.
  - Keys are kept in `sessionStorage` (forgotten when the tab closes) unless **Remember on this device** is ticked, which uses `localStorage`.
  - **Disconnect** removes them. **Settings** changes them.
- **Permissions:** every viewer uses their own token, so they only see repositories GitHub already lets them read. Gate approvals are recorded under their own GitHub login.
- **Copilot:** with an Anthropic key, the page calls Claude directly. The SDK loads only when Copilot is used. Without a key, Copilot answers the suggested questions from the project files.
- **Content Security Policy:** the built page carries a CSP. Scripts load only from the site itself, and network calls go only to `api.github.com` and `api.anthropic.com`. Markdown is rendered without raw HTML.
- **No shared cache:** each page load reads the repository again, which takes about 15–20 GitHub API calls.

Publish:

1. Merge to `main`. `.github/workflows/pages.yml` runs the tests, builds with `VITE_STATIC=1` and the repository name as the base path, and deploys.
2. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Open `https://<owner>.github.io/<repo>/`.

To try the static build locally, run `npm run build:pages`. Then serve `dist/` so it's reachable at `/speckit-ui/`.

## GitHub mode

```bash
# .env (server-side only)
GITHUB_REPO=owner/repo      # the repository that holds .specify/ and specs/
GITHUB_REF=main             # optional; defaults to the repository's default branch
GITHUB_TOKEN=github_pat_…   # needed for private repos
```

For the token, use a fine-grained personal access token. Give it:

| Repository | Permissions |
|---|---|
| The root repo (`GITHUB_REPO`) | Contents: Read-only · Pull requests: Read-only · **Issues: Read and write** (for gate approvals) |
| Each submodule repo | Contents: Read-only · Pull requests: Read-only |

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

**Security:**

- The server returns the repository's spec files to anyone who can reach it, and anyone who can reach it can approve gates as the token's owner. For a private repository, run the app locally or put it behind authentication before deploying.
- `POST /api/gates` only accepts same-origin JSON requests, which blocks cross-site posts.
- The token itself never leaves the server.

In GitHub mode the command bar copies the command for you to paste into Claude Code. The app doesn't run commands, and it never writes files or branches. Its only writes are to tracking issues.

### Gates and approvals

Each step from Specify to Implement has a gate. The **Gate & PRs** tab shows the gate's checks, evaluated from the spec's files:

| Gate | Required (blocks approval) | Warning only |
|---|---|---|
| Specify | spec.md exists; every story has acceptance scenarios; FRs and SCs listed; `checklists/requirements.md` complete | `[NEEDS CLARIFICATION]` markers left (Clarify resolves them) |
| Clarify | no `[NEEDS CLARIFICATION]` markers remain | no clarification answers recorded |
| Plan | plan.md exists; Constitution Check fully ticked; no NEEDS CLARIFICATION in Technical Context | no Constitution Check list |
| Tasks | tasks.md exists; every user story has tasks | tasks that name no file path |
| Analyze | analysis.md saved; no CRITICAL findings | HIGH findings |
| Implement | all tasks checked; linked PRs merged; merged in repo order; submodule pointers include every merge | no linked PRs |

Approvals are stored in **one GitHub issue per spec** in the root repo. The issue is labelled `speckit` and titled `Spec NNN: …`:

- Approving a gate ticks its box in the issue and adds a comment with the checks at that commit. The first approval creates the issue.
- **Request changes** posts your note and leaves the gate unticked. **Reopen** unticks an approved gate.
- Approving Implement closes the issue.
- You can also tick a box directly on GitHub; the app reads it on the next refresh.
- The server re-runs the checks before writing, so a failing gate can't be approved through the API.

In the rail, a step whose files are done shows **To approve** until its gate is approved, then **Approved**. **Next up** lists the first pending approval for each spec before its next command.

### Pull requests and merge order

A PR is linked to a spec when its branch name contains the spec slug (`feat/001-rename-vendor-tab`) or its description mentions `specs/001-rename-vendor-tab`. The server looks at the last 100 PRs in the root repo and in each submodule repo from `.gitmodules`.

The **Implement** gate checks two things across those PRs:

- **Merge order:** PRs in the submodule repos must be merged in order.
- **Bumped pointers:** the root repo's submodule pointers must include each merged PR, checked with GitHub's compare API.

The order is the `.gitmodules` order unless the root repo has `.specify/speckit-ui.json`:

```json
{ "mergeOrder": ["edge", "wedding-front"] }
```

Entries are submodule paths or `owner/repo` names.

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
  backend.ts            data source: the speckit-ui server, or GitHub/Claude from the browser (static build)
  Connect.tsx           static build: repository and key entry
  project/              GitHub mode: types, step derivation, gates, views, Copilot context
  copilot/              Copilot panel, context builder, gate brief, API client, offline responder
  styles/               modernist.css (design system), workspace.css (app layout)
server/
  copilot.ts            /api/copilot handler (also mounted by the Vite dev server)
  claude.ts             the Claude call shared by the server and the static build
  github.ts             /api/project: loads and caches the project from GitHub
  tracking.ts           /api/tracking and /api/gates: tracking issues, linked PRs, submodule bumps
  parse.ts              parsers for constitution, spec, plan, tasks, analysis and checklists
  index.ts              production static and API server
tests/                  unit tests: parsers, step derivation, gates, GitHub loader and tracking (mocked GitHub), Copilot logic
```

## Status

Possible next steps:

- Run `/speckit-*` commands from the app through Claude Code sessions.
- Multiple approvers per gate, mapped to GitHub users.
