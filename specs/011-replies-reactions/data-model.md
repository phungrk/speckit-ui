# Data Model: Trả lời và thả emoji

Mở rộng `Highlight` của 010/012 (`src/project/types.ts`). Mọi trường mới là tuỳ chọn; thiếu coi như rỗng.

## Reaction

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `emoji` | chuỗi | thuộc bộ cố định `👍 ❤️ 😄 🎉 😕 👀` |
| `author` | `HighlightAuthor` | người thả; mỗi cặp (emoji, người) tối đa một lần trên một mục |

## Reply

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | chuỗi | `r_` + 12 ký tự ngẫu nhiên, tạo ở trình duyệt khi mở ô trả lời, giữ qua Retry |
| `author` | `HighlightAuthor` | do người đang lưu quyết định, không tin giá trị client gửi |
| `createdAt` | ISO | |
| `editedAt` | ISO, tuỳ chọn | có khi đã sửa; UI ghi "edited" |
| `text` | chuỗi | 1–2.000 ký tự sau khi cắt khoảng trắng đầu cuối; chữ thuần |
| `reactions` | `Reaction[]`, tuỳ chọn | |

## Highlight (thêm)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `replies` | `Reply[]`, tuỳ chọn | theo thứ tự thời gian (`createdAt`, rồi `id`) khi ghi |
| `reactions` | `Reaction[]`, tuỳ chọn | emoji trên nhận xét gốc |

`updatedAt` của highlight đặt bằng giờ lưu sau mỗi thay đổi trả lời/emoji (R7).

## Tệp

| Điều kiện | `version` |
|---|---|
| không highlight nào có `replies` hoặc `reactions` khác rỗng | `1` |
| ít nhất một highlight có | `2` |

Đọc nhận `1` và `2`; giá trị khác là "unknown format" (như 010). Ghi tuân theo bảng trên (R1). Kích thước tối đa 512 KB như 010.

## Thay đổi (`HighlightChange`, thêm)

| `type` | Trường | Ai | Hiệu ứng |
|---|---|---|---|
| `reply` | `id`, `reply` | người lưu được | thêm trả lời; cùng `reply.id` đã có thì bỏ qua |
| `reply-edit` | `id`, `replyId`, `text` | chính tác giả trả lời | đổi `text`, đặt `editedAt` |
| `reply-remove` | `id`, `replyId` | chính tác giả trả lời | xoá trả lời |
| `react` | `id`, `replyId?`, `emoji`, `on` | người lưu được | `on: true` thêm (emoji, `by`) nếu chưa có; `false` gỡ |

Lỗi (HighlightError): nhận xét không còn (409), trả lời không còn (409), không phải tác giả trả lời (403), nội dung trống hoặc quá dài (400), emoji ngoài bộ (400), trả lời khi không có mã hợp lệ (400).

## Trạng thái cục bộ (trình duyệt, không lưu)

- `replyDrafts: Record<highlightId, string>`; `editingReply: { id, replyId, text } | null`; `pending[replyId]` theo `reducePending`.
