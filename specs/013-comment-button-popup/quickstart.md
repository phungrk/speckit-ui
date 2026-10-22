# Quickstart: kiểm hộp chọn chữ một nút "Comment"

Chuẩn bị: `npm run dev` (demo: `http://localhost:5173/?demo`); với server dùng GitHub giả của kiểm tra 012 hoặc repo thử. Dữ liệu tự tạo, không ghi GitHub thật.

1. **Một nút.** Chọn một câu ở 1440×900: hộp sáng chỉ có "Comment" (biểu tượng + nhãn), không có ô màu, Copy, Ask. (US1-1)
2. **Điện thoại.** Lặp ở 390 px và 320 px: nhãn một dòng, hộp trong màn hình, không cuộn ngang. (US1-2, SC-003)
3. **Soạn.** Bấm "Comment": hộp đóng, hộp soạn mở (rail ở bố cục rộng, sheet ở bố cục hẹp); gõ và gửi lưu một nhận xét `n`. (US1-3, SC-002)
4. **Đóng.** Bấm ra ngoài, Escape, đổi vùng chọn: hộp đóng, không lưu. (US1-4)
5. **Chỉ đọc.** Với tài khoản không có quyền ghi (hoặc ghim commit): nút bị tắt kèm lý do; chọn thẻ vẫn Copy, Ask được. (US1-5, US3-4)
6. **Bàn phím.** Chọn bằng Shift+mũi tên, Tab tới nút, Enter; Ctrl/Cmd+Alt+M vẫn mở hộp soạn. (US1-6)
7. **Giao diện trang.** Ở White, Sepia, Green, Dark: hộp đọc được, tách khỏi nền. (US2-1, SC-004)
8. **Mép màn hình và xoay.** Chọn dòng sát mép trên: hộp xuống dưới vùng chọn. Đổi cỡ cửa sổ hoặc xoay khi hộp đang hiện: hộp đặt lại hoặc đóng, không lọt khỏi màn hình. (US2-2, Edge Cases)
9. **Thẻ.** Chọn một nhận xét của mình: có ô màu, Edit, Delete, Copy, Ask; đổi màu lưu được. Chọn nhận xét của người khác: chỉ Copy, Ask. (US3-1, US3-3)
10. **Tab Highlights, highlight chỉ có màu** (dữ liệu cũ: seed demo `h1`, tác giả Director; đổi vai trò demo sang Director để là highlight của mình, ở vai khác chỉ có Copy, Ask): bấm mục → hàng ô màu, Copy, Ask, Delete; xoá hỏi xác nhận. (US3-2)
11. **Bấm highlight chỉ-màu của mình trong văn bản** (demo: vai Director, `h1`): hộp chỉ có "Comment"; gửi thì highlight giữ màu và có thẻ. Của người khác: không có hộp. (FR-009)
12. **Không còn highlight chỉ-màu mới:** mọi highlight tạo mới là nhận xét; không có đường tạo chỉ-màu từ vùng chọn. (FR-010)
13. **Dữ liệu.** `npm test` qua các test lưu/đọc/commit cũ (SC-005); ở chế độ GitHub vẫn một commit `[skip ci]` mỗi lần lưu.
14. **Bốn chế độ.** Lặp 1–3, 9 ở demo, server, static (build:pages), local. (FR-011)
15. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.
