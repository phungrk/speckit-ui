# Research: Bố cục mục nhận xét (017)

## R1. Hàng emoji gốc thuộc Card, không thuộc Thread
- **Decision**: `Card` dựng hàng emoji (`ReactionBar`) ngay sau `.sk-cm-row` trong `.sk-cm-item`, qua prop `chips` do rail lấy từ `chipsFor(card, open)` của `Annotator`. `Thread` không còn `ReactionBar` của nhận xét gốc (replies giữ nguyên, đã dưới nội dung của từng trả lời).
- **Rationale**: Thread chỉ dựng khi thẻ mở; muốn thẻ đóng có emoji thì hàng phải nằm ngoài thread. Đặt trong `.sk-cm-item` để hover của 015 phủ cả hàng.
- **Alternatives**: Nhân đôi `ReactionBar` ở Card và Thread: hai nơi cùng vẽ một thứ.

## R2. Thẻ đóng có emoji được đo
- **Decision**: `measured(card) = mở || có emoji || màn hình cảm ứng`. Thẻ `measured` không đặt `height` cố định và báo chiều cao qua `onMeasure` (cơ chế của thẻ mở). Thẻ không emoji trên màn hình có hover giữ `height: 124` nên ảnh demo không đổi. Nhóm Outdated (xếp tĩnh) cộng ước lượng cho thẻ có emoji/cảm ứng vào `outdatedHeight`.
- **Rationale**: FR-004, SC-004. Rail đã đo thẻ mở, mở rộng điều kiện là nhỏ nhất; không phải ước lượng số dòng chữ.
- **Alternatives**: Hằng số chiều cao thêm cho thẻ có emoji: sai khi emoji xuống dòng hoặc chạm 44 px. Đo mọi thẻ: đổi chiều cao thẻ đóng không emoji, vỡ ảnh demo.

## R3. Ba chấm trên thẻ đóng chừa chỗ cố định
- **Decision**: `MoreMenu` dựng khi `card.mine && actions` (không cần `selected`), ở cuối `.sk-cm-who` sau giờ, luôn chiếm chỗ (opacity 0 lúc nghỉ, như 015). Tiêu đề thẻ đóng của mình: tên cắt bớt (`min-width: 0`, ellipsis) khi hẹp để không xuống dòng.
- **Rationale**: Clarifications Q1 A; cùng vị trí với thẻ mở; hover không làm dịch gì.
- **Alternatives**: Đè lên giờ khi hover (B): bị loại ở Q1.

## R4. Edit, Delete từ thẻ đóng
- **Decision**: Edit gọi `actions.onEdit(id)`: thẻ vào soạn tại chỗ vì `open = selected || editing.id === id` (không cần chọn thẻ). Delete gọi `onSelect(id)` rồi `setConfirming(true)`: thẻ mở ra và hiện câu hỏi xác nhận; hiệu ứng `if (!selected) setConfirming(false)` chỉ chạy khi `selected` đổi nên không xoá cờ vừa đặt. Keep và Delete như thẻ mở.
- **Rationale**: Dùng đúng luồng có sẵn, không đường ghi mới (FR-006).
- **Alternatives**: Hộp xác nhận riêng cho thẻ đóng: thêm giao diện chỉ để tránh một lần chọn thẻ.

## R5. Thứ tự Tab của thẻ đóng
- **Decision**: Trên thẻ đóng, ba chấm, nút emoji và các viên emoji có `tabIndex=-1` (prop `tabbable={false}`); thẻ đóng vẫn vào được bằng bàn phím như hiện nay (mũi tên chọn thẻ, Enter mở), và khi mở thì các nút vào thứ tự Tab. Chuột và cảm ứng dùng trực tiếp.
- **Rationale**: Giữ thứ tự Tab của rail ngắn (rail có thể hàng chục thẻ); bàn phím vẫn làm được mọi việc (FR-010, SC-006) qua mở thẻ trước.
- **Alternatives**: Mọi nút ở thẻ đóng vào Tab: hàng chục điểm dừng vô ích.

## R6. Chặn chọn thẻ khi bấm nút
- **Decision**: Hàng emoji bọc trong thẻ chặn `click` và `keydown` lên thẻ/rail như `Thread` (bấm viên emoji không mở thẻ, ↑/↓ không đổi thẻ chọn). `EmojiButton` và `MoreMenu` đã chặn sẵn (015, 014).
- **Rationale**: FR-003, FR-007.

## R7. Cảm ứng
- **Decision**: Khối `@media (hover: none), (pointer: coarse)` của 015 bỏ giới hạn `.sk-cm-card.on` cho nút emoji, để thẻ đóng cũng hiện sẵn; hàng ở thẻ đóng có `min-height: 52px` và `padding-right: 60px` như thẻ mở; thẻ đóng trên cảm ứng được đo (R2). Ba chấm đã hiện sẵn từ 015.
- **Rationale**: FR-009, SC-005.

## R8. Tiêu đề thẻ đóng
- **Decision**: `.sk-cm-count` chỉ còn "N reply/replies"; chuỗi emoji bỏ (hàng emoji dưới nội dung thay thế).
- **Rationale**: FR-002; tránh hiển thị cùng thông tin hai chỗ.

## R9. Ghi chú
- `near()` của rail dựng thẻ theo `c.height` (124), không theo chiều cao đo; thẻ có emoji có thể được dựng sớm hoặc muộn một chút, nhưng vùng đệm là một màn hình nên không thấy được. Không đổi.
