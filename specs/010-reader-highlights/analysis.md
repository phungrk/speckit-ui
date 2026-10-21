# Specification Analysis Report: 010 Chế độ đọc kiểu Kindle

Lần chạy thứ hai, ngày 2026-10-20, sau khi sửa theo lần chạy đầu. Đọc `spec.md`, `plan.md`,
`tasks.md` (33 task), `research.md`, `data-model.md`, `contracts/reader-ui.md`, `quickstart.md` và
constitution 1.2.0.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| I3 | Inconsistency | LOW | spec.md FR-007; contracts §4 | Tooltip "Gate, highlights & Copilot" nhắc highlight, nhưng sidebar phải chưa có tab Highlights cho tới khi `010-spec-annotations` xong. | Giữ theo bản thiết kế (đã chọn). Spec annotations không cần đổi tooltip. |
| I4 | Inconsistency | LOW | spec.md tiêu đề; tên thư mục và nhánh | Slug `010-reader-highlights` không còn phần highlight. Giữ để không mất liên kết với issue #27. | Nhắc trong mô tả PR. |
| P1 | Process | LOW | `.specify/memory/constitution.md`; plan.md "Constitution" | Constitution 1.2.0 được sửa cùng nhánh tính năng, nên sẽ vào `main` qua PR của 010. Governance cho phép sửa qua PR, nhưng người review cần thấy rõ đây là thay đổi luật. | Tách mục "Constitution 1.2.0" riêng trong mô tả PR, kèm Sync Impact Report. |

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 nút Aa và popover (header workspace) | Có | T011, T014, T015, T016, T017, T018 | |
| FR-002 phạm vi font đọc | Có | T012, T013 | |
| FR-003 font có tiếng Việt | Có | T002 | Kiểm tay |
| FR-004 nhớ theo người dùng, áp trước lần vẽ đầu | Có | T004, T007, T009, T010, T017 | T017 nhận `storage` từ `Root.tsx` |
| FR-005 nền phủ toàn khung | Có | T006, T022, T023, T024 | |
| FR-005a bảng màu theo prototype | Có | T006, T020 | Constitution IV 1.2.0 |
| FR-006 tương phản ≥ 4.5 | Có | T020, T023 | |
| FR-007 hai nút sidebar | Có | T026, T027, T029 | |
| FR-008 sidebar ẩn không nhận focus, phím tắt | Có | T025, T026, T028, T029 | |
| FR-009 bàn phím, hộp thoại có tên | Có | T011, T014, T026 | |
| FR-010 vùng bấm, giảm chuyển động | Có | T009, T015 | |
| FR-011 không xê dịch layout | Có | T032 | Quickstart §1 bước 6 |
| FR-012 bốn chế độ, demo theo thiết kế | Có | T016, T017, T018, T029, T031 | |
| FR-013 không ghi, không gọi mạng | Có | T018, T021, T032 | T021 kiểm import |
| SC-001 | Có | T012, T013, T032 | |
| SC-002 | Có | T020, T024 | |
| SC-003 không nháy | Có | T009, T032 | Kiểm tay |
| SC-004 chỉ bàn phím | Có | T011, T032 | |
| SC-005 0 phần tử ẩn nhận focus | Có | T026, T029 | |

## Constitution Alignment Issues

Không có. Nguyên tắc IV (1.2.0) cho phép bảng nền của chế độ đọc và cho demo thiếu phần thuộc
`010-spec-annotations`. I, II, III, V, VI, VII: không vi phạm (không ghi mới, không điểm đến mạng
mới, không dependency mới).

## Unmapped Tasks

Không có. T001 (baseline), T030 (README), T033 (cổng kiểm tra) là task chung.

## Metrics

- Total Requirements: 19 (14 FR, 5 SC)
- Total Tasks: 33
- Coverage: 19/19 (100%)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Lần chạy đầu và cách đã xử lý

Lần chạy đầu (commit `57c6964`) có 1 CRITICAL, 1 HIGH, 4 MEDIUM, 5 LOW. Đã xử lý ở commit
`6026cab` và `409cd02`:

- C1 (CRITICAL, màu mới trái nguyên tắc IV) và C2 (HIGH, demo thiếu phần highlight): constitution
  1.1.0 → 1.2.0, nguyên tắc IV có ngoại lệ cho bảng nền của chế độ đọc và cho phần thuộc spec khác
  chưa xong. CLAUDE.md khớp lại.
- U1: T017 nhận `storage` từ `Root.tsx`; plan thêm `src/Root.tsx`.
- I1: Assumptions nêu ngoại lệ với 006 FR-008.
- I2: FR-004 và Assumptions nêu bản cài đặt của thiết bị.
- G1: quickstart §1 bước 6 và T032 đo layout shift.
- G2: FR-001 nói rõ header của workspace.
- G3, A1: T021 kiểm import và dùng regex có ranh giới.

## Next Actions

- Không còn CRITICAL hay HIGH. Có thể duyệt Analyze và chạy `/speckit-implement 010-reader-highlights`.
- Ba mục LOW xử lý trong mô tả PR.
