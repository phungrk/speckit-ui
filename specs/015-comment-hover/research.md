# Research: Hiệu ứng hover (015)

## R1. Hover bằng CSS, không bằng trạng thái React
- **Decision**: Mỗi mục là một khối `.sk-cm-item` (tiêu đề + nội dung). Hiển thị nút nổi và ba chấm bằng CSS: `.sk-cm-item:hover`, `.sk-cm-item:focus-within`, và trạng thái đang mở (`[aria-expanded="true"]`) cho nút. Nền đậm chỉ áp lên dòng nội dung (`.sk-cm-row`) khi cha `:hover` hoặc `:focus-within`.
- **Rationale**: Không render lại thẻ khi rê chuột (rail có thể hàng trăm thẻ); luôn đúng "không quá một mục" vì các mục là anh em, không lồng nhau; bàn phím có cùng hiệu ứng qua `:focus-within` (FR-002).
- **Alternatives**: State `hoverId` ở `Annotator`: render lại mỗi lần chuột di chuyển, phức tạp hơn mà không có lợi.

## R2. Chừa chỗ cho nút, không nhảy bố cục
- **Decision**: Hàng nội dung luôn có `padding-right` đủ chỗ cho nút (khoảng 36 px) ở thẻ đang mở, nút đặt `position: absolute` ở mép phải, canh giữa theo chiều cao dòng (hoặc dòng đầu khi nhiều dòng). Nút ẩn bằng `opacity: 0` + `pointer-events: none`, hiện bằng `opacity: 1`, không bằng `display`.
- **Rationale**: FR-004, SC-003: chiều cao thẻ và vị trí thẻ không đổi khi hover (đo bằng 0 px). Chữ luôn hẹp hơn một chút, không đổi theo hover.
- **Alternatives**: Thêm chỗ chỉ khi hover: làm chữ xuống dòng khác đi, nhảy chiều cao.

## R3. Nút ba chấm: ẩn khi nghỉ bằng opacity, không bằng gỡ khỏi DOM
- **Decision**: `MoreMenu` vẫn dựng như 014 (để Tab tới được); CSS đặt `opacity: 0` lúc nghỉ và `1` khi `.sk-cm-item:hover/:focus-within` hoặc `aria-expanded="true"`. Tab tới nút làm `:focus-within` đúng, nút hiện ra.
- **Rationale**: Clarifications Q1 B (chỉ hiện khi hover/focus); giữ bàn phím dùng được (FR-002, SC-006); menu đang mở giữ nút hiện (FR-008).
- **Alternatives**: Dựng/gỡ theo hover: mất tiêu điểm, không dùng được bằng bàn phím.

## R4. Nút emoji nổi thay nút "+" của 011
- **Decision**: Thành phần `EmojiButton({ list, me, readOnly, what, onToggle })`: nút tròn (`border-radius: 50%`), nền `--color-bg`, bóng `--shadow-md`, biểu tượng mặt cười kèm dấu cộng (SVG nội tuyến, `aria-hidden`), nhãn "Add a reaction to {what}", `aria-haspopup="true"`, `aria-expanded`; bấm mở bộ 6 emoji (đặt cố định theo nút, R5); chọn thì `onToggle(emoji, on)`; tắt kèm lý do khi `readOnly`. `ReactionBar` chỉ còn các viên emoji đã thả (nút vuông, bấm để thả/gỡ phần của mình như 011) và không còn "+" hay bộ chọn.
- **Rationale**: FR-003, FR-005, FR-006; tái dùng `groupReactions` và `onToggle` có sẵn nên đường lưu không đổi.
- **Alternatives**: Giữ "+" thêm nút nổi: hai nút cho một việc.

## R5. Đặt vị trí cố định theo nút: hook dùng chung
- **Decision**: `usePopover(open, buttonRef, { width, height, align })` trả `{ style, listRef }`: tính toạ độ từ `getBoundingClientRect` của nút (dưới nút, canh mép phải, lật lên khi hết chỗ, kẹp 8 px trong màn hình), đóng khi bấm ngoài, đổi cỡ, cuộn (bỏ qua 400 ms đầu như 014), và khi một popover khác mở (cùng sự kiện `OPENED`). `MoreMenu` đổi sang dùng hook này; hành vi bàn phím của menu giữ nguyên.
- **Rationale**: Cả hai popover nằm trong thẻ/sheet có `overflow` nên phải `position: fixed`; một nơi duy nhất cho phần dễ sai (cuộn, lật lên, một cái mở một lúc).

## R6. Ngoại lệ hình tròn và constitution
- **Decision**: Sửa nguyên tắc IV bằng `/speckit-constitution` lên 1.4.2: giữ "không bo góc" và nêu ngoại lệ: nút emoji nổi của thẻ nhận xét (specs/015) hình tròn, qua token, một phần tử. Các chỉ báo radio có sẵn của design system (`border-radius: 50%` trong `modernist.css`) không đổi. Test CSS kiểm: trong khối CSS của spec này chỉ có đúng một `border-radius`, và là của `.sk-cm-float`.
- **Rationale**: Q2 A; luật được viết lại cho khớp, không lặng lẽ vi phạm.

## R7. Thiết bị không có hover
- **Decision**: `@media (hover: none), (pointer: coarse)`: nút emoji và ba chấm luôn `opacity: 1` và `pointer-events: auto` ở thẻ đang mở; vùng chạm 44 px (nút ba chấm đã có từ 014; nút emoji thêm). Nền hover không áp (không có hover).
- **Rationale**: FR-009, SC-005. `(hover: none)` bắt điện thoại/máy tính bảng; `(pointer: coarse)` giữ 014 đã dùng.

## R8. Trợ năng và chuyển động
- **Decision**: Nút nổi có nhãn, `:focus-visible` theo hệ thống, hiện khi `:focus-within`; Escape đóng bộ emoji và trả tiêu điểm về nút; chuyển `opacity` ngắn chỉ khi `prefers-reduced-motion: no-preference`. Nền đậm tính bằng `color-mix(in srgb, var(--color-text) 8%, transparent)` như các hover khác của dự án.
- **Rationale**: FR-010, SC-006; cùng cách làm của 013, 014.
