# Analysis: Trả lời và thả emoji (011)

**Date**: 2026-10-22 | **Artifacts**: spec.md, plan.md, tasks.md, constitution 1.4.1 | **Run**: 1

Kết quả: 0 CRITICAL, 3 MEDIUM, 4 LOW. 21 yêu cầu (15 FR + 6 SC), 29 task lúc phân tích, độ phủ 100%, 1 mơ hồ, 0 trùng lặp. Tất cả đã sửa (cột "Cách xử lý").

| ID | Loại | Mức | Vị trí | Tóm tắt | Cách xử lý |
|----|------|-----|--------|---------|------------|
| S1 | Underspecification (bảo mật) | MEDIUM | T005, data-model, `add`/`reply` | `add` nhận nguyên highlight từ client nên có thể mang trả lời/emoji giả tác giả; `createdAt` của trả lời do client gửi nên giả/lệch thứ tự được. | `add` bỏ `replies`, `reactions` gửi kèm; `reply` do nơi lưu đặt `author` và `createdAt` (payload chỉ `{ id, text }`); research R12, contract, T005, test T009. |
| U1 | Underspecification | MEDIUM | T014, T020, R8 | Chưa nói cách hiển thị lạc quan trả lời/emoji khi `optimistic` hiện chỉ mô hình hoá `add`. | R8: danh sách hiển thị = `applyChange(items, thayĐổiĐangChờ, tôi)`, `ok` thay bằng danh sách đã lưu, `fail` hoàn lại (emoji) hoặc giữ Failed + Retry (trả lời); T014, T020. |
| I1 | Tương thích | MEDIUM | R1, T024 | Build cũ đọc `version: 2` báo "unknown format" và ẩn nhận xét của spec; đổi bộ emoji sau này sẽ làm mất dữ liệu ở build cũ. | R11, contract `highlights-file.md` (đổi emoji hay trường mới phải tăng `version`), T024, T029. |
| T1 | Thứ tự task | LOW | Phase 2, T008 | Phase 2 "không UI" nhưng T008 sửa `Annotator.tsx`. | Mục tiêu Phase 2 sửa thành "chưa có giao diện mới". |
| A1 | Mơ hồ | LOW | spec Edge Cases (demo) | Demo có gieo sẵn trả lời không? Gieo thì đổi màn hình demo mặc định. | R13 và spec: không gieo; tạo trong demo. |
| U2 | Underspecification | LOW | T014 | Bản nháp trả lời mồ côi khi nhận xét bị xoá ở máy khác. | Edge case mới trong spec; T014 báo mất chỗ gắn. |
| F1 | Thuật ngữ | LOW | spec vs plan vs code | "Cuộc thảo luận", "thread", "reply", "comment" lẫn lộn. | Dòng "Thuật ngữ" trong plan. |
