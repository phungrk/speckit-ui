---

description: "Task list for 005 link PRs to the tracking issue and close it on merge"
---

# Tasks: Liên kết PR với issue và đóng issue khi PR được merge

**Input**: Design documents from `/specs/005-link-pr-issue/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pr-links.md, quickstart.md

**Tests**: Có. Constitution nguyên tắc V bắt buộc test cho nhận dạng liên kết, kiểm tra cổng và hook. Mọi test dùng GitHub và `gh` giả lập (`tests/fakeGitHub.ts`), fixture tự tạo, không ghi vào GitHub thật.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Cấu trúc hiện có: SPA trong `src/`, logic GitHub dùng chung trong `server/` và `src/project/gates.ts`, nguồn script hook trong `hook/`, test trong `tests/`. Không thêm file nguồn mới; chỉ thêm `tests/links.test.ts`. Xem plan.md → Project Structure.

**Modes affected**: server và Pages (nhãn liên kết, dòng sao chép, cảnh báo, `outdated`); demo không đổi; ngoài app là hook trong repo dự án.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Add `prLinks` to `parseUiConfig` in `server/parse.ts`. Values are `"block"` (default) and `"off"`. A missing field or anything else means `"block"` (R6). Update the doc comment above it.
- [ ] T002 [P] In `src/project/types.ts`: add `link: 'closes' | 'mentions' | 'none' | null` to `SpecPR`; add `'outdated'` to `Project.gateCheck`; add `prLinks: 'block' | 'off'` to `Project` (set from `parseUiConfig` in `server/github.ts`, next to `approvalGates`; the `outdated` hint in T013 uses it). Add `link: null` to every `SpecPR` fixture and fix every `gateCheck` type use in `tests/overview.test.ts`, `tests/project.test.ts`, `tests/tracking.test.ts`, `tests/gating.test.ts` and `tests/fakeGitHub.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared link rule (R1, R2) and the `outdated` state (R5). Every story uses them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 In `src/project/gates.ts` add the shared link helpers (data-model.md; no Node imports, the hook bundles this file):
  - `linkKind(body, issue, rootRepo, prRepo)` returns `'closes'` when the body has a closing keyword (`close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`, case-insensitive, optional `:`) followed by `#N` or `<rootRepo>#N`; `'mentions'` when it only has `#N` or `<rootRepo>#N`; otherwise `'none'`. Match `#N` as a whole number (`#12` must not match `#123`), and for a PR in the root repo accept `#N` and `<rootRepo>#N`, for a PR in another repo accept only `<rootRepo>#N` (a bare `#N` there means that repo's own issue).
  - `linkLine(issue, rootRepo, prRepo)` returns `Closes #N` for the root repo and `Part of <rootRepo>#N` otherwise.
  - `linkStatus(link, prRepo, rootRepo)` returns `{ ok, label, line }` per the table in data-model.md: `Closes #N`, `Linked to #N`, `Not linked to #N`, `Linked, but won't close #N`, `Closes #N early`; `null` gives no label.
- [ ] T004 In `server/tracking.ts` `loadTracking`, set `link` on each `SpecPR` (R2): `null` when the spec has no tracking issue yet, otherwise `linkKind(p.body, issue.number, root(src), r.repo)`. The PR body is already in the `GET /pulls` list, so make no extra API call. Use the issue number from the same `issues` map that fills `Tracking.issues`.
- [ ] T005 In `server/github.ts` (near line 180) make `gateCheck` return `'outdated'` when the hook file is in the tree and `settings.json` contains `speckit-gate.mjs` but has no PreToolUse entry whose matcher covers `create_pull_request` (R5). Add `GATE_PR_MATCHER = 'Bash|mcp__.*__create_pull_request'` next to `GATE_HOOK_FILE` in `src/project/gates.ts` and use it here and in `install` (T015). Also set `prLinks` on `Project` from `ui.prLinks`. Parse `settings.json` as JSON for this check; if it is not valid JSON, keep today's string check.
- [ ] T006 [P] Create `tests/links.test.ts` with the foundational cases:
  - `linkKind`: every closing keyword and case; `Closes #12` vs `#123`; `Closes o/root#12`; bare `#12` in a root-repo PR gives `mentions`; bare `#12` in a submodule PR gives `none`; `Part of o/root#12` gives `mentions`; empty or null body gives `none`; a keyword for another number gives `none`.
  - `linkLine` for root and submodule PRs.
  - `linkStatus` for all six rows of the data-model.md table.
- [ ] T007 [P] Add to `tests/links.test.ts` (use `tests/fakeGitHub.ts`):
  - `loadTracking` gives `closes`, `mentions`, `none` for three PRs of a spec with an issue, and `null` for a spec without an issue (quickstart scenario 1 fixture `acme/alpha`).
  - Submodule PR `acme/back#3` with `Part of acme/alpha#1` gives `mentions`; `acme/back#4` with `Closes acme/alpha#1` gives `closes`.
  - No extra request is made compared with before (count the fake's calls).
  - `loadProject` gateCheck: `installed` with all three hooks, `outdated` with only the two from spec 004, `missing` without the script.
  - `parseUiConfig` reads `prLinks` for `"off"`, a missing value and junk.

**Checkpoint**: The link rule is unit-tested; the UI and hook can now use it.

---

## Phase 3: User Story 1 - PR được liên kết với issue ngay khi tạo (Priority: P1) 🎯 MVP

**Goal**: speckit-ui shows, per PR of a spec, whether it links to the tracking issue and gives the line to copy. The Claude Code gate check blocks creating a PR without the line and says which line to add. Repos on the spec 004 hook are told to update it.

**Independent Test**: Quickstart scenarios 1, 2 and 4.

### Tests for User Story 1

- [ ] T008 [P] [US1] Add to `tests/links.test.ts` the Implement-gate warning: with `gateChecks(..., issueNumber)` a spec whose PRs are all ✓ gives `Every linked PR links to #N` ok; one unlinked PR gives it not ok and not required (does not block approval); a spec without an issue omits the check; a spec with no PRs passes.
- [ ] T009 [P] [US1] Extend `tests/hook.test.ts` with PR creation (call `run()` with a fake `gh`/fetch and a temp repo `specs/001-login`, `origin` `acme/alpha`, issue #1 from a synthetic tracking issue):
  - `gh pr create --head feat/001-login --body "Adds login"` exits 2 and stderr contains `Closes #1` and the issue URL; with `Closes #1` in the body it exits 0.
  - `--body-file body.md` and `-F body.md`: read the file; a missing file exits 2 with the "could not read" message; `--fill` or no body counts as an empty body.
  - `gh api repos/acme/alpha/pulls -f head=feat/001-login -f title=x -F body=@body.md`: exits 0 with the line, 2 without; `-X POST`/`--method POST` and `--field`/`--raw-field` forms; `gh api repos/acme/alpha/pulls` as a plain GET exits 0 without reading GitHub.
  - MCP `mcp__github__create_pull_request` with `owner`, `repo`, `head`, `body`: exits 2 without the line.
  - Submodule PR (repo in `.gitmodules`): `Part of acme/alpha#1` exits 0; only `Closes #1` exits 2 and names `Part of acme/alpha#1`.
  - Spec found from `specs/<slug>` in the body when the branch has no slug; a PR for two specs needs both lines.
  - Spec without an issue: exit 0 and JSON `permissionDecision: "allow"` with the "No tracking issue" reason.
  - Unknown spec, repo that is neither root nor submodule, `prLinks: "off"` all exit 0. `approvalGates: "off"` does not disable the check.
  - `gh pr list`, `git push`, `npm test`, `cd x && ls` exit 0 and the fake records no GitHub request and no file read (plan.md performance goal).
  - GitHub unreachable or 401 exits 2 with the `SPECKIT_GATE_BYPASS` hint; with the variable set it allows and records the bypass.
  - Existing spec 004 cases for `UserPromptSubmit` and `Skill` still pass.
- [ ] T010 [P] [US1] Add `install` cases to `tests/hook.test.ts`: on a spec 004 `settings.json` it adds only the `PreToolUse` entry with matcher `GATE_PR_MATCHER` and keeps the two old entries and other keys; running it twice adds nothing; on an empty repo it adds all three; the command text matches contracts/pr-links.md.

### Implementation for User Story 1

- [ ] T011 [US1] In `src/project/gates.ts` `gateChecks`, add an optional trailing `issue?: { number: number; rootRepo: string }` parameter. For the `implement` gate, when `issue` is set and the spec has PRs, push `warn('Every linked PR links to #N', prs.every(p => linkStatus(p.link, p.repo, issue.rootRepo).ok))`. Pass it from `src/project/GatePanel.tsx` (line 46) and `server/tracking.ts` (line 206) using the spec's issue and `project.repo`.
- [ ] T012 [US1] In `src/project/GatePanel.tsx`, in the **Pull requests · merge order** block (R3, contracts/pr-links.md):
  - Spec with an issue: show "Add to the PR description:" with the `Closes #N` text in a `sk-id` and a `btn btn-secondary` Copy button (`aria-label="Copy the PR link line"`, keyboard usable). If the project has submodules add "In submodule PRs:" with `Part of <root>#N` and its own Copy.
  - Spec without an issue: "No tracking issue yet. Approve Specify to create it, then link PRs to it."; show it also when the spec has no PRs yet.
  - Each PR: a `tag` with the `linkStatus` label when ok; an `sk-warn` with the label and a Copy button for the right line when not ok. Nothing when `link` is `null`.
  - Use existing classes only (`tag`, `sk-warn`, `btn`); no new colours (constitution IV). Reuse the clipboard helper that the command bar uses in `LiveWorkspace.tsx`; if it is local to that file, move it to a small export in `src/project/` and import it in both.
- [ ] T013 [US1] In `src/project/LiveWorkspace.tsx` (near line 233), when `project.gateCheck === 'outdated'` show a `sk-cmdhint` line "The gate check here doesn't check PR links yet. Update it →" linking to the same README anchor as the install hint (T019). Show it only when `project.prLinks === 'block'`; it is independent of `approvalGates`.
- [ ] T014 [US1] In `hook/speckit-gate.ts` add PR-creation handling per R4 and contracts/pr-links.md:
  - Extend `readTarget` (or add `readPrTarget`) so `Bash` with `tool_input.command` and `mcp__.*__create_pull_request` are recognised. Do the cheap test first: a command with no `gh pr create` and no `gh api` containing `/pulls` returns before any file or GitHub access (under 100 ms).
  - Parse the shell command into words (quotes, `\` line breaks, `&&`/`;` segments, leading `cd <dir> &&`) to get `repo` (`--repo`/`-R`, the `repos/<o>/<r>/pulls` path, MCP `owner`+`repo`, else `origin` of the working directory), `head` (`--head`/`-H`, `-f head=`, MCP `head`, else current branch) and `body` (`--body`/`-b`, `--body-file`/`-F`, `-f body=`, `-F body=@file`, MCP `body`). A body that can't be read (variable, command substitution, missing file) is `unknown` and blocks with the "Could not read the PR description" message.
  - Find specs: slugs in `specs/` contained in `head`, or `specs/<slug>` in the body (same rule as `prMatches`; import it or copy the one-liner without importing Node code). Decide root vs submodule repo from `origin` and `.gitmodules`; any other repo passes.
  - Read the tracking issue with the existing `trackingIssue`, then check `linkKind` for each matching spec as in the contract table. Block with exit 2 and `Add "Closes #N" to the PR description for <slug> (tracking issue <url>), then create the PR again.` (use `linkLine`); allow with the reminder when the spec has no issue; honour `prLinks: "off"` and `SPECKIT_GATE_BYPASS`; keep every error path at exit 2.
  - Keep the spec 004 flow for `UserPromptSubmit` and `Skill` unchanged.
- [ ] T015 [US1] In `hook/speckit-gate.ts` `install`, add the third hook with matcher `GATE_PR_MATCHER` when no entry runs the script for it, and report it in the returned message (`PreToolUse (Bash, create_pull_request)`). Keep existing entries; for a spec 004 install, also keep the old `Skill` entry.
- [ ] T016 [US1] Extend the built-bundle smoke test in `tests/hook.test.ts` (T022 of spec 004, which builds the hook itself): it must still pass, and add a case there that the built `speckit-gate.mjs` blocks a `gh pr create` without the link (exit 2) using the fake `gh` on `PATH`.

**Checkpoint**: US1 works on server and Pages and in the hook; quickstart scenarios 1, 2 and 4 steps 1–9 pass.

---

## Phase 4: User Story 2 - Merge PR thì issue được đóng (Priority: P1)

**Goal**: Merging the root-repo PR closes the issue through GitHub's closing keyword (nothing to build for the closing itself, R1). speckit-ui shows the closed issue with the real gate state and does not treat it as an Implement approval (FR-006, R7).

**Independent Test**: Quickstart scenario 3.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add to `tests/tracking.test.ts` (the fake GitHub from `tests/fakeGitHub.ts`):
  - issue closed, Implement unticked: `loadTracking` returns the issue as `closed` with Implement not approved; `blockingGates` and `canApprove` for Implement are unchanged.
  - `decideGate` approve Implement on the closed issue patches the gate body and sends `state: closed`, and does not reopen it.
  - `decideGate` reopen and changes on the closed issue send `state: open`.
  - A PR closed without merge has `state: 'closed'` and its `link` is still computed; nothing in the app closes or edits an issue (assert the fake saw no PATCH during `loadTracking`).
- [ ] T018 [P] [US2] Add a `GatePanel` render case (Vitest with the existing React test setup, or a pure-function test if the repo has none) that a closed issue shows "issue #N (closed)" while Implement still shows Approve enabled. If `tests/` has no component-test setup, cover it in the Playwright run (T022) instead and say so in the PR description.

### Implementation for User Story 2

- [ ] T019 [US2] Confirm against the code that `server/tracking.ts` `decide()` and `src/project/GatePanel.tsx` already satisfy FR-006 (R7: no change to `decideGate`). If T017 fails, fix the smallest thing it shows; otherwise record "no code change" in the PR description.

**Checkpoint**: Both stories work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Update `README.md`: add a "Linking PRs to the tracking issue" section (the two lines `Closes #N` / `Part of <owner>/<root>#N`, that GitHub closes the issue only on a merge into the default branch, the `prLinks: "off"` switch, and that the hook needs the update step); update the gate-check install section so re-running `curl` + `node … install` upgrades a spec 004 install. Add the anchor used by T013.
- [ ] T021 [P] Note in `specs/004-approval-gates-next/contracts/gate-check.md` that spec 005 adds a third hook to the same script (one line, link to `specs/005-link-pr-issue/contracts/pr-links.md`).
- [ ] T022 Run `specs/005-link-pr-issue/quickstart.md` scenarios 1–3 with Playwright against a synthetic GitHub, on Pages and on the server build, including 390 px width and the Copy buttons (SC-004).
- [ ] T023 [P] Check demo-mode pixel parity of `src/App.tsx` against `main` at 1440×900 and 924×540, on the main screen and the New spec dialog (constitution IV; quickstart scenario 5).
- [ ] T024 Run quickstart scenario 4 against `dist/speckit-gate.mjs` in a temp repo with a fake `gh`. Then, in a fresh Claude Code session on a scratch repo with the hook installed, ask it to create a PR without the link and confirm the command is blocked, Claude adds the line and retries (step 10). Record the real `PreToolUse` `tool_input` field names for `Bash` and the MCP tool and adjust `hook/speckit-gate.ts` if they differ. No writes to real GitHub.
- [ ] T025 Run all four quality gates from `package.json`: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` (constitution V). In the PR description name `specs/005-link-pr-issue`, the modes touched, and that no new GitHub write was added.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks both stories.
- **US1 (Phase 3)**: Depends on Phase 2.
- **US2 (Phase 4)**: Depends on Phase 2 only (its tests use `link` and the closed-issue paths); it can run in parallel with US1.
- **Polish (Phase 5)**: After the stories; T020 and T021 can start once the behaviour is fixed.

### Within Each Phase

- T003 before T004, T005 and T006. T005 adds the `GATE_PR_MATCHER` constant that T015 uses.
- US1: tests T008–T010 first and failing; T011 before T012; T014 before T015 and T016; T012 and T013 touch different files from T014, so the app part (T011–T013) and the hook part (T014–T016) can proceed in parallel.
- `src/project/GatePanel.tsx` is touched by T011 and T012, and `src/project/LiveWorkspace.tsx` by T012 (only if the clipboard helper moves) and T013: run those sequentially.

### Parallel Opportunities

- T001 ∥ T002; T006 ∥ T007; T008 ∥ T009 ∥ T010; T017 ∥ T018; T020 ∥ T021 ∥ T023.

---

## Implementation Strategy

**MVP**: Phase 1 → Phase 2 → US1. That gives the link rule, the visible status and copy line, and the hook that makes Claude Code add the line, which is what makes GitHub close the issue on merge. US2 adds the tests that pin the closed-issue behaviour (FR-006) and needs almost no code, so deliver it in the same PR.

**Order of delivery**: foundational helpers (T003–T007) → app display (T011–T013) → hook (T014–T016) → polish. Land it as one PR from `feat/005-link-pr-issue` that mentions `specs/005-link-pr-issue`; after merging, reinstall the hook in speckit-ui and tohong (`curl` + `node … install`) so their PRs are checked.
