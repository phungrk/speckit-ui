# Analysis: Hộp chọn chữ một nút "Comment" (013)

**Date**: 2026-10-22 | **Artifacts**: spec.md, plan.md, tasks.md, constitution 1.4.0 | **Run**: 1

Kết quả: 0 CRITICAL, 4 MEDIUM, 4 LOW. 16 yêu cầu (11 FR + 5 SC), 22 task lúc phân tích, độ phủ 100%, 1 mơ hồ, 1 trùng lặp. Tất cả đã sửa (cột "Cách xử lý").

| ID | Loại | Mức | Vị trí | Tóm tắt | Cách xử lý |
|----|------|-----|--------|---------|------------|
| C1 | Constitution | MEDIUM | tasks T016/T011; constitution IV, Governance | Hộp sáng trái câu "thanh công cụ luôn tối" của IV; amendment đặt sau hộp và sửa tay, trong khi Governance yêu cầu `/speckit-constitution`, Sync Impact Report, `CLAUDE.md` khớp. | Chuyển thành T002 ở Phase 1, dùng `/speckit-constitution` (1.4.1), phải xong trước hộp sáng (T013) và cùng PR; ghi trong Dependencies và plan. |
| I1 | Coverage | MEDIUM | spec Edge Cases, SC-003 | Đổi cỡ cửa sổ/xoay khi hộp hiện chưa có task; `Annotator` không nghe `resize`. | Thêm T012 (tính lại vị trí hoặc đóng, kèm test, kiểm 390→844); quickstart 8. |
| I2 | Underspecification | MEDIUM | tasks T004/T006; plan R5 | `onActions` không có clean-up: bước không có tài liệu để lại hành động treo ở tab. | T005: `onActions(null)` khi unmount; T006: `actions` null không hiện hàng; T009 có test. |
| U1 | Underspecification | MEDIUM | quickstart 10–11, demoSeed | Demo chỉ có một highlight chỉ-màu (`h1`, tác giả Director); tác giả demo là vai đang chọn. | Quickstart 10–11 và T018 ghi rõ đổi vai sang Director. |
| A1 | Ambiguity | LOW | spec FR-008, US3-2 | Chưa rõ mục có ghi chú ở tab có hàng hành động không. | Sửa FR-008 và US3-2: chỉ "mục chỉ có màu"; mục có ghi chú dùng thẻ. |
| D1 | Duplication | LOW | tasks T015 (cũ) | Test tương phản đã có ở `tests/reader.test.ts`:111–112. | T017 bỏ vế "thêm test". |
| U2 | Underspecification | LOW | tasks T005 (cũ); constitution IV | Hàng hành động ở tab chưa nêu `aria-label` và `:focus-visible`. | Thêm vào T006 và test T009. |
| F1 | Terminology | LOW | spec vs plan | "hộp" / "popup" / `HlToolbar` / `.sk-tb`. | Plan ghi rõ giữ tên component và class. |

Sau khi sửa: 23 task (T002 constitution ở Phase 1, T012 resize mới; các số sau đó dịch).
