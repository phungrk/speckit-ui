# Research: Thẻ nhận xét gọn (014)

## R1. Màu của nhận xét mới
- **Decision**: `submitDraft` lưu `color: 'o'`. Thêm ghi chú vào highlight chỉ-màu (013) giữ màu có sẵn (không đổi sang `o`). Không còn đường nào đổi màu.
- **Rationale**: FR-001, FR-002, câu hỏi 1 A (không ghi đè dữ liệu cũ). `o` đã hợp lệ ở file và đã có token `--hl-o`, `--hl-o-solid`, `--hl-o-text`, đoạn tô `sk-o` (010), nên không cần màu hay định dạng mới.
- **Alternatives**: Đổi màu cũ sang `o` khi mở: ghi vào file không ai yêu cầu, trái câu hỏi 1.

## R2. Gỡ chức năng chọn màu
- **Decision**: Xoá hàng ô màu và dòng nhãn màu (`.sk-cm-meta`) khỏi `Card`, ô màu và chip lọc khỏi tab, `onColor` khỏi `HighlightActions`. Giữ loại thay đổi `update` có `color` trong `applyChange` (đường ghi chung, test của 010); chỉ giao diện không gọi.
- **Rationale**: Không đổi đường ghi, không phá file/test cũ; spec chỉ nói giao diện.
- **Alternatives**: Gỡ `color` khỏi `update`: đổi hợp đồng ghi mà không có lợi.

## R3. Nút ba chấm và menu
- **Decision**: Thành phần `MoreMenu({ label, items, readOnly })`: nút `aria-haspopup="menu"`, `aria-expanded`, nhãn "More actions"; menu `role="menu"` với `role="menuitem"`; mở bằng Enter/Space/chuột, mũi tên lên/xuống di chuyển và quay vòng, Enter chọn, Escape đóng và trả tiêu điểm về nút, bấm ngoài đóng, Tab đóng. Mở menu này đóng menu kia (một menu mở: đăng ký qua state ở cha hoặc sự kiện đóng toàn cục). Mục tắt dùng `aria-disabled` kèm `title` là lý do.
- **Rationale**: FR-004–FR-008; khuôn mẫu menu WAI-ARIA gọn, không thêm dependency.
- **Alternatives**: `<details>`: không quản lý được tiêu điểm và Escape đúng ý.

## R4. Ai thấy nút
- **Decision**: Chỉ nhận xét/trả lời của chính người dùng (`mine`) có nút; mục của người khác không có. Người chỉ đọc vẫn thấy nút trên mục mình viết, mở ra thì Edit/Delete tắt kèm lý do (FR-008). Chỉ thẻ đang chọn có nút (thẻ đóng không).
- **Rationale**: Khớp 010 FR-011 và 011 FR-003; thẻ đóng gọn.

## R5. Menu và Delete
- **Decision**: Chọn Delete không xoá ngay mà hiện dòng xác nhận (như hiện nay: "Delete this comment and its N replies?" / "Delete this reply?" với Keep và Delete) ngay dưới nội dung của mục; Edit chuyển mục sang soạn tại chỗ như hiện có và ẩn nút ba chấm của mục đó cho tới Save/Cancel.
- **Rationale**: Giữ hành vi và test của 012/011; chỉ đổi chỗ khởi động.

## R6. Ô trả lời
- **Decision**: Hộp trả lời giữ góc vuông (constitution IV cấm bo góc) dù ảnh tham chiếu bo tròn; Cancel và Reply hiện khi hộp có tiêu điểm hoặc có chữ (`:focus-within` + trạng thái khi có chữ), ẩn khi nghỉ. Cancel khi có chữ vẫn hỏi bỏ; không chữ thì bỏ tiêu điểm.
- **Rationale**: FR-010; ghi vào mô tả PR như phần chênh nhỏ với ảnh tham chiếu.

## R7. Tab Highlights và "Before you approve"
- **Decision**: Bỏ ô lọc theo màu và các chữ nhãn màu ở `HighlightsPanel`; giữ dải màu nhỏ (`.sk-hlp-bar hl-{màu}-solid`) bên trái mỗi mục để nhận xét cũ còn phân biệt được; mục chỉ-màu của mình mở ra chỉ có **Delete** (hai bước). `briefNotes` xếp theo `createdAt` (bỏ `briefRank`).
- **Rationale**: Câu hỏi 2 A, FR-013. Spec 012 FR-003 (thứ tự Issue trước) bị thay thế; ghi ở mô tả PR.
- **Alternatives**: Bỏ luôn dải màu: nhận xét cũ mất dấu hiệu duy nhất để phân biệt.

## R8. Bỏ Ask: dọn đường dẫn
- **Decision**: Xoá prop `onAsk` của `Annotator` và các chỗ truyền ở `App`, `LiveWorkspace`, `LocalWorkspace` (App còn `onAsk` riêng của `GateBrief`, giữ). `navigator.clipboard` ở local (`onAsk`) bỏ cùng.
- **Rationale**: Không để lại mã chết (constitution VII).
