---

description: "Task list for 005 link PRs to the tracking issue"
---

# Tasks: Liên kết PR với issue và đóng issue khi PR được merge

**Input**: Design documents from `/specs/005-link-pr-issue/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pr-links.md, quickstart.md

**Tests**: Có. Constitution nguyên tắc V bắt buộc test cho kiểm tra cổng và luồng ghi, và plan.md liệt kê test cho nhận dạng liên kết, `loadTracking`, cảnh báo cổng Implement, `gateCheck: outdated` và mọi nhánh của hook. Test viết trước phần cài đặt tương ứng và phải fail cho tới khi cài xong. Mọi test dùng GitHub và `gh` giả lập, với fixture tự tạo; không chép nội dung từ repo private.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Cấu trúc hiện có, không thêm file nguồn:
- SPA trong `src/`, logic dùng chung trong `src/project/gates.ts`;
- logic GitHub dùng chung trong `server/`;
- script hook trong `hook/speckit-gate.ts` (build thành `dist/speckit-gate.mjs`);
- test trong `tests/` (thêm `tests/links.test.ts`, sửa `tests/hook.test.ts`).

Xem plan.md → Project Structure. Dòng liên kết và bảng đánh giá nằm ở research R1–R2 và data-model.md; kết quả của hook nằm ở contracts/pr-links.md.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Prepare the environment and a baseline. Run `npm ci` (dependencies are not installed in a fresh session), then `npm test` and `npm run typecheck` on this branch to confirm they pass before any change. Playwright and Chromium live outside the repo: run measurement scripts from the scratchpad directory with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` and `require('/opt/node-tools/node_modules/playwright')`. Check that the type scale of spec 006 is on this branch: `grep -c -- '--fs-13' src/styles/modernist.css` must print a number above 0. If it prints 0, PR #18 (spec 006) is not in this branch yet: once it is merged into `main`, merge `origin/main` into this branch; if it is not merged, stop and tell the user, because T015 must not write literal `px` font sizes (the test from 006 forbids them) nor use `var(--fs-N)` before the variables exist. Start `npm run dev` and save screenshots of the demo (`/?demo`) at 1440×900 and 924×540 (main screen and the New spec dialog) to the scratchpad directory, outside the repo, for the demo comparison in T026 (constitution IV).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared link rule (R1, R2), which the app, the server and the hook all use (constitution III).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] In `src/project/types.ts` add `link: 'closes' | 'mentions' | 'none' | null` to `SpecPR` and add `'outdated'` to `Project.gateCheck` (data-model.md). Add `link: null` to every `SpecPR` literal (the `Project` literals keep their `gateCheck`); find the literals with `grep -rn "bumped:" tests src server`.
- [ ] T003 [P] In `server/parse.ts` add `prLinks: 'block' | 'off'` to `UiConfig` and to `parseUiConfig`: `"off"` means off, anything else or a missing field means `"block"`, also in the `catch` default (R6). Update the doc comment above `parseUiConfig`.
- [ ] T004 Write `tests/links.test.ts` first (it fails until T005). Cover, with synthetic bodies and no network:
  - `linkKind(body, issueNumber, rootRepo)` returns `'closes'` for every GitHub closing keyword (`close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`), in any letter case, with `#N`, `Closes: #N` and `owner/root#N`;
  - it returns `'mentions'` for a bare `#N`, for `Part of owner/root#N`, and for a closing keyword followed by a different number;
  - it does not match `#12` inside `#123` or `https://…/issues/12`, and returns `'none'` for an empty or `null` body;
  - `linkStatus` gives the rows of the table in data-model.md (root PR `closes` ✓, root PR `mentions` ✓ (an earlier PR; "Linked to #N"), submodule PR `mentions` ✓, submodule PR `closes` ✗ "Closes #N early", any `none` ✗, `null` no label);
  - `linkLine(12, 'o/root', 'o/root')` is `Closes #12` `linkLine(12, 'o/root', 'o/root', false)` is `Part of #12`, and `linkLine(12, 'o/root', 'o/back')` is `Part of o/root#12`;
  - `parseUiConfig` reads `prLinks` with `"block"` as the default.
- [ ] T005 In `src/project/gates.ts` implement what T004 tests, with no import other than `./types.ts` so the hook can load it: `linkKind(body, issueNumber, rootRepo)`, `linkStatus(link, prRepo, rootRepo, issueNumber)` returning `{ ok: boolean; label: string }` with the labels from contracts/pr-links.md ("Closes #N", "Linked to #N", "Not linked to #N", "Closes #N early"), `linkLine(issueNumber, rootRepo, prRepo, closes = true)` (root PR: `Closes #N`, or `Part of #N` when `closes` is false; PR in another repo: `Part of <root>#N`), and the constant `PR_HOOK_MATCHER = 'Bash|mcp__.*__create_pull_request'`. Reference the closing keywords from one list so the app and the hook cannot drift.
- [ ] T006 Add a test to `tests/links.test.ts` that `loadTracking` (`server/tracking.ts`) sets `link` on each `SpecPR`: a root-repo PR whose body has `Closes #1` gets `closes`; a PR with no reference gets `none`; a spec without a tracking issue gives `null` for all its PRs. Use `fakeGitHub` from `tests/fakeGitHub.ts` and add a case for a spec that exists only on a `feat/` branch (specs/003): its PRs get `link` from the tracking issue found by slug (FR-007). Give the fake `/pulls` answer bodies (extend the fake, not the real code, if it returns `[]` only). It fails until T007.
- [ ] T007 In `server/tracking.ts` `loadTracking`, set `link` for every PR from its description (`p.body`, already loaded by `GET /pulls`) and the spec's tracking issue: `issue ? linkKind(p.body ?? '', issue.number, root(src)) : null`. No extra API call (R2). Make T006 pass.
- [ ] T008 Add a test to `tests/links.test.ts` for `gateCheck: 'outdated'`: a project whose `.claude/settings.json` runs `speckit-gate.mjs` and has the `create_pull_request` matcher is `installed`; one with `speckit-gate.mjs` but without that matcher is `outdated`; no script or no settings entry is `missing`. It fails until T009.
- [ ] T009 In `server/github.ts` (the `gateCheck` line near `CLAUDE_SETTINGS`) return `'outdated'` when `settings.json` contains `GATE_HOOK_FILE` but not `create_pull_request`, `'installed'` when it has both, `'missing'` otherwise (R5). Make T008 pass and run `npm run typecheck`.

**Checkpoint**: The link rule, the `link` field, `prLinks` and `outdated` exist and are tested. Nothing is shown or enforced yet.

---

## Phase 3: User Story 1 - PR được liên kết với issue ngay khi tạo (Priority: P1) 🎯 MVP

**Goal**: Mọi PR của spec có liên kết với issue theo dõi từ lúc tạo (Claude Code bị chặn nếu thiếu), speckit-ui chỉ ra PR nào thiếu và cho sao chép dòng cần thêm (FR-001, FR-002, FR-003, FR-007, FR-008).

**Independent Test**: quickstart kịch bản 1, 2 và 4: speckit-ui hiện đúng nhãn và dòng Copy; hook chặn, cho qua hoặc nhắc đúng theo bảng ở contracts/pr-links.md.

### Tests for User Story 1

- [ ] T010 [US1] In `tests/hook.test.ts` add cases for the hook's new branch, each with a synthetic project folder and fake `gh` (R4, contracts/pr-links.md "Kết quả"). Use `PreToolUse` input with `tool_name: 'Bash'` or an MCP name:
  - `gh pr create --head feat/001-login --title x --body "Adds login"` with a tracking issue #1: exit 2 and stderr contains `Closes #1`;
  - the same with `--body "Adds login\n\nCloses #1"`: exit 0;
  - `--body-file body.md` with and without the line (the file lives in the project folder);
  - `gh api repos/acme/alpha/pulls -f head=feat/001-login -F body=@body.md`, `--method POST` and `-X POST` forms;
  - MCP `mcp__github__create_pull_request` with `owner`, `repo`, `head`, `body`;
  - PR in a submodule repo listed in `.gitmodules`: body `Part of acme/alpha#1` exits 0; body `Closes #1` exits 2 and names `Part of acme/alpha#1`;
  - spec with no tracking issue: exit 0 and JSON `permissionDecision: "allow"` with the reason text from the contract;
  - a body the hook cannot read (a variable, `$(…)`) exits 2 and suggests `--body-file`;
  - GitHub unreachable exits 2 and mentions `SPECKIT_GATE_BYPASS`; with the variable set it allows;
  - a root-repo PR whose body has `Part of #1` (no `Closes`) exits 0, and a body with neither exits 2 and names both lines;
  - `prLinks: "off"` exits 0; a branch or body that matches no spec exits 0; a PR to an unrelated repo exits 0;
  - `gh pr list`, `git push` and `npm test` exit 0 and the fake `github` function is never called and `.specify/speckit-ui.json` is never read (these commands must leave at once, because most Bash commands pass through this hook);
  - a PR for two specs needs both lines;
  - `gh pr create --title x --body "…"` with **no** `--head`: the head is the current branch of the command's directory (`git rev-parse --abbrev-ref HEAD`), so a branch `feat/001-login` is matched to spec 001;
  - `gh pr create --fill` and a command with no body: the body is empty, so the line is missing (exit 2);
  - a spec that exists only on the checked-out `feat/` branch is matched and checked the same way (FR-007).
  These fail until T011–T013.
- [ ] T011 [US1] Add `install` cases to `tests/hook.test.ts`: on a `settings.json` from spec 004 (has the `UserPromptSubmit` and `PreToolUse/Skill` entries) `install` adds only the `Bash|mcp__.*__create_pull_request` entry and keeps everything else; running it twice adds nothing; on an empty file it adds all three. It fails until T014.

### Implementation for User Story 1 (hook)

- [ ] T012 [US1] In `hook/speckit-gate.ts` add `readPrRequest(input)`, a pure function that returns `{ repo, head, body }` or `null` (R4, data-model.md "Yêu cầu tạo PR"):
  - `Bash`: recognise `gh pr create` (`--body`/`-b`, `--body-file`/`-F` read from disk, `--repo`/`-R`, `--head`/`-H`) and `gh api` to `repos/<o>/<r>/pulls` with `-f`/`-F`/`--field`/`--raw-field` or a POST method (`body=`, `body=@file`, `head=`); take the repo from `cd <dir> &&` or the hook's `cwd` and `origin` when not given; when there is no head, use the current branch (`git rev-parse --abbrev-ref HEAD` in that directory); `--fill` or no body means an empty body; a body that cannot be read becomes `unknown`;
  - `mcp__…__create_pull_request`: read `owner`, `repo`, `head`, `body` from `tool_input`;
  - any other command returns `null` before reading config or GitHub.
  Keep the existing `readTarget` for the gated commands.
- [ ] T013 [US1] In `hook/speckit-gate.ts` `run`, handle a PR request before the gated-command branch (contracts/pr-links.md "Kết quả"):
  - return `{ code: 0 }` at once when `readPrRequest` is `null`;
  - read `.specify/speckit-ui.json` and return `{ code: 0 }` when `prLinks` is `"off"` (`approvalGates: "off"` must not turn this check off);
  - find the specs whose slug is in `head` or whose `specs/<slug>` is in `body`; none means exit 0;
  - classify the PR repo: equal to `origin` is the root repo, a repo in `.gitmodules` (use `parseGitmodules` from `server/parse.ts`) is a submodule, anything else exits 0;
  - read the tracking issue with the existing `trackingIssue`; no issue means exit 0 with `allow(...)` and the reminder from the contract;
  - call `linkKind` from `src/project/gates.ts`; a correct line exits 0; a root-repo PR is correct with `Closes #N` or `Part of #N` (only the last PR of a spec should close, spec Q4), a submodule PR only with `Part of <root>#N`; a missing or wrong one exits 2 with `Add "Closes #N" (or "Part of #N" if more PRs follow) to the PR description for <slug> (tracking issue <url>), then create the PR again.` (submodule: `Add "Part of <root>#N" …`);
  - `unknown` body exits 2 with the `--body-file` / `-F body=@file` message; `CantCheck` exits 2 and honours `SPECKIT_GATE_BYPASS` as in spec 004.
  Make the T010 cases pass.
- [ ] T014 [US1] In `hook/speckit-gate.ts` `install`, add the third entry `{ matcher: PR_HOOK_MATCHER, hooks: [entry()] }` to `PreToolUse` when no existing `PreToolUse` group has that matcher, without touching the other entries, and update the returned message. Detect "already installed" per entry (not by the file name alone) so a repo from spec 004 gets upgraded. Make the T011 cases pass.

### Implementation for User Story 1 (speckit-ui)

- [ ] T015 [P] [US1] In `src/project/GatePanel.tsx`, in the "Pull requests · merge order" section, show (R3, contracts/pr-links.md "Giao diện"):
  - when the spec has an issue #N: "Add to the PR description:" with two lines for the root repo, each with its own Copy button: `Closes #N` (last PR) and `Part of #N` (earlier PRs); when `project.submodules` is not empty, a second line "In submodule PRs:" with its own Copy;
  - when the spec has no issue: "No tracking issue yet. Approve Specify to create it, then link PRs to it." (FR-002);
  - on each PR row, `linkStatus(...)`: a `tag` for ✓ and an `sk-warn` for ✗ with the Copy button for the correct line (FR-003); no label when `link` is `null`.
  Use existing classes only (`tag`, `sk-warn`, `btn`), give the Copy buttons an accessible name, and use `var(--fs-N)` for any font size (specs/006). The shared Copy helper in `LiveWorkspace.tsx` (`navigator.clipboard?.writeText`) can be reused or copied.
- [ ] T016 [P] [US1] In `src/project/gates.ts` `gateChecks`, case `implement`, add two non-required (`warn`) checks: "Every PR links to #N" (passes when every PR with a non-null `link` has an OK `linkStatus`) and "A PR in this repo closes #N" (passes when at least one root-repo PR has `link: 'closes'`; left out when the spec has no root-repo PR). Both are left out when the spec has no issue. Add the cases to `tests/links.test.ts` (warning only; `canApprove` unchanged). The `gateChecks` signature may take the issue number or the `link` values already on `prs`.
- [ ] T017 [P] [US1] In `src/project/LiveWorkspace.tsx` add, next to the existing `gateCheck === 'missing'` hint, a `sk-cmdhint` line shown when `project.gateCheck === 'outdated'`: "The gate check here doesn't check PR links yet. Update it →", linking to the README section from T018 (add a constant beside `GATE_CHECK_HELP`).
- [ ] T018 [US1] In `README.md` add a section "Linking PRs to the tracking issue": the lines (`Closes #N` for the last PR in the root repo, `Part of #N` for earlier root-repo PRs, `Part of <owner>/<root>#N` for submodule PRs), what GitHub does with each (links both pages, closes only on merge to the default branch, PR closed without merge changes nothing), that only the root-repo PR closes the issue, how to update an installed gate check (download the new `speckit-gate.mjs` and run `install`), the `"prLinks": "off"` switch in `.specify/speckit-ui.json`, and that Claude Code sessions with several repositories do not load the repo's hooks (so the `CLAUDE.md` rule below is the fallback). Link it from the "Approval gates" section.
- [ ] T019 [US1] In `CLAUDE.md`, section "Spec Kit", add the rule from research R8 (in Vietnamese, as in the research): when creating a PR for `specs/NNN-…`, put `Closes #<issue theo dõi>` in the PR description, where the issue is the one with label `speckit` titled `Spec NNN: …`; for a PR in a submodule repo use `Part of <owner>/<root>#<issue>`. Keep the file consistent with `.specify/memory/constitution.md` (it is a summary of it; the rule is an addition, so do not claim it is part of the constitution).

**Checkpoint**: A PR cannot be created from Claude Code without the link, and speckit-ui shows which PRs are linked and how to fix the rest.

---

## Phase 4: User Story 2 - Merge PR thì issue được đóng (Priority: P1)

**Goal**: Merge PR liên kết đóng issue (do GitHub làm), speckit-ui hiện issue đã đóng cùng trạng thái cổng thật, và Implement không bị coi là đã duyệt (FR-004, FR-005, FR-006).

**Independent Test**: quickstart kịch bản 3: issue đóng mà cổng Implement vẫn "To approve"; duyệt Implement giữ issue đóng; reopen mở lại.

### Tests for User Story 2

- [ ] T020 [P] [US2] In `tests/tracking.test.ts` (or `tests/links.test.ts`) add cases for FR-006 with the fake GitHub, using an issue that is already `closed` (as after a merge) whose gates do not tick Implement:
  - `loadTracking` reports `state: 'closed'` for the issue and Implement is still not approved;
  - `decideGate` approving Implement leaves the issue closed and ticks only Implement;
  - `decideGate` reopening or requesting changes sets `state: 'open'` (existing behaviour, now pinned by a test).
  These should pass without code changes (R7); if one fails, fix `server/tracking.ts` `decide` minimally.
- [ ] T021 [P] [US2] Add a case to `tests/links.test.ts`: a root-repo PR in state `closed` (not merged) with `Closes #1` still gets `link: 'closes'` and nothing in the app treats it as closing the issue; and a merged submodule PR with `Part of o/root#1` is `Linked to #1`. This documents FR-005 and the "submodule PR does not close" rule.

### Implementation for User Story 2

- [ ] T022 [US2] Check `src/project/GatePanel.tsx` shows the closed issue next to the real gate state ("Recorded in issue #N (closed)." and the Implement gate still "To approve") when the issue is closed and Implement is not ticked. If the two are not visible together, add the smallest change that shows both, using existing classes. Do not add any new write (spec Non-Goals).
- [ ] T023 [US2] In `README.md`, in the section from T018, add three lines about closing: it is GitHub that closes the issue, only for a PR merged into the default branch, a closed Implement gate is separate (merging does not approve it), and Reopen gate still reopens the issue.

**Checkpoint**: Both stories work independently; no new write exists in speckit-ui.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T024 Run quickstart kịch bản 1 and 2 in a browser with GitHub mocked (Playwright `page.route` on `https://api.github.com/**`, synthetic repos from the quickstart) on the Pages build and the server build, at 1440 px and 390 px: the labels, the Copy button (clipboard holds `Closes #1`), the no-issue message, the Implement warning, and the `outdated` hint. Fix any layout problem with existing classes and `var(--fs-N)` sizes.
- [ ] T025 Run quickstart kịch bản 3 and 4 steps 1–9 as automated tests against `dist/speckit-gate.mjs` (after `npm run build`) with a fake `gh` on `PATH`, and record the result of kịch bản 4 step 10 (a real Claude Code session) and 4b (a session without hooks following the `CLAUDE.md` rule) in the PR description, saying plainly if either was not run.
- [ ] T026 Demo pixel check (quickstart kịch bản 5, constitution IV): capture the same four screenshots as T001 on this branch and compare; they must be identical at 1440×900 and 924×540.
- [ ] T027 Run the four checks that must pass before merge: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` (constitution V).
- [ ] T028 Open the PR from `feat/005-link-pr-issue` with `specs/005-link-pr-issue` in the description and "Modes affected: server, static (display), plus the Claude Code gate check; demo unchanged". Put `Closes #<issue>` for this spec in the description, where `<issue>` is the issue labelled `speckit` titled `Spec 005: …` if it exists (the rule from T019 applied to itself). Merging to `main` deploys to GitHub Pages, so do not merge before T027 is green.

---

## Dependencies & Execution Order

- **Phase 1**: T001 first.
- **Phase 2** depends on T001.
  - T002 and T003 run in parallel (different files).
  - T004 → T005 (tests first), T006 → T007, T008 → T009. T005 needs T002; T007 needs T002 and T005; T009 needs T002.
- **US1 (Phase 3)** depends on Phase 2.
  - Tests T010 and T011 first.
  - Hook: T012 → T013 → T014 (same file, in order).
  - UI: T015, T016, T017 run in parallel with each other and with the hook tasks (different files); T016 edits `src/project/gates.ts` after T005.
  - Docs: T018 and T019 after T013 and T015 so they describe what exists.
- **US2 (Phase 4)** depends on Phase 2 and can run in parallel with US1. T020 and T021 are in parallel; T022 touches `GatePanel.tsx`, so do it after T015; T023 after T018.
- **Polish (Phase 5)** depends on both stories. T024 → T025 → T026 → T027 → T028.

## Parallel Example: User Story 1

```text
Phase 2 done
  ├─ T010, T011 (hook tests)  →  T012 → T013 → T014   (hook/speckit-gate.ts)
  └─ in parallel: T015 GatePanel.tsx · T016 gates.ts + tests · T017 LiveWorkspace.tsx
       └─ T018 README · T019 CLAUDE.md
```

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1 (T001–T019).** US1 delivers the first half of the request, a PR that is linked when it is created, and that link is what makes GitHub close the issue on merge. US2 is mostly verification of GitHub's behaviour plus tests that pin FR-006, so it can ship in the same PR.

Keep the order: shared rule and its tests → hook → display → docs. Every font size in new UI uses `var(--fs-N)` (specs/006), and nothing in this feature writes to GitHub from speckit-ui (constitution I).
