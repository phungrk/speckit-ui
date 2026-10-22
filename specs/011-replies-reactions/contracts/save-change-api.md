# Contract: lưu thay đổi trả lời và emoji

Cùng một đường lưu với 010/012: `POST /api/highlights` (server), Contents API trực tiếp (Pages), `localFileStore` (local), `demoStore` (demo). Cả bốn gọi `applyChange` ở `server/highlightsFile.ts`.

## Thân yêu cầu (server)

`{ repo, slug, branch, change }`, `change` thêm bốn dạng:

```text
{ type: 'reply', id, reply: { id, text, createdAt } }
{ type: 'reply-edit', id, replyId, text }
{ type: 'reply-remove', id, replyId }
{ type: 'react', id, replyId?, emoji, on }
```

`routes.ts` kiểm hình dạng (kiểu và độ dài chuỗi); lỗi → 400 "Expected { repo, slug, branch, change: { type: add | update | remove | reply | reply-edit | reply-remove | react, … } }.". Quyền và nội dung kiểm trong `applyChange`.

## Phản hồi và lỗi

Như 010: `{ items, commit }` khi thành công. Lỗi `HighlightError` có `status` (400, 403, 409, 413), thông điệp hiển thị nguyên văn. Xung đột commit (409/422) thử lại tối đa 3 lần trên bản mới (010 R2).

## Commit

Một commit chỉ đổi `highlights.json`, thông điệp kết thúc `[skip ci]`:

| Thay đổi | Mẫu |
|---|---|
| `reply` | `{who} replied on {Phase}: "{quote}" [skip ci]` |
| `reply-edit` | `{who} edited a reply on {Phase}: "{quote}" [skip ci]` |
| `reply-remove` | `{who} removed a reply on {Phase}: "{quote}" [skip ci]` |
| `react` (on) | `{who} reacted {emoji} on {Phase}: "{quote}" [skip ci]` |
| `react` (off) | `{who} removed a reaction on {Phase}: "{quote}" [skip ci]` |

## Quyền

Xem data-model.md và research R4. Người chỉ có quyền đọc: không gọi được (UI tắt nút; nếu gọi, GitHub từ chối như 010).
