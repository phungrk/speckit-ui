---

description: "Task list for 004 approval gates block the next step"
---

# Tasks: Phải duyệt xong mới sang bước tiếp theo

**Input**: Design documents from `/specs/004-approval-gates-next/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-api.md, contracts/gate-check.md, quickstart.md

**Tests**: Có. Constitution nguyên tắc V bắt buộc test cho suy ra trạng thái, kiểm tra cổng và luồng ghi. Mọi test dùng GitHub và `gh` giả lập, với fixture tự tạo.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Cấu trúc hiện có:
- SPA trong `src/`;
- logic GitHub dùng chung trong `server/`;
- test trong `tests/`;
- thư mục mới `hook/` cho nguồn script hook.

Xem plan.md → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Add `approvalGates` to `parseUiConfig` in `server/parse.ts`. Values are `"block"` (default) and `"off"`. Anything else, or a missing field, means `"block"` (R6). Update the doc comment above it.
- [X] T002 [P] Add `approvalGates: 'block' | 'off'` and `gateCheck: 'installed' | 'missing'` to `Project` in `src/project/types.ts` (data-model.md). Add both fields to every `Project` fixture in `tests/overview.test.ts`, `tests/project.test.ts` and `tests/tracking.test.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single lock rule (R1), which every story uses.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Move `phaseStatus`, `allTasks` and `LiveStatus` from `src/project/phases.ts` into the new `src/project/status.ts`:
  - `status.ts` imports only `./types.ts`, so Node and the hook bundle can load it;
  - `phases.ts` re-exports all three, so existing imports keep working.
- [X] T004 Add `blockingGates(status, issue, mode)` to `src/project/gates.ts` (data-model.md):
  - It returns, per step, the first unapproved gate among earlier `done` steps 1–6, or `null`.
  - `skipped` steps never block; step 0 never blocks.
  - `issue == null` means no gate is approved; `mode === 'off'` gives all `null`.
  - Also add `blockedReason(k)`, which returns `Approve ${GATE_NAME[k]} first.`.
- [X] T005 In `server/github.ts`, set `approvalGates` from `parseUiConfig` and `gateCheck` (R7):
  - Add `.claude/settings.json` to the small files read at load.
  - `gateCheck` is `installed` when the tree has `.claude/hooks/speckit-gate.mjs` and `settings.json` contains `speckit-gate.mjs`; otherwise `missing`.
  - Branch versions (specs/003) keep the default branch's values.
- [X] T006 [P] Write `tests/gating.test.ts` foundational cases for `blockingGates`:
  - Specify unapproved blocks 2–6;
  - after Specify is approved, the first `done` step that is not approved blocks the steps after it;
  - Not run Clarify does not block, including `**Track**: light`;
  - gates ticked out of order still block at the first gap;
  - `null` issue;
  - `off`.
- [X] T007 [P] Add config and `gateCheck` cases to `tests/gating.test.ts`:
  - `parseUiConfig` reads `approvalGates`, with `"off"`, a missing value and junk;
  - `loadProject` on `tests/fakeGitHub.ts` gives `missing` without the hook files, and `installed` with both files;
  - `settings.json` without `speckit-gate.mjs` gives `missing`.

**Checkpoint**: The rule is unit-tested; the UI and hook can now use it.

---

## Phase 3: User Story 1 - Bước sau bị khoá cho tới khi cổng trước được duyệt (Priority: P1) 🎯 MVP

**Goal**: In speckit-ui, a step after an unapproved gate shows Locked. No command is suggested or copyable for it, and Next up only shows the pending approval. Approving unlocks the step at once; reopening locks it again.

**Independent Test**: Quickstart scenario 1, steps 1–4 and 7–9.

### Tests for User Story 1

- [X] T008 [P] [US1] Add `buildOverview` cases to `tests/gating.test.ts`:
  - a blocked spec yields only `Approve K`;
  - with `tracking === null` and `approvalGates: 'block'`, no `run` or `implement` items appear;
  - with `off`, behaviour is as before.
- [X] T009 [P] [US1] Add `decideGate` cases to `tests/tracking.test.ts`:
  - approving Plan while Specify is unapproved throws `GateRefused('Approve Specify first.')`, and nothing is written (no POST or PATCH in the fake's calls);
  - `reopen` and `changes` are never refused for this reason;
  - approving Specify, then Plan, succeeds;
  - with `off`, the old behaviour applies;
  - on a `feat/` branch version from `tests/fakeGitHub.ts` `fakeBranches` (specs/003), approving Plan with Specify unapproved is refused the same way (FR-010, analysis G1).

### Implementation for User Story 1

- [X] T010 [US1] In `server/tracking.ts` `decide()`, before any write and after the issue is re-read:
  - compute `blockingGates(phaseStatus(project, f), freshIssue, project.approvalGates)` for the gate's step;
  - if it is not `null`, throw `GateRefused(blockedReason(k))`;
  - leave the 409 mapping in `server/routes.ts` as it is (contracts/ui-api.md).
- [X] T011 [US1] In `src/project/overview.ts` `buildOverview`: when `approvalGates === 'block'` and `tracking` is `null`, return no `run` or `implement` items. When tracking is loaded, the existing approve-first order already covers blocked specs.
- [X] T012 [US1] In `src/project/LiveWorkspace.tsx`, compute `blocked = blockingGates(status, issue, project.approvalGates)` for the open spec, and per row for the Specs list. Then:
  - rail cell: blocked and not `done` → class `locked`, label `Locked`, lock icon;
  - Specs progress bar: blocked cells use `locked`;
  - command bar for a blocked step: empty read-only input, Copy disabled, and a `sk-cmdhint` line "Approve K first" that selects step K when clicked or activated with the keyboard;
  - command bar when approvals can't be loaded and gates are on: Copy disabled, with the line "Approvals could not be checked, so no command is suggested.".
- [X] T013 [P] [US1] In `src/project/views.tsx` `NotStarted`, accept an optional `blockedBy` gate and `onGoTo`. When set, show "Waiting for K approval", a lock icon, and a `btn btn-secondary` "Go to K". Show no command.
- [X] T014 [P] [US1] In `src/project/GatePanel.tsx`, accept `blockedBy`. When set and the gate is not approved:
  - disable Approve;
  - show one `sk-warn` "Approve K first.";
  - replace both the "Fix the failing checks…" line and the "K has no output yet. Run /speckit-k first." line (`GatePanel.tsx:86`), so no command for a blocked step appears in the Gate panel (analysis U1, SC-001).
- [X] T015 [P] [US1] In `src/project/copilot.ts`:
  - add "Locked: waiting for K approval" to the live context when the selected step is blocked;
  - make the offline answers suggest the pending approval instead of a blocked command.
- [X] T016 [US1] Pass `blockedBy` and `onGoTo` from `src/project/LiveWorkspace.tsx` to `NotStarted`, `GatePanel` and the Copilot context. Confirm that approving or reopening re-renders the unlocked or locked state from the `tracking` returned by `decide` (R10, FR-009).

**Checkpoint**: US1 works on server and Pages; quickstart scenario 1 steps 1–4 and 7–9 pass.

---

## Phase 4: User Story 2 - Chặn cả khi chạy lệnh ngoài speckit-ui (Priority: P1)

**Goal**: A Claude Code hook in the project repo stops `/speckit-clarify` … `/speckit-implement` before they run when an earlier gate is unapproved. speckit-ui ships the hook and tells repos without it how to install it.

**Independent Test**: Quickstart scenarios 2 and 3.

### Tests for User Story 2

- [X] T017 [P] [US2] Write `tests/hook.test.ts`, calling the hook's exported `run(input, env, deps)` with a fake `gh`/fetch and a temp project dir built from synthetic files:
  - `UserPromptSubmit` `/speckit-plan 001` is blocked (exit 2, message with the gate and issue link) and allowed once approved;
  - `PreToolUse` `Skill` `speckit-plan` behaves the same, with the skill name in `skill`, `name` or `command`;
  - non-gated commands and non-commands pass;
  - spec resolution order works: argument `NNN`, then `SPECIFY_FEATURE`, then `.specify/feature.json`, then the branch name (R4);
  - `approvalGates: "off"` passes;
  - `gh` failure, a 401 or no credentials give exit 2 with the `SPECKIT_GATE_BYPASS` hint;
  - with the variable set, the command runs and the bypass is recorded on both paths: on `UserPromptSubmit` the reason is printed on stdout (added to the session); on `PreToolUse` the hook prints JSON `permissionDecision: "allow"` with `permissionDecisionReason` naming the bypass (analysis U2);
  - an unexpected throw gives exit 2;
  - no file in the temp dir changes.
- [X] T018 [P] [US2] Add `install` cases to `tests/hook.test.ts`:
  - it creates `.claude/settings.json` when missing;
  - it keeps existing keys and hooks;
  - running it twice adds no duplicates;
  - the command matches contracts/gate-check.md.

### Implementation for User Story 2

- [X] T019 [US2] Create `hook/speckit-gate.ts` per contracts/gate-check.md:
  - read the JSON on stdin;
  - recognise gated commands with any prefix, also reading `.specify/integration.json` (R3);
  - resolve the spec (R4);
  - read files with `server/parse.ts` and get status from `src/project/status.ts`;
  - read config with `parseUiConfig`;
  - read the tracking issue with `gh api` or `fetch` and `GH_TOKEN`/`GITHUB_TOKEN`, taking the repo from `git remote get-url origin`, and parse it with `parseIssueBody` (R5);
  - decide with `blockingGates`;
  - handle `SPECKIT_GATE_BYPASS` (recorded on both paths, as in T017), `install`, `check <spec> <step>` and `--version`.

  Export `run()` for tests; the CLI entry wraps it and maps every error to exit 2. Never print tokens.
- [X] T020 [US2] Add `vite.hook.config.ts`:
  - SSR or library build of `hook/speckit-gate.ts` into one ES module at `dist/speckit-gate.mjs`, with `emptyOutDir: false`;
  - Node built-ins external, a banner `// speckit-gate <commit>` from the `buildCommit()` helper in `vite.config.ts` (from PR #12; export it so both configs share it).

  In `package.json`, make `build` run it after `vite build`, so Pages and the server serve `speckit-gate.mjs`.
- [X] T021 [US2] Show the install hint in `src/project/LiveWorkspace.tsx`: when `approvalGates === 'block'` and `gateCheck === 'missing'`, add a `sk-cmdhint` line "Commands aren't blocked in Claude Code for this repo. Install the gate check →", linking to the README section from T025 (FR-012, US2-AS4).
- [X] T022 [US2] Smoke-test the built bundle in `tests/hook.test.ts`:
  - the test builds the hook itself with `vite build --config vite.hook.config.ts` into a temp `outDir`, so `npm test` in CI (which runs before `npm run build`) still covers the shipped file (analysis G2);
  - run `node <out>/speckit-gate.mjs --version` and a blocked `UserPromptSubmit` input with a fake `gh` on `PATH`;
  - check exit 2 and that it runs without TypeScript at runtime.

**Checkpoint**: Quickstart scenarios 2 and 3 (steps 1–7) pass. Step 8, a real Claude Code session, is recorded in T029.

---

## Phase 5: User Story 3 - Việc đã làm trước khi duyệt (Priority: P2)

**Goal**: Steps that ran before an earlier gate was approved stay visible, labelled "Ran early". Their gates can't be approved out of order.

**Independent Test**: Quickstart scenario 1, steps 5–6.

### Tests for User Story 3

- [X] T023 [P] [US3] Add cases to `tests/gating.test.ts`:
  - a spec with `plan.md` and `tasks.md` but Specify unapproved shows Plan and Tasks as `done` and blocked ("Ran early");
  - approving in order unlocks each next gate whose checks pass (US3-AS3).

### Implementation for User Story 3

- [X] T024 [US3] In `src/project/LiveWorkspace.tsx`, for a `done` step that is blocked:
  - rail cell gets class `review` and label `Ran early`;
  - the doc view keeps its content and adds `sk-warn` "Ran before K was approved" above it (FR-006).

  `GatePanel` already disables Approve through `blockedBy` (T014).

**Checkpoint**: All three stories work independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T025 [P] Add an "Approval gates" section to `README.md`:
  - what is locked and why, and the `approvalGates: "off"` switch;
  - installing the gate check in ≤ 5 minutes (the `curl` + `node … install` + commit steps from R8);
  - what happens offline (`SPECKIT_GATE_BYPASS`), and that the hook needs Node, `gh` or a token, and Issues read;
  - the limit that multi-repo Claude Code cloud sessions don't load repo hooks, so commands are not blocked there (analysis U3).

  Link to it from T021.
- [X] T026 [P] Update spec 001's Non-Goal line in `specs/001-approve-button-state/spec.md` to say spec 004 replaces it.
- [X] T027 Run `specs/004-approval-gates-next/quickstart.md` scenarios 1 and 2 with Playwright against a synthetic GitHub, on Pages and on the server build, including 390 px width. Include a spec on a `feat/` branch (FR-010). Check that no `/speckit-<k>` text for a blocked step is *visible anywhere* on the page or copyable (SC-001, analysis U1), and time the unlock after Approve (SC-002).
- [X] T028 [P] Check demo-mode pixel parity of `src/App.tsx` against `main` at 1440×900 and 924×540, on the main screen and the New spec dialog (constitution IV).
- [X] T029 Run `specs/004-approval-gates-next/quickstart.md` scenario 3 against `dist/speckit-gate.mjs`:
  - with `dist/speckit-gate.mjs` in a temp repo and a fake `gh`;
  - in a fresh Claude Code session on a scratch repo with the hook installed, confirm a typed `/speckit-plan` and a model `Skill` call are both blocked;
  - record the real `PreToolUse` `tool_input` field names and adjust `hook/speckit-gate.ts` if needed (R2).

  No writes to real GitHub.
- [X] T030 Run all four quality gates from `package.json`: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` (constitution V)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories.
- **US1 (Phase 3)** and **US2 (Phase 4)**: Both depend only on Phase 2, and can run in parallel.
- **US3 (Phase 5)**: Depends on US1 (it shares `LiveWorkspace.tsx` and `blockedBy` in `GatePanel`).
- **Polish (Phase 6)**: After the stories it checks; T025 can start any time.

### Within Each User Story

- Tests are written first and fail before implementation.
- US1: T010 (server) and T011 are independent; T012 comes before T016; T013, T014 and T015 are parallel.
- US2: T019 before T020 before T022; T021 is independent.

### Parallel Opportunities

- T001 ∥ T002; T006 ∥ T007.
- After Phase 2, US1 and US2 can proceed together, since they touch different files except `LiveWorkspace.tsx` (T012, T016, T021: run sequentially).
- T013 ∥ T014 ∥ T015; T017 ∥ T018; T025 ∥ T026 ∥ T028.

---

## Parallel Example: User Story 1

```bash
Task: "T008 buildOverview cases in tests/gating.test.ts"
Task: "T009 decideGate refusal cases in tests/tracking.test.ts"
# then
Task: "T013 NotStarted blocked view in src/project/views.tsx"
Task: "T014 GatePanel blockedBy in src/project/GatePanel.tsx"
Task: "T015 Copilot context in src/project/copilot.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T017 hook run() cases in tests/hook.test.ts"
Task: "T018 install cases in tests/hook.test.ts"   # same file: write together
Task: "T021 install hint in src/project/LiveWorkspace.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phases 1–2.
2. US1: locks, no command for blocked steps, server-side refusal.
3. **STOP and VALIDATE** with quickstart scenario 1, steps 1–4.

US1 alone is not the full ask: commands still run in Claude Code. Ship it together with US2.

### Incremental Delivery

- US1 + US2 together answer the request ("phải có Approve thì bước tiếp theo mới có thể thực hiện được").
- US3 makes existing specs, such as speckit-ui 001/002 and tohong, readable under the new rule. It ships in the same PR.
- Modes: server and Pages; demo unchanged. The hook runs in Claude Code in the user's project repo.

### Notes

- Branch: `feat/004-approval-gates-next`. The PR description mentions `specs/004-approval-gates-next`.
- Save `/speckit-analyze` output as `specs/004-approval-gates-next/analysis.md` before implementing.
- Never write to real GitHub in tests or manual checks; fixtures are synthetic (constitution V).

## Implementation notes

- T003: `phaseStatus`, `allTasks` and `LiveStatus` now live in `src/project/status.ts`; `phases.ts` re-exports them. `server/tracking.ts` and the hook import `status.ts` directly.
- T005: `gateCheck` reads `.claude/settings.json` only when the tree has it, so a repo without it costs no extra call.
- T010: the refusal is checked on the issue just re-read, before the checks and before any write. A test covers an approval made on GitHub after the list was read. Pre-004 tests in `tests/tracking.test.ts` and `tests/overview.test.ts` run with `approvalGates: 'off'`; the new behaviour is tested in `tests/gating.test.ts` and in the new `decideGate` block.
- T012:
  - The command bar shows "Loading approvals…" until tracking loads, then "Approvals could not be checked…" if it fails.
  - The "Run on feat/x: git switch" line is hidden while the step is locked.
  - "Approve K first" is a keyboard-focusable button (`.sk-hintlink`).
- T017/T019:
  - A bypass (`SPECKIT_GATE_BYPASS`) only applies when approvals can't be read. It never overrides a gate that GitHub says is unapproved.
  - The hook skips GitHub when no earlier step ran.
- T020: `buildCommit()` is exported from `vite.config.ts`. `npm run build` now also runs `vite build --config vite.hook.config.ts`, writing `dist/speckit-gate.mjs` (21 kB, Node 18 target). The server serves `.mjs` as `text/javascript`.
- T027: Pages and server (token mode), synthetic acme/alpha, 60 ms per call. All steps pass:
  - Plan is Locked, the command bar is empty and its Copy button disabled, and the Gate panel says "Approve Specify first.";
  - no `/speckit-plan` text anywhere on the page;
  - Next up shows only approvals, and the install hint is shown;
  - after Specify is approved, Plan is unlocked about 350 ms after the approval is recorded; reopening Specify locks it again;
  - the Export spec (`feat/002-export-plan`) shows Ran early and its content;
  - `POST /api/gates` returns `409 Approve Specify first.`;
  - at 390 px the page is 390 px wide.
- 390 px fix: the page was 429 px wide on `main` too, because grid tracks in `.sk-live` would not shrink below the step rail. `src/styles/live.css` now sets `minmax(0,1fr)` on them under 760 px. Demo is unaffected.
- T028: demo identical to `main` at 1440×900 and 924×540, on the main screen and the New spec dialog.
- T029: Claude Code 2.1.302 on a scratch repo with `dist/speckit-gate.mjs` installed and a fake `gh`:
  - typed `/speckit-plan 001` is blocked before any turn runs (0 turns, no file changed);
  - when Claude calls the Skill tool, the call is denied with the same message.
  The real `PreToolUse` input is `tool_input: { "skill": "speckit-plan", "args": "001" }`, which matches the field the hook reads first (R2 confirmed).
- T030: 167 tests, typecheck, build and build:pages pass.
