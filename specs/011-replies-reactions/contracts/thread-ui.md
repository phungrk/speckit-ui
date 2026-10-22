# Contract: thảo luận trong thẻ nhận xét

## Thẻ đóng

Khi có trả lời: một dòng nhỏ "N replies" (số ít "1 reply") trong chiều cao đóng sẵn có; có emoji trên nhận xét gốc thì hiện gọn cạnh dòng đó. Thẻ chưa có trả lời/emoji không đổi.

## Thẻ mở (rail) và sheet (hẹp), thành phần `Thread` trong khe `.sk-cm-thread`

1. **Dải emoji của nhận xét gốc:** mỗi emoji đang có hiện nút "emoji + số" (`aria-pressed` khi của mình; tên tất cả người thả trong `title` và nhãn đọc); nút "+" mở bộ 6 emoji. Người không ghi được: chỉ xem, nút tắt kèm lý do.
2. **Danh sách trả lời** (theo thời gian): avatar chữ cái, tên, giờ tương đối, "edited" nếu có, nội dung (chữ thuần, giữ xuống dòng), dải emoji riêng. Trả lời của mình có menu **Edit** / **Delete** (Delete hai bước). Mỗi trả lời có dòng trạng thái Sending/Saved/Failed + Retry (như thẻ).
3. **Ô trả lời** ở cuối: một ô nhập "Reply…", nút **Reply** (tắt khi trống hoặc không ghi được); Ctrl/Cmd+Enter gửi; trống thì có lời nhắc; vượt 2.000 ký tự thì báo trước khi gửi; Escape thu ô, có chữ thì hỏi bỏ.
4. **Tắt ghi:** lý do (cùng lý do của 012) hiện một lần trong khe, các điều khiển ghi `aria-disabled`.

## Xoá nhận xét gốc

Hộp xác nhận hiện số trả lời: "Delete this comment and its N replies?".

## Trợ năng

Danh sách là `role="list"`; thông báo `aria-live="polite"` cho "Reply sent", "Reaction added/removed", lỗi; mọi nút có nhãn, `:focus-visible` theo hệ thống; Tab đi qua dải emoji, danh sách, ô trả lời.

## Giao diện

Token Modernist, không bo góc, không màu mới (nút emoji dùng nền `--color-surface`, viền `--color-divider`, "của mình" đậm viền `--color-text`). Dùng được ở 390 px, không cuộn ngang.
