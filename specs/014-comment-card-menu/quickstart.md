# Quickstart: kiểm thẻ nhận xét gọn (014)

Chuẩn bị: `npm run dev` (demo `http://localhost:5173/?demo`, đổi vai sang QA để là tác giả của nhận xét mình tạo); server dùng GitHub giả như 012/011. Dữ liệu tự tạo, không ghi GitHub thật.

1. **Một màu.** Chọn câu → Comment → gõ → gửi: đoạn chữ tô cam (`--hl-o`), thẻ không có ô màu hay nhãn màu; file lưu `color: "o"`. (US1-1, 2, SC-001)
2. **Thêm ghi chú vào highlight chỉ-màu của mình** (013): thành nhận xét, giữ màu có sẵn. (US1-3)
3. **Nhận xét cũ.** Nhận xét lưu với `y`, `b`, `p`, `n` vẫn đúng màu trên đoạn chữ; mở tài liệu không tạo commit hay đổi file. (US1-4, SC-004)
4. **Ba chấm.** Thẻ của mình mở: nút ba chấm ở tiêu đề nhận xét và ở từng trả lời của mình; thẻ hay trả lời của người khác không có. (US2-1, 2)
5. **Menu.** Edit soạn tại chỗ; Delete hỏi xác nhận (nêu số trả lời); Escape/bấm ngoài đóng và tiêu điểm về nút; một menu mở một lúc. (US2-3, 4)
6. **Bàn phím.** Tab tới nút, Enter mở, ↓/↑ di chuyển, Enter chọn, Escape đóng. (US2-6, SC-003)
7. **Chỉ đọc** (`push:false`): mở menu của mục mình: Edit và Delete tắt kèm lý do. (US2-5)
8. **Không Copy/Ask.** Thẻ và tab không còn Copy, Ask. (US3, SC-002)
9. **Bố cục.** Nhận xét + một trả lời: tiêu đề → nội dung → tiêu đề trả lời → nội dung → ô trả lời; Cancel/Reply ẩn lúc nghỉ, hiện khi chọn ô hoặc có chữ; Cancel có chữ hỏi bỏ. (US4, SC-006)
10. **Hẹp.** 390 px: sheet có đủ, không cuộn ngang, ba chấm ≥ 44 px (`pointer: coarse`). (US4-4, SC-005)
11. **Tab Highlights.** Không ô lọc màu, không nhãn màu; còn dải màu nhỏ; mục chỉ-màu của mình: chỉ Delete (có xác nhận). (FR-013)
12. **Before you approve** (demo, Gate): ghi chú theo thời gian, không Issue trước. (US2/Q2)
13. **Dữ liệu và lưu.** `npm test` qua các test lưu/đọc/commit; mỗi lần lưu một commit `[skip ci]` ở GitHub giả. (FR-011)
14. **Demo 1440×900 và 924×540** (màn hình chính, hộp thoại New spec) giống hệt trước khi sửa.
15. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.
