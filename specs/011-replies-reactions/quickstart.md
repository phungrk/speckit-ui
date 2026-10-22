# Quickstart: kiểm trả lời và emoji

Chuẩn bị: `npm run dev` (demo `http://localhost:5173/?demo`); server dùng GitHub giả như spec 012/013 (`FAKE_STATE`, hai người `mai` và `lan` bằng cách sửa file trạng thái). Dữ liệu tự tạo, không ghi GitHub thật.

1. **Trả lời.** Chọn một nhận xét, gõ ở ô Reply, gửi: trả lời hiện dưới nhận xét với tên, giờ; thẻ đóng ghi "1 reply". (US1-1)
2. **Người khác trả lời.** Ở server giả, `lan` trả lời nhận xét của `mai`; `mai` bấm "New comments": trả lời của `lan` hiện, `mai` không sửa/xoá được nó. (US1-1, SC-001)
3. **Trống và quá dài.** Gửi trống: không lưu, có lời nhắc; 2.001 ký tự: báo trước khi gửi. (US1-2, FR-005)
4. **Sửa và xoá.** Sửa trả lời của mình: hiện "edited"; xoá hỏi xác nhận; trả lời của người khác không có menu. (US1-3)
5. **Hai người cùng lúc.** Hai trả lời gần như đồng thời ở server giả: cả hai còn. (US1-4, SC-002)
6. **Xoá nhận xét gốc có trả lời:** hộp xác nhận nêu số trả lời. (US1-5)
7. **Chỉ đọc.** `push:false`: thấy trả lời và emoji, ô Reply và nút emoji tắt kèm lý do. (US1-6, US2-5)
8. **Hẹp.** 390 px: thẻ trong sheet có đủ phần trả lời và emoji, không cuộn ngang. (US1-7, SC-005)
9. **Emoji.** Thả 👍 và 🎉 lên hai mục: số 1; người thứ hai thả cùng emoji: 2; bấm lại emoji của mình: gỡ, số giảm; không gỡ được của người khác; tên người thả hiện ở `title`. (US2-1…3)
10. **Emoji đồng thời:** hai người thả cùng lúc, cả hai được tính. (US2-4)
11. **Tương thích.** File 010/012 thuần mở bình thường, lưu lại giống hệt từng byte khi không đổi; file có trả lời ghi `version: 2`; một emoji ngoài bộ trong file bị bỏ qua, không hỏng. (FR-013, SC-006)
12. **Bản cũ không xoá dữ liệu.** Bản parse cũ (v1 only, trong test) từ chối file `version: 2`. (R1)
13. **Commit.** Mỗi lần lưu ở server giả đúng một commit `[skip ci]` chỉ đổi `highlights.json` với thông điệp trong contract. (SC-003)
14. **Hiệu năng.** 200 nhận xét × 3 trả lời: mở tài liệu dưới 1 giây, rail không chồng thẻ. (SC-004)
15. **Bàn phím.** Chỉ bàn phím: chọn thẻ, Tab tới ô Reply, gõ, Ctrl+Enter, thả emoji bằng Enter. (SC-005)
16. **Demo.** Demo 1440×900 và 924×540 (màn hình chính, hộp thoại New spec) giống hệt trước khi sửa khi chưa có thảo luận.
17. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.
