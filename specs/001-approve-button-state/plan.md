# Implementation Plan: Trạng thái nút Approve sau khi duyệt

**Branch**: `feat/001-approve-button-state` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-approve-button-state/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Sau khi duyệt thành công, nút Approve hiện lại vì ứng dụng **bỏ kết quả ghi** và đọc lại danh sách issue (R1). Danh sách này có thể là bản cũ vì hai lý do:
- **Trình duyệt dùng cache HTTP 60 giây** của GitHub. Đây là nguyên nhân chính ở bản Pages.
- **Endpoint danh sách của GitHub cập nhật chậm.**

Cách sửa:

1. **Dùng kết quả ghi làm nguồn sự thật.** Hàm thuần `applyIssue` gộp issue vừa ghi vào tracking hiện có, không đọc lại từ GitHub (R2).
2. **Không để dữ liệu cũ ghi đè.**
   - Đọc GitHub với `cache: 'no-cache'`.
   - Giữ "bản ghi gần đây" trong 2 phút, và khi gộp thì chọn bản mới hơn theo `updatedAt` (R3).
3. **Không duyệt trùng.**
   - Khoá đồng bộ trong giao diện.
   - Ghi nối tiếp theo `repo|slug`.
   - Ghi lặp lại thì không làm gì: đọc lại issue trước khi ghi, đã ở trạng thái đích thì không ghi (R4).

Bản sửa giữ nguyên định dạng issue và không thêm loại ghi nào. Số lần gọi GitHub sau mỗi lần duyệt cũng giảm.

## Technical Context

**Language/Version**: TypeScript (strict, `erasableSyntaxOnly`), React 18.3; Node ≥ 22.18

**Primary Dependencies**: Không thêm. Code nằm trong `server/tracking.ts` và `server/github.ts`, dùng chung cho server và trình duyệt.

**Storage**: Không có. "Bản ghi gần đây" chỉ nằm trong bộ nhớ, sống 2 phút. Phê duyệt vẫn chỉ nằm trong issue theo dõi.

**Testing**: Vitest với GitHub giả lập có thể trả danh sách cũ; Playwright cho quickstart; so ảnh chế độ demo.

**Target Platform**: Trình duyệt hiện đại (bản Pages); Node 22 (bản server).

**Project Type**: Ứng dụng web: SPA React cộng server Node nhỏ, kèm bản build tĩnh.

**Performance Goals**: Trạng thái đã duyệt hiện ra ≤ 1 giây sau khi ghi xong (SC-001). Bỏ được việc đọc lại issue và PR sau mỗi lần duyệt.

**Constraints**: Chỉ báo thành công khi ghi đã thành công (US3). Module dùng chung không dùng API riêng của Node.

**Scale/Scope**: Một khu vực cổng; khoảng 6 file nguồn và 1 file test.

**Modes affected**: Bản server và bản Pages. Chế độ demo không đổi (FR-010).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Kết quả: **PASS** cả trước Phase 0 lẫn sau khi thiết kế Phase 1.

- [x] **I. Git là nguồn sự thật**: Phê duyệt vẫn chỉ ghi vào issue theo dõi, cùng định dạng. Không thêm loại ghi mới; ghi lặp lại còn bớt được ghi thừa. Bản ghi gần đây chỉ là cache 2 phút của chính lần ghi đó, không phải nơi lưu thứ hai.
- [x] **II. Khoá thuộc về người dùng**: Không đổi cách giữ khoá, không thêm điểm đến mạng mới. `cache: 'no-cache'` không lưu thêm gì.
- [x] **III. Ba chế độ, một hành vi**:
  - Mọi thay đổi logic nằm trong `server/tracking.ts` và `server/github.ts`, nên hai chế độ thật dùng chung (FR-009).
  - Kiểm tra cổng vẫn chạy lại ngay trước khi ghi.
  - Chế độ demo không đổi.
- [x] **IV. Trung thành với thiết kế**: Dùng lại `sk-pass`, `sk-warn`, `btn` và nhãn "Saving…" sẵn có. Không thêm màu hay class. PR phải so ảnh demo.
- [x] **V. Test trước khi merge**: Có test cho luồng ghi issue: dữ liệu cũ, ghi đồng thời, ghi lặp lại, lỗi. GitHub luôn được giả lập; đủ 4 lệnh kiểm tra.
- [x] **VI. AI chỉ đề xuất**: Không liên quan.
- [x] **VII. Đơn giản trước**: Không thêm dependency hay nơi lưu trữ. Ba cơ chế nhỏ (gộp theo `updatedAt`, khoá theo `repo|slug`, ghi lặp lại thì không làm gì) đều nằm trong một module. Spec đã có Non-Goals.

## Project Structure

### Documentation (this feature)

```text
specs/001-approve-button-state/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0: R1–R5
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── gates.md         # POST /api/gates, Backend.decide, trạng thái GatePanel
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, chưa tạo)
```

### Source Code (repository root)

```text
server/
├── github.ts        # SỬA: gh() đọc với cache: 'no-cache'
├── tracking.ts      # SỬA: GateIssue.updatedAt; applyIssue(); bản ghi gần đây + gộp theo updatedAt;
│                    #      khoá theo repo|slug; ghi lặp lại thì không làm gì (unchanged)
└── routes.ts        # SỬA: POST /api/gates trả { issue, unchanged, tracking: applyIssue(...) }, không đọc lại

src/
├── backend.ts               # SỬA: browserBackend.decide dùng applyIssue; Backend.decide trả { tracking, unchanged }
├── project/
│   ├── types.ts             # SỬA: GateIssue.updatedAt
│   ├── trackingApi.ts       # SỬA: postGate trả { tracking, unchanged }
│   ├── GatePanel.tsx        # SỬA: khoá bằng useRef; ghi chú "Already approved"
│   └── LiveWorkspace.tsx    # SỬA: decide dùng kết quả mới

tests/
└── tracking.test.ts         # SỬA: dữ liệu cũ, gộp, đồng thời, ghi lặp lại, lỗi, no-cache
```

**Structure Decision**: Giữ cấu trúc hiện tại. Toàn bộ logic nằm trong module dùng chung `server/tracking.ts`, nên bản Pages và bản server sửa cùng một chỗ.

## Complexity Tracking

Không có vi phạm constitution cần biện minh.
