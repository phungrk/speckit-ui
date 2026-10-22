# Contract: hộp chọn chữ, thẻ và tab Highlights (spec 013)

## Hộp chọn chữ (`HlToolbar`)

- Một nút, nhãn hiển thị và `aria-label` đúng "Comment"; biểu tượng `note` bên trái nhãn; `white-space: nowrap`.
- Container: `role="dialog"`, `aria-label="Comment"`, nền `--color-bg`, chữ `--color-text`, viền 1 px `--color-text`, bóng `--shadow-md`, không bo góc.
- Hiện khi: (a) có vùng chọn trong tài liệu; (b) bấm vào highlight chỉ có màu của chính mình. Không hiện khi bấm highlight chỉ-màu của người khác.
- Tắt: khi `readOnly` (quyền đọc, nhánh bảo vệ, thư mục chỉ đọc, ghim vào commit): nút `aria-disabled="true"`, lý do nằm trong hộp (`role="status"`) và `title`.
- Bấm: gọi `onComment`, hộp đóng, hộp soạn mở (rail hoặc sheet), giống 012.
- Bàn phím: Tab từ tài liệu nhảy vào nút; Enter/Space kích hoạt; Escape đóng. Ctrl/Cmd+Alt+M không đổi.
- Bề rộng: theo nội dung; kẹp 8 px trong màn hình; có thông báo thì tối đa `min(260, viewport − 16)`.
- Không có: ô màu, Copy, Ask, Xoá, ô ghi chú.

## Thẻ đang chọn (`Card`)

- Mọi người xem: hàng **Copy**, **Ask**.
- Tác giả (và có quyền ghi): thêm ô màu (5 màu), **Edit**, **Delete** (hai bước) như 012.
- Người chỉ có quyền đọc là tác giả: các hành động ghi `aria-disabled` kèm lý do; Copy, Ask dùng được.

## Mục trong tab Highlights

- Bấm mục: cuộn tới đoạn chữ và chọn (như 012). Với mục **không có ghi chú**, mục mở rộng hàng hành động ngay dưới: tác giả có ô màu, Copy, Ask, Delete (xác nhận hai bước); người khác có Copy, Ask. Bấm lại mục hoặc mục khác thu hàng cũ.
- Mục **có ghi chú**: không có hàng; dùng thẻ.
- Hàng hành động là phần tử anh em của nút mục, không lồng trong `<button>`.
- Hành động ghi bị tắt kèm lý do khi `readOnly`.

## Nhãn

"Comment" thay cho "Add comment" ở nút; hộp soạn của 012 giữ nút "Cancel" / "Comment".
