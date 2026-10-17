# Contract: API của bản server

Áp dụng cho `npm run dev` và `npm start`. Bản Pages gọi trực tiếp GitHub qua cùng các module dùng chung, nên không dùng các endpoint này, nhưng hành vi phải giống hệt (nguyên tắc III).

Mọi response là JSON và có `Cache-Control: no-store`. Lỗi trả về dạng `{ "error": "<thông báo cho người dùng>" }`.

## Xác thực

Ở chế độ **sign-in**, mọi endpoint `/api/*` (trừ `/api/session`, kể cả `/api/copilot`) trả `401 { "error": "Sign in required." }` khi không có phiên hợp lệ. Mọi route nằm trong `server/routes.ts`.

Ở chế độ **token**, server dùng `GITHUB_TOKEN` từ `.env.local` hoặc `.env`, và chỉ lắng nghe trên `127.0.0.1` (R6).

### `GET /api/session`

Cho biết chế độ chạy và người dùng hiện tại. Không bao giờ trả token.

```json
{ "mode": "signin", "user": { "login": "phungrk", "avatarUrl": "https://…" }, "defaultRepo": "phungrk/tohong" }
```

- Chế độ `signin` khi chưa đăng nhập: `{ "mode": "signin", "user": null }`
- Chế độ `token` khi token sai hoặc thiếu: `{ "mode": "token", "user": null, "error": "GitHub rejected GITHUB_TOKEN (401). Put a valid fine-grained token in .env.local, …" }`
- Không cấu hình gì: `{ "mode": "demo", "user": null }`

### `GET /auth/login?return=<query>`

Chỉ có ở chế độ sign-in. Tạo `state` ngẫu nhiên, lưu vào cookie tạm `sk_oauth` (HttpOnly, 10 phút) cùng `return`, rồi trả `302` tới trang uỷ quyền của GitHub App.

### `GET /auth/callback?code=…&state=…`

- `state` khớp cookie `sk_oauth`: đổi `code` lấy token (phía server), tạo `ServerSession`, đặt cookie `sk_session`, rồi `302` về `/?<return>`.
- `state` sai, thiếu hoặc hết hạn: trả `400` kèm trang lỗi có liên kết "Sign in again". Không tạo phiên.

### `POST /auth/logout`

Chỉ nhận request cùng origin. Xoá phiên khỏi bộ nhớ, xoá cookie, trả `{ "ok": true }`.

## Repo

### `GET /api/repos`

```json
{ "repos": [ { "fullName": "phungrk/tohong", "private": true, "defaultBranch": "main", "pushedAt": "2026-10-17T02:33:27Z", "speckit": null } ],
  "truncated": false, "fetchedAt": "2026-10-17T09:00:00Z" }
```

### `POST /api/repos/detect`

Body `{ "repos": [{ "fullName": "owner/a", "pushedAt": "2026-10-17T02:33:27Z" }, "owner/b"] }`, tối đa 30 repo mỗi lần. Mỗi phần tử là tên `owner/name`, hoặc object kèm `pushedAt` để cache theo lần push (R2). Request phải cùng origin và là JSON.

```json
{ "results": { "owner/a": true, "owner/b": false } }
```

Repo không đọc được thì có giá trị `false`, kèm `"errors": { "owner/c": "Not accessible" }`.

## Dự án và cổng duyệt

Các endpoint hiện có nhận thêm `repo` (và `ref` tuỳ chọn). Không truyền `repo` thì dùng `defaultRepo`. Không có `defaultRepo` thì trả `400`.

| Endpoint | Thay đổi |
|---|---|
| `GET /api/project?repo=owner/name&ref=&refresh=1` | Như hiện tại, theo repo được chỉ định |
| `GET /api/tracking?repo=owner/name&refresh=1` | Như hiện tại |
| `POST /api/gates` | Body thêm `"repo": "owner/name"`; ghi issue trong đúng repo đó (FR-009) |

Mọi endpoint dữ liệu dùng quyền của người dùng hiện tại. Cache được khoá theo `login|owner/repo@ref` (R3).

## Mã lỗi

| Trạng thái | Khi nào |
|---|---|
| 400 | Thiếu hoặc sai `repo`, body không hợp lệ |
| 401 | Chưa đăng nhập hoặc phiên đã kết thúc (chế độ sign-in) |
| 403 | Request ghi không cùng origin, hoặc GitHub từ chối (ví dụ ghi issue khi token không có quyền Issues ghi) |
| 404 | Repo không tồn tại hoặc người dùng không có quyền (GitHub trả 404 cho cả hai) |
| 409 | Cổng chưa đủ điều kiện duyệt (giữ nguyên hành vi hiện tại) |
| 502 | GitHub lỗi hoặc giới hạn số lần gọi |
