# Quickstart: kiểm lưu hoãn (016)

Chuẩn bị: `npm run dev` với GitHub giả (`FAKE_STATE`, như 011–017) cho chế độ server; `npm run build:pages` và chạy bản tĩnh với GitHub giả cho Pages nếu có; demo `?demo` và thư mục local để kiểm phần không đổi. Dữ liệu tự tạo.

1. **Tức thì.** Viết một nhận xét và thả một emoji: cả hai hiện ngay (dưới 0,3 giây), thẻ ghi "Not saved", thanh "2 changes not saved" hiện; kho giả: 0 commit. (US1-1, 2, SC-001)
2. **Tải lại.** Tải lại trang: nhận xét và emoji vẫn còn, vẫn "Not saved". Mở tab khác cùng spec: cùng thấy. (US1-3, SC-003)
3. **Save một lần.** Viết hai nhận xét, thả ba emoji, bấm Save: lần đầu hiện hộp xác nhận, chấp nhận: đúng một commit `[skip ci]` chứa cả năm thay đổi, thanh biến mất, dấu "Not saved" mất. (US2-1–3, SC-002)
4. **Lỗi giữ nguyên.** Làm lần lưu lỗi (500): thanh ở lại với lý do và Retry, hàng đợi nguyên; Retry thành công thì đúng một commit, không nhân đôi. (US2-4)
5. **Hợp nhất.** Trong lúc có thay đổi chưa lưu, ghi một nhận xét của người khác vào kho giả và làm mới: thấy cả hai; Save: file có cả hai. (US1-4, US2-5, SC-004)
6. **Mục bị xoá.** Người khác xoá nhận xét mình đã trả lời (chưa lưu) rồi mình Save: các thay đổi khác vẫn lưu, báo "1 change skipped". (US3-4)
7. **Discard.** Bấm Discard: hỏi xác nhận; xác nhận thì trở về trạng thái đã lưu, 0 yêu cầu ghi. (US3-1)
8. **Rời trang.** Có hàng đợi: đóng tab thì trình duyệt nhắc; hết hàng đợi thì không. (US3-2)
9. **Gộp.** Viết một nhận xét rồi xoá nó trước khi Save: Save không có gì để ghi (không commit). Thả rồi gỡ cùng emoji: không ghi. (FR-015)
10. **Chỉ đọc.** `push:false`: không tạo được thay đổi mới, kèm lý do; nếu còn hàng đợi cũ, Save tắt kèm lý do.
11. **Hai tài khoản.** Đổi tài khoản: không thấy hàng đợi của tài khoản trước.
12. **Local và demo.** Mỗi thao tác ghi ngay như trước, không thanh chưa lưu; ảnh demo giống hệt; test local qua. (US4, SC-005)
13. **Màn hình hẹp 390 px.** Thanh Save hiện, không cuộn ngang; Save, Discard dùng được; bộ nhớ chặn (chế độ riêng tư): thanh nói thay đổi sẽ mất khi đóng tab.
14. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.
