# Quickstart: kiểm hiệu ứng hover (015)

Chuẩn bị: `npm run dev` (demo `http://localhost:5173/?demo`, vai QA để là tác giả của nhận xét mình tạo); server dùng GitHub giả như 012/011/014. Dữ liệu tự tạo, không ghi GitHub thật.

1. **Nền đậm.** Mở thẻ; rê chuột lên nội dung nhận xét rồi từng trả lời: mỗi lúc chỉ một dòng đậm hơn; rời thẻ thì không dòng nào. Thẻ đóng không có hiệu ứng. (US1-1…4, SC-001)
2. **Nút nổi.** Khi hover: nút tròn trắng có bóng, mặt cười kèm dấu cộng ở mép phải dòng, không che chữ; rời chuột thì mất. (US2-1, 2)
3. **Thả emoji.** Bấm nút, chọn 👍: viên "👍 1" hiện dưới nội dung; chọn lại 👍: gỡ. Bộ emoji đóng bằng Escape (tiêu điểm về nút) và bằng bấm ngoài. (US2-3, 4)
4. **Không nhảy bố cục.** Đo chiều cao thẻ và vị trí các thẻ trước, trong và sau hover: chênh 0 px. (US2-7, SC-003)
5. **Ba chấm.** Lúc nghỉ tiêu đề chỉ có avatar, tên, giờ; hover mục của mình: hiện ba chấm; mục của người khác không có. Mở menu rồi rời chuột: nút còn cho tới khi menu đóng. (US3-1, 2, FR-008)
6. **Bàn phím.** Tab tới nút ba chấm: nút hiện, nền hàng đậm; Tab tiếp tới nút emoji; Enter mở bộ, chọn bằng Enter, Escape đóng. (FR-002, SC-006)
7. **Chỉ đọc** (`push:false`): hover: nút emoji hiện nhưng tắt kèm lý do; các viên emoji đã có vẫn thấy. (US2-5)
8. **Cảm ứng 390 px** (giả lập): nút emoji và ba chấm hiện sẵn ở mỗi mục của thẻ đang mở, ≥ 44 px, không cuộn ngang; bộ emoji và menu mở trong màn hình, cả trong sheet. (US2-6, US3-3, SC-005)
9. **Bốn giao diện trang** (White, Sepia, Green, Dark): nền đậm và nút nổi đọc được, tách khỏi nền. (SC-004)
10. **Đang sửa.** Chọn Edit: mục không có nền hover và nút nổi cho tới khi Save/Cancel. (FR-013)
11. **Hình tròn duy nhất.** Test CSS: trong khối CSS của spec này đúng một `border-radius`, của nút nổi; viên emoji, ba chấm, menu, ô trả lời vẫn vuông. (FR-011)
12. **Dữ liệu và lưu.** `npm test` qua các test của 011; thả/gỡ emoji tạo một commit `[skip ci]`, không nhân đôi. (SC-007)
13. **Demo 1440×900 và 924×540** (màn hình chính, hộp thoại New spec) giống hệt trước khi sửa.
14. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.
