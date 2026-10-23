# Contract: thanh Save và dấu "Not saved" (016)

## Khi nào có

Chỉ ở chế độ lưu qua commit (Pages và server) và khi hàng đợi của spec đang xem có ít nhất một thay đổi áp được. Local và demo không có thanh này.

## SaveBar

- `role="status"`, nằm giữa thanh bước và khung đọc (mọi độ rộng) và ở đầu tab Highlights. Chữ: "N change(s) not saved". Hai nút: **Save** và **Discard**.
- **Save**: bấm gọi ghi một lần. Đang ghi: nhãn "Saving…", cả hai nút tắt. Chỉ đọc hoặc nhánh bảo vệ: `aria-disabled` kèm lý do (012). Lần đầu ở repo: hộp "Commit highlights?" (như 010) trước khi ghi; từ chối giữ nguyên hàng đợi.
- **Thành công**: thanh biến mất, báo "Saved · commit abc1234" (như hiện nay) và, nếu có, "N changes skipped" kèm lý do.
- **Thất bại**: thanh ở lại, hiện lý do và nút Retry; hàng đợi nguyên vẹn.
- **Discard**: bước xác nhận trong thanh "Discard N changes? Keep / Discard"; Discard xoá hàng đợi, không gọi mạng.
- Khi lưu cục bộ bị chặn: thêm dòng "These changes are only in this tab and are lost if you close it."

## Dấu trên thẻ

Thẻ và trả lời có thay đổi trong hàng đợi hiện "Not saved" (cùng chỗ dòng trạng thái của 011), không phai theo thời gian, mất khi Save thành công. Không có "Sending" hay "Saved · commit" cho từng thao tác ở chế độ này.

## Nhắc khi rời trang

Có hàng đợi không rỗng: `beforeunload` hiện lời nhắc của trình duyệt; rỗng thì không.
