# Contract: API và giao diện

Áp dụng cho bản server và bản Pages. Bản Pages gọi cùng hàm trong trình duyệt, không qua HTTP.

## `GET /api/project` (thêm trường)

```jsonc
{
  "approvalGates": "block",     // "block" | "off", từ .specify/speckit-ui.json
  "gateCheck": "missing"        // "installed" | "missing" (R7)
  // … các trường hiện có
}
```

## `POST /api/gates` (thêm một lý do từ chối)

`{ "action": "approve" }` cho một cổng mà cổng trước chưa được duyệt sẽ bị từ chối với `409`:

```json
{ "error": "Approve Specify first." }
```

Kiểm tra chạy lại trên issue vừa đọc lại, ngay trước khi ghi (FR-005). `reopen` và `changes` không bị chặn. Khi `approvalGates` là `"off"`, hành vi giống như trước.

## Giao diện

| Nơi | Khi bước đang chọn bị chặn bởi cổng `K` | Khi không đọc được phê duyệt |
|---|---|---|
| Thanh bước | Ô `locked`, nhãn "Locked" | Như cũ (chỉ theo file) |
| Bước đã chạy nhưng bị chặn | Ô `review`, nhãn "Ran early"; nội dung hiển thị kèm `sk-warn` "Ran before K was approved" | Như cũ |
| Thanh tiến độ trong danh sách Specs | Ô bị chặn dùng `locked` | Như cũ |
| Màn hình bước | "Waiting for K approval" và nút "Go to K" | — |
| Thanh lệnh | Ô lệnh trống, chỉ đọc; Copy tắt; dòng "Approve K first" (bấm thì mở cổng K) | Copy tắt; dòng "Approvals could not be checked, so no command is suggested." |
| Cổng (Approve) | Nút tắt, lý do "Approve K first." | Như hiện nay ("Approvals unavailable") |
| Next up, Overview | "Approve K" đứng trước, không có lệnh của bước sau | Không có mục lệnh nào; giữ ghi chú hiện có |
| Copilot | Ngữ cảnh nêu "Locked: waiting for K approval"; câu trả lời offline không gợi ý lệnh bị chặn | — |
| Chưa cài bước kiểm tra, khoá đang bật | Một dòng `sk-cmdhint`: "Commands aren't blocked in Claude Code for this repo. Install the gate check →" (liên kết README) | — |

Khi `approvalGates` là `"off"`, mọi thứ hoạt động như trước tính năng này.

Chế độ demo không đổi.
