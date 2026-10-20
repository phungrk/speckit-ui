---

description: "Task list for 010 Kindle-style reader mode"
---

# Tasks: Chế độ đọc kiểu Kindle

**Input**: Design documents from `/specs/010-reader-highlights/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/reader-ui.md, quickstart.md

**Tests**: Có. Mô tả gốc (mục H) yêu cầu test, và constitution V bắt buộc unit test cho logic. Test
viết trước và phải fail cho tới khi phần code tương ứng xong. Không thêm dependency: logic thuần và
render tĩnh bằng `react-dom/server` (research R10). Phần chạy trên trình duyệt kiểm tay theo
quickstart bằng Playwright có sẵn ngoài repo; script để trong scratchpad, không commit.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Chế độ bị ảnh hưởng**: cả bốn (demo, server, Pages, local), qua cùng module `src/reader/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Module mới: `src/reader/` (`settings.ts`, `useReader.ts`, `ReaderControls.tsx`).
- CSS mới: `src/styles/reader.css`, import sau `live.css` trong `src/main.tsx`.
- Ba shell: `src/App.tsx` (demo), `src/project/LiveWorkspace.tsx` (server, Pages),
  `src/project/LocalWorkspace.tsx` (local).
- Test: `tests/`.
- Mọi giá trị (màu, cỡ, nhãn, aria) lấy từ `contracts/reader-ui.md`; không tự đặt giá trị mới.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Prepare the environment and capture the "before" baseline. Run `npm ci`. Run `npm run dev`, then with Playwright from the scratchpad (`NODE_PATH=/opt/node-tools/node_modules`, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) save demo screenshots (`/?demo`) at 1440×900 and 924×540, main screen and the New spec dialog, to the scratchpad directory, outside the repo (quickstart §7). Confirm `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` all pass before any change.
- [ ] T002 Create the empty module and stylesheet so later tasks can run in parallel: `src/reader/settings.ts`, `src/reader/useReader.ts`, `src/reader/ReaderControls.tsx` (each exporting nothing yet), and `src/styles/reader.css` with only the Google Fonts `@import` from research R6 (`Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400`, `Source+Serif+4:opsz,wght@8..60,400;8..60,600`, `Atkinson+Hyperlegible:wght@400;700`, `display=swap`). Import `./styles/reader.css` after `./styles/live.css` in `src/main.tsx`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: settings model, storage and the first-paint hook that all three stories use.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational ⚠️

- [ ] T003 [P] Write `tests/reader.test.ts` part 1 (model, data-model.md "ReaderSettings"/"LayoutPrefs"): `DEFAULT_READER` is `{font:'literata', size:18, lh:1.7, width:700, theme:'white'}`; `parseReader` keeps valid fields and replaces each invalid or missing field with its default (e.g. `{size:19, theme:'blue', font:'archivo'}` → archivo, 18, white), returns all defaults for non-objects and broken JSON; `parseLayout` does the same for `{left,right}` booleans (default both `true`); `readerVars(s)` returns exactly `--rd-font`, `--rd-size`, `--rd-size-sm` (size−2), `--rd-size-xs` (size−3), `--rd-lh`, `--rd-measure` and the four theme tokens from contracts §1, plus the five Dark overrides and the shadow override only when `theme === 'dark'`.
- [ ] T004 [P] Extend `tests/prefs.test.ts`: `prefsFor(login).getReader()/setReader()` and `getLayout()/setLayout()` round-trip under keys `sk.u.{login}.reader` and `sk.u.{login}.layout`; two logins do not see each other's values; invalid stored values come back as defaults through `parseReader`/`parseLayout`; blocked storage (getter throws) returns defaults and writes are ignored without throwing.
- [ ] T005 [P] Update `tests/typescale.test.ts` (research R5): add `src/styles/reader.css` to `STYLES`; allow exactly `var(--rd-size)`, `var(--rd-size-sm)`, `var(--rd-size-xs)` in addition to `var(--fs-N)` in the "no font size written as a number" check, and only inside `reader.css`; add `22: 21` to the `PHONE` table (keeps the non-decreasing order 20→20, 22→21, 24→22). Leave every other assertion unchanged.

### Implementation for Foundational

- [ ] T006 Implement `src/reader/settings.ts`: the value lists and labels from contracts §1–2 (`FONTS` with key, name and CSS stack, `SIZES`, `LINE_HEIGHTS`, `WIDTHS` with key and px, `THEMES` with key, name, bg, surface, text, divider), `DARK_OVERRIDES`, `DEFAULT_READER`, `DEFAULT_LAYOUT`, `parseReader(unknown)`, `parseLayout(unknown)`, `readerVars(settings)`, `applyReader(settings, root = document.documentElement)` (sets each variable with `style.setProperty`, removes the Dark-only variables for other themes, sets `data-reader-theme`), and `loadDeviceReader()` / `saveDeviceReader()` for the `sk.reader` key in `localStorage`, tolerant of blocked storage. Only browser APIs; no imports from `server/`. Makes T003 pass.
- [ ] T007 Extend `src/project/prefs.ts`: add `getReader(): ReaderSettings`, `setReader(s)`, `getLayout(): LayoutPrefs`, `setLayout(l)` to the `Prefs` interface and `prefsFor`, stored under `reader` and `layout`, validated with `parseReader`/`parseLayout` from `src/reader/settings.ts`. Update the header comment (reader settings are display preferences, not project state). Makes T004 pass.
- [ ] T008 Add `--fs-22: 22px` to `:root` and `--fs-22: 21px` to the phone block in `src/styles/modernist.css`, and add the row to the table in `specs/006-mobile-font-size/data-model.md`. With T008 the scale part of T005 passes; the reader.css part passes once T013 and T015 use only the allowed variables.
- [ ] T009 Apply settings before the first render in `src/main.tsx`: call `applyReader(loadDeviceReader())` before `createRoot(...).render(...)` (research R2). Add to `src/styles/reader.css` the root transition `:root{transition:background-color .2s,color .2s}` and its removal under `@media (prefers-reduced-motion: reduce)` (contracts §1).
- [ ] T010 Implement `src/reader/useReader.ts`: `useReader(owner: string, where: PrefsStorage)` returns `{reader, setReader, reset, layout, setLayout}`. On mount and when `owner` changes, follow data-model.md "Luồng" steps 2–3 (owner value wins and is written to `sk.reader`; no owner value yet → store the current device value for the owner). Every change calls `applyReader`, `prefs.setReader` and `saveDeviceReader`. Export the owner constants `DEMO_OWNER = '~demo'` and `LOCAL_OWNER = '~local'`. Add to `tests/reader.test.ts` a test of the owner/device flow using a fake `Storage` (owner value replaces device value; first owner visit copies the device value), calling the pure helper that the hook uses (`resolveReader(deviceValue, ownerValue)`), so no React renderer is needed.

**Checkpoint**: `npm test` and `npm run typecheck` pass; nothing visible has changed yet except fonts being loaded.

---

## Phase 3: User Story 1 - Chỉnh cách đọc (Priority: P1) 🎯 MVP

**Goal**: The **Aa** button and popover change font, size, line height and width of the prose in the reading column only, remembered per user, in all four modes.

**Independent Test**: quickstart §1 and §3 (Atkinson 22px changes paragraphs, not `FR-001` or headings; reload keeps it with no flash).

### Tests for User Story 1 ⚠️

- [ ] T011 [P] [US1] Write `tests/readerMarkup.test.tsx` part 1 with `renderToStaticMarkup`: `<AaButton open={false}>` has `aria-label="Reading settings"`, `aria-expanded="false"`, `aria-haspopup="dialog"`; `<ReaderPanel>` for the default settings renders `role="dialog"` with `aria-label="Reading settings"`, the label "Size · 18px", 4 font buttons with Literata `aria-pressed="true"`, 6 size ticks with 4 marked `on`, "Smaller"/"Larger" with neither disabled, and "Reset to default"; with `size: 15` "Smaller" is `disabled`, with `size: 22` "Larger" is `disabled`. Also unit-test the pure `panelKey(event)` / `isOutside(target, panel, button)` helpers that drive closing (Escape closes; mousedown inside the panel or on the button does not).
- [ ] T012 [P] [US1] Add to `tests/reader.test.ts` a static CSS check on `src/styles/reader.css` (contracts §3): the prose selectors `.sk-col p`, `.sk-col li` use `var(--rd-font)`, `var(--rd-size)`, `var(--rd-lh)`; `.sk-col td`, `.sk-col .sk-ac`, `.sk-col .sk-cl li` use `var(--rd-size-sm)`; `.sk-col .sk-opt`, `.sk-col .sk-kv b` use `var(--rd-size-xs)`; the UI-font rule lists `.sk-id`, `.sk-path`, `.sk-owner`, `.sk-meta`, `.sk-file`, `.tag`, `button`, `.btn`, `.sk-pass`, `.sk-nc`, `code`, `pre`, `th` and `h1`–`h6` and sets `font-family: var(--font-body)`.

### Implementation for User Story 1

- [ ] T013 [US1] Add the reading-column rules to `src/styles/reader.css` (contracts §3, research R4): `.sk-col{max-width:var(--rd-measure);margin:0 auto}`, the three prose groups, and the UI-font group with higher specificity than the prose group (e.g. `.sk-col :is(h1,…,th)`, and `.sk-col li .sk-id`), `.sk-col .sk-id{font-size:var(--fs-12)}`. Makes T012 pass.
- [ ] T014 [US1] Implement `AaButton` and `ReaderPanel` in `src/reader/ReaderControls.tsx` exactly as contracts §4–5: the five sections in order, every control a real `<button>` with the listed `aria-*`, icons for spacing and width as inline SVG of three lines (same geometry as the prototype), "Reset to default" calling `reset`. Closing: Escape (returns focus to the Aa button), mousedown outside panel and button, clicking Aa again. On open, focus the selected font button. Export the pure helpers tested in T011. Makes T011 pass.
- [ ] T015 [US1] Add the header and popover styles to `src/styles/reader.css`: `.sk-navsep`, `.sk-aawrap`, `.sk-aa` (40×36, `1.5px` divider border, hover, open state, focus ring), `.sk-rdp` and its parts (`-fonts`, `-size`, `-ticks`, `-seg`, `-themes`, `-reset`, labels) per contracts §4–5, font sizes only through `var(--fs-N)` (`--fs-11`, `--fs-12`, `--fs-13`, `--fs-16`, `--fs-18`, `--fs-22`), hit areas ≥ 36px and ≥ 44px under `@media (pointer: coarse)`, and `width:calc(100vw - 32px)` under 372px.
- [ ] T016 [US1] Demo shell `src/App.tsx`: call `useReader(DEMO_OWNER, 'local')`; in `nav.sk-nav` add, after the avatar, `<div className="sk-navsep" aria-hidden="true">` and `<div className="sk-aawrap"><AaButton/>{open && <ReaderPanel/>}</div>` (contracts §4 order); wrap `{view}` in `<div className="sk-col">` inside `.sk-doc`.
- [ ] T017 [P] [US1] Live shell `src/project/LiveWorkspace.tsx` (server and Pages): same as T016 with `useReader(user.login, storage)`. `LiveWorkspace` does not know the storage today: `src/Root.tsx` computes `storage: PrefsStorage` (around line 106) and keeps it in the workspace props (around line 136). Add a `storage: PrefsStorage` prop to `LiveWorkspace` and pass it from `Root.tsx` where `<LiveWorkspace … />` is rendered. Place the separator and Aa at the end of the nav, after `SessionButtons`. Wrap `{view}` in `.sk-col`.
- [ ] T018 [P] [US1] Local shell `src/project/LocalWorkspace.tsx`: same as T016 with `useReader(LOCAL_OWNER, 'local')`; wrap both document panels (the `Markdown` panel and the one returned by `LocalStageContent`) in `.sk-col`. Keep local read-only: nothing here writes files (FR-013).
- [ ] T019 [US1] Add to `tests/readerMarkup.test.tsx` a check that the demo `App` and `LocalStageContent` render a `.sk-col` inside `.sk-doc` and an element with `aria-label="Reading settings"` in the nav (render `App` with `renderToStaticMarkup`; follow the existing pattern in `tests/localMode.test.tsx` for the local shell).

**Checkpoint**: quickstart §1, §3, §5 pass in demo, server, Pages and local. US1 is shippable alone; the Page section of the popover already switches themes, and US2 adds the styled swatches and the surface audit.

---

## Phase 4: User Story 2 - Theme cho toàn bộ khung (Priority: P1)

**Goal**: White, Sepia, Green, Dark recolor every surface, including pages outside the workspace shell, with body text ≥ 4.5:1.

**Independent Test**: quickstart §2 (choose Dark: no white or `#f3f2f2` area anywhere, including the New spec dialog and the sign-in page).

### Tests for User Story 2 ⚠️

- [ ] T020 [P] [US2] Add to `tests/reader.test.ts` the contrast test (research R9): a WCAG 2.x `contrast(a, b)` helper; for each entry in `THEMES`, text on bg and text on surface ≥ 4.5; for Dark, `#ff9a86` on bg ≥ 4.5; for the light themes, Modernist `--color-accent-700` (`#ae1800`) on bg ≥ 4.5. Read the colors from `THEMES` and `DARK_OVERRIDES`, not from copies in the test.
- [ ] T021 [P] [US2] Add to `tests/reader.test.ts` a hard-coded colour guard (research R8): in `src/styles/workspace.css`, `live.css`, `reader.css` and every `src/**/*.tsx`, no colour value `#fff`, `#ffffff`, `#000`, `#000000` (match `#(?:fff|ffffff|000|000000)\b`, case-insensitive) and no keyword `white` or `black` used as a value (`:\s*[^;]*\b(?:white|black)\b`, so `white-space` does not match), outside comments; in `modernist.css` they may appear only inside `:root{…}` token definitions. Allow-list the theme swatch rule in `reader.css` that intentionally shows each theme's own colours through inline `style` from `THEMES` (no literals in CSS). Also assert that no file in `src/reader/` imports `fetch`, `../backend`, `../project/trackingApi`, `../project/repoLoader` or anything under `server/` (FR-013).

### Implementation for User Story 2

- [ ] T022 [US2] Theme swatches in `ReaderPanel` (`src/reader/ReaderControls.tsx`): four buttons, each `<span>` "Aa" with inline `style={{background: t.bg, color: t.text}}` from `THEMES`, name below, `aria-pressed`; selected swatch outline `2px var(--color-accent)` offset 2px (`.sk-rdp-themes` in `src/styles/reader.css`, border of the span `1px solid var(--color-divider)` so it shows on every theme).
- [ ] T023 [US2] Dark details in `src/styles/reader.css`: `:root[data-reader-theme="dark"]` sets `--shadow-sm/md/lg: 0 0 0 1px var(--color-divider)` (contracts §1) and `color-scheme: dark` so native form controls and scrollbars follow; other themes `color-scheme: light`.
- [ ] T024 [US2] Audit surfaces outside `.sk`: open the sign-in, connect, repo picker, Overview, local folder picker and New spec dialog in each theme (quickstart §2); fix any rule that reads a fixed colour or `--color-neutral-*` for a background where the design uses `--color-bg`/`--color-surface`, in `src/styles/workspace.css` or `src/styles/live.css`. Record what was changed in the PR description. Makes T021 pass if it was failing.

**Checkpoint**: quickstart §2 passes in all four modes; contrast test green.

---

## Phase 5: User Story 3 - Ẩn/hiện sidebar (Priority: P2)

**Goal**: Two header buttons (and `[` / `]`) hide or show the left and right sidebars; hidden sidebars are not in the DOM; the choice is remembered per user.

**Independent Test**: quickstart §4 (hide both, Tab through the page, nothing from the sidebars receives focus; reload keeps them hidden).

### Tests for User Story 3 ⚠️

- [ ] T025 [P] [US3] Add to `tests/reader.test.ts` tests for the pure `sidebarKey(event)` helper (research R7): `[` → `'left'`, `]` → `'right'`; `null` when the target is `input`, `textarea`, `select` or `[contenteditable]`, or when Ctrl, ⌘ or Alt is held.
- [ ] T026 [P] [US3] Add to `tests/readerMarkup.test.tsx`: `<SidebarToggle side="left" open={false}>` renders `aria-pressed="false"`, `aria-label="Show left sidebar"`, `title="Queue & features"`; the right one with `open` renders `aria-pressed="true"`, `aria-label="Hide right sidebar"`, `title="Gate, highlights & Copilot"`; the demo `App` rendered with layout `{left:false,right:false}` has no `aside.sk-side` and no `aside.sk-right`, and `.sk-body` has classes `no-left no-right` (expose an optional `initialLayout` prop or render the inner shell component so the test can set it).

### Implementation for User Story 3

- [ ] T027 [US3] Add icons `panelL` and `panelR` to `ICONS` in `src/ui.tsx` (contracts §4), and implement `SidebarToggle` and the exported `sidebarKey` helper in `src/reader/ReaderControls.tsx`; in `src/reader/useReader.ts` add a `useSidebarKeys(setLayout)` effect that listens on `window` `keydown`. Makes T025 pass.
- [ ] T028 [US3] Add the toggle and grid styles to `src/styles/reader.css` (contracts §4 and §6): `.sk-navbtn` states (55% ink when not pressed, full ink when pressed, 7% ink hover, focus ring inset), `.sk-body.no-left`, `.no-right`, `.no-left.no-right` at desktop, under `@media (max-width:1180px)` and under `@media (max-width:760px)`, keeping the existing `.sk-live` 760px rule in `live.css` working.
- [ ] T029 [US3] Wire the toggles into the three shells: `src/App.tsx`, `src/project/LiveWorkspace.tsx`, `src/project/LocalWorkspace.tsx`. Left toggle is the first child of `nav.sk-nav` (before `.nav-brand`), right toggle is the last (after Aa). Render `aside.sk-side` only when `layout.left` and `aside.sk-right` only when `layout.right`; add `no-left`/`no-right` to `.sk-body`; call `useSidebarKeys`. Keep the right sidebar's tab and Copilot state in the shell so it survives hiding. Makes T026 pass.

**Checkpoint**: quickstart §4 and §6 pass in all four modes.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T030 [P] README: in the section that describes the workspace, add "Reading settings (Aa)" and "Show/hide sidebars" with the keyboard shortcuts, and state that settings stay in the browser and no new network destination is used (fonts come from Google Fonts, already allowed by the Pages CSP).
- [ ] T031 Re-baseline design screenshots (constitution IV, quickstart §7): demo at 1440×900 and 924×540 (main screen and New spec dialog) with White, plus 1440×900 for Sepia, Green and Dark, saved in the scratchpad; compare with `Speckit Workspace.html` from the design export; list the accepted differences (Highlights tab, highlight toolbar, note pins: `010-spec-annotations`) in the PR description.
- [ ] T032 Run quickstart §1–§6 end to end on the server build (`npm run dev`), the Pages build (`npm run build:pages` + `npx vite preview`, check the console for CSP errors) and local mode; check the phone width (390px) for horizontal scroll with the popover open. For FR-011, at 1440×900 record the bounding boxes of `nav.sk-nav`, `.sk-rail`, `aside.sk-side` and `aside.sk-right` before and after changing size 15→22 and width 600→820; they must not change (only `.sk-col` content reflows).
- [ ] T033 Run all four gates: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`. Open the PR from `feat/010-reader-highlights`, mention `specs/010-reader-highlights` and the four affected modes in the description.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup; blocks all stories.
- **US1 (Phase 3)**: after Foundational. MVP.
- **US2 (Phase 4)**: after Foundational. T022 edits `ReaderPanel` from T014, so in practice after US1.
- **US3 (Phase 5)**: after Foundational; independent of US1/US2 except that T029 edits the same three shell files as T016–T018 (do them after US1 to avoid conflicts).
- **Polish (Phase 6)**: after the stories that will ship.

### Within Each Story

Tests first (they must fail), then CSS/components, then shell wiring, then the checkpoint from quickstart.

### Parallel Opportunities

- Phase 2 tests T003, T004, T005 together (three files).
- US1: T011 and T012 together; after T014–T016, T017 and T018 together (different shells).
- US2: T020 and T021 together.
- US3: T025 and T026 together.
- Polish: T030 alongside T031–T032.

## Parallel Example: User Story 1

```bash
# Tests first:
Task: "T011 readerMarkup.test.tsx part 1 (AaButton, ReaderPanel, close helpers)"
Task: "T012 reader.test.ts CSS check for .sk-col rules"
# After T016 (demo shell) is done:
Task: "T017 LiveWorkspace.tsx: Aa + .sk-col"
Task: "T018 LocalWorkspace.tsx: Aa + .sk-col"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and 2.
2. Phase 3 (US1): reading settings in every mode.
3. Stop and validate with quickstart §1, §3, §5. Shippable: the default theme is White, so the look already changes (Complexity Tracking).

### Incremental Delivery

1. Setup + Foundational.
2. US1 → validate → can ship.
3. US2 → validate contrast and surfaces → ship.
4. US3 → validate focus and grid → ship.
5. Polish: README, screenshots, gates, one PR (or one PR per story if review is easier).

## Notes

- Highlights, notes, the Highlights tab and the gate brief notes are out of scope (`moved-to-annotations.md`, `010-spec-annotations`).
- Never commit the design export zip or screenshots of private repos (constitution V).
- Commit after each task or logical group; tick the task in this file in the same commit.
