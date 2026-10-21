# Contract: kiểm tra nhận xét mới (012-docs-style-comment-flow)

## `GET /api/highlights` (server mode)

Cùng origin, đọc, không có tác dụng phụ. Token ở server (constitution II). Dùng quyền đọc nội dung đã có.

| | |
|---|---|
| Query | `repo` (`owner/name`), `slug` (`NNN-…`), `branch` |
| Header | `If-None-Match: <etag>` (tuỳ chọn) |
| 200 | `{ "items": Highlight[], "error": string \| null, "etag": string }` |
| 304 | không thân: file chưa đổi từ `etag` |
| 404 | file hoặc nhánh không có: trả `{ items: [], error: null, etag: null }` (spec chưa có highlight) |
| 401 | phiên hết hạn (cùng dạng với các route khác) |
| 403 | không có quyền đọc repo |
| 429/5xx | lỗi tạm; client lùi lại |

- Server gọi `GET /repos/{o}/{r}/contents/specs/{slug}/highlights.json?ref={branch}` với `If-None-Match`
  nếu client gửi; chuyển `ETag` của GitHub thành `etag` ở thân 200; chuyển 304 của GitHub thành 304.
- Thân 200 đi qua `parseHighlights` (không tin dữ liệu thô); `error` do parse trả về.
- Route phải có trong `ROUTES`, không có trong `POSTS` hay `JSON_WRITES`; xử lý như các `GET` khác.
- Không đưa token, đường dẫn máy chủ hay nội dung lỗi thô của GitHub vào phản hồi.

## `readHighlights` (dùng chung, `server/highlights.ts`)

```ts
readHighlights(src, { slug, branch, etag? }): Promise<
  | { status: 'ok'; items: Highlight[]; error: string | null; etag: string | null }
  | { status: 'unchanged' }>
```

Bản Pages gọi trực tiếp (`src/backend.ts`), bản server qua route trên. Cùng một code (constitution III).

## `HighlightStore.refresh` (`src/annotations/store.ts`)

```ts
refresh?(target: { slug: string; branch: string | null }, etag: string | null):
  Promise<{ items: Highlight[]; error: string | null; etag: string | null } | 'unchanged'>
```

| Chế độ | `refresh` |
|---|---|
| github (server, Pages) | `backend.readHighlights` như trên |
| local | đọc lại `specs/{slug}/highlights.json`; `etag` là `lastModified` của file; `'unchanged'` khi không đổi |
| demo | không có |

## Lịch kiểm tra (`useFreshness`)

| Điều kiện | Hành vi |
|---|---|
| Tab hiện, chế độ github | kiểm tra mỗi **60 s** (`nextPollDelay`) |
| Tab ẩn | dừng; khi hiện lại kiểm tra ngay rồi tiếp tục |
| Lỗi mạng, 403, 429, 5xx | `failures += 1`; trễ nhân đôi từ 60 s tới trần **10 phút**; thành công thì về 60 s |
| 401 | dừng, dùng thông báo hết phiên hiện có |
| 304 | chỉ cập nhật `checkedAt` ("Updated just now") |
| 200, có khác biệt | lưu `incoming`, hiện dấu "New comments (n)"; không áp |
| Đổi spec hoặc nhánh | đặt lại `etag`, `incoming`, `failures` |
| Local | kiểm tra khi cửa sổ được focus và khi bấm làm mới; không có đồng hồ |
| Demo | không kiểm tra |

Giới hạn: tối đa 1 yêu cầu mỗi phút mỗi tab; 304 không tính vào giới hạn tốc độ chính của GitHub.
Việc áp dữ liệu mới chỉ khi người dùng bấm (FR-014); không bao giờ đụng nháp, thẻ đang chọn, hay thay đổi đang gửi.
