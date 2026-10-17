---

description: "Task list for 003 branch specs"
---

# Tasks: Liệt kê spec trên nhiều nhánh

**Input**: Design documents from `/specs/003-branch-specs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/branches.md, quickstart.md

**Tests**: Có. Constitution nguyên tắc V bắt buộc test cho logic đọc dữ liệu và luồng ghi. Mọi test dùng GitHub giả lập và fixture tự tạo.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Cấu trúc hiện có: SPA trong `src/`, logic GitHub dùng chung trong `server/`, test trong `tests/`. Xem plan.md → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 [P] Extend `fakeGitHub` in `tests/fakeGitHub.ts` with a `branches` option. It maps a branch name to `{ files: Record<path, text> }` and serves:
  - `GET /branches` with paging and a `Link` header;
  - `GET git/trees/{commitSha}` for the root tree, `git/trees/{treeSha}` for `specs/` and for each spec folder, and `?recursive=1`, all with content-derived SHAs, so identical folders share a SHA;
  - `GET commits/{sha}` with a commit date;
  - raw contents at a ref;
  - a `failBranch` option that answers 500 for one branch.
- [ ] T002 [P] Add `branchPrefixes` to `parseUiConfig` in `server/parse.ts`: default `["feat/"]`; `[]` allowed; ignore anything that is not an array of strings (R8)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Add the following types to `src/project/types.ts` (data-model.md):
  - on `SpecFeature`: `branch: string | null`, `sha: string`, `unmerged: boolean` and `variants: SpecVariant[]`;
  - new types `SpecVariant` and `BranchInfo`;
  - on `Project`: `branches: BranchInfo[]` and `skippedBranches: number`.

  Single-branch loads in `server/github.ts` fill the defaults: `branch: null`, `sha: project.sha`, `unmerged: false`, and one variant.
- [ ] T004 Extract `loadSpecDir(src, commitSha, dir, files)` from `loadAt` in `server/github.ts`. It returns a `SpecFeature` for one `specs/NNN-slug` folder, cached in an LRU of 64 keyed by the folder's tree SHA when known (R3). `loadAt` keeps its behaviour by calling it.
- [ ] T005 Add `listBranches(src, prefixes)` to `server/github.ts`:
  - read `GET /repos/{o}/{r}/branches?per_page=100`, at most 3 pages;
  - keep names starting with one of `prefixes`;
  - sort by name descending and keep 30;
  - return `{ branches: { name, sha }[], skipped }` (R1).
- [ ] T006 [P] Write `tests/branches.test.ts` foundational cases:
  - `parseUiConfig` defaults, `[]` and invalid values;
  - `listBranches` filters by prefix, ignores `fix/…`, caps at 30 and reports `skipped`;
  - `loadSpecDir` serves a second load of the same tree SHA from cache with no fetch.

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Thấy cả spec chưa merge (Priority: P1) 🎯 MVP

**Goal**: Mở hoặc chuyển sang một repo thì panel Specs hiện spec của nhánh chính cùng spec của các nhánh `feat/…` chưa merge, kèm tên nhánh.

**Independent Test**: Repo giả lập có spec A trên `main`, B trên `feat/b`, C trên `feat/c`: panel hiện A, B, C, trong đó B và C có nhãn nhánh. Nhánh đã merge không gây trùng; nhánh không có `specs/` và nhánh `fix/…` bị bỏ qua (quickstart.md kịch bản 1, bước 1).

### Tests for User Story 1

- [ ] T007 [P] [US1] Add tests in `tests/branches.test.ts`:
  - `loadProject` lists main and `feat/` specs with `branch` and `unmerged` set;
  - a merged branch costs exactly 1 tree call;
  - a branch without `specs/` is skipped silently;
  - `fix/…` is not read;
  - a failing branch adds a warning while the other specs stay (FR-008);
  - a fixed `ref` reads only that branch (FR-010);
  - a refresh with nothing changed makes only the main commit and branch-list calls;
  - after a new push to a branch, the next refresh shows the new file (SC-001);
  - a deleted branch's specs disappear on the next refresh, and a force-push back to an older SHA shows the older content (G1).

### Implementation for User Story 1

- [ ] T008 [US1] Implement `loadBranches(src, main, prefixes)` in `server/github.ts`:
  - per branch, read the root tree and compare the `specs` tree SHA with main's; when it differs, read the `specs` tree and load only folders whose SHA differs or that main lacks, via `loadSpecDir`, 8 at a time (R2);
  - record a `BranchInfo` per branch, with errors as warnings;
  - keep the branch's submodule pointers (root-tree entries of type `commit`) on each branch version, so the Implement gate checks the branch's own pointers (analysis C1).
- [ ] T009 [US1] In `loadProject` in `server/github.ts`, when `src.ref` is not set and `branchPrefixes` is not empty:
  - call `loadBranches`;
  - group main and branch versions by slug into `variants`, merging variants with the same tree SHA;
  - show the branch version when one exists (US3 refines the choice);
  - set `branch`, `sha` and `unmerged`, plus `Project.branches` and `skippedBranches`;
  - add a warning when branches were skipped.
- [ ] T010 [US1] In `getProject` in `server/github.ts`, re-use a cached project only when the main commit and every listed branch SHA are unchanged, and re-read only changed branches (R3)
- [ ] T011 [US1] Show the branch for unmerged specs in `src/project/LiveWorkspace.tsx` and the overview:
  - in `src/project/LiveWorkspace.tsx`, add a `tag` with the branch name (without `feat/`) on unmerged rows of the Specs list;
  - add a `branch` field to `OverviewItem` in `src/project/types.ts` and fill it in `src/project/overview.ts`;
  - show the branch next to the slug in Next up and in `src/project/Overview.tsx`.
- [ ] T012 [P] [US1] Add the branch tag style for `.sk-feat` rows in `src/styles/live.css`, using Modernist tokens only and working at phone width

**Checkpoint**: User Story 1 works on its own: unmerged specs appear in the list.

---

## Phase 4: User Story 2 - Làm việc với spec trên nhánh như spec trên nhánh chính (Priority: P1)

**Goal**: Xem bước, file, kiểm tra cổng và duyệt cổng trên đúng nội dung của nhánh; địa chỉ trang giữ được nhánh; thanh lệnh nhắc chạy trên nhánh.

**Independent Test**: Chọn spec chỉ có trên `feat/b`, đã có plan: bước Plan hiện plan của nhánh, link file trỏ `feat/b`. Duyệt Specify thì ghi vào issue của spec, và link spec trong issue trỏ `feat/b` (quickstart.md kịch bản 1, bước 2–4).

### Tests for User Story 2

- [ ] T013 [P] [US2] Add tests in `tests/branches.test.ts`:
  - `decideGate` with `branch` runs the checks on that variant's content (approving fails when only main's version would pass, and the reverse);
  - a new tracking issue links `tree/feat/b/specs/…`;
  - `GET /api/spec` returns the variant, 404 for an unknown slug and 400 for a branch outside `branchPrefixes`;
  - `browserBackend.spec` matches the server result;
  - the Implement gate of a branch version uses that branch's submodule pointers, not main's (C1);
  - `GET /api/spec` without `branch`, or with the default branch, returns main's version (U1).

### Implementation for User Story 2

- [ ] T014 [US2] Make `blobUrl` in `src/project/phases.ts` take the version's `sha`. Use `f.sha` for the file and folder links in `src/project/LiveWorkspace.tsx` and `src/project/views.tsx`.
- [ ] T015 [US2] Add `getSpecVariant(src, project, slug, branch)` to `server/github.ts`. Add `GET /api/spec` to `server/routes.ts` and `spec(repo, slug, branch)` to `Backend` in `src/backend.ts` (contracts/branches.md).
- [ ] T016 [US2] Wire the branch into gate decisions in `server/tracking.ts`, `server/routes.ts` and `src/backend.ts`:
  - `POST /api/gates` in `server/routes.ts` accepts `branch`;
  - `Backend.decide` in `src/backend.ts` takes an optional `branch`;
  - `decideGate` in `server/tracking.ts` runs on the chosen variant, and its `specUrl` uses `f.branch ?? project.ref`;
  - for a branch version, `gateChecks` and `loadTracking` use the branch's submodule pointers (C1).
- [ ] T017 [US2] Carry the branch in the address via `src/project/urlState.ts`:
  - add `branch` to `URL_KEYS` and `UrlState` in `src/project/urlState.ts`, and to `RETURN_KEYS` in `server/session.ts`;
  - in `src/Root.tsx` and `src/project/LiveWorkspace.tsx`, restore the version from `?branch=` and write it back on change (FR-009).
- [ ] T018 [US2] For an unmerged spec, show "Run on `feat/x`: `git switch feat/x`" above the command row in `src/project/LiveWorkspace.tsx`. The copied text stays the `/speckit-…` command (FR-011).

**Checkpoint**: User Stories 1 and 2 work together. This is the MVP.

---

## Phase 5: User Story 3 - Một spec có mặt ở nhiều nhánh (Priority: P2)

**Goal**: Mỗi slug hiện một lần, với bản đi xa nhất. Người dùng thấy và chuyển được giữa các bản. Spec trùng số có cảnh báo.

**Independent Test**: Spec 003 có trên `feat/003-x` và `feat/004-y`, với cùng SHA: hiện một lần, kèm 2 nhánh. Spec có plan trên nhánh nhưng chỉ có spec trên `main`: hiện bản của nhánh. Hai slug `005-…` khác nhau: cả hai hiện, kèm cảnh báo (quickstart.md kịch bản 1, bước 1).

- [ ] T019 [P] [US3] Add tests in `tests/branches.test.ts`:
  - same slug on main and a branch: one row showing the version with more done steps;
  - two branches with the same tree SHA: one variant listing both branches;
  - a stage tie is broken by the newer commit, with `commits/{sha}` fetched only for the tie;
  - `005-a` and `005-b` both appear, with a duplicate-number warning (FR-007).
- [ ] T020 [US3] Implement version choice in `server/github.ts`:
  - `stage` = number of `done` steps from `phaseStatus`;
  - ties go to the newer `committedAt`, fetched lazily and cached, then to branch name;
  - add the duplicate-number warning (R4, R5).
- [ ] T021 [US3] In the spec header of `src/project/LiveWorkspace.tsx`, show a version selector (`select`, styled like `.sk-repo-switch`) when `variants.length > 1`:
  - it lists each version with its branches;
  - choosing one loads it with `backend.spec` and updates `?branch=` (US3-AS2).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T022 [P] Add a "Specs on feat/ branches" section to `README.md`:
  - which branches are read and how many;
  - `branchPrefixes`;
  - how versions are chosen;
  - pinning a branch turns this off.
- [ ] T023 Run quickstart scenarios 1 and 2 from `specs/003-branch-specs/quickstart.md` with Playwright against a synthetic multi-branch GitHub, on Pages and on the server build. Record the timings for 20 branches (SC-002).
- [ ] T024 [P] Check demo-mode pixel parity of `src/App.tsx` against `main` at 1440×900 and 924×540, on the main screen and the New spec dialog (constitution IV)
- [ ] T025 Run all four quality gates from `package.json`: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` (constitution V)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T001 and T002 run in parallel.
- **Foundational (Phase 2)**: depends on Setup and blocks every story. T003 → T004 → T005; T006 after T002 and T005.
- **US1 (Phase 3)**: depends on Phase 2. T008 → T009 → T010; T011 after T009.
- **US2 (Phase 4)**: depends on US1 (T009 gives `branch` and `sha`). T015 → T016; T017 and T018 after T011.
- **US3 (Phase 5)**: depends on US1. T020 replaces the simple choice from T009; T021 needs T015 (`backend.spec`).
- **Polish (Phase 6)**: after all stories.

### User Story Dependencies

```text
Phase 2 ──► US1 ──► US2
              └───► US3 (T021 also needs T015)
```

### Within Each User Story

- Write the tests first and see them fail.
- Order: `server/github.ts` → `server/routes.ts` and `server/tracking.ts` → `src/backend.ts` → UI.

## Parallel Opportunities

- **Phase 1**: T001 and T002.
- **US1**: T007 and T012 alongside T008.
- **US2**: T013 alongside T014.
- **US3**: T019 alongside T020.
- **Polish**: T022 and T024.

### Parallel Example: User Story 1

```text
Task: "T007 US1 tests in tests/branches.test.ts"
Task: "T012 branch tag style in src/styles/live.css"
```

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Phases 1–2.
2. US1: unmerged specs appear with their branch.
3. US2: they can be read and approved on the right content.
4. **STOP and VALIDATE** with quickstart.md scenario 1, steps 1–4.

### Incremental Delivery

- US3 (choosing and switching versions) completes the feature in the same PR.
- Modes: server and Pages; demo unchanged.

### Notes

- Branch: `feat/003-branch-specs`. The PR description mentions `specs/003-branch-specs`.
- Save `/speckit-analyze` output as `specs/003-branch-specs/analysis.md` before implementing.
