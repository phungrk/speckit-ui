---

description: "Task list for 006 mobile font size"
---

# Tasks: Cỡ chữ phù hợp màn hình điện thoại

**Input**: Design documents from `/specs/006-mobile-font-size/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/type-scale.md, quickstart.md

**Tests**: Có một file test tĩnh (`tests/typescale.test.ts`), viết trước và phải fail cho tới khi thang cỡ chữ được thay vào (constitution V, research R6). Phần đo trên trình duyệt chạy tay theo quickstart bằng Playwright có sẵn trong môi trường; script đo để trong thư mục scratchpad, không commit và không thêm dependency.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Cấu trúc hiện có, không thêm file nguồn:
- CSS trong `src/styles/` (`modernist.css`, `workspace.css`, `live.css`);
- TSX trong `src/`;
- test trong `tests/`.

Xem plan.md → Project Structure. Thang cỡ chữ và bảng quy đổi nằm ở data-model.md; khối CSS chuẩn nằm ở contracts/type-scale.md.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Prepare the environment and capture the baseline before any CSS change. Run `npm ci` (dependencies are not installed in a fresh session). Playwright and Chromium are installed outside the repo, so run measurement scripts from the scratchpad with `NODE_PATH=/opt/node-tools/node_modules` and `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`. Then, on this branch (it differs from `origin/main` only by files under `specs/`), run `npm run dev` and save screenshots of the demo at 1440×900 and 924×540 (main screen and the New spec dialog) to the scratchpad directory, outside the repo (constitution IV, quickstart "Chuẩn bị"). Also save the computed `font-size` of `body`, `h1`–`h6`, `.btn`, `.input`, `.table`, `.sk-md` at 1440 px for later comparison.
- [X] T002 [P] Write `tests/typescale.test.ts` (research R6, data-model.md "Quy tắc kiểm được"). It reads `src/styles/*.css` and `src/**/*.tsx` as text and asserts:
  - no `font-size: <number>px` remains in any rule, except the one sanctioned rule `input, select, textarea { font-size: 16px !important }` inside the phone block (the test must allow exactly that one line and fail on any other literal), and no `fontSize: <number>` remains in any `.tsx`;
  - every `var(--fs-N)` that is used is declared in `:root`;
  - each `--fs-N` in `:root` equals `Npx` (SC-002);
  - inside `@media (max-width: 760px)` the 15 values match the table in `data-model.md`, all are ≥ 12px, and `--fs-14` and `--fs-15` are 16px (FR-002, FR-003);
  - mobile sizes never invert order: for `a < b`, phone(`--fs-a`) ≤ phone(`--fs-b`);
  - the phone block contains `input, select, textarea { font-size: 16px !important; }` (FR-004).
  Use no network and no fixtures from users' repos. The test fails until T003–T007 and T014 are done.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The type scale (R2), which every story uses. After this phase the whole app already follows the scale; the user stories verify and fix what the scale exposes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Add the type scale to `src/styles/modernist.css`, right after the `--font-*` tokens in `:root`: 15 variables `--fs-10 … --fs-42`, each equal to `Npx`. Then add one `@media (max-width: 760px) { :root { … } }` block with the phone values from `data-model.md` (`--fs-10/11/12: 12px`, `--fs-13: 14px`, `--fs-14/15: 16px`, `--fs-16: 17px`, `--fs-17/18: 18px`, `--fs-20: 20px`, `--fs-24/25: 22px`, `--fs-28/32: 26px`, `--fs-42: 30px`). Use the block in `contracts/type-scale.md` and add a short comment naming the rule "every font size goes through `var(--fs-N)`".
- [X] T004 [P] In `src/styles/modernist.css`, replace every `font-size: <N>px` with `font-size: var(--fs-<N>)`, keeping the spacing of each line (24 declarations: body, `h1`–`h6`, `.input`, `.btn`, `.card-*`, `.table`, `.dialog-*`, `.nav`, …). Do not touch the new `--fs-*` declarations. Keep the plain `font: inherit` lines as they are.
- [X] T005 [P] In `src/styles/workspace.css`, replace every `font-size:<N>px` with `font-size:var(--fs-<N>)` (70 declarations, compact style, no added spaces).
- [X] T006 [P] In `src/styles/live.css`, replace every `font-size:<N>px` with `font-size:var(--fs-<N>)` (29 declarations, compact style).
- [X] T007 [P] Replace `fontSize: 13` with `fontSize: 'var(--fs-13)'` in all 13 places in `src/App.tsx`, `src/views/views.tsx`, `src/project/GatePanel.tsx`, `src/project/views.tsx`, `src/project/Overview.tsx`, `src/project/RepoPicker.tsx` and `src/project/LiveWorkspace.tsx`. Do not change any other prop.
- [X] T008 Check that the replacement is mechanical and lossless:
  - `git diff -U0 -- src` shows only `font-size` / `fontSize` changes (no stray edits);
  - the counts match 24 + 70 + 29 CSS and 13 TSX;
  - `npx vitest run tests/typescale.test.ts` passes except the input rule (done in T014);
  - `npm run typecheck` passes.

**Checkpoint**: The type scale is in place. Desktop output is identical by construction (FR-005).

---

## Phase 3: User Story 1 - Đọc được nội dung chính trên điện thoại mà không phải phóng to (Priority: P1) 🎯 MVP

**Goal**: Chữ nội dung 16px, chữ phụ 14px, không chữ nào dưới 12px, mọi màn hình không tràn ngang (FR-001, FR-002, FR-003, FR-006, FR-007).

**Independent Test**: quickstart kịch bản 2, 5 và 6 ở 390px (và 360, 430, 760px).

- [X] T009 [US1] Measure at 390 px with the console snippet in quickstart kịch bản 2 on every screen: connect, repo list, workspace (each of the 8 steps), Overview, New spec dialog, gate dialog, Copilot panel. Write down each element that is below 16px but carries paragraph, list, table or spec-document text (FR-002), and each below 12px (FR-003). Classify each element with the content-vs-secondary rule in `data-model.md` ("Chữ nội dung và chữ phụ"). Save the list in the scratchpad.
- [X] T010 [US1] For each element in the T009 list that the rule in `data-model.md` classes as content but that is below 16px on the phone, add a phone-only override inside the `@media (max-width: 760px)` block: `selector { font-size: var(--fs-14); }` (or the token that gives 16px). Put overrides in the same CSS file as the original rule and keep them together under one comment. **Never** change the token on the element's base rule: that would change the desktop size and break SC-002. Start with `.sk-props li` and `.sk-files` (list rows at 13 px). For each element below 12 px, fix the variable table in `src/styles/modernist.css` instead. If an explicit `line-height` below 1.4 sits on 16px content text, raise it to about 1.5 inside the phone block (FR-002). Re-run the T009 measurement until the list is empty.
- [X] T011 [US1] Check horizontal overflow (quickstart kịch bản 5) at 360, 390, 430 and 760 px for the workspace: step rail (`.sk-cell`, `.sk-bar`), the task table, `.sk-props` (`grid-template-columns: 96px 1fr`), command bar (`.sk-cmdin`, `.sk-cmdhint`), the gate panel and the Copilot panel. Fix each overflow locally in `src/styles/workspace.css` or `src/styles/live.css`, inside the existing `@media (max-width: 760px)` blocks, with `overflow-wrap`, `minmax(0, 1fr)` columns or an `overflow-x: auto` wrapper for wide tables and code (research R7). Do not redesign the layout.
- [X] T012 [US1] Check the same overflow and clipped-text conditions for the connect screen, repo list, Overview, boot/error screen and the New spec dialog, in `src/styles/live.css` and `src/styles/workspace.css` (`.sk-connect`, `.sk-repos`, `.sk-boot`, `.sk-ns-*`). Fix locally as in T011.
- [X] T013 [US1] Check the 760/761 px boundary (quickstart kịch bản 6): at 760 px `getComputedStyle(document.body).fontSize` is `16px` and at 761 px it is `15px`, in demo, server and static builds (FR-005, FR-009).

**Checkpoint**: A full spec can be read on a phone with no zoom and no horizontal scrolling.

---

## Phase 4: User Story 2 - Nhập liệu trên điện thoại không bị trình duyệt tự phóng to (Priority: P2)

**Goal**: Mọi ô nhập, ô chọn và vùng văn bản có chữ 16px trên điện thoại (FR-004).

**Independent Test**: quickstart kịch bản 3.

- [X] T014 [US2] In the phone `@media (max-width: 760px)` block of `src/styles/modernist.css`, add `input, select, textarea { font-size: 16px !important; }` with a one-line comment: iOS zooms into any field below 16px; this is the only `!important` for font size (research R5, Complexity Tracking). Confirm `npx vitest run tests/typescale.test.ts` now passes completely.
- [X] T015 [US2] Run quickstart kịch bản 3 at 390 px: `getComputedStyle(el).fontSize === '16px'` for every `input`, `select` and `textarea` on the connect screen, repo search, `.sk-repo-switch`, `.sk-cmdin`, the approval note (`.sk-note textarea`), the Copilot input (`.sk-cp-in textarea`) and the New spec dialog fields. Check that field labels (`.field label`) are ≥ 12 px and button text (`.btn`) ≥ 14 px (US2-AS2). Fix any field that wraps badly or overflows now that its text is larger, in `src/styles/workspace.css` or `src/styles/live.css`.
- [ ] T016 [US2] On a real iPhone or an iOS simulator, tap each field from T015 in the static build and confirm the page does not zoom (SC-003). If no iOS device is available, say so in the PR description instead of claiming it passed.

**Checkpoint**: Connecting, searching and approving work on iOS without the page jumping.

---

## Phase 5: User Story 3 - Tiêu đề và chữ cỡ lớn thu nhỏ vừa màn hình hẹp (Priority: P3)

**Goal**: Tiêu đề lớn nhất 30px, không tiêu đề nào bị cắt hay tràn ở 360px (FR-001, US3).

**Independent Test**: quickstart kịch bản 4 ở 360 px.

- [X] T017 [US3] At 360 px read the computed sizes of `h1`–`h6`, `.dialog-title`, `.sk-ns-head .dialog-title`, `.sk-roman`, `.sk-stats b` and `.nav-brand`; they must be 30, 26, 22, 20, 17, 14, 20, 22, 26, 26 px and 18 px (20 px inside `.sk-boot` and `.sk-connect`) respectively (data-model.md). If any differs, fix the variable table in `src/styles/modernist.css`, not the selector.
- [X] T018 [US3] On the five screens in quickstart kịch bản 4, find any heading that is clipped or overflows at 360 px (long spec titles, long repo names, the New spec dialog title) and fix it with `overflow-wrap: anywhere` or `text-wrap: balance` inside the phone block in `src/styles/live.css` or `src/styles/workspace.css`. Heading line-height stays as set (`1.12`).

**Checkpoint**: All three stories work independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Add one line to the `README.md` section that describes the UI or the Modernist tokens (find it with `grep -n "Modernist\|design" README.md`): font sizes always go through `var(--fs-N)`, and the phone values live in the `@media (max-width: 760px)` block of `src/styles/modernist.css`. Link `specs/006-mobile-font-size/contracts/type-scale.md`.
- [X] T020 Demo pixel check (quickstart kịch bản 7, constitution IV, SC-002): on this branch, capture the same four screenshots as T001 and compare. They must be identical at 1440×900 and 924×540. Also compare the saved computed sizes from T001.
- [X] T021 Run quickstart kịch bản 2–6 and 8 once more on all three modes (demo, server, static) after all fixes (FR-009). Kịch bản 8 is page zoom to 200% at 390 px: the app stays usable and no text overlaps. Record the minimum font size found per mode in the PR description.
- [X] T022 Run the four checks that must pass before merge: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` (constitution V).
- [ ] T023 Open the PR from `feat/006-mobile-font-size` with `specs/006-mobile-font-size` in the description, "Modes affected: demo, server, static", the iOS result from T016 (or that it was not tested), and the demo comparison from T020. Merging to `main` deploys to GitHub Pages, so do not merge before T022 is green.

---

## Dependencies & Execution Order

- **Phase 1**: T001 and T002 are independent.
- **Phase 2** depends on T002 (the test exists and fails first).
  - T003 first (it declares the variables).
  - T004, T005, T006, T007 run in parallel after T003 (different files).
  - T008 after all of them.
- **US1 (Phase 3)** depends on Phase 2. T009 → T010 → (T011, T012 touch the same CSS files, so run one after the other) → T013.
- **US2 (Phase 4)** depends on Phase 2 only. T014 can run in parallel with US1 work on a different file region, but it edits `modernist.css`, so do it before or after T004, not at the same time. T015 follows T014; T016 follows T015.
- **US3 (Phase 5)** depends on Phase 2. It can run in parallel with US2 once T014 is done.
- **Polish (Phase 6)** depends on all stories. T019 is independent. T020 → T021 → T022 → T023.

## Parallel Example: Phase 2

```text
T003 (declare the scale)
  └─ in parallel: T004 modernist.css · T005 workspace.css · T006 live.css · T007 the seven .tsx files
       └─ T008 (verify)
```

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1 (T001–T013).** After Phase 2 the whole app already uses the phone scale; US1 makes it readable without overflow, which is what the user asked for. US2 removes the iOS auto-zoom and US3 tidies headings; each can ship in a separate PR if the first one gets too large.

Keep the order: scale in place → measure → fix by token or local layout, never by a literal `px`. If a fix needs a new size, add a `--fs-N` to both `:root` and the phone block in the same PR (contracts/type-scale.md rule 2).
