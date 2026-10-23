# Quickstart: kiểm bố cục mục nhận xét (017)

Chuẩn bị: `npm run dev` (demo `http://localhost:5173/?demo`, vai QA); server dùng GitHub giả như 012–015. Dữ liệu tự tạo.

1. **Emoji dưới nội dung (thẻ đóng).** Thả 👍 lên một nhận xét rồi đóng thẻ: hàng "👍 1" nằm ngay dưới nội dung; tiêu đề chỉ có số trả lời, không emoji. (US1-1)
2. **Thẻ mở.** Nhận xét và mỗi trả lời có hàng emoji ngay dưới nội dung của nó, trước trả lời kế. Mục không emoji không có hàng trống. (US1-2, 3)
3. **Bấm viên emoji ở thẻ đóng.** Bấm "👍 1" của mình: gỡ, thẻ không mở; bấm của người khác: thả thêm. (US1-4)
4. **Không chồng thẻ.** Thả/gỡ emoji ở thẻ đóng giữa hai thẻ gần nhau: các thẻ dịch xuống/lên, không đè (1920, 1440, 924, 390). (US1-6, SC-004)
5. **Ba chấm ở thẻ đóng.** Hover thẻ đóng của mình: ba chấm (ngoài cùng bên phải) và nút emoji cùng hiện; rời thì mất. Thẻ của người khác chỉ có nút emoji. (US2-1, 2)
6. **Edit/Delete từ thẻ đóng.** Edit: soạn tại chỗ. Delete: thẻ mở với câu hỏi xác nhận; Keep giữ, Delete xoá. (US2-3, 4)
7. **Bàn phím.** ↑/↓ chọn thẻ, Enter mở thẻ; trong thẻ mở Tab tới ba chấm và nút emoji, Enter, Escape. (SC-006)
8. **Chỉ đọc** (`push:false`): nút emoji và Edit/Delete tắt kèm lý do ở cả thẻ đóng. (US2-7)
9. **Cảm ứng 390 px.** Ba chấm (của mình) và nút emoji hiện sẵn ở thẻ đóng và mở, ≥ 44 px, không cuộn ngang, bấm không chọn thẻ. (US2-6, SC-005)
10. **Bốn giao diện trang** và giảm chuyển động như 015.
11. **Demo.** Ảnh chính, New spec, popup (1440×900, 924×540, 390): giống trước, trừ tiêu đề thẻ đóng của mình (giờ dịch trái) và thẻ có emoji; ghi vào PR.
12. **Dữ liệu và lưu.** `npm test` qua các test của 011/014/015; thả/gỡ emoji một commit `[skip ci]`, không nhân đôi. (SC-007)
13. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.
