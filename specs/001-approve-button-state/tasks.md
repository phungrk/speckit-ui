---

description: "Task list for 001 approve button state"
---

# Tasks: Trạng thái nút Approve sau khi duyệt

**Input**: Design documents from `/specs/001-approve-button-state/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/gates.md, quickstart.md

**Tests**: Có. Constitution nguyên tắc V bắt buộc test cho luồng ghi issue. Mọi test dùng GitHub giả lập và fixture tự tạo, không gọi GitHub thật.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Cấu trúc hiện có: SPA trong `src/`, logic GitHub dùng chung trong `server/`, test trong `tests/`. Xem plan.md → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: GitHub giả lập tái hiện được lỗi gốc.

- [ ] T001 Add a `staleIssueList` option to `fakeGitHub` in `tests/fakeGitHub.ts`:
  - `GET /repos/{o}/{r}/issues` keeps returning the issues as they were before the first write;
  - `GET`/`PATCH /issues/{n}` stay current;
  - issues carry `updated_at`, which moves forward on every PATCH;
  - every call records its `cache` init option, so tests can assert `no-cache`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Kết quả ghi trở thành nguồn sự thật, và dữ liệu cũ không ghi đè được nó (R2, R3). Mọi user story dựa vào phần này.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Add `updatedAt: string | null` to `GateIssue` in `src/project/types.ts`, and fill it from `updated_at` in `toGateIssue` in `server/tracking.ts`
- [ ] T003 [P] Make every read in `gh()` in `server/github.ts` use `cache: 'no-cache'`, so the browser revalidates with GitHub instead of serving its 60-second HTTP cache (R1, R3). Leave writes as they are.
- [ ] T004 Add the pure function `applyIssue(tracking, slug, issue): Tracking` to `server/tracking.ts`. It returns a new tracking whose `issues[slug]` is `issue`, and leaves the input unchanged (R2).
- [ ] T005 Add the recent-writes store to `server/tracking.ts`:
  - a `Map` keyed `identity|owner/repo|slug` holding `{ issue, at }` for 2 minutes;
  - `loadTracking` merges it into the listed issues, keeping whichever has the newer `updatedAt` and dropping recent writes that GitHub has caught up with;
  - `clearTrackingCache()` empties it (data-model.md → RecentWrite).
- [ ] T006 [P] Write foundational tests in `tests/tracking.test.ts`:
  - `applyIssue` does not mutate its input;
  - a recent write wins over an older listed issue;
  - a listed issue with a newer `updatedAt` wins and clears the recent write;
  - recent writes expire after 2 minutes (fake timers);
  - `gh` reads send `cache: 'no-cache'`.

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Cổng chuyển ngay sang trạng thái đã duyệt (Priority: P1) 🎯 MVP

**Goal**: Ngay khi duyệt thành công, khu vực cổng hiện đã duyệt (người duyệt, ngày, Reopen gate), không còn nút Approve. Thanh bước và Next up đổi cùng lúc.

**Independent Test**: Duyệt một cổng đủ điều kiện khi GitHub giả lập trả danh sách issue cũ. Khu vực cổng phải đổi ngay sang đã duyệt, và vẫn đã duyệt sau Refresh hay tải lại trang (quickstart.md kịch bản 1, bước 1–3).

### Tests for User Story 1

- [ ] T007 [P] [US1] Write tests in `tests/tracking.test.ts` with `staleIssueList` on:
  - `decideGate(...,'approve')` returns `tracking` where the gate is approved by the current user;
  - `getTracking(src, project, true)` right after still shows it approved (FR-004);
  - `POST /api/gates` through `route()` returns the same `{ issue, unchanged: false, tracking }` without re-listing PRs;
  - `browserBackend.decide` returns the same result (FR-009).

### Implementation for User Story 1

- [ ] T008 [US1] Change `decideGate` in `server/tracking.ts`:
  - return `{ issue, unchanged, tracking }`, where `tracking = applyIssue(trackingUsedForChecks, f.slug, issue)`;
  - record the recent write as soon as the PATCH succeeds;
  - stop clearing the whole repo's tracking cache; instead store the merged tracking under the current key.
- [ ] T009 [US1] Make `handleGate` in `server/routes.ts` return `{ issue, unchanged, tracking }` from `decideGate` instead of calling `getTracking(src, project, true)` again (contracts/gates.md)
- [ ] T010 [US1] Change `Backend.decide` in `src/backend.ts` and `postGate` in `src/project/trackingApi.ts` to return `{ tracking, unchanged }`. `browserBackend.decide` passes the `decideGate` result through without calling `getTracking`.
- [ ] T011 [US1] In `src/project/LiveWorkspace.tsx`, set `tracking` from the decide result, so the gate panel, step rail, Next up and spec progress bars update in the same render (FR-001, FR-005)

**Checkpoint**: User Story 1 works on its own; the reported bug is fixed.

---

## Phase 4: User Story 2 - Không thể duyệt hai lần trong lúc đang xử lý (Priority: P1)

**Goal**: Bấm liên tiếp, nhấp đúp hay duyệt từ tab khác chỉ tạo đúng một bản ghi duyệt. Người bấm sau thấy tên người đã duyệt trước.

**Independent Test**: Bấm nhanh 5 lần vào Approve, rồi kiểm tra GitHub giả lập: có đúng 1 PATCH và 1 comment. Duyệt từ tab thứ hai thì tab đó hiện "Already approved" (quickstart.md kịch bản 1, bước 4–5).

### Tests for User Story 2

- [ ] T012 [P] [US2] Write tests in `tests/tracking.test.ts`:
  - five concurrent `decideGate` approvals for one spec make exactly 1 PATCH and 1 comment, and four results have `unchanged: true` (SC-002);
  - approving a gate already approved by `@lan` makes no write and returns `unchanged: true` with `by: 'lan'` (FR-007);
  - the first approval creates the issue, and a second approval of another gate right after, with `staleIssueList` on, reuses it and does not create a second issue.

### Implementation for User Story 2

- [ ] T013 [US2] Serialise `decideGate` per `owner/repo|slug` with a promise-chain lock in `server/tracking.ts`, so later calls see earlier results (R4)
- [ ] T014 [US2] Make `decideGate` in `server/tracking.ts` idempotent:
  - after reading the issue with `GET /issues/{n}`, if the gate is already in the target state (approved for `approve`, not approved for `reopen`), return `{ issue, unchanged: true, tracking }` without a PATCH or comment;
  - find an existing issue through the merged tracking (recent writes included) before creating one.
- [ ] T015 [US2] In `src/project/GatePanel.tsx`:
  - guard `decide` with a `useRef` flag set synchronously before `setBusy`, so a second click is ignored even before React re-renders (FR-002, FR-003);
  - change `onDecide` to return `{ error: string | null; unchanged: boolean }`;
  - when `unchanged` after Approve, show "Already approved" next to the approver line, using `sk-meta`;
  - update the caller in `src/project/LiveWorkspace.tsx`.

**Checkpoint**: User Stories 1 and 2 work together. This is the MVP.

---

## Phase 5: User Story 3 - Duyệt thất bại thì báo rõ và cho thử lại (Priority: P2)

**Goal**: Mọi lỗi đều hiện thông báo, giữ cổng chưa duyệt và cho bấm lại. Ứng dụng không bao giờ báo thành công khi ghi thất bại.

**Independent Test**: Duyệt với GitHub giả lập trả 403, 409 hoặc lỗi mạng: luôn thấy thông báo, nút dùng lại được, cổng chưa duyệt (SC-004).

- [ ] T016 [P] [US3] Write tests in `tests/tracking.test.ts`:
  - a 403 on PATCH, a 409 from failing checks and a network error each reject `decideGate`, record no recent write, and leave `getTracking` showing the gate unapproved;
  - when the PATCH succeeds but the comment POST fails, the call rejects, the gate already shows approved on the next `getTracking`, and a retry returns `unchanged: true` with no second PATCH.
- [ ] T017 [US3] In `server/tracking.ts`, make a failure after the PATCH surface as an error while keeping the recent write. In `src/project/GatePanel.tsx`, leave Approve enabled after any error (FR-006, R5).

**Checkpoint**: Errors never show a false approval.

---

## Phase 6: User Story 4 - Reopen gate có hành vi tương tự (Priority: P3)

**Goal**: Reopen chuyển ngay về chưa duyệt; nút khoá trong lúc lưu; lỗi thì giữ đã duyệt.

**Independent Test**: Mở lại một cổng đã duyệt mà không tải lại trang: nút Approve xuất hiện ngay. Reopen lỗi thì cổng vẫn đã duyệt (quickstart.md kịch bản 1, bước 6).

- [ ] T018 [P] [US4] Write tests in `tests/tracking.test.ts`:
  - with `staleIssueList` on, a reopen returns tracking where the gate is unapproved, and the next `getTracking` keeps it unapproved;
  - reopening an unapproved gate is `unchanged: true` with no write;
  - a failed reopen leaves the gate approved.
- [ ] T019 [US4] Check that the Reopen gate button in `src/project/GatePanel.tsx` uses the same ref guard and busy state as Approve, and shows "Saving…" while busy (FR-008)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T020 Run `specs/001-approve-button-state/quickstart.md` scenarios 1 and 2 with Playwright against a synthetic GitHub whose issue list stays stale for 60 seconds. Record the time from write to approved state (SC-001 ≤ 1 s).
- [ ] T021 [P] Check demo-mode pixel parity of `src/App.tsx` against `main` at 1440×900 and 924×540, on the main screen and the New spec dialog (FR-010, constitution IV)
- [ ] T022 [P] Update the "Gates and approvals" section of `README.md`:
  - the gate shows the approval as soon as GitHub confirms it;
  - approving twice records once;
  - reads revalidate with GitHub (`no-cache`).
- [ ] T023 Run all four quality gates from `package.json`: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` (constitution V)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: depends on Setup and blocks every story. T002 → T004 → T005. T003 is independent.
- **US1 (Phase 3)**: depends on Phase 2. T008 → T009 and T010 → T011.
- **US2 (Phase 4)**: depends on US1 (T008's return shape). T013 → T014; T015 after T010 and T011.
- **US3 (Phase 5)**: depends on US1. Can run alongside US2, except that T017 and T015 both touch `GatePanel.tsx`, so do them one after the other.
- **US4 (Phase 6)**: depends on US2 (T014's idempotency covers reopen).
- **Polish (Phase 7)**: after the stories.

### User Story Dependencies

```text
Phase 2 ──► US1 ──► US2 ──► US4
              └───► US3
```

### Within Each User Story

- Write the tests first and see them fail; T007 must fail on the current code with `staleIssueList`.
- Order: `server/tracking.ts` → `server/routes.ts` → `src/backend.ts` → UI.

## Parallel Opportunities

- **Phase 2**: T003 and T006 alongside T002 → T005.
- **US1**: T007 alongside T008.
- **US2–US4**: test tasks T012, T016 and T018 are independent of each other.
- **Polish**: T021 and T022 together.

### Parallel Example: Phase 2

```text
Task: "T003 gh() reads with cache: 'no-cache' in server/github.ts"
Task: "T006 foundational tests in tests/tracking.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Phase 1 → Phase 2. T003 alone already removes the 60-second browser cache on Pages.
2. US1: show the write result at once.
3. US2: no duplicate approvals.
4. **STOP and VALIDATE** with quickstart.md scenario 1, steps 1–5.

### Incremental Delivery

- US3 and US4 follow in the same PR; together they are small.
- Modes: server and Pages; demo unchanged.

### Notes

- Branch: `feat/001-approve-button-state`. The PR description mentions `specs/001-approve-button-state`.
- Save `/speckit-analyze` output as `specs/001-approve-button-state/analysis.md` before implementing.
