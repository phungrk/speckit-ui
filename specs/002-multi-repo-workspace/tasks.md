---

description: "Task list for 002 multi-repo workspace"
---

# Tasks: Làm việc với nhiều repo trong một phiên

**Input**: Design documents from `/specs/002-multi-repo-workspace/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Có. Constitution nguyên tắc V bắt buộc unit test cho logic đọc dữ liệu và luồng ghi; plan.md liệt kê các file test. Mọi test dùng GitHub giả lập và fixture tự tạo, không gọi GitHub thật.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Cấu trúc hiện có của repo: SPA trong `src/`, server Node trong `server/`, test trong `tests/` (xem plan.md → Project Structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Cấu hình để token local không lọt vào git và server đọc được `.env.local`.

- [ ] T001 Add `.env.local` and `.env.*.local` to `.gitignore` so local tokens are never committed (FR-016, R7)
- [ ] T002 [P] Update `.env.example`: describe `GITHUB_REPO` as the default repo to open, add `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET` and `ALLOW_REMOTE_TOKEN_MODE`, and say that personal tokens belong in `.env.local`
- [ ] T003 [P] Change the `start` script in `package.json` to load `--env-file-if-exists=.env --env-file-if-exists=.env.local` so `.env.local` overrides `.env` (R7)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cache tách theo người dùng và repo, backend nhận tham số repo, lưu tuỳ chọn và địa chỉ. Mọi user story đều dựa vào phần này.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add `CurrentUser`, `AccessibleRepo`, `RepoListing` and `OverviewItem` types from data-model.md to `src/project/types.ts`
- [ ] T005 Add `identityFor(token)` (first 8 hex chars of SHA-256 via `crypto.subtle`, which works in the browser and Node 22) and an optional `identity` field on `Source` in `server/github.ts` (R3)
- [ ] T006 Replace the single-slot project cache and the shared `inflight` promise in `server/github.ts` with a `Map` keyed by `identity|owner/repo@ref`: at most 8 entries, evicting the oldest, and an in-flight promise per key. Export `clearProjectCache()`, which empties the map (R3, FR-006, FR-017)
- [ ] T007 Replace the single-slot tracking cache in `server/tracking.ts` with a `Map` keyed by `identity|owner/repo@sha`, and invalidate only the affected key after `decideGate`. Export `clearTrackingCache()` (R3, FR-017)
- [ ] T008 [P] Write `tests/cache.test.ts` covering:
  - switching repo while a load is in flight returns the right repo;
  - two identities never share an entry;
  - eviction after 8 entries;
  - a tracking write invalidates only its own repo;
  - `POST /api/gates` with `"repo": "o/b"` while `GITHUB_REPO=o/a` writes the issue in `o/b`, and the same holds for `browserBackend.decide` (FR-009);
  - `clearProjectCache()` and `clearTrackingCache()` leave no entries.
- [ ] T009 Make `/api/project`, `/api/tracking` and `POST /api/gates` accept `repo` (and optional `ref`), defaulting to `GITHUB_REPO` and returning 400 when neither is set, per contracts/server-api.md, in `server/github.ts` and `server/tracking.ts`
- [ ] T010 Extend the `Backend` interface in `src/backend.ts`:
  - add `session()`, `repos()` and `detect(repos)`;
  - `browserBackend.session()` calls `GET /user` with the stored token and returns `CurrentUser` (`mode: 'pages'`); a 401 returns `user: null` with an error, so Connect shows it;
  - give `project`, `tracking` and `decide` a `repo` argument;
  - `serverBackend` sends `?repo=` and `"repo"` in the body;
  - `browserBackend` builds a `Source` per repo from the stored token, with `identity` set.
- [ ] T011 [P] Create `src/project/prefs.ts`:
  - `getPins/setPins`, `getLast/setLast` and `getLastRepo/setLastRepo`, namespaced `sk.u.<login>.*`;
  - choose `localStorage`, or `sessionStorage` for the Pages build without Remember;
  - wrap every access in try/catch;
  - cap pins at 20 and drop duplicates (R9, data-model.md).
- [ ] T012 [P] Write `tests/prefs.test.ts`: per-login isolation, session versus local storage choice, blocked storage, pin cap and dedupe
- [ ] T013 [P] Create `src/project/urlState.ts`:
  - read and write `repo`, `spec`, `step` and `view` with `history.replaceState`;
  - assert that no other parameters (tokens, keys) are ever written (FR-008, contracts/client-state.md);
  - in the app the step is the index `0–6`, while the URL uses the name (`constitution`, `specify`, `clarify`, `plan`, `tasks`, `analyze`, `implement`); export `stepToParam` and `paramToStep`, where an unknown name gives `null`;
  - put tests for the mapping and the no-secrets assertion in `tests/prefs.test.ts`.

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Chọn repo từ danh sách token được phép (Priority: P1) 🎯 MVP

**Goal**: Sau khi người dùng được nhận diện, hiển thị các repo họ có quyền đọc, đánh dấu repo Spec Kit, và mở repo được chọn.

**Independent Test**: Kết nối bằng token có quyền với 2 repo Spec Kit và 1 repo thường. Danh sách hiện đủ 3 repo, đúng nhãn, và chọn một repo thì mở đúng dự án (quickstart.md kịch bản 1, bước 2–3).

### Tests for User Story 1

- [ ] T014 [P] [US1] Write `tests/repos.test.ts` with a mocked GitHub covering:
  - `listRepos` paging (200 repos take exactly 2 calls, SC-002) and the 1,000-repo cap (`truncated`);
  - `detectSpeckit` mapping 200 to Spec Kit, 404 to not, and other errors to an error entry;
  - concurrency of at most 6;
  - the in-memory `repo@pushedAt` cache;
  - sort order: pinned, then Spec Kit, then unknown, then plain, newest first within each group;
  - `/api/session` in token mode returns the login from `GET /user`, and reports a rejected token with the `.env.local` hint.

### Implementation for User Story 1

- [ ] T015 [US1] Implement `listRepos(src)` in `server/github.ts`: `GET /user/repos?per_page=100&sort=pushed`, at most 10 pages, mapped to `AccessibleRepo` and returned as `RepoListing` (R1)
- [ ] T016 [US1] Implement `detectSpeckit(src, fullNames)` in `server/github.ts`:
  - call `GET /repos/{owner}/{repo}/contents/.specify`, at most 6 at a time;
  - cache in memory only, keyed by `identity|repo@pushedAt`, and clear it with `clearProjectCache()`;
  - nothing is written to browser storage (R2);
  - add a `sortRepos(repos, pins)` helper (FR-002).
- [ ] T017 [US1] Add `handleSession`, `handleRepos` and `handleDetect` (`GET /api/session`, `GET /api/repos`, and `POST /api/repos/detect` with the same-origin JSON check) per contracts/server-api.md in `server/github.ts`, and register them in `server/index.ts` and `vite.config.ts`
- [ ] T018 [US1] Add start-up mode detection (`signin` / `token` / `demo`) in `server/index.ts`. In token mode:
  - bind to `127.0.0.1` unless `ALLOW_REMOTE_TOKEN_MODE=1`, and print a warning;
  - `GET /api/session` calls `GET /user` once with `GITHUB_TOKEN` and caches the login;
  - a missing or rejected token is reported with the `.env.local` hint (R6, FR-016).
- [ ] T019 [US1] Create `src/project/RepoPicker.tsx`:
  - repo list with a "Spec Kit" or "Checking…" label;
  - detection requested for visible rows first;
  - manual `owner/name` input (FR-007);
  - auto-open when exactly one Spec Kit repo exists (US1-AS3);
  - an empty state when none is found (US1-AS4);
  - a truncated hint when the 1,000-repo cap is hit.
- [ ] T020 [US1] Make the repository field optional in `src/Connect.tsx` (moved under an "Advanced" section), and stop requiring `repo` in `loadSettings` in `src/backend.ts`
- [ ] T021 [US1] Rework `src/Root.tsx`:
  - identify the user (Pages: settings; server: `backend.session()`);
  - then open `?repo=`, else `lastRepo`, else `defaultRepo`, else the RepoPicker;
  - show a guidance screen for local token mode with a missing or invalid token (FR-016).
- [ ] T022 [P] [US1] Add RepoPicker styles in `src/styles/live.css` using Modernist tokens and classes (`sk-list`, `sk-qitem`, `sk-chip`, `tag`), including phone width

**Checkpoint**: User Story 1 works on its own: pick any permitted repo and see its project.

---

## Phase 4: User Story 2 - Chuyển qua lại giữa các repo (Priority: P1)

**Goal**: Chuyển repo từ thanh điều hướng mà không nhập lại gì. Quay lại thì mở đúng chỗ cũ. Không lẫn dữ liệu giữa các repo.

**Independent Test**: Mở repo A ở bước Plan của một spec, chuyển sang B, rồi quay lại A. Đúng spec và bước cũ hiện ra, và không có dữ liệu nào của A xuất hiện ở B (quickstart.md kịch bản 1, bước 4–5).

### Tests for User Story 2

- [ ] T023 [P] [US2] Write `tests/repoLoader.test.ts`: a response for an earlier repo that resolves after a later switch is discarded (latest wins), and errors are scoped to their repo

### Implementation for User Story 2

- [ ] T024 [US2] Create `src/project/repoLoader.ts`: a latest-wins loader that tags each request with `fullName` and ignores results whose repo is no longer current (data-model.md → RepoContext)
- [ ] T025 [US2] Use `repoLoader` in `src/Root.tsx` for project and tracking loads; on switch, clear the shown `RepoContext` immediately and update the URL through `urlState` (US2-AS3, FR-006)
- [ ] T026 [US2] Add a repo switcher and an "All repos" link to the nav in `src/project/LiveWorkspace.tsx`, listing pinned repos first, then recent repos (FR-004)
- [ ] T027 [US2] In `src/project/LiveWorkspace.tsx`, key Copilot threads and the selected spec and step by `fullName`; restore them from `prefs.getLast` when a repo opens and save them with `prefs.setLast` and `setLastRepo` on change (FR-005)

**Checkpoint**: User Stories 1 and 2 work together. This is the MVP: choose and switch repos.

---

## Phase 5: User Story 3 - Ghim và tìm repo (Priority: P2)

**Goal**: Ghim hoặc bỏ ghim repo; repo đã ghim nằm đầu danh sách. Tìm repo theo tên.

**Independent Test**: Ghim 2 repo, rồi tải lại trang: cả hai nằm đầu danh sách. Gõ một phần tên: chỉ còn các repo khớp (US3-AS1, US3-AS2).

- [ ] T028 [US3] Add pin and unpin buttons with `aria-pressed` to each row in `src/project/RepoPicker.tsx`, using `prefs.setPins`, and re-sort immediately (FR-011, US3-AS3)
- [ ] T029 [US3] Add a search box in `src/project/RepoPicker.tsx` that filters by any part of `owner/name`, case-insensitive, and keeps the manual entry option when nothing matches (FR-010)
- [ ] T030 [US3] Handle repo-scoped access errors:
  - in `src/project/RepoPicker.tsx` and `src/project/LiveWorkspace.tsx`, hide pinned repos that are no longer accessible (404 or 403) from the active list and show a notice;
  - keep those repos in stored pins until the user unpins them (data-model.md → Pins);
  - keep the other repos working (FR-012);
  - in `src/project/GatePanel.tsx`, map a 403 from `decide` to "You can read this repo but cannot write issues here", shown only for that repo, with the Approve button left enabled for a retry;
  - add both cases to `tests/repoLoader.test.ts`.

**Checkpoint**: Pinning and search work. The overview can use the pin list.

---

## Phase 6: User Story 4 - Tổng quan các repo đã ghim (Priority: P2)

**Goal**: Một màn hình hiện việc cần làm tiếp theo của mọi repo đã ghim, nhóm theo repo. Bấm một mục thì mở đúng repo, spec và bước.

**Independent Test**: Ghim 3 repo Spec Kit, rồi mở Overview. Thấy việc cần làm của cả 3 repo, và bấm một mục thì mở đúng nơi. Một repo lỗi không ảnh hưởng các repo khác (quickstart.md kịch bản 1, bước 6–7).

### Tests for User Story 4

- [ ] T031 [P] [US4] Write `tests/overview.test.ts` for `buildOverview`:
  - a pending approval comes before the next command;
  - an implement item shows progress;
  - specs with nothing to do are left out;
  - the output matches the existing Next up for the same project.

### Implementation for User Story 4

- [ ] T032 [P] [US4] Implement the pure function `buildOverview(project, tracking): OverviewItem[]` in `src/project/overview.ts`, reusing `nextStep` and `unapprovedGates` from `src/project/phases.ts` and `src/project/gates.ts` (R10)
- [ ] T033 [US4] Create `src/project/Overview.tsx`:
  - load pinned repos at most 3 at a time with `Promise.allSettled`;
  - give each repo its own block in a `loading`, `ready` or `error` state (FR-019);
  - each item opens its repo, spec and step;
  - show pinning guidance when nothing is pinned (US4-AS4).
- [ ] T034 [US4] Route `?view=overview` in `src/Root.tsx`, and add "Overview" links in `src/project/LiveWorkspace.tsx` and `src/project/RepoPicker.tsx`
- [ ] T035 [P] [US4] Add Overview styles in `src/styles/live.css` using Modernist tokens, with one block per repo separated by 2px rules

**Checkpoint**: Wave A (US1–US4) is complete in the Pages build and in local token mode.

---

## Phase 7: User Story 5 - Mọi chế độ đều dùng quyền của chính người dùng (Priority: P2)

**Goal**: Bản server bắt đăng nhập bằng GitHub App; token chỉ ở server, trong phiên; mỗi người chỉ thấy repo của mình. Có đăng xuất và ngắt kết nối.

**Independent Test**: Đăng nhập bằng 2 tài khoản có quyền khác nhau. Mỗi người chỉ thấy repo của mình, phê duyệt ghi đúng tên, và không có token nào trong response hay cookie đọc được bằng JavaScript (quickstart.md kịch bản 3).

### Tests for User Story 5

- [ ] T036 [P] [US5] Write `tests/session.test.ts` with mocked GitHub endpoints covering:
  - `/auth/login` sets the `sk_oauth` state cookie and redirects;
  - a callback with a wrong, missing or expired state returns 400 and creates no session;
  - a valid callback sets an `HttpOnly; Secure; SameSite=Lax` `sk_session` cookie;
  - no response body ever contains the access or refresh token;
  - an expired access token is refreshed;
  - a failed refresh ends the session;
  - `/api/*` returns 401 without a session;
  - logout clears both store and cookie;
  - cache keys use the login.

### Implementation for User Story 5

- [ ] T037 [US5] Create `server/session.ts` with:
  - an in-memory `ServerSession` store keyed by a 32-byte random id from `node:crypto`;
  - cookie parse and serialize helpers;
  - a 7-day maximum age;
  - `getSession(req)` and `destroySession(id)`.
- [ ] T038 [US5] Implement the GitHub App web flow in `server/session.ts`:
  - `GET /auth/login?return=` with a random `state` stored in the `sk_oauth` cookie for 10 minutes;
  - `GET /auth/callback`, which exchanges the code at `https://github.com/login/oauth/access_token` server-side, reads `/user`, creates the session and redirects to `return`;
  - access-token refresh with the refresh token;
  - `POST /auth/logout` (same-origin only) (R4, R5).
- [ ] T039 [US5] In `server/index.ts` and `vite.config.ts`, register the `/auth/*` routes. In sign-in mode, require a session for every `/api/*` except `/api/session`, and build each request's `Source` from the session token with `identity = login` (FR-014, FR-015)
- [ ] T040 [US5] Make `listRepos` in `server/github.ts` list repos through `/user/installations` and `/user/installations/{id}/repositories` when the token is a GitHub App user token (R1)
- [ ] T041 [US5] Create `src/project/SignIn.tsx` with a "Sign in with GitHub" screen that keeps the current query in `return`. In `src/Root.tsx`, send any 401 to SignIn and hide all repo data. Add a "Sign out" button that calls `POST /auth/logout` in `src/project/LiveWorkspace.tsx` (US5-AS1, US5-AS5)
- [ ] T042 [US5] On Pages **Disconnect** and server **Sign out**, in `src/backend.ts` and `src/Root.tsx`:
  - clear `sk.settings`;
  - call `clearProjectCache()` and `clearTrackingCache()`;
  - drop the shown `RepoContext` and the Copilot threads;
  - keep pins and the last-viewed position (FR-017, contracts/client-state.md).

**Checkpoint**: All user stories work in every mode, each with the user's own permissions.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T043 [P] Update `README.md`:
  - working with many repos, deep links and the overview;
  - the three ways a user is identified (Pages token, server sign-in, local `.env.local`);
  - registering the GitHub App and its least-privilege permissions;
  - token-mode binding;
  - **Security**: the new server-side destination `github.com/login/oauth/*`, tokens only in the server-side session, and the single-process limit of the in-memory store (constitution II).
- [ ] T044 [P] Update the Rules and Commands summary in `CLAUDE.md` to mention per-user access in every mode and `.env.local`
- [ ] T045 Run the quickstart scenarios from `specs/002-multi-repo-workspace/quickstart.md` in Chromium with Playwright:
  - scenarios 1, 2 and 4 with GitHub writes intercepted;
  - scenario 3 against a mocked GitHub App flow;
  - record the wall-clock times of scenario 1 step 2 (SC-002, ≤5 s), step 4 (SC-001, ≤10 s) and step 6 (SC-005, ≤10 s) against real GitHub (read-only), and put them in the PR description.
- [ ] T046 Check demo-mode pixel parity against the design at 1440×900 and 924×540, on the main screen and the New spec dialog (constitution IV)
- [ ] T047 Run all four quality gates: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` (constitution V)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup and **blocks** every user story. T005 → T006 → T007; T009 depends on T006 and T007; T010 depends on T009.
- **US1 (Phase 3)**: depends on Phase 2.
- **US2 (Phase 4)**: depends on US1 (it needs a repo to open and the RepoPicker to return to).
- **US3 (Phase 5)**: depends on US1 (RepoPicker); independent of US2.
- **US4 (Phase 6)**: depends on US3 (pins). T032 and T031 can start once Phase 2 is done.
- **US5 (Phase 7)**: depends on Phase 2 and T017 (`/api/session`); independent of US2–US4. Can run in parallel with wave A once T017 and T018 are done.
- **Polish (Phase 8)**: after the stories in the wave being delivered.

### User Story Dependencies

```text
Phase 2 ──► US1 ──► US2
             │
             └──► US3 ──► US4
Phase 2 + T017/T018 ──► US5
```

### Within Each User Story

- Write tests first and confirm they fail before implementing.
- Order: server/shared logic → backend → UI → styles.

## Parallel Opportunities

- **Phase 1**: T002 and T003 alongside T001.
- **Phase 2**: T008, T011, T012 and T013 are independent files once T004 is done.
- **US1**: T014 and T022 alongside implementation.
- **US4**: T031 and T032 can be done early, right after Phase 2.
- **US5**: T036 can be written in parallel with the whole of wave A; T037–T040 are in `server/` and do not touch the UI files of US2–US4.

### Parallel Example: Phase 2

```text
Task: "T008 Write tests/cache.test.ts …"
Task: "T011 Create src/project/prefs.ts …"
Task: "T012 Write tests/prefs.test.ts …"
Task: "T013 Create src/project/urlState.ts …"
```

### Parallel Example: User Story 4

```text
Task: "T031 Write tests/overview.test.ts …"
Task: "T032 Implement buildOverview in src/project/overview.ts …"
Task: "T035 Add Overview styles in src/styles/live.css …"
```

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Phase 1 → Phase 2 (keyed caches fix the cross-repo leak even before any new UI).
2. US1: list and pick repos.
3. US2: switch repos with restored position.
4. **STOP and VALIDATE** with quickstart.md scenario 1, steps 2–5, then deploy the Pages build.

### Incremental Delivery

- **Wave A**: MVP → US3 (pins and search) → US4 (overview). Each increment ships through the Pages build and works in local token mode.
- **Wave B**: US5 server sign-in, behind configuration. Without `GITHUB_APP_*` the server keeps working in token mode bound to localhost.

### Notes

- Per the constitution this feature goes through the full Spec Kit flow: run `/speckit-analyze` and save the report as `specs/002-multi-repo-workspace/analysis.md` before implementing.
- Commit after each task or logical group. Branch: `feat/002-multi-repo-workspace`.
- Each PR description links `specs/002-multi-repo-workspace/spec.md`.
