# Data Model: Lưu hoãn (016)

`highlights.json` không đổi (khuôn dạng, `version`, thay đổi `react`, `reply`, v.v. của 010–014 giữ nguyên). Mọi thứ dưới đây nằm trong trình duyệt hoặc là thân yêu cầu ghi.

## PendingChange (trình duyệt)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | string | id của thay đổi (từ `changeId`: id nhận xét, trả lời, hoặc `id:emoji`), để gộp |
| `change` | `HighlightChange` | đúng kiểu đã có |
| `by` | `HighlightAuthor` | người làm; chỉ để hiển thị cục bộ, server dùng người đã đăng nhập |
| `at` | ISO string | thời điểm làm, giữ thứ tự |

## PendingQueue

Danh sách `PendingChange` theo thứ tự thao tác của một tài khoản trên một spec, nhánh, repo. Lưu ở `localStorage` key `sk.pending.v1.{login}.{repo}@{branch}.{slug}`, giá trị `{ v: 1, changes }`. Tối đa 500 thay đổi. Sai khuôn dạng → bỏ qua (hàng đợi rỗng).

## Quy tắc

- **View** = `foldPending(saved, queue)`: áp từng `change` bằng `applyChange(items, change, by)`; thay đổi ném `HighlightError` thì bị bỏ qua. Kết quả gồm `items`, `applied` (số thay đổi áp được), `skipped` (id bị bỏ qua).
- **Gộp** (`compactPending`): xem research R4. Bất biến: `fold(saved, compact(q))` cho cùng nhận xét và nội dung như `fold(saved, q)` (trừ `updatedAt`).
- **Chưa lưu** của một mục = hàng đợi có thay đổi tới `id` đó (nhận xét), hoặc tới trả lời đó.
- **Chuyển trạng thái**: rỗng → có thay đổi (thao tác) → rỗng (Save thành công, hoặc Discard). Save thất bại: giữ nguyên.

## Thân yêu cầu ghi (`POST /api/highlights`)

Giữ `{ repo, slug, branch, change }`; thêm `{ repo, slug, branch, changes: HighlightChange[] }` (1 đến 200). Kết quả `{ items, commit, skipped }`: `commit` null khi không có gì đổi, `skipped` là danh sách `{ index, error }` của thay đổi không áp được. Xem `contracts/batch-save-api.md`.
