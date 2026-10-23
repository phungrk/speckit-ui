# Contract: ghi nhiều thay đổi một lần (016)

## Yêu cầu

`POST /api/highlights` (server) hoặc `backend.saveHighlights(repo, slug, branch, changes)` (Pages), thân JSON:

```json
{ "repo": "owner/name", "slug": "003-transfer-limits", "branch": "main", "changes": [ { "type": "add", "highlight": { } }, { "type": "react", "id": "h_x", "emoji": "👍", "on": true } ] }
```

- `changes`: 1 đến 200 phần tử, mỗi phần tử qua `changeShapeOk` như `change` hiện nay. Thân cũ `{ change }` vẫn dùng được.
- Vẫn như 010: không tin tác giả từ trang; người ghi là người server biết (phiên đăng nhập hoặc chủ token); `slug` đúng mẫu `NNN-tên`; `branch` không rỗng.
- Quá 200 phần tử: 400. Thân tối đa `MAX_BYTES` (512 KiB) cho đường này (các đường khác giữ 8.000 ký tự); quá thì 413.

## Xử lý

1. Đọc `specs/{slug}/highlights.json` trên `branch` (như `saveHighlight`).
2. Áp từng thay đổi bằng `applyChange(items, change, user)`. Thay đổi ném `HighlightError` 409 (đích đã bị xoá) hoặc 403 (không phải người viết) bị **bỏ qua** và ghi vào `skipped`; lỗi khác (kích thước, quyền ghi) dừng cả lần.
3. Nếu danh sách cuối khác danh sách đọc được: một PUT Contents API, một commit `[skip ci]`. Thông điệp: một thay đổi thì như cũ; nhiều thì `{user} saved {N} comment changes on {spec} [skip ci]`. Nếu không có gì đổi: không commit, `commit: null`.
4. Gặp 409/422 khi PUT: đọc lại và áp lại cả danh sách, tối đa 3 lần (như hiện nay).

## Kết quả

`200 { items, commit: { sha, url } | null, skipped: [{ index, error }] }`. Lỗi quyền (403/404), nhánh bị xoá (422), kích thước (413), cạnh tranh quá 3 lần (409): giữ nguyên thông điệp hiện nay.
