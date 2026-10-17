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
3. `getTracking` trong 5 phút sau khi ghi (dài hơn 2 phút của SC-003) không trả trạng thái cổng cũ hơn lần ghi đó (so bằng `updatedAt`).
4. Lệnh đọc GitHub gửi `cache: 'no-cache'`, nên trình duyệt không dùng bản cũ trong cache HTTP.
5. **Ghi được một phần (I1):** khi PATCH đã được GitHub nhận nhưng việc đăng comment lỗi, lệnh vẫn trả lỗi.
   - Giao diện báo lỗi, và nút Approve dùng lại được.
   - Issue thật đã ghi duyệt, nên lần làm mới sau hiện đã duyệt (nhờ bản ghi gần đây).
   - Lần bấm sau trả `unchanged: true` và không ghi gì thêm. Lỗi comment chỉ làm thiếu một comment, không bao giờ làm thừa một lần duyệt.
6. **Một issue cho mỗi spec (U1):** trong một tiến trình, lệnh duyệt đầu tiên của một spec tạo issue và ghi lại số issue cho `repo|slug`, dùng chung cho mọi người dùng.
   - Lệnh duyệt sau, của bất kỳ ai, dùng lại số issue đó thay vì tạo mới.
   - Lệnh đó vẫn đọc issue bằng token của chính người dùng, nên ai không có quyền thì vẫn nhận 404.

## Giao diện (GatePanel)

| Trạng thái | Nút | Ghi chú |
|---|---|---|
| Chưa duyệt, đủ điều kiện | `Approve <Step>` dùng được | |
| Đang lưu | `Saving…`, mọi nút trong khu vực cổng bị khoá | Lần bấm thứ hai bị bỏ qua đồng bộ (ref) |
| Đã duyệt | `Approved by @x · ngày` + `Reopen gate` | Không có nút Approve |
| Đã duyệt bởi người khác (`unchanged`) | Như trên | Ghi chú "Already approved" |
| Lỗi | Nút trở lại như trước khi bấm | Thông báo lỗi `role="alert"` |

Không thêm class hay màu mới: dùng `sk-pass`, `sk-warn`, `btn` sẵn có (nguyên tắc IV).
