# Analysis: Thẻ nhận xét gọn, menu ba chấm, một màu (014)

**Date**: 2026-10-22 | **Artifacts**: spec.md, plan.md, tasks.md, constitution 1.4.1 | **Run**: 1

Kết quả: 1 CRITICAL (chỉ là câu chữ trong spec), 2 MEDIUM, 5 LOW. 19 yêu cầu (13 FR + 6 SC), 24 task, độ phủ 100%, 2 mơ hồ, 0 trùng lặp. Tất cả đã sửa (cột "Cách xử lý").

| ID | Loại | Mức | Vị trí | Tóm tắt | Cách xử lý |
|----|------|-----|--------|---------|------------|
| C1 | Constitution | CRITICAL (câu chữ) | spec US4 | Spec ghi "ô nhập bo tròn", trái nguyên tắc IV (không bo góc); plan R6 đã giữ góc vuông. | Spec: ô trả lời góc vuông (US4, FR-010, Input), nói rõ khác ảnh tham chiếu. |
| K1 | Underspecification (bàn phím) | MEDIUM | T002, T005 | Rail đổi chọn thẻ bằng ↑/↓ và chỉ bỏ qua ô nhập; Escape toàn cục bỏ chọn thẻ nếu tiêu điểm không ở `.sk-cm-thread`. Nút ba chấm và menu sẽ làm đổi chọn thẻ. | T002: menu chặn truyền phím, có class `.sk-cm-more`/`.sk-cm-menu`; T005: ngoại lệ Escape; kiểm ở T008. |
| I1 | Inconsistency | MEDIUM | FR-004 vs plan R4 | Spec: mọi mục của mình có ba chấm; plan: chỉ thẻ đang mở. | FR-004 và US2-1: chỉ trên thẻ đang mở; T010 ghi chú. |
| U1 | Underspecification | LOW | T014 | Mục của người khác ở tab vẫn có `aria-expanded` dù không có gì để mở. | T014/T015: chỉ mở rộng khi có hàng hành động. |
| U2 | Underspecification | LOW | T003, T008, T019 | Menu trong sheet ở chân trang chưa được kiểm. | Thêm ca sheet 390 px vào T008. |
| A1 | Mơ hồ | LOW | SC-002 | "ít nhất 4 nút ít hơn" khó kiểm. | Viết lại: không còn 9 nút cố định, mỗi mục của mình đúng một nút ba chấm. |
| A2 | Mơ hồ | LOW | FR-013 | Dải màu ở tab là "MAY". | Đổi thành MUST. |
| T1 | Thứ tự task | LOW | T011 | Test màu mặc định dựa vào hàm thuần không có. | T011: kiểm bằng file lưu và Playwright (T012). |
