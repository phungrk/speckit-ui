---

description: "Task list for 010 spec annotations (highlights and notes)"
---

# Tasks: Chú thích (highlight và ghi chú) trên tài liệu của spec

**Input**: Design documents from `/specs/010-spec-annotations/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/highlights-file.md, contracts/annotations-ui.md, quickstart.md

**Tests**: Có. Constitution V bắt buộc unit test cho luồng ghi và logic; mô tả gốc (mục H) yêu cầu test
neo và phát hiện Outdated. Test viết trước, phải fail cho tới khi code tương ứng xong. GitHub luôn
giả lập (`tests/fakeGitHub.ts`), không ghi GitHub thật. Không thêm dependency: logic thuần và render
tĩnh bằng `react-dom/server`. Kiểm tay theo quickstart bằng Playwright ngoài repo.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Chế độ bị ảnh hưởng**: cả bốn (demo, server, Pages, local).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Include exact file paths in descriptions

## Path Conventions

- Ghi dùng chung: `server/highlights.ts` (chỉ cú pháp xoá được, import có đuôi `.ts`, không API riêng của Node).
- Giao diện dùng chung: `src/annotations/`.
- Ba shell: `src/App.tsx` (demo), `src/project/LiveWorkspace.tsx` (server, Pages), `src/project/LocalWorkspace.tsx` (local).
- CSS đã có trong `src/styles/reader.css` (`.sk-tb*`, `.sk-hlp*`, `.sk-hl-pin`, `.sk-rtabs.is-3`, `::highlight(sk-*)`, `.hl-*`); không thêm màu mới.
- Mọi chữ, nhãn và thông báo lấy từ `contracts/annotations-ui.md` và `contracts/highlights-file.md`.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Prepare and baseline: `npm ci`; confirm `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` pass; with Playwright from the scratchpad (`NODE_PATH=/opt/node-tools/node_modules`, Chromium at `/opt/pw-browsers/chromium`) save demo screenshots (`/?demo`) at 1440×900 and 924×540 outside the repo, and keep the design export's screenshots for comparison (quickstart §1).
- [ ] T002 Add the highlight types to `src/project/types.ts` per data-model.md: `HighlightColor = 'y'|'b'|'p'|'o'`, `HighlightAuthor`, `Highlight`, `HighlightChange` (`add` / `update` / `remove`), `HighlightsFile { version: 1; highlights: Highlight[] }`, and on `SpecFeature` an optional `highlights?: { items: Highlight[]; error: string | null; sha: string | null }`. Export `HL_COLORS` (key, meaning `Key|Issue|Question|Change`, in the toolbar order of contracts/annotations-ui.md) from a new `src/annotations/colors.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: anchoring, the file format and the write path that every story needs.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational ⚠️

- [ ] T003 [P] Write `tests/anchor.test.ts` for `src/annotations/anchor.ts` (research R5): `describe` trims leading and trailing whitespace and keeps ≤ 32 chars of prefix and suffix; `locate` finds the right occurrence of a quote that appears twice using prefix/suffix, uses `startHint` to break ties, still finds the quote after unrelated text is inserted before it, and returns `null` (Outdated) when the quote is gone; an empty or 1-char quote is rejected.
- [ ] T004 [P] Write `tests/highlights.test.ts` part 1 for `server/highlights.ts` pure functions: `parseHighlights` accepts `{version:1, highlights:[]}`, drops malformed items and reports how many in `error`, returns an error and blocks writing for broken JSON or another `version`; `applyChange` adds, updates colour or note, removes by `id`, refuses `update`/`remove` by someone other than the author (`login`, or `name` for local authors), refuses changes to an `id` that no longer exists, refuses notes over 2,000 chars and files over 512 KB; `serializeHighlights` sorts by `createdAt`, indents 2 and ends with a newline; `commitMessage` follows research R16 and ends with ` [skip ci]`. Also: removing the last highlight leaves `{"version":1,"highlights":[]}` (the file is kept).
- [ ] T005 [P] Extend `tests/fakeGitHub.ts` with a contents store per repo and branch: `GET /repos/{o}/{r}/contents/{path}?ref=` returns `{content (base64), sha}` or 404; `PUT` checks `sha` (missing for new files), answers 409 when it does not match, records the commit message and returns `{content:{sha}, commit:{sha, html_url}}`; options to force a status for PUT (403, 404, 422) and to bump the file from "another user" before the next PUT.
- [ ] T006 Write `tests/highlights.test.ts` part 2 for `saveHighlight` against the fake (contracts/highlights-file.md "Ghi qua GitHub"): creates the file on the first save with exactly one PUT on the viewed branch; second save sends the read `sha`; a 409 from a concurrent writer triggers re-read and re-apply and both highlights end up in the file; three conflicts in a row give "Someone else saved highlights at the same time. Try again."; 403/404 and 422 give the messages from the contract table; a broken file is never overwritten; only `specs/{slug}/highlights.json` is ever written.

### Implementation for Foundational

- [ ] T007 Implement `src/annotations/anchor.ts`: `textOf(root)` (concatenated text nodes with an offset→node map), `rangeFor(root, start, end)`, `offsetIn(root, node, offset)`, `describe(root, range)` → `{quote, prefix, suffix, startHint}`, `locate(text, anchor)` → `{start, end} | null` scoring candidates by prefix/suffix match then distance to `startHint`. Pure except for DOM ranges. Makes T003 pass.
- [ ] T008 Implement `server/highlights.ts`: `HIGHLIGHTS_FILE = 'highlights.json'`, `MAX_BYTES = 512 * 1024`, `parseHighlights`, `applyChange`, `serializeHighlights`, `commitMessage`, and `saveHighlight(src, {slug, branch, change, user})` (GET contents → parse → apply → PUT with base64 content, `sha`, `branch`, message; retry up to 3 times on 409/422-sha). Base64 with `btoa`/`TextEncoder` so it runs in the browser and in Node. Makes T004 and T006 pass.
- [ ] T009 In `server/github.ts`, let `gh()` take `method: 'PUT'` and, for writes under `/contents/`, say "needs Contents: Read and write" in the 403 message instead of the Issues hint.
- [ ] T010 Load the file with each spec: add `highlights.json` to `wantedInSpec` in `server/project.ts`; in `buildFeature` parse it with `parseHighlights` into `SpecFeature.highlights` (`sha` = blob sha when known, else null). Add a case to `tests/project.test.ts`: a spec folder with a valid file, one with a broken file (error set), one without (empty list, no error). Record each spec file's blob sha from the tree (`SpecFeature.blobs?: Record<string, string>`) so new highlights get `docSha` (data-model); local and demo compute `docSha` with `contentHash(text)` (FNV-1a 32-bit, `h:` prefix) in `src/annotations/anchor.ts`, tested in T003.
- [ ] T011 Add the write route: `POST /api/highlights` in `server/routes.ts` (add to `POSTS`, `JSON_WRITES`, `ROUTES`; same-origin and JSON checks like `/api/gates`), body `{repo, slug, branch, change}`, uses the session's token and identity, calls `saveHighlight`, returns `{file, commit}` or `{error}` with the status from the error. Test in `tests/highlights.test.ts`: cross-origin request is refused with 403 and no GitHub call is made.
- [ ] T012 Implement the store interface in `src/annotations/store.ts` (research R14): `HighlightStore { canWrite: boolean | 'unknown'; readOnlyReason: string | null; save(slug, branch, change): Promise<{ items: Highlight[]; commit?: { sha: string; url: string } }> }`, with `gitHubStore(backend, repo)` that calls a new `backend.saveHighlight(repo, slug, branch, change)`. Add `saveHighlight` to the `Backend` interface in `src/backend.ts`: `serverBackend` posts to `/api/highlights`; `browserBackend` calls `saveHighlight` from `server/highlights.ts` with the browser token (Pages). The token never leaves the server in server mode.
- [ ] T013 Add to `src/project/prefs.ts`: `getHighlightConsent(repo)`, `setHighlightConsent(repo, on)` (key `hlConsent`) and `getAuthorName()`, `setAuthorName(name)` (key `authorName`). Extend `tests/prefs.test.ts` for both, including blocked storage.

**Checkpoint**: `npm test`, `npm run typecheck` pass; nothing visible yet.

---

## Phase 3: User Story 1 - Highlight và ghi chú trên đoạn văn (Priority: P1) 🎯 MVP

**Goal**: Select text, pick a colour, add a note, see the highlight and pin, edit or remove your own, Copy and Ask, in every workspace.

**Independent Test**: quickstart §1–§2 (demo matches the design; create, note, edit, remove, Ask; duplicate passage anchors correctly after reload).

### Tests for User Story 1 ⚠️

- [ ] T014 [P] [US1] Write `tests/annotationsMarkup.test.tsx` part 1 with `renderToStaticMarkup`: `HlToolbar` in create mode renders `role="dialog"` `aria-label="Highlight"`, four colour buttons with `aria-label="Highlight Key|Issue|Question|Change"` in that order, Note, Copy and Ask, and no Remove; in edit mode for the author it adds `aria-label="Remove highlight"` and marks the current colour `on`; for a non-author or a read-only store it renders only Copy and Ask; the note editor renders the ≤ 90-char quote, the placeholder "Add a note for the team…", "Visible to approvers", a `btn btn-secondary` Cancel and a `btn btn-primary` Save note. Also test the pure helpers `toolbarPosition(rect, viewport)` (52px above, flips below, clamps 8px) and `selectionOk(text)` (≥ 2 non-space chars). Plain text (FR-007): a quote and note containing `<img src=x onerror=alert(1)>` and `**bold**` render as literal text, with no `<img` or `<strong>` in the markup.

### Implementation for User Story 1

- [ ] T015 [US1] Implement `src/annotations/useHighlights.ts`: given `items`, the `.sk-col` element and the current phase/doc, compute anchors with `locate`, register one `Highlight` per colour in `CSS.highlights` (`sk-y`, `sk-b`, `sk-p`, `sk-o`), re-run after render, after the reader settings change and on resize; expose `outdated` ids, `focus(id)` (scroll to ~120px from the top of `.sk-doc`, `sk-focus` for 1.6 s, none when `prefers-reduced-motion`) and `hitTest(x, y)` (via `caretPositionFromPoint`/`caretRangeFromPoint`). Without `CSS.highlights`, draw nothing and expose `unsupported = true`.
- [ ] T016 [US1] Implement `src/annotations/Toolbar.tsx` (`HlToolbar`) per contracts/annotations-ui.md and research R8: fixed position from `toolbarPosition`, `mousedown` `preventDefault` on its controls, closes on outside mousedown, `.sk-doc` scroll and Escape; Note expands the editor (⌘/Ctrl+Enter saves, Escape cancels; a note without a colour uses Key); Copy writes the plain text; Ask calls `onAsk(text)`; Remove only for the author. Makes T014 pass.
- [ ] T017 [US1] Implement `src/annotations/Pins.tsx`: one `button.sk-hl-pin` per highlight with a note, inside `.sk-doc`, top from the first client rect of its range, left clamped inside `.sk-doc` so it never scrolls sideways, background = the colour's solid class, `aria-label="Note by {author}"`; click opens the toolbar in edit mode with the editor open.
- [ ] T018 [US1] Implement `src/annotations/Annotator.tsx`: the wrapper that owns selection handling (mouseup/touchend; on touch wait for `selectionchange` to settle 300 ms), opens `HlToolbar` for a valid selection wholly inside `.sk-col` or for a clicked highlight (`hitTest`), renders `Pins`, and calls `store.save`. Saving keeps the toolbar's draft on failure and shows the error inline (FR-015). Props: `store`, `items`, `slug`, `branch`, `phase`, `doc`, `docSha`, `author`, `onItems`, `onAsk`, `colRef`, `docRef`. Unsaved note on navigation (spec edge case): changing spec, step or branch while the editor has unsaved text asks "Discard this note?" (Keep editing / Discard); the save always targets the slug, branch and phase captured when the toolbar opened, never the new ones. A selection that leaves the reading column or is not continuous shows "Select text inside one document to highlight it." Test the pure guard `pendingTarget(draft, current)` in `tests/annotationsMarkup.test.tsx`.
- [ ] T019 [US1] Demo store in `src/annotations/store.ts`: `demoStore()` keeps `{ [featureId]: Highlight[] }` in `localStorage` key `sk.demo.highlights`, seeded with the four highlights of the design prototype (`HL_SEED`: feature 003 — Director "a stolen session cannot drain my account" y on Specify; Designer "MUST require step-up authentication" b with its note; QA "Limit check p95 < 50 ms" o on Plan with its note; QA the A1 sentence p on Analyze with its note), authors from `SK.people`, synthetic data only. Never calls GitHub.
- [ ] T020 [US1] Wire the demo shell `src/App.tsx`: `Annotator` around the `.sk-col` with `demoStore`, author = current role's person; Ask switches the right sidebar to Copilot and seeds `Explain this passage from {Phase} and flag any risk or gap: "{text}"`.
- [ ] T021 [P] [US1] Wire the live shell `src/project/LiveWorkspace.tsx`: `Annotator` with `gitHubStore(backend, project.repo)`, `branch = f.branch ?? project.ref`, author `{ login: user.login }`, items from `f.highlights` (updated in place after each save); add Copilot seeding for Ask (add a `seed` state like the demo if the live shell has none). Read-only when `project.pinned`, when `f.highlights.error` is set, or after a 403/404/422 on save (remember for the session), with the reason shown in the toolbar.
- [ ] T022 [P] [US1] Wire the local shell `src/project/LocalWorkspace.tsx` with `localFileStore` (done in T031); until US2's local tasks land, pass a read-only store so highlights from `highlights.json` (read by T030) are visible.

**Checkpoint**: quickstart §1–§2 pass in demo; in live, creating works once US2's consent flow (T024) is in; reading works already.

---

## Phase 4: User Story 2 - Highlight được lưu cùng spec, người tạo và đoạn văn (Priority: P1)

**Goal**: Every save is one `[skip ci]` commit to the viewed branch (server, Pages) after a one-time confirmation per repo, or a direct write to the file (local).

**Independent Test**: quickstart §3, §4 and §7.

### Tests for User Story 2 ⚠️

- [ ] T023 [P] [US2] Add to `tests/annotationsMarkup.test.tsx`: the consent dialog renders "Commit highlights?", the branch and login, Cancel and "Commit highlights"; the toast renders `role="status"` and "Saved · commit {sha7}" linking to the commit; and a pure test of `needsConsent(prefs, repo)` (true until accepted, true again after the "Ask before committing highlights" switch is turned on).

### Implementation for User Story 2

- [ ] T024 [US2] Consent and toast in `src/annotations/Consent.tsx` and `src/annotations/Annotator.tsx` (research R9): before the first GitHub save in a repo show the dialog; Cancel writes nothing and keeps the draft; accepting stores consent via `prefs.setHighlightConsent(repo, true)`; every successful commit shows the 4-second toast. Not shown for local or demo. Makes T023 pass.
- [ ] T025 [US2] Pass the user's prefs into the live shell for consent: `src/Root.tsx` already builds `prefs` in `Session`; pass it (or `storage`, already a prop) to `LiveWorkspace` and use it in `Annotator`.
- [ ] T026 [US2] Server-side author check: in `server/highlights.ts` `saveHighlight` sets `author = { login: user }` on `add` from the session identity (ignoring any author sent by the browser) and checks it on `update`/`remove`. Extend `tests/highlights.test.ts`: a forged author on `add` is replaced; `remove` of someone else's highlight is refused with "Only {author} can change this highlight."
- [ ] T027 [US2] Constitution 1.4.0 follow-up in `README.md`: permissions tables (Pages token and the server's GitHub App) add **Contents: Read and write** for highlights, with "without it you can still read highlights"; a "Highlights" section describing the file, the commit per save with `[skip ci]`, the one-time confirmation and the author rule.
- [ ] T028 [P] [US2] Update `specs/007-local-repo-browser/spec.md` FR-006 with the single exception: local mode may write `specs/*/highlights.json` in the selected folder (specs/010-spec-annotations FR-016), nothing else, no commit, no network.
- [ ] T029 [US2] Allow write access for local folders in `src/project/localRepositoryPersistence.ts`: widen the permission types to `{ mode: 'read' | 'readwrite' }` and add `requestWrite(handle)` that asks for `readwrite` only when first needed (research R12). Keep the existing read flow unchanged.
- [ ] T030 [US2] Read `highlights.json` in local mode: in `src/project/localProject.ts` include the file when building the project, parsed with `parseHighlights` into `SpecFeature.highlights`. Extend `tests/localProject.test.ts`.
- [ ] T031 [US2] Implement `localFileStore(handle, authorName)` in `src/annotations/store.ts`: read, `applyChange`, write with `createWritable()` to `specs/{slug}/highlights.json` only; no handle or permission refused → read-only with "This folder was opened read-only. Choose it again with write access to save highlights."; first save asks for the author name (stored with `prefs.setAuthorName`). Wire it in `src/project/LocalWorkspace.tsx` (replacing the read-only store from T022). Test the pure part (path chosen, only one file written) with a fake directory handle in `tests/highlights.test.ts`.

**Checkpoint**: quickstart §3, §4, §7 pass (server against a test repo of your own; Pages build; local in Chromium).

---

## Phase 5: User Story 3 - Panel Highlights và "Before you approve" (Priority: P2)

**Goal**: Three right-sidebar tabs; the Highlights tab with filters, groups and jump-to; notes in the gate brief.

**Independent Test**: quickstart §5.

### Tests for User Story 3 ⚠️

- [ ] T032 [P] [US3] Add to `tests/annotationsMarkup.test.tsx`: `HighlightsPanel` renders `All {n}` and one filter per colour with its count, sections labelled `02 · Specify` etc. in phase order, items with quote, note, author, meaning and relative time, "Outdated, text changed" for outdated ids, the empty line from the contract, and the "Ask before committing highlights" switch only for GitHub stores; `briefNotes(items, phase)` returns `{Author}: {note}` lines with Issue notes first and nothing for highlights without notes. Also: a note with `<script>` renders as text in the panel and in the brief (FR-007); with an Issue note in the brief the Approve button is still enabled, and no highlight code imports `trackingApi` or calls `/api/gates` (FR-022).

### Implementation for User Story 3

- [ ] T033 [US3] Implement `src/annotations/HighlightsPanel.tsx` per contracts/annotations-ui.md, plus `briefNotes` in `src/annotations/brief.ts`. Clicking an item calls `onJump(item)` (switch phase, then `focus(id)` after render). Makes T032 pass.
- [ ] T034 [US3] Three tabs in the demo `src/App.tsx`: `.sk-rtabs.is-3` with Gate · Highlights {n} · AI Copilot (as the design), `HighlightsPanel` in the middle tab, and `gateBrief(...)` items followed by `briefNotes` in `GateBrief` (`src/copilot/context.ts` unchanged except for accepting extra lines, or concatenate in `App.tsx`).
- [ ] T035 [P] [US3] Three tabs in `src/project/LiveWorkspace.tsx` (keep the existing "Gate & PRs" label for the first tab) and add "Before you approve" to `src/project/GatePanel.tsx` (research R15): a `GateBrief` for the step awaiting approval with the failing checks and `briefNotes`, hidden when empty; pass `notes` as a new prop.
- [ ] T036 [P] [US3] Three tabs in `src/project/LocalWorkspace.tsx`: Local mode panel · Highlights {n} (local has no Copilot or gate, so two tabs use the existing two-column strip, and there is no "Before you approve", per FR-016/FR-019).

**Checkpoint**: quickstart §5 passes in all four modes.

---

## Phase 6: User Story 4 - Highlight còn đúng khi tài liệu đổi (Priority: P3)

**Goal**: Highlights whose text changed stay in the panel as Outdated; unchanged ones still anchor.

**Independent Test**: quickstart §6.

- [ ] T037 [P] [US4] Add to `tests/anchor.test.ts`: a highlight created on version A of a markdown fixture, rendered text of version B with the paragraph edited → `locate` returns null; version C restoring the sentence → found again at the right occurrence.
- [ ] T038 [US4] In `src/annotations/useHighlights.ts` and `HighlightsPanel.tsx`, mark outdated items, skip them when drawing and pinning, and keep them listed with the old quote and note (already wired in T015/T033; this task verifies and fixes the end-to-end path with a fixture spec in the demo data or a test repo).

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T039 [P] Performance check (SC-006): generate 200 synthetic highlights for a demo feature in the scratchpad, measure redraw on step change with `performance.now()` in Playwright; optimise `locate` (index the text once per render) if over 1 second.
- [ ] T040 [P] Accessibility and phone checks (FR-023, SC-008): keyboard-only create/edit/remove (Shift+arrows to select, Tab into the toolbar, Enter, Escape), screen-reader names, and 390px with no horizontal scroll; fix in the components. Highlight legibility (FR-001): add to `tests/reader.test.ts` a check that body text stays ≥ 4.5:1 on each `--hl-*-text` colour blended over each page theme's background (White, Sepia, Green, Dark); if a pair fails, raise it in the PR instead of changing the design colours silently.
- [ ] T041 Design comparison (constitution IV): demo screenshots at 1440×900 and 924×540 against the design export; the highlight parts now must match too. List any remaining difference in the PR.
- [ ] T042 Run quickstart §1–§8 end to end (server against a test repo of your own, Pages build preview, local in Chromium) and record the results in the PR description.
- [ ] T043 Run `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`; open the PR from `feat/010-spec-annotations` mentioning `specs/010-spec-annotations`, the four modes, constitution 1.4.0 and the new Contents: write permission.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup → Foundational → stories. Foundational blocks everything.
- **US1** (P1): needs Foundational. MVP for demo; live saving needs US2's consent (T024).
- **US2** (P1): needs Foundational; T024 edits `Annotator` from T018, T031 replaces the store from T022.
- **US3** (P2): needs US1 (items, focus). Edits the same shells as US1, so after US1.
- **US4** (P3): needs US1 and US3.
- Polish after the stories that ship.

### Within Each Story

Tests first (must fail), then pure modules, then components, then shell wiring, then the quickstart checkpoint.

### Parallel Opportunities

- Foundational tests T003, T004, T005 together.
- US1: T021 and T022 together after T018–T020.
- US2: T028 alongside T024–T027; T029 and T030 together.
- US3: T035 and T036 together after T033–T034.
- Polish: T039 and T040 together.

## Parallel Example: Foundational

```bash
Task: "T003 tests/anchor.test.ts"
Task: "T004 tests/highlights.test.ts part 1 (pure functions)"
Task: "T005 tests/fakeGitHub.ts contents store"
```

## Implementation Strategy

### MVP First

1. Phase 1–2.
2. US1 in demo (T014–T020): matches the design, no GitHub.
3. US2 (T023–T031): sharing for real in server, Pages and local.
4. Validate quickstart §1–§4, §7. Shippable.

### Incremental Delivery

US3 (panel and brief) → US4 (Outdated) → Polish. One PR is fine; split per story if review is easier,
but constitution 1.4.0 must ship with the first PR that writes to repos.

## Notes

- Never commit the design export or screenshots of private repos.
- Commit after each task or logical group; tick the task in the same commit.
