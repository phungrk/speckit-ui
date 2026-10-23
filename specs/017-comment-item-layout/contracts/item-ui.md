# Contract: mục nhận xét (017)

## Hàng emoji (`ReactionBar` trong `.sk-cm-item`)

- Nhận xét gốc: ngay sau `.sk-cm-row`, trong `.sk-cm-item`, ở **mọi thẻ**. Trả lời: ngay sau `.sk-cm-row` của trả lời (không đổi).
- Chỉ hiện khi có ít nhất một emoji. Bọc trong khối chặn `click` và `keydown` lên thẻ và rail.
- Viên emoji: giữ nhãn, `aria-pressed`, `title` của 011; thẻ đóng có `tabIndex=-1`.
- Thứ tự trong thẻ: tiêu đề, trích dẫn, nội dung, hàng emoji, (thẻ mở: thao tác xoá, dòng trạng thái, thread).

## Tiêu đề thẻ đóng

`avatar · tên · [N reply/replies] · giờ · ba chấm (của mình)`. Không còn chuỗi emoji. Ba chấm ngoài cùng bên phải, chiếm chỗ lúc nghỉ, `opacity` 0 cho tới khi hover/focus (015). Tên cắt bằng ellipsis nếu hẹp.

## Ba chấm trên thẻ đóng

- Chỉ nhận xét của mình. `tabIndex=-1` ở thẻ đóng. Edit: soạn tại chỗ. Delete: chọn thẻ rồi hiện xác nhận (Keep, Delete). Chỉ đọc: `aria-disabled` kèm lý do (012).

## Chiều cao

Thẻ không emoji, màn hình có hover: `height: 124` như hiện nay. Thẻ khác: chiều cao đo và báo cho rail; rail xếp lại, không chồng.

## Cảm ứng

`(hover: none), (pointer: coarse)`: ba chấm và nút emoji hiện sẵn ở thẻ đóng và mở, ≥ 44 px; bấm không chọn thẻ.
