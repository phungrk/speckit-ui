# Contract: thẻ nhận xét gọn (014)

## Tiêu đề của một mục (nhận xét hoặc trả lời)

Avatar chữ cái, tên, giờ (và "edited" nếu có); bên phải **nút ba chấm dọc** khi mục là của người dùng và thẻ đang mở (R4). Mục của người khác: không có nút.

## Nút ba chấm và menu (`MoreMenu`)

- Nút: `type="button"`, `aria-label="More actions"`, `aria-haspopup="menu"`, `aria-expanded`; vùng chạm ≥ 44 px ở `(pointer: coarse)`.
- Menu: `role="menu"`, hai mục `role="menuitem"`: **Edit**, **Delete**. Mục tắt: `aria-disabled="true"` và `title` là lý do (012).
- Bàn phím: Enter/Space mở và đưa tiêu điểm vào mục đầu; ↑/↓ di chuyển và quay vòng; Enter/Space chọn; Escape đóng và trả tiêu điểm về nút; Tab đóng.
- Chuột: bấm ra ngoài đóng; chọn một mục đóng; một lúc chỉ một menu mở trong thẻ.
- Chọn **Edit**: mục soạn tại chỗ (Save/Cancel), nút ba chấm ẩn cho tới khi xong. Chọn **Delete**: dòng xác nhận dưới nội dung ("Delete this comment and its N replies?" cho nhận xét gốc có trả lời, "Delete this comment?", "Delete this reply?"), Keep / Delete.
- Kiểu: bề mặt `--color-bg`, chữ `--color-text`, viền 1 px `--color-text`, bóng `--shadow-md`, không bo góc; mở về phía còn chỗ, không bị cắt ở cuối rail.

## Thẻ đang chọn

Thứ tự: tiêu đề nhận xét → nội dung → dải emoji (011) → các trả lời (cùng kiểu) → ô trả lời. **Không có**: hàng ô màu, dòng nhãn màu, Edit/Delete cố định, Copy, Ask.

## Ô trả lời

Ô nhập góc vuông, nhãn "Reply…". Cancel và Reply chỉ hiện khi ô có tiêu điểm hoặc có chữ. Cancel có chữ: hỏi bỏ ("Discard this reply?"); không chữ: thu ô. Quy tắc gửi/độ dài/chỉ đọc giữ như 011.

## Tab Highlights

Không có ô lọc màu, không nhãn màu bằng chữ. Mỗi mục có dải màu nhỏ bên trái theo màu đã lưu. Mục **có ghi chú**: không có hàng hành động (dùng thẻ). Mục **chỉ có màu**: khi mở, tác giả có **Delete** (hai bước); người khác không có gì; chỉ đọc thì Delete tắt kèm lý do.

## "Before you approve"

Ghi chú của bước đang xem, theo thời gian tạo (cũ trước); không theo màu.
