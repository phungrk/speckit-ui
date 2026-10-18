# speckit-ui

Speckit Workspace: a web UI where a cross-functional team (Director, Designer, Engineer, QA) runs a project through the [Spec Kit](https://github.com/github/spec-kit) flow together. The flow is Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement, with an approval gate at each step and an AI Copilot.

Built from the Claude Design handoff `Speckit Workspace.html` (Modernist design system). It matches the prototype pixel for pixel.

It runs in three modes, with or without a server (see [Local mode](#local-mode-read-only) and
[GitHub Pages](#github-pages-no-server)):

- **GitHub mode**: the app reads real Spec Kit projects (constitution, `specs/NNN-*/`) from GitHub, in [any repository your own access allows](#several-repositories). It also tracks gate approvals in GitHub issues and lists each spec's PRs across the repo and its submodules.
- **Local mode**: choose a repository folder and inspect its real Spec Kit files in this browser tab. It is read-only and needs no credentials.
- **Demo mode**: choose **Open the demo** from the no-configuration screen, or use `?demo` in the URL, to show the sample "Wallet App" workspace from the design, including approvals and the New spec flow.

GitHub mode always uses the GitHub access of the person using it: the token they enter (Pages),
their GitHub sign-in (a shared server), or their own token in `.env.local` (running locally).

## Run it

```bash
npm install
cp .env.example .env      # optional: add ANTHROPIC_API_KEY for AI answers
echo 'GITHUB_TOKEN=github_pat_…' > .env.local   # optional: your own token; git ignores .env.local
npm run dev               # http://localhost:5173 (app and API)
```

Production:

```bash
npm run build
npm start                 # serves dist/ and the API on PORT (default 8787)
```

Other scripts: `npm test` (Vitest) and `npm run typecheck`. Requires Node 22.18 or later, because the server runs TypeScript directly.

With no GitHub configuration, the app offers local mode and the demo. Choose **Open local
repository** to view a folder on this computer, or **Open the demo** to use the sample workspace.
The explicit `?demo` URL continues to open the demo directly.

## GitHub Pages (no server)

The app can also be built as static files and published to GitHub Pages. There's no speckit-ui server: the page calls GitHub, and optionally Claude, straight from the browser with keys the viewer enters.

- **Connect screen:** the first visit asks for a GitHub token and an optional Anthropic API key. You can also choose **Open local repository** without entering credentials. Under **Advanced** you can name a repository (and branch) to open first; otherwise the app lists every repository the token can read.
  - Keys are kept in `sessionStorage` (forgotten when the tab closes) unless **Remember on this device** is ticked, which uses `localStorage`.
  - **Disconnect** removes them. **Settings** changes them.
- **Permissions:** every viewer uses their own token, so they only see repositories GitHub already lets them read. Gate approvals are recorded under their own GitHub login.
- **Copilot:** with an Anthropic key, the page calls Claude directly. The SDK loads only when Copilot is used. Without a key, Copilot answers the suggested questions from the project files.
- **Content Security Policy:** the built page carries a CSP. Scripts load only from the site itself, and network calls go only to `api.github.com` and `api.anthropic.com`. Markdown is rendered without raw HTML.
- **No shared cache:** each page load reads the repository again, which takes about 15–20 GitHub API calls. Within a page, the last 8 projects stay cached, so switching back to a repo is quick.

Publish:

1. Merge to `main`. `.github/workflows/pages.yml` runs the tests, builds with `VITE_STATIC=1` and the repository name as the base path, and deploys.
2. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Open `https://<owner>.github.io/<repo>/`.

To try the static build locally, run `npm run build:pages`. Then serve `dist/` so it's reachable at `/speckit-ui/`.

## GitHub mode

The server picks how users are identified when it starts:

| Mode | When | Who the user is |
|---|---|---|
| **Sign-in** | `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET` are set | Everyone signs in with GitHub and works with their own access. For a server shared by a team. |
| **Token** | `GITHUB_TOKEN` is set (and no App) | The owner of the token. For running on your own machine: the server only listens on `127.0.0.1`. |
| **Demo** | neither | The sample workspace. |

```bash
# .env (shared settings)
GITHUB_REPO=owner/repo      # optional: the repository opened first when the URL names none
GITHUB_REF=main             # optional; branch for GITHUB_REPO

# .env.local (yours, ignored by git): token mode
GITHUB_TOKEN=github_pat_…
```

Both `npm run dev` and `npm start` read `.env` and then `.env.local`, which wins. If the token is missing or GitHub rejects it, the app shows a screen saying where to put it.

In token mode the server refuses to listen beyond `127.0.0.1` (`HOST=0.0.0.0` with `npm start`, or `npm run dev -- --host`, is ignored with a warning), because everyone who could reach it would act as the token's owner. Set `ALLOW_REMOTE_TOKEN_MODE=1` only if you accept that.

For the token, use a fine-grained personal access token. Give it, for each repository you work on:

| Repository | Permissions |
|---|---|
| A Spec Kit repo | Contents: Read-only · Pull requests: Read-only · **Issues: Read and write** (for gate approvals) |
| Each submodule repo | Contents: Read-only · Pull requests: Read-only |

Without Issues write on a repo you can still read it; approving a gate there says the permission is missing.

### Sign-in mode (a server for a team)

Register a **GitHub App** once for your organization (Settings → Developer settings → GitHub Apps):

- **Callback URL:** `<your server>/auth/callback`. Tick *Expire user authorization tokens*.
- **Permissions (repository):** Contents: Read-only · Pull requests: Read-only · Issues: Read and write · Metadata: Read-only. No account permissions are needed.
- Install it on the organization (all repositories, or the ones speckit-ui should see).
- Put its client ID and a client secret in the server's `.env` as `GITHUB_APP_CLIENT_ID` and `GITHUB_APP_CLIENT_SECRET`. Set `PUBLIC_URL` if the server sits behind a proxy.

Then:

- Nothing about any repository is shown before sign-in. A deep link (`/?repo=owner/name&step=plan`) survives the trip through GitHub.
- Each person sees the repositories that both the App's installation and their own account can read, and approvals are recorded under their own login.
- If the organization uses single sign-on (for example Okta), GitHub asks for it during sign-in.
- **Sign out** ends the session on the server.

## Several repositories

Once the app knows who you are, it lists the repositories you can read (up to 1,000, most recently pushed first):

- Repositories with a `.specify/` folder are labelled **Spec Kit** and listed first. The check is one API call per repository, done for pinned and visible rows first, so you can open a repo before every row is checked.
- **Pin** repositories to keep them on top and on the **Overview**, which shows what waits in each pinned repo: gates to approve first, then the next command. A repo that can't be read shows its error in its own block.
- Switch repositories from the selector in the top bar. Going back to a repo reopens the spec and step you were on.
- Each repository has its own address, `?repo=owner/name&spec=NNN-slug&step=plan`, for bookmarks and links. Addresses never contain a token.
- Pins and positions are kept per GitHub login on this device (`sessionStorage` on Pages unless **Remember** is ticked). They are display preferences, not project data.

How it reads the project:

- The server lists the repository tree through the GitHub REST API. It downloads only the files the UI shows: the constitution, `.specify/integration.json`, and for each spec `spec.md`, `plan.md`, `tasks.md`, `analysis.md`, `research.md`, `data-model.md`, `quickstart.md` and `checklists/*.md`.
- It parses them on the server (`server/parse.ts`) and serves the result at `GET /api/project`.
- The result is cached per user and repository (the last 8). After 30 seconds the next request checks the branch head and downloads again only if the commit changed. **Refresh** forces that check.
- Command names follow the project's integration: `/speckit-plan` when it invokes Claude skills with `-`, otherwise `/speckit.plan`.

## Local mode (read-only)

Choose **Open local repository** from the no-configuration start screen, GitHub connect/sign-in
screen, or signed-in workspace. Select the repository folder in the browser's directory dialog.
The viewer reads supported Spec Kit files under `specs/NNN-name/` and the optional project
constitution/configuration files, then shows the actual local Markdown. Choose another folder to
refresh, or exit local mode to return to the previous workspace choice.

Local files stay in the browser tab: they are not uploaded, written, or saved across reloads.
GitHub approvals, PR tracking, and Copilot are unavailable in local mode; connect through GitHub
mode to use them. Directory selection is supported in current desktop browsers. If the browser
does not support it, the app explains the limitation and leaves the demo and GitHub options
available.

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

- **Sign-in mode:** each person's GitHub token stays in the server's memory. The browser only gets a random session id in an `HttpOnly; Secure; SameSite=Lax` cookie (`sk_session`), and no API response contains a token.
  - Sessions last at most 7 days. Access tokens are refreshed on the server and expire after 8 hours.
  - The sign-in uses a random `state` checked on return. The return address is limited to `repo`, `spec`, `step` and `view`.
  - The server calls one more destination: `github.com/login/oauth/access_token`, to exchange the sign-in code and refresh tokens.
  - Sessions live in one process. Run a single server process; restarting it signs everyone out.
  - Cookies are `Secure`, so serve the app over HTTPS (browsers allow `http://localhost`).
- **Token mode:** anyone who can reach the server acts as the token's owner, which is why it listens on `127.0.0.1` only.
- Caches are keyed by user and repository, so one person never receives data loaded with another person's access.
- `POST /api/gates`, `POST /api/repos/detect` and `POST /auth/logout` only accept same-origin requests, which blocks cross-site posts.
- Tokens never leave the server, and no URL ever contains one.

In GitHub mode the command bar copies the command for you to paste into Claude Code. The app doesn't run commands, and it never writes files or branches. Its only writes are to tracking issues.

#### Specs on feat/ branches

Spec Kit writes each spec on its own branch before it is merged. Unless a branch is pinned, the app also reads the repo's `feat/` branches, so unmerged specs show in the Specs list and can be approved before the merge.

- **Which branches:** up to 30 branches whose names start with `feat/`, highest name first. A warning says how many were left out. Other branches are not read, even with an open pull request.
- **Change the prefixes:** set `"branchPrefixes": ["feat/", "spec/"]` in `.specify/speckit-ui.json` on the default branch. `[]` turns branch reading off.
- **Cost:** only spec folders whose git tree differs from the default branch are downloaded. A merged branch costs one call. Results are cached by SHA, so a refresh with nothing new costs two calls: the default branch's commit and the branch list.
- **One row per spec:**
  - An unmerged spec carries its branch name.
  - When a spec exists on several branches, the version that went furthest (most steps done) is shown, then the newest commit. Branches holding the same folder count as one version.
  - The selector in the spec header switches to another branch's version, and the address keeps it (`&branch=feat/…`).
  - Two different specs with the same number both show, with a warning.
- **Working on a branch version:**
  - Steps, files and gate checks use that branch's content, including its submodule pointers for the Implement gate.
  - Approvals go to the spec's single tracking issue.
  - The command bar reminds you to run the command on that branch (`git switch feat/…`).
- **Pinned branch:** pinning a branch (Branch under Advanced, or `GITHUB_REF`) reads only that branch, as before. The Specs list then says so at the top, so missing unmerged specs are not a surprise.
- **Which build am I on?** The commit the app was built from shows at the bottom of the Connect/Settings screen, and as the tooltip of the Speckit logo.

## Gates and approvals

Each step from Specify to Implement has a gate. The **Gate & PRs** tab shows the gate's checks, evaluated from the spec's files:

| Gate | Required (blocks approval) | Warning only |
|---|---|---|
| Specify | spec.md exists; every story has acceptance scenarios; FRs and SCs listed; `checklists/requirements.md` complete | `[NEEDS CLARIFICATION]` markers left (Clarify resolves them) |
| Clarify | no `[NEEDS CLARIFICATION]` markers remain | no clarification answers recorded |
| Plan | plan.md exists; Constitution Check fully ticked; no NEEDS CLARIFICATION in Technical Context | no Constitution Check list |
| Tasks | tasks.md exists; every user story has tasks | tasks that name no file path |
| Analyze | analysis.md saved; no CRITICAL findings | HIGH findings |
| Implement | all tasks checked; linked PRs merged; merged in repo order; submodule pointers include every merge | no linked PRs |

Approvals are stored in **one GitHub issue per spec** in the root repo of the open repository. The issue is labelled `speckit` and titled `Spec NNN: …`:

- Approving a gate ticks its box in the issue and adds a comment with the checks at that commit. The first approval creates the issue.
- **Request changes** posts your note and leaves the gate unticked. **Reopen** unticks an approved gate.
- Approving Implement closes the issue.
- You can also tick a box directly on GitHub; the app reads it on the next refresh.
- The server re-runs the checks before writing, so a failing gate can't be approved through the API.
- The gate shows the approval as soon as GitHub confirms the write. The app uses GitHub's answer to the write itself, and for a few minutes prefers it over GitHub's issue list, which can lag. If someone edits the issue on GitHub afterwards, the newer copy wins.
- Approving twice records once: the button locks while saving, decisions for the same spec run one at a time, and a gate that is already approved, by you or someone else, is reported as *Already approved* without another write.
- Reads revalidate with GitHub (`cache: no-cache`), so the browser never shows a cached copy of the issue list.
- **Limitation:** on the Pages build, if two browsers approve the *first* gate of a spec within a few seconds, before GitHub's list shows the new issue, each may create a tracking issue.

In the rail, a step whose files are done shows **To approve** until its gate is approved, then **Approved**. **Next up** lists the first pending approval for each spec before its next command.

### Approval gates

A step can't go ahead until the gates before it are approved (`specs/004-approval-gates-next`). The rule is the same on the server, on Pages and in Claude Code: a step is locked by the first unapproved gate among the earlier steps that ran. Steps that were not run, such as a skipped Clarify, don't lock anything.

- **In the app**: a locked step shows **Locked** and *Waiting for Specify approval*. The command bar offers no command and says **Approve Specify first**, and **Next up** lists only the approval. The gate of a later step can't be approved, and the server refuses it too (`409 Approve Specify first.`). Work that ran before an earlier gate was approved stays visible, marked **Ran early**. Reopening a gate locks the steps after it again.
- **In Claude Code**: the *gate check*, a hook installed in your project repo, stops `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` and `/speckit-implement` before they run, whether you type them or Claude calls the skill. `/speckit-specify`, `/speckit-constitution`, `/speckit-checklist`, `/speckit-converge` and `/speckit-taskstoissues` are not checked.
- **Turn it off** for a repo with `{ "approvalGates": "off" }` in `.specify/speckit-ui.json`. The app and the gate check both read it.

Install the gate check in a project repo (about 5 minutes):

```bash
mkdir -p .claude/hooks
curl -fsSL https://phungrk.github.io/speckit-ui/speckit-gate.mjs -o .claude/hooks/speckit-gate.mjs
node .claude/hooks/speckit-gate.mjs install   # adds two hooks to .claude/settings.json, keeps the rest
git add .claude && git commit -m "chore: speckit approval gate check"
```

- It needs Node 18+ and GitHub read access to the repo's issues: a logged-in `gh` (used first; it is already set up in Claude Code on the web), or `GH_TOKEN`/`GITHUB_TOKEN`. It only reads the tracking issue and the files in your working tree, and never prints a token.
- To check by hand: `node .claude/hooks/speckit-gate.mjs check 004 plan`. `--version` prints the commit it was built from; download it again when speckit-ui changes the rule.
- If approvals can't be read (offline, no `gh` login, 401/404), the command is stopped with the reason. To run it anyway, start Claude Code with `SPECKIT_GATE_BYPASS="<why>"`. The reason is recorded in the session.
- The app shows *Commands aren't blocked in Claude Code for this repo* until `.claude/hooks/speckit-gate.mjs` and a `.claude/settings.json` that runs it are on the branch you are viewing.
- **Limitation:** Claude Code cloud sessions that open several repositories don't load hooks from the repo, so commands are not blocked there. Single-repo sessions, the CLI and the desktop app do load them.

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

## Development

This repo is developed with Spec Kit 0.15.1 (Claude integration).

- **Rules:** the constitution in `.specify/memory/constitution.md` holds the development rules. `CLAUDE.md` is a summary for coding agents.
- **When to use the full flow:** changes to keys, token permissions or network destinations; a new kind of write; changes affecting two or more modes. Medium features in one mode run specify + plan only. Small fixes go straight to a PR.
- **Font sizes:** every font size goes through `var(--fs-N)`; never write `font-size: 13px`. The phone values (screens up to 760 px wide) are set once, in the `@media (max-width: 760px)` block of `src/styles/modernist.css`. `tests/typescale.test.ts` enforces this. Rules: `specs/006-mobile-font-size/contracts/type-scale.md`.
- **Dogfooding:** speckit-ui manages its own specs. Open `phungrk/speckit-ui` on the Pages site to approve its gates in the app.

## Layout

```
src/
  App.tsx               workspace shell, state, gates, queue
  data.ts / types.ts    sample project (Wallet App) and its types
  views/                one view per phase, plus the draft spec
  NewSpecDialog.tsx     /speckit.specify flow
  Root.tsx              identifies the user, then shows the repo list, the overview or a workspace
  backend.ts            data source: the speckit-ui server, or GitHub/Claude from the browser (static build)
  Connect.tsx           static build: token and key entry
  project/              GitHub mode: types, step derivation, gates, views, Copilot context,
                        repo list, overview, sign-in screens, prefs and URL state
  copilot/              Copilot panel, context builder, gate brief, API client, offline responder
  styles/               modernist.css (design system), workspace.css (app layout)
server/
  routes.ts             every /api and /auth route (also mounted by the Vite dev server): modes, per-request access
  session.ts            sign-in mode: GitHub App web flow, in-memory sessions
  copilot.ts            /api/copilot handler
  claude.ts             the Claude call shared by the server and the static build
  github.ts             loads and caches projects, lists repos, detects Spec Kit (shared with the static build)
  tracking.ts           tracking issues, linked PRs, submodule bumps (shared with the static build)
  parse.ts              parsers for constitution, spec, plan, tasks, analysis and checklists
  index.ts              production static and API server
tests/                  unit tests: parsers, step derivation, gates, GitHub loader and tracking, repo listing,
                        caches, sign-in and sessions (all against a fake GitHub), prefs, overview, Copilot logic
```

## Status

Possible next steps:

- Run `/speckit-*` commands from the app through Claude Code sessions.
- Multiple approvers per gate, mapped to GitHub users.
