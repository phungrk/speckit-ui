# Data Model: Hiệu ứng hover (015)

Không có thay đổi dữ liệu. `Highlight`, `Reply`, `Reaction`, `highlights.json` và mọi loại thay đổi (gồm `react`) giữ nguyên (spec 011, 014).

## Mô hình giao diện

**Khối mục (`.sk-cm-item`)**: một mục của thẻ đang mở: nhận xét gốc (tiêu đề + trích + nội dung) hoặc một trả lời (tiêu đề + nội dung). Các mục là anh em, không lồng nhau, nên tại mọi lúc chỉ một mục ở trạng thái `:hover`.

**Hàng nội dung (`.sk-cm-row`)**: dòng nội dung của mục, chỗ chứa nút nổi; có `padding-right` cố định chừa chỗ cho nút.

**EmojiButton**: `list: Reaction[] | undefined`, `me`, `readOnly`, `what`, `onToggle(emoji, on)`. Trạng thái cục bộ: `open`. Không lưu.

**usePopover**: `{ open, buttonRef, width, height }` → `{ style, listRef }`. Không lưu.
