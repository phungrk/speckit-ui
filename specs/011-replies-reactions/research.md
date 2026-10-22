# Research: Trả lời và thả emoji

## R1. Tương thích file: `version` 1 hay 2
- **Decision**: Trường mới (`replies`, `reactions`) là tuỳ chọn. `serializeHighlights` ghi `version: 1` nếu không có highlight nào có trả lời hoặc emoji, `version: 2` nếu có. `parseHighlights` nhận cả hai. Bản app cũ gặp `version: 2` báo "unknown format; fix the file first" và không ghi (010 FR-014).
- **Rationale**: Hiện `serializeHighlights` liệt kê từng trường, nên bản cũ lưu lại sẽ làm rơi trả lời/emoji mà không báo gì. Một file chưa dùng tính năng mới giữ `version: 1` để bản cũ vẫn dùng được.
- **Alternatives**: Luôn nâng lên 2: làm hỏng mọi file hiện có với app cũ. Giữ 1 và bảo bản cũ "bảo toàn trường lạ": không sửa được bản cũ đã phát hành.

## R2. Hình dạng dữ liệu
- **Decision**: `Highlight.replies?: Reply[]` với `Reply = { id, author, createdAt, editedAt?, text, reactions?: Reaction[] }`; `Highlight.reactions?: Reaction[]`; `Reaction = { emoji, author }`, một phần tử cho mỗi cặp (emoji, người). Mặc định rỗng.
- **Rationale**: Danh sách phẳng khớp việc gộp theo (emoji, người), đếm bằng `filter`, và ai đã thả hiện được. Tên người dùng cùng kiểu `HighlightAuthor` như 010 (tài khoản, tên local, người mẫu).
- **Alternatives**: Bản đồ emoji → danh sách người: tiện đếm nhưng khó gộp và khó kiểm hợp lệ từng phần tử.

## R3. Bốn loại thay đổi mới
- **Decision**: `reply` (thêm), `reply-edit`, `reply-remove`, `react` (đặt hoặc gỡ: `on: boolean`, không phải bật tắt). Đều nhắm tới `id` của highlight, trả lời nhắm thêm `replyId`.
- **Rationale**: Gộp theo mã, thử lại an toàn (đặt `on` hai lần không đổi, thêm trả lời cùng `id` hai lần bỏ qua lần hai), và mỗi loại có quyền riêng. `by` lấy từ người đang lưu, không tin tác giả do client gửi (như `add` hiện nay).
- **Alternatives**: `update` mở rộng: phải bỏ quy tắc "chỉ tác giả" của 010 FR-011 cho mọi `update`, làm lỏng nhận xét gốc.

## R4. Quyền
- **Decision**: `reply` và `react`: bất kỳ người nào lưu được (quyền ghi nội dung repo, 012). `reply-edit` và `reply-remove`: chỉ `reply.author` trùng `by` (403 nếu khác). `remove` của nhận xét gốc: vẫn chỉ tác giả (010), xoá kèm cả trả lời và emoji. Emoji chỉ gỡ được của chính mình (đặt/gỡ luôn áp cho `by`).
- **Rationale**: Khớp FR-003, FR-007, FR-010; không đường lưu thứ hai.

## R5. Bộ emoji và kiểm tra khi đọc
- **Decision**: `['👍', '❤️', '😄', '🎉', '😕', '👀']` trong một hằng ở `server/highlightsFile.ts`, dùng chung cho UI. Khi đọc, phản ứng ngoài bộ hoặc sai hình dạng bị bỏ qua (không tính vào lỗi "không đọc được"), trả lời sai hình dạng thì bỏ qua. Khi ghi `react` với emoji ngoài bộ: 400.
- **Rationale**: FR-013; chặn nội dung tuỳ ý trong trường emoji (constitution II). Trả lời hỏng bị bỏ qua nhưng sẽ rơi mất ở lần ghi kế tiếp, nên được tính vào cảnh báo như highlight hỏng (đếm `dropped`, giữ cơ chế chặn ghi của 010 FR-014).
- **Alternatives**: Cho mọi emoji: cần bộ chọn đầy đủ, ngoài phạm vi (Non-goals).

## R6. Xoá nhận xét gốc có trả lời
- **Decision**: UI xác nhận có chữ nói rõ số trả lời bị xoá; `remove` của 010 xoá cả. Không có xoá riêng cả luồng.
- **Rationale**: FR-004; không đổi logic ghi.

## R7. Cập nhật `updatedAt` và badge "New comments"
- **Decision**: Mỗi thay đổi trả lời/emoji đặt `updatedAt` của highlight gốc bằng giờ lưu. `diffIncoming` (012) vốn so `updatedAt`, nên trả lời mới của người khác làm hiện "New comments"; không cần mã mới cho badge.
- **Rationale**: Tái dùng cơ chế kiểm tra định kỳ của 012 (SC-001). Hệ quả: người thả emoji lên nhận xét của bạn cũng làm badge hiện; chấp nhận, vì đó là thay đổi người đọc muốn thấy.
- **Alternatives**: Ngày riêng `threadUpdatedAt`: thêm trường mà không đổi trải nghiệm.

## R8. Trạng thái đang gửi
- **Decision**: Mỗi trả lời mới có mã riêng và dùng làm khoá trong `reducePending` (Sending / Saved / Failed + Retry), hiện ngay dưới trả lời đó; chỉnh `changeId` để `reply`/`reply-edit`/`reply-remove` dùng `replyId`. Emoji lạc quan: đổi ngay, hoàn lại và báo lỗi nếu lưu thất bại.
- **Rationale**: Một commit mỗi lần bấm sẽ chậm; trả lời cần Retry không tạo bản sao (khoá bằng mã cố định như 012 R5).

## R9. Chỗ hiển thị
- **Decision**: Thẻ đóng chỉ thêm một dòng đếm nhỏ ("3 replies") khi có trả lời, trong chiều cao đóng sẵn có (`CLOSED_CARD_HEIGHT`); thẻ mở có danh sách, ô trả lời và dải emoji. Sheet ở bố cục hẹp dùng cùng `Thread`. `CommentRail` nhận `threadFor(card)`.
- **Rationale**: Layout của 012 giữ nguyên với thẻ đóng; thẻ mở đã đo chiều cao (`onMeasure`), nên tự giãn theo trả lời.

## R10. Bản nháp trả lời
- **Decision**: Bản nháp theo mã nhận xét ở state của `Annotator` (không lưu), giữ khi đổi thẻ, hỏi trước khi bỏ nếu có chữ (như 012). Ctrl/Cmd+Enter gửi, Escape thu ô trả lời.
- **Rationale**: Cùng hành vi hộp soạn của 012 (FR-005), người dùng đã quen.
