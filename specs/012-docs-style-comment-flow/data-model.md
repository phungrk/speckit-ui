# Data model: Luồng nhận xét kiểu Google Docs (012-docs-style-comment-flow)

Spec này **không đổi file** `highlights.json` ngoài một giá trị màu mới. Mọi thứ khác là trạng thái
giao diện trong bộ nhớ của trang, không ghi ra ngoài. Nền: `specs/010-spec-annotations/data-model.md`.

## Thay đổi ở file highlight

| Trường | Trước (010) | Sau (012) | Ghi chú |
|---|---|---|---|
| `color` | `y` · `b` · `p` · `o` | `y` · `b` · `p` · `o` · **`n`** | `n` = nhận xét thường ("Comment"), tô trung tính. Mặc định của nút Comment. |

- `version` giữ `1`. Phần tử có `color: "n"` hợp lệ; `parseHighlights` và `applyChange` chấp nhận `n`.
- Đọc file cũ (không có `n`): không đổi nghĩa (spec FR-016 của 011, SC-007 của 012 ở mức màu).
- Rủi ro bản 010 thuần: xem research R6.

**Thứ tự trong "Before you approve"** (mở rộng 010 FR-022): ghi chú có `note` không rỗng của bước, sắp
`p` (Issue) → `n` (Comment) → `y`, `b`, `o` theo thứ tự thanh công cụ, trong mỗi nhóm theo `createdAt`.

## Thực thể chỉ ở bộ nhớ trang

### CommentCard (view model của một thẻ)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | string | `id` của highlight; hoặc `draft:<key>` cho thẻ nháp |
| `kind` | `'comment' \| 'draft'` | thẻ nháp là hộp soạn |
| `anchorTop` | number \| null | `top` của neo trong `.sk-doc`; `null` khi Outdated |
| `top` | number | kết quả của `layoutCards`; không có khi `anchorTop` là `null` |
| `height` | number | hằng số cho thẻ đóng; đo cho thẻ đang chọn và hộp soạn |
| `selected` | boolean | `id === selectedId` |
| `outdated` | boolean | đoạn chữ không còn (010 FR-006) |
| `save` | `SaveState` | xem dưới |
| `mine` | boolean | tác giả trùng người dùng hiện tại; quyết định nút Edit, Delete |

Thẻ Outdated nằm ở nhóm riêng cuối rail, không có `anchorTop`.

### SaveState (cho mỗi thẻ)

| Trạng thái | Nghĩa | Chuyển |
|---|---|---|
| `idle` | Đã có từ lần tải hoặc làm mới | → `sending` khi sửa |
| `sending` | `store.save` đang chạy | → `saved` hoặc `failed` |
| `saved` | Vừa lưu; kèm `commit?: { sha, url }` hoặc nơi lưu (`folder`, `browser`) | → `idle` khi làm mới |
| `failed` | Lưu lỗi; kèm `error` và `change` để thử lại | → `sending` khi Retry |

Ràng buộc: một `id` có tối đa một thay đổi `sending`; Retry dùng lại đúng `change`, không tạo `id` mới.

### Draft (bản nháp nhận xét)

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `key` | string | `slug|doc|startHint` |
| `anchor` | `{ quote, prefix, suffix, startHint }` | như 010; quote 2–2.000 ký tự đã cắt khoảng trắng |
| `target` | `AnnotatorTarget` | spec, nhánh, bước, tài liệu lúc mở (để phát hiện chuyển chỗ) |
| `text` | string | 0–2.000 ký tự; rỗng thì không gửi |

Chỉ tồn tại ở bộ nhớ trang. Huỷ hoặc gửi xong thì xoá. Chuyển spec hoặc nhánh mà có `text` thì hỏi trước.

### Selection

`selectedId: string | null`, thuộc shell. Tối đa một giá trị tại một thời điểm (FR-008). Đặt khi: bấm thẻ,
đoạn chữ, ghim hoặc mục ở tab Highlights; xoá khi Escape, bấm ra ngoài, hoặc thẻ bị xoá.

### Freshness (trạng thái cập nhật)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `etag` | string \| null | của `highlights.json` lần đọc gần nhất (server, Pages) |
| `incoming` | `Highlight[] \| null` | dữ liệu mới chưa áp |
| `newCount` | number | số `id` mới cộng số `id` có `updatedAt` mới hơn so với danh sách đang hiển thị |
| `checkedAt` | number \| null | thời điểm kiểm tra gần nhất, để hiện "Updated {rel}" |
| `failures` | number | số lần lỗi liên tiếp, quyết định backoff |
| `paused` | boolean | `true` khi tab ẩn hoặc phiên hết hạn |

Quy tắc áp (khi người dùng bấm): danh sách mới = `incoming`, nhưng các `id` đang `sending` hoặc `failed`
giữ bản cục bộ, và `selectedId`, `Draft` không bị đụng.

## Hàm thuần (không đụng DOM)

| Hàm | Vào | Ra |
|---|---|---|
| `layoutCards` | neo (id, top), `selectedId`, chiều cao, khoảng cách | `top` của từng thẻ, không đè nhau |
| `toCards` | highlights, neo đã định vị, `pending`, người dùng | `CommentCard[]` (nhóm Outdated riêng) |
| `reducePending` | `pending`, sự kiện (`start`, `ok`, `fail`, `retry`) | `pending` mới |
| `diffIncoming` | danh sách hiện tại, danh sách mới | `{ added, changed, newCount }` |
| `nextPollDelay` | `failures`, `visible` | ms tới lần kiểm tra kế (60 s, backoff nhân đôi tới 10 phút) |
| `briefNotes` (sửa) | highlights, bước | chuỗi "{tác giả}: {ghi chú}" theo thứ tự trên |

## Quan hệ

- Một highlight (010) tạo đúng một `CommentCard` nếu có `note`. Highlight chỉ có màu (không ghi chú) không phải nhận xét: không có thẻ,
  không vào trạng thái chọn của FR-008, bấm vào đoạn chữ vẫn mở thanh công cụ của 010 (spec FR-008).
- Một bước có tối đa một `Draft` mỗi đoạn chữ; nhiều `Draft` ở các đoạn khác nhau cùng tồn tại.
- `Project.canWrite: boolean | null` (research R16): `false` khi GitHub báo không có quyền ghi vào repo,
  `true` khi có, `null` khi không biết (nhánh đã ghim, hoặc phản hồi không có trường quyền). Chỉ ở bộ nhớ,
  tính khi tải lần đầu và khi làm mới, nằm ngoài `Project` được cache theo commit (research R16); quyết định `hlReadOnly` cùng `pinned`, lỗi file và `refused`.

