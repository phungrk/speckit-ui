# Contract: Ghi quyết định cổng

Áp dụng cho `POST /api/gates` (bản server) và `Backend.decide` (cả hai bản). Hành vi giống nhau ở hai chế độ (FR-009), vì cùng chạy `decideGate` trong `server/tracking.ts`.

## `POST /api/gates`

Request: không đổi so với spec 002, `{ "repo", "slug", "gate", "action": "approve" | "changes" | "reopen", "note"? }`. Vẫn kiểm tra cùng origin và JSON.

Response 200:

```json
{ "issue": { "number": 4, "url": "…", "state": "open", "gates": { "plan": { "approved": true, "by": "phungrk", "at": "2026-10-17" } }, "updatedAt": "2026-10-17T10:20:00Z" },
  "unchanged": false,
  "tracking": { "...": "tracking hiện có, đã gộp issue ở trên (applyIssue); không đọc lại từ GitHub" } }
```

- `unchanged: true`: cổng đã ở trạng thái đích. Không có PATCH, không có comment, và `issue` cho biết người đã duyệt thật (FR-007).
- Mã lỗi giữ nguyên:
  - `409`: cổng chưa đủ điều kiện;
  - `403`: không cùng origin, hoặc GitHub từ chối ghi;
  - `404`: không tìm thấy spec hoặc repo;
  - `502`: lỗi GitHub.

  Khi lỗi, không có gì được ghi và tracking của client không đổi (FR-006).

## Đảm bảo

1. Ứng dụng chỉ báo thành công sau khi GitHub đã nhận cả PATCH lẫn comment.
2. Hai lệnh cho cùng `repo|slug` trong một tiến trình chạy nối tiếp nhau, và lệnh thứ hai thấy kết quả của lệnh thứ nhất.
3. `getTracking` trong 2 phút sau khi ghi không trả trạng thái cổng cũ hơn lần ghi đó (so bằng `updatedAt`).
4. Lệnh đọc GitHub gửi `cache: 'no-cache'`, nên trình duyệt không dùng bản cũ trong cache HTTP.

## Giao diện (GatePanel)

| Trạng thái | Nút | Ghi chú |
|---|---|---|
| Chưa duyệt, đủ điều kiện | `Approve <Step>` dùng được | |
| Đang lưu | `Saving…`, mọi nút trong khu vực cổng bị khoá | Lần bấm thứ hai bị bỏ qua đồng bộ (ref) |
| Đã duyệt | `Approved by @x · ngày` + `Reopen gate` | Không có nút Approve |
| Đã duyệt bởi người khác (`unchanged`) | Như trên | Ghi chú "Already approved" |
| Lỗi | Nút trở lại như trước khi bấm | Thông báo lỗi `role="alert"` |

Không thêm class hay màu mới: dùng `sk-pass`, `sk-warn`, `btn` sẵn có (nguyên tắc IV).
