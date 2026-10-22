# Data Model: Thẻ nhận xét gọn (014)

Không có thay đổi dữ liệu. `Highlight`, `Reply`, `Reaction`, `highlights.json` (`version` 1 hoặc 2) và mọi loại thay đổi (`add`, `update`, `remove`, `reply`, `reply-edit`, `reply-remove`, `react`) giữ nguyên.

- **Màu**: nhận xét mới có `color: 'o'`. Giá trị `y`, `b`, `p`, `n` đã lưu vẫn hợp lệ, được đọc, hiển thị (đoạn tô và dải màu) và ghi lại nguyên văn; không có thao tác đổi màu nào ở giao diện.
- **Mở tài liệu không ghi**: không có bước chuyển đổi dữ liệu.

## Mô hình giao diện

**HighlightActions** (`src/annotations/highlightActions.ts`), sau khi gỡ:

| Hành động | Ai | Ghi? |
|---|---|---|
| `onEdit(id)` | tác giả, chỉ thẻ | có |
| `onDelete(id)` | tác giả (thẻ và mục chỉ-màu ở tab) | có |
| `mine(h)` | — | — |
| `readOnly` | — | lý do tắt ghi hoặc null |

Bỏ `onCopy`, `onAsk`, `onColor`.

**MoreMenu** (`src/annotations/MoreMenu.tsx`): `items: { key, label, onSelect, disabledReason? }[]`; trạng thái cục bộ `open`, mục đang trỏ tới. Không lưu.
