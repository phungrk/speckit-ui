# Data Model: Hộp chọn chữ một nút "Comment"

Không có thay đổi dữ liệu: `Highlight`, `highlights.json` (`version: 1`) và giá trị màu `y|b|p|o|n` giữ nguyên (spec 012 data-model). Không có loại ghi mới.

## Mô hình giao diện

**ToolbarState** (`src/annotations/Toolbar.tsx`): vẫn có `mode: 'new' | 'edit'`, `id?`, `text`, vị trí; bỏ `color` vì hộp không còn hiển thị màu hiện tại. `mode: 'edit'` nay chỉ có nghĩa "thêm lời vào highlight chỉ có màu của mình".

**HighlightActions** (`src/annotations/highlightActions.ts`): chữ ký dùng chung cho thẻ và tab.

| Hành động | Ai dùng | Ghi? |
|---|---|---|
| `onCopy(id)` | mọi người xem | Không |
| `onAsk(id)` | mọi người xem | Không (mở Copilot) |
| `onColor(id, color)` | tác giả | Có: cập nhật highlight |
| `onEdit(id)` | tác giả, chỉ ở thẻ | Có |
| `onDelete(id)` | tác giả | Có: xoá highlight |
| `canWrite(h)` | để bật/tắt nút | — (tác giả và không bị `readOnly`) |

**Trạng thái cục bộ của tab**: `openId: string | null`, mục chỉ-màu đang mở hàng hành động; `confirmId: string | null` khi chờ xác nhận xoá. Không lưu.
