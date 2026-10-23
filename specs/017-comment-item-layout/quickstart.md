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

## Kết quả kiểm (Playwright, GitHub giả, 2026-10-23)

- **1–3 (emoji dưới nội dung):** thả 👍 qua nút nổi lên thẻ đóng: hàng "👍 1" nằm ngay dưới nội dung, trong thẻ; tiêu đề chỉ có "1 reply". Bấm viên của mình gỡ được mà không mở thẻ. Thẻ mở: một hàng emoji, nằm trước thread, thread không còn hàng gốc.
- **4 (không chồng thẻ):** thẻ có emoji cao 134 px, các thẻ dưới dịch xuống (593, 725, 857 sau 582, 714, 846 lúc chưa có emoji), khoảng cách giữ 8 px; gỡ emoji thì về 124 px.
- **5–6 (ba chấm ở thẻ đóng):** lúc nghỉ ba chấm và nút emoji `opacity` 0; hover thẻ đóng của mình: cả hai 1, thẻ không mở. Ba chấm nằm cách mép thẻ 13 px, giờ ở bên trái nó, tiêu đề một dòng. Thẻ của lan: chỉ nút emoji, không ba chấm. Edit: soạn tại chỗ, thẻ không được chọn. Delete: thẻ mở, hỏi "Delete this comment and its 1 reply?" với Keep và Delete; Keep bỏ câu hỏi, 4 nhận xét còn nguyên.
- **7 (bàn phím):** ↓/↑ đổi thẻ chọn; Tab từ thẻ mở đi qua "More actions", "Add a reaction to this comment", ba chấm và nút emoji của trả lời, ô Reply; nút của thẻ đóng có `tabindex=-1`.
- **8 (chỉ đọc, `push:false`):** nút emoji của thẻ đóng `aria-disabled` kèm lý do, bấm không mở bộ; Edit và Delete `aria-disabled` kèm cùng lý do, bấm không làm gì.
- **9 (cảm ứng, 1920 với `isMobile`):** ba chấm 44×44 và nút emoji 44×44 hiện sẵn ở thẻ đóng; thẻ được đo (152, 134, 152, 152 px), không chồng nhau (cách nhau 8 px) và nội dung không bị cắt; chạm nút emoji mở 6 emoji mà không chọn thẻ; không cuộn ngang. Ở 390 px rail không hiện (chỉ có sheet cho thẻ đã chọn).
- **10 (bốn giao diện trang):** White, Sepia, Green, Dark: hàng emoji, ba chấm và nút nổi đọc được; viên emoji của mình có viền theo màu chữ, nền cùng nền thẻ (như 011).
- **11 (demo):** ảnh chính, New spec, popup (1440×900, 924×540, 390) giống từng byte với ảnh trước spec này (ở các cỡ này rail không hiện). Ở 1920 px (rail hiện), thẻ đóng của mình đổi đúng chỗ đã ghi: giờ ở tiêu đề dịch trái từ cách mép thẻ 13 px thành 53 px (chỗ cho ba chấm, 40 px thay vì ~32 px dự kiến); chiều cao 124 px giữ nguyên. Phần chênh này phải có trong bản thiết kế đã cập nhật (T001b, chờ người dùng).
- **12–13 (dữ liệu và cổng):** `npm test` 530 qua, `npm run typecheck`, `npm run build`, `npm run build:pages` qua. Thả/gỡ emoji tạo một commit `[skip ci]` mỗi lần, không nhân đôi. Không còn hàng emoji gốc trong thread và không còn chuỗi emoji trong tiêu đề. Static và local: chỉ build, không chạy tay (cùng mã giao diện).

## Mô tả PR (nháp, T016; chưa tạo PR)

- **Spec**: `specs/017-comment-item-layout/`; `Closes #<issue "Spec 017: …">` (tạo khi người dùng yêu cầu PR, nhãn `speckit`).
- **Đổi**: hàng emoji dưới nội dung ở mọi thẻ (thẻ đóng không còn chuỗi emoji trong tiêu đề, thẻ có emoji được đo chiều cao); ba chấm cùng nút emoji khi hover ở mọi thẻ của mình, ngoài cùng bên phải của tiêu đề; Edit/Delete từ thẻ đóng; cảm ứng: nút hiện sẵn ở thẻ đóng.
- **Chế độ**: cả bốn (demo, server, static, local), chỉ giao diện; không đổi dữ liệu, `highlights.json`, quyền hay cách lưu.
- **Demo**: ảnh 1440×900 và 924×540 (chính, New spec) và popup giống hệt; ở 1920 px thẻ đóng của mình có giờ dịch 40 px sang trái (chỗ cho ba chấm) và hàng emoji dưới nội dung khi có emoji. Hai chỗ này phải có trong bản thiết kế `Speckit Workspace.html` đã cập nhật (người dùng cung cấp); **không merge trước khi có xác nhận (T001b)**.
