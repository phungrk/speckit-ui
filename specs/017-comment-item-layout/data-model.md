# Data Model: Bố cục mục nhận xét (017)

Không đổi dữ liệu: không trường, thực thể, khuôn dạng hay quyền mới. `highlights.json` và các thay đổi `react`, `edit`, `delete` của 010–014 giữ nguyên.

## Mô hình giao diện

| Khái niệm | Nguồn | Quy tắc |
|---|---|---|
| Hàng emoji của nhận xét | `highlight.reactions` qua `groupReactions` | Hiện dưới `.sk-cm-row` của mọi thẻ khi có ít nhất một emoji; không hàng trống. |
| `measured(card)` | thẻ mở, đang soạn, có emoji, hoặc màn hình cảm ứng | Thẻ `measured` không có `height` cố định; chiều cao báo qua `onMeasure`. |
| Ba chấm của thẻ đóng | `card.mine && actions` | Luôn chiếm chỗ; hiện bằng hover/focus (015). |

## Chuyển trạng thái

- Delete từ thẻ đóng: đóng → (chọn thẻ, `confirming = true`) → mở có xác nhận → Keep (về mở, `confirming=false`) hoặc Delete (xoá).
- Edit từ thẻ đóng: đóng → soạn tại chỗ (`editing.id`) → Save/Cancel về đóng.
