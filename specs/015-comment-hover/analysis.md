# Analysis: Hiệu ứng hover trên thẻ nhận xét (015)

**Date**: 2026-10-22 | **Artifacts**: spec.md, plan.md, tasks.md, constitution 1.4.1 | **Run**: 1

Kết quả: 0 CRITICAL, 2 MEDIUM, 4 LOW. 20 yêu cầu (13 FR + 7 SC), 20 task, độ phủ 100%, 2 mơ hồ, 0 trùng lặp. Tất cả đã sửa (cột "Cách xử lý").

| ID | Loại | Mức | Vị trí | Tóm tắt | Cách xử lý |
|----|------|-----|--------|---------|------------|
| K1 | Underspecification (sự kiện) | MEDIUM | T008, T009; Escape toàn cục ở Annotator | Nút emoji của nhận xét gốc nằm ngoài `.sk-cm-thread`: Escape trong bộ emoji sẽ bỏ chọn thẻ, và click nút sẽ chạy `onSelect(id, {jump:true})` của thẻ, cuộn tới đoạn chữ. | T008: chặn truyền phím và click; T009: thêm `.sk-cm-float, .sk-cm-picker` vào ngoại lệ Escape; kiểm ở T012. |
| T1 | Thứ tự test | MEDIUM | T010–T011; `tests/moreMenu.test.tsx` | Test 014 kiểm "không `border-radius`" trên CSS từ chú thích mở đầu khối 014 đến hết file; khối 015 nằm sau nên sẽ làm test hỏng khi có nút tròn. | T011: cắt khối 014 ở chú thích mở đầu khối 015; kiểm một `border-radius` ở `tests/hoverCss.test.ts`. |
| A1 | Inconsistency | LOW | spec FR-001 vs plan R1 | Spec: hover nội dung; plan: hover cả mục (tiêu đề và nội dung). | FR-001 và US1-1: hover trên mục. |
| A2 | Inconsistency | LOW | FR-003 vs R4 | "nền trắng" vs token `--color-bg` (tối ở giao diện Dark). | FR-003: nền sáng theo giao diện trang. |
| U1 | Underspecification | LOW | T012 | Chưa kiểm nút không bị chữ dài hoặc dòng Sending/Failed che. | Thêm vào T012. |
| U2 | Underspecification | LOW | T013 | Nút ba chấm trong suốt vẫn được đọc và nằm trong Tab. | T013 ghi rõ là có chủ ý. |
