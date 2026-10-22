# Contract: hover trên thẻ nhận xét (015)

## Mục và hàng

- Chỉ ở **thẻ đang mở**. Nhận xét gốc và mỗi trả lời là một `.sk-cm-item`; nội dung nằm trong `.sk-cm-row` có `padding-right` cố định (chừa chỗ cho nút nổi) ở mọi lúc.
- Hover hoặc `:focus-within` trên mục: nền `.sk-cm-row` đậm hơn (`color-mix(in srgb, var(--color-text) 8%, transparent)`). Không quá một mục cùng lúc. Mục đang soạn tại chỗ (Edit) không có hàng này.

## Nút emoji nổi (`EmojiButton`, class `.sk-cm-float`)

- Vị trí: mép phải của `.sk-cm-row`, canh giữa theo chiều cao dòng (dòng đầu nếu nội dung nhiều dòng). `position: absolute`, không làm đổi chiều cao hay bố cục.
- Hình dạng: tròn (`border-radius: 50%`, ngoại lệ của constitution 1.4.2), nền `var(--color-bg)`, bóng `var(--shadow-md)`, viền 1 px `var(--color-divider)`; biểu tượng mặt cười kèm dấu cộng (SVG, `aria-hidden`).
- Ẩn lúc nghỉ bằng `opacity: 0` và `pointer-events: none`; hiện khi `.sk-cm-item:hover`, `.sk-cm-item:focus-within` hoặc khi bộ emoji đang mở (`aria-expanded="true"`).
- Nút: `type="button"`, nhãn `Add a reaction to {this comment | the reply by NAME}`, `aria-haspopup="true"`, `aria-expanded`. Chỉ đọc: `aria-disabled="true"` và `title` là lý do (012).
- Bấm: mở bộ 6 emoji (`role="group"`, mỗi nút `aria-label="React with 👍"` hoặc `Remove 👍` nếu đã thả, `aria-pressed`), đặt cố định theo nút (dưới, canh mép phải, lật lên khi hết chỗ, trong màn hình). Chọn: gọi `onToggle(emoji, on)` rồi đóng. Escape hoặc bấm ngoài đóng, tiêu điểm về nút. Mở bộ này đóng menu ba chấm đang mở và ngược lại.

## Viên emoji đã thả (`ReactionBar`)

Chỉ còn các viên đã có (nút vuông: emoji + số, `aria-pressed`, `title` tên người thả); bấm thả/gỡ phần của mình như 011. Không còn nút "+" và bộ chọn trong thanh này.

## Nút ba chấm (`MoreMenu`, 014)

Chỉ ở mục của mình. Ẩn lúc nghỉ (`opacity: 0`), hiện khi `.sk-cm-item:hover`, `:focus-within`, hoặc `aria-expanded="true"` (menu đang mở giữ nút hiện dù chuột đã rời). Vẫn là một nút trong thứ tự Tab; Tab tới nút làm nó hiện.

## Thiết bị không có hover

`@media (hover: none), (pointer: coarse)`: nút nổi và ba chấm luôn hiện ở thẻ đang mở; nút nổi và ba chấm cao/rộng ≥ 44 px; không áp nền hover.

## Chuyển động và giao diện trang

Chuyển `opacity` ≤ 120 ms chỉ khi `prefers-reduced-motion: no-preference`. Màu chỉ qua token; nút nổi đọc được ở White, Sepia, Green, Dark (trên nền tối, nền nút là `--color-bg` tối, tách khỏi thẻ bằng viền và bóng).
