# Data model: Chú thích (010-spec-annotations)

## Highlight (một phần tử trong `highlights.json`)

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `id` | string | `h_` + 12 ký tự ngẫu nhiên base36; duy nhất trong file |
| `phase` | string | `constitution` · `specify` · `clarify` · `plan` · `tasks` · `analyze` · `implement` |
| `doc` | string | đường dẫn tài liệu trong thư mục spec, ví dụ `spec.md`, `plan.md`; dùng khi một bước có nhiều tài liệu |
| `quote` | string | 2–2.000 ký tự, đã cắt khoảng trắng đầu cuối |
| `prefix` | string | ≤ 32 ký tự ngay trước `quote` |
| `suffix` | string | ≤ 32 ký tự ngay sau `quote` |
| `startHint` | number | vị trí ký tự trong `textContent` của cột đọc lúc tạo, ≥ 0 |
| `docSha` | string · null | phiên bản tài liệu lúc tạo, để biết tài liệu đã đổi: server và Pages lấy sha blob của file từ tree của spec; local và demo dùng hash nội dung (`h:` + FNV-1a 32 bit dạng hex, tính đồng bộ, không cần Web Crypto); null khi không tính được. Chỉ để tham khảo, việc gắn dùng `locate` |
| `color` | string | `y` (Key) · `b` (Question) · `p` (Issue) · `o` (Change) |
| `note` | string | 0–2.000 ký tự; văn bản thuần |
| `author` | object | `{ login: string }` (server, Pages) hoặc `{ name: string, local: true }` (local) hoặc `{ name, demo: true }` |
| `createdAt` | string | ISO 8601 |
| `updatedAt` | string | ISO 8601, ≥ `createdAt` |

Không lưu: trạng thái "Outdated" (tính khi hiển thị bằng `locate`), feature id (suy ra từ thư mục).

**Validate khi đọc** (`parseHighlights`): bỏ phần tử sai kiểu và ghi vào `error` số phần tử bị bỏ;
JSON hỏng hoặc `version` khác 1 → `error` và chặn ghi (FR-014).

## Thay đổi (HighlightChange) — đơn vị ghi

| Loại | Dữ liệu | Quyền |
|---|---|---|
| `add` | Highlight mới (đủ trường) | ai có quyền ghi |
| `update` | `id`, và `color` và/hoặc `note` | chỉ tác giả (so `author.login` hoặc `author.name` ở local) |
| `remove` | `id` | chỉ tác giả |

Áp thay đổi lên bản mới nhất (research R2): `add` thêm nếu chưa có `id`; `update`/`remove` báo
"This highlight was removed by someone else" nếu không còn `id`. Kiểm tra tác giả chạy ở client và
lặp lại ở `server/highlights.ts` trước khi ghi.

## File highlight

```json
{ "version": 1, "highlights": [ /* Highlight, sắp theo createdAt */ ] }
```

Chi tiết và ví dụ: [contracts/highlights-file.md](contracts/highlights-file.md). Tối đa 512 KB.

## Trạng thái trong trình duyệt

| Khoá | Kho | Nội dung |
|---|---|---|
| `sk.u.{login}.hlConsent` | như `prefsFor` | `{ [repo]: true }`: đã xác nhận commit highlight (FR-009a) |
| `sk.u.~local.authorName` | `localStorage` | tên tác giả ở local (FR-017) |
| `sk.demo.highlights` | `localStorage` | `{ [featureId]: Highlight[] }` cho demo (FR-018) |

## Quan hệ

- Một spec (thư mục) có 0 hoặc 1 file highlight; một file có 0..n highlight.
- Highlight gắn với một bước và một tài liệu của spec; phiên bản spec (nhánh) quyết định file nào
  được đọc và ghi.
