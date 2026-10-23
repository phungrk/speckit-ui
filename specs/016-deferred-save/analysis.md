# Analysis: 016 deferred-save (2026-10-23)

Báo cáo `/speckit-analyze`, kèm cách xử lý đã áp dụng khi bắt đầu `/speckit-implement` (không có câu trả lời riêng cho B1: dùng phương án khuyến nghị, "theo Remember").

| ID | Mức | Vấn đề | Xử lý |
|----|-----|--------|-------|
| B1 | HIGH | R5 luôn dùng `localStorage`, trái cách ứng dụng đối xử với "Remember" (bình luận có thể từ repo riêng, vẫn ở lại thiết bị dù đã chọn không ghi nhớ). | Theo `storage` của `Root`: bật Remember → `localStorage`, tắt → `sessionStorage`. Sửa spec FR-002, US1-3; research R5; T004, T009. |
| U1 | HIGH | `readJson` đọc tối đa 8.000 ký tự: một lô vài nhận xét dài làm Save thất bại ở server. | Đường `/api/highlights` đọc tới `MAX_BYTES` (512 KiB); sửa contract; T005 thêm test. |
| U2 | HIGH | Xoá cả hàng đợi sau Save làm mất thay đổi làm trong lúc đang lưu. | Chụp danh sách gửi đi, chỉ bỏ các mục đã gửi, tắt Save khi đang lưu; research R10; T013. |
| C1 | MEDIUM | Đếm và `beforeunload` chỉ xét spec đang mở; đổi repo mất hàng đợi không lưu được. | `listPending`; "N unsaved in other specs"; hỏi xác nhận khi đổi repo; spec FR-009; T004, T016. |
| U3 | MEDIUM | `applyChange` đóng dấu giờ lúc áp dụng: trả lời viết 09:00 lưu 11:00 thành 11:00. | Server đặt giờ lúc Save (ghi vào spec); view dùng `at` làm `now`; research R11; T003. |
| T1 | LOW | T003 và T004 cùng file nhưng đều `[P]`. | T004 bỏ `[P]`, ghi phụ thuộc. |
| G1 | LOW | FR-014 (không khoá trong hàng đợi) chưa có kiểm tra. | T004 kiểm giá trị lưu chỉ có `v` và `changes`. |
| U4 | LOW | T010 có điều kiện mơ hồ. | Bỏ mệnh đề điều kiện. |
| A1 | LOW | Spec nói "trên rail", plan đặt thanh trên khung đọc. | FR-003 sửa. |
