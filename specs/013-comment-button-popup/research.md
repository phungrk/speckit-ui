# Research: Hộp chọn chữ một nút "Comment"

## R1. Bề mặt và màu của hộp
- **Decision**: Nền `var(--color-bg)`, chữ `var(--color-text)`, viền 1 px `var(--color-text)`, bóng `var(--shadow-md)`, không bo góc. Hộp đi theo nền đọc (White, Sepia, Green, Dark) vì các nền đó ghi đè token ở `:root`.
- **Rationale**: Nguyên tắc IV cấm màu mới; bảng nền đọc đã có test tương phản chữ/nền ≥ 4,5:1 (spec 010), nên hộp thừa hưởng bảo đảm đó (SC-004). Bóng nhẹ có sẵn trong Modernist (`--shadow-md`).
- **Alternatives**: Giữ `--hl-ink/--hl-paper` (thanh tối): trái yêu cầu. Thêm màu riêng: trái IV.

## R2. Bề rộng và một dòng
- **Decision**: Hộp rộng theo nội dung (`width: max-content`), nút `white-space: nowrap`, ước lượng 132 px khi dùng để chặn trong màn hình; khi có thông báo (lý do tắt, lỗi) hộp rộng tối đa `min(260, viewport − 16)` và thông báo xuống dòng bên dưới nút.
- **Rationale**: Lỗi ở ảnh chụp do nút co lại trong thanh 380 px chia cho nhiều nút. Một nút nowrap không xuống dòng ở 320 px (hộp ≈ 132 px).
- **Alternatives**: Rộng cố định 380: lại thừa chỗ trống.

## R3. Vị trí
- **Decision**: Giữ quy tắc của 010: trên vùng chọn 44 px (hộp thấp hơn thanh cũ), dưới vùng chọn 10 px khi không đủ chỗ, kẹp trong màn hình 8 px. `toolbarPosition` nhận bề rộng hộp.
- **Rationale**: Không đổi hành vi; chỉ tham số hoá bề rộng để kẹp đúng.

## R4. Hành động của thẻ
- **Decision**: Thẻ đang chọn có hàng "Copy · Ask" cho mọi người xem (kể cả người chỉ có quyền đọc); hàng đổi màu, Sửa, Xoá giữ cho tác giả như 012.
- **Rationale**: Copy và Ask không ghi gì nên không phụ thuộc quyền ghi (010 FR-011: người khác được Copy và Ask). Khớp FR-008 và User Story 3 kịch bản 3, 4.

## R5. Hành động cho highlight chỉ có màu ở tab Highlights
- **Decision**: Bấm một mục chỉ có màu ở tab thì cuộn tới đoạn chữ (như hiện nay) và mở hàng hành động ngay dưới mục đó: ô màu, Copy, Ask, Xoá (xác nhận hai bước như thẻ) cho tác giả; chỉ Copy và Ask cho người khác. Trạng thái "đang mở hàng hành động" là state cục bộ của tab. Annotator xuất hành động qua một prop `onActions` gọi một lần khi mount, dùng hàm ổn định (đọc state mới nhất qua ref); shell giữ nó trong `useState` rồi đưa cho tab.
- **Rationale**: Lưu, xác nhận commit, Ask đều đang ở `Annotator`. Cầu nối nhỏ hơn việc chuyển cả logic lên ba shell. Mục có ghi chú không cần hàng này vì đã có thẻ.
- **Alternatives**: Cho highlight chỉ có màu một thẻ trong rail: đổi mô hình 012 (chỉ nhận xét có thẻ, FR-008 của 012). Context React toàn cục: thêm cơ chế mà shell đã tự làm được.

## R6. Không còn tạo highlight chỉ có màu từ vùng chọn
- **Decision**: Bỏ `add(color)` và `onColor` của hộp; mọi highlight mới là nhận xét `n`. Dữ liệu chỉ-màu cũ vẫn đọc, hiển thị và sửa được (FR-009, FR-010).
- **Rationale**: Theo Q1 A. Màu đặt sau trên thẻ.

## R7. Highlight của người khác và nhận xét
- **Decision**: `openFor` (mở hộp khi bấm vào văn bản) chỉ chạy khi highlight chỉ có màu **và** do chính người dùng tạo; nhận xét có ghi chú đã chọn thẻ như 012; highlight chỉ-màu của người khác không làm gì.
- **Rationale**: FR-009; hộp không còn gì để cho họ ngoài "Comment", mà họ không thêm lời vào highlight của người khác (010 FR-011).

## R8. Nhãn và tài liệu
- **Decision**: Nhãn hiển thị và `aria-label` đều là "Comment". Đổi "Add comment" thành "Comment" trong code, README, spec/contract 012 ở chỗ nói về nút này; test cập nhật theo. Lịch sử `analysis.md` và `tasks.md` của 012 giữ nguyên.
- **Rationale**: FR-006, FR-007. Phím tắt Ctrl/Cmd+Alt+M không đổi.
