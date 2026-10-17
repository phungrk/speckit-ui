# Implementation Plan: Liệt kê spec trên nhiều nhánh

**Branch**: `feat/003-branch-specs` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-branch-specs/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Khi mở hoặc chuyển sang một repo, ứng dụng đọc nhánh chính và mọi nhánh `feat/…` (tối đa 30). Spec nào khác nhánh chính thì được thêm vào panel Specs, kèm tên nhánh.

- **So sánh bằng SHA cây git:** nhánh đã merge chỉ tốn 1 lần gọi, và chỉ những thư mục spec có SHA khác mới được tải (R2).
- **Cache theo SHA:** nội dung theo SHA không đổi, nên làm mới khi không có gì thay đổi chỉ tốn 2 lần gọi (R3).
- **Mỗi slug một mục:** chọn bản đi xa nhất; các nhánh cùng SHA gộp thành một bản; spec khác slug mà trùng số thì có cảnh báo (R4, R5).
- **Duyệt cổng:** vẫn ghi vào issue duy nhất của slug, nhưng kiểm tra cổng chạy trên đúng bản của nhánh (R6).
- **Địa chỉ trang** có thêm `branch` (R9).
- **Cố định nhánh** thì hoạt động như cũ (R7).

## Technical Context

**Language/Version**: TypeScript (strict, `erasableSyntaxOnly`), React 18.3; Node ≥ 22.18

**Primary Dependencies**: Không thêm. Logic nằm trong `server/github.ts` (dùng chung cho server và trình duyệt) và `server/parse.ts`.

**Storage**: Không có. Thêm cache trong bộ nhớ theo SHA cây (LRU 64 mục).

**Testing**: Vitest với GitHub giả lập có nhiều nhánh; Playwright cho quickstart; so ảnh demo.

**Target Platform**: Trình duyệt (bản Pages); Node 22 (bản server).

**Project Type**: Ứng dụng web: SPA React cộng server Node nhỏ, kèm bản build tĩnh.

**Performance Goals** (SC-002): 20 nhánh `feat/…`, lần mở đầu ≤ 10 giây; làm mới khi không có gì đổi ≤ 3 giây. Đo khi cài đặt (giả lập 80 ms mỗi lần gọi): 2,1 giây và khoảng 0,2 giây (tasks.md, T023).

**Constraints**:
- CSP bản Pages chỉ cho `api.github.com`; không dùng GraphQL.
- Giới hạn 5.000 lần gọi mỗi giờ.
- Module dùng chung không dùng API riêng của Node.

**Scale/Scope**: Tối đa 30 nhánh mỗi repo; khoảng 8 file nguồn, 1 endpoint mới.

**Modes affected**: Bản server và bản Pages. Chế độ demo không đổi.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Kết quả: **PASS** cả trước Phase 0 lẫn sau khi thiết kế Phase 1.

- [x] **I. Git là nguồn sự thật**:
  - Chỉ đọc thêm nhánh, mọi trạng thái suy ra từ file trên các nhánh.
  - Không thêm loại ghi; phê duyệt vẫn ghi vào issue theo dõi.
  - Trường cấu hình mới `branchPrefixes` là tuỳ chọn và có mặc định.
- [x] **II. Khoá thuộc về người dùng**:
  - Không đổi cách giữ khoá. Mọi lời gọi mới tới `api.github.com`, nên CSP không đổi.
  - Quyền cần có: Contents đọc (đã có). Đọc nhánh không cần quyền mới.
  - Địa chỉ trang thêm `branch`, không chứa khoá.
- [x] **III. Ba chế độ, một hành vi**:
  - Đọc nhánh, so SHA và chọn bản nằm trong `server/github.ts`, dùng chung cho cả hai chế độ thật.
  - Kiểm tra cổng chạy lại trên đúng bản trước khi ghi.
  - Một nhánh lỗi chỉ tạo cảnh báo, không làm trắng trang.
- [x] **IV. Trung thành với thiết kế**: Nhãn nhánh dùng `tag`; bộ chọn bản dùng `select` theo kiểu `sk-repo-switch` có sẵn. Không thêm màu. Chế độ demo không đổi; PR phải so ảnh demo.
- [x] **V. Test trước khi merge**: Có test cho đọc nhánh, so SHA, cache, chọn bản, trùng số, lỗi từng nhánh, duyệt cổng theo bản. GitHub luôn được giả lập; đủ 4 lệnh kiểm tra.
- [x] **VI. AI chỉ đề xuất**: Copilot dùng bản đang xem; không đổi hành vi.
- [x] **VII. Đơn giản trước**: Không thêm dependency, nơi lưu hay dịch vụ. Một endpoint đọc mới (`/api/spec`) để chuyển bản mà không phải tải lại cả dự án.

## Project Structure

### Documentation (this feature)

```text
specs/003-branch-specs/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0: R1–R10
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── branches.md      # /api/project, /api/spec, /api/gates, URL, cấu hình, giao diện
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, chưa tạo)
```

### Source Code (repository root)

```text
server/
├── github.ts        # SỬA: listBranches(); loadSpecDir() theo SHA cây (cache LRU); loadBranches(); chọn bản;
│                    #      getProject kiểm tra cả SHA các nhánh; getSpecVariant()
├── parse.ts         # SỬA: parseUiConfig thêm branchPrefixes
├── tracking.ts      # SỬA: decideGate dùng đúng bản theo branch; link issue mới trỏ nhánh
├── routes.ts        # SỬA: GET /api/spec; POST /api/gates nhận branch
└── session.ts       # SỬA: safeReturn giữ thêm branch

src/
├── backend.ts               # SỬA: Backend.spec(repo, slug, branch); decide nhận branch
├── project/
│   ├── types.ts             # SỬA: SpecFeature.branch/sha/unmerged/variants; Project.branches/skippedBranches
│   ├── urlState.ts          # SỬA: tham số branch
│   ├── phases.ts            # SỬA: blobUrl dùng sha của bản
│   ├── LiveWorkspace.tsx    # SỬA: nhãn nhánh trong danh sách; bộ chọn bản; dòng nhắc git switch
│   └── overview.ts          # SỬA: nhãn kèm tên nhánh
└── styles/live.css          # SỬA: kiểu nhãn nhánh (token Modernist)

tests/
├── fakeGitHub.ts            # SỬA: nhiều nhánh, cây theo SHA, lỗi theo nhánh
└── branches.test.ts         # MỚI
```

**Structure Decision**: Giữ cấu trúc hiện tại. Logic nhiều nhánh nằm trong module dùng chung `server/github.ts`.

## Complexity Tracking

Không có vi phạm constitution cần biện minh.
