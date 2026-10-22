# Tasks: Hiệu ứng hover trên thẻ nhận xét (nút emoji nổi, ba chấm)

**Input**: `specs/015-comment-hover/` (spec.md, plan.md, research.md, data-model.md, contracts/hover-ui.md, quickstart.md)

**Tests**: Có. Constitution V; một số test của 011 và 014 phải cập nhật vì "+" và bộ chọn rời khỏi `ReactionBar`. Dữ liệu tự tạo, GitHub giả.

**Format**: `- [ ] T### [P?] [US?] Mô tả kèm đường dẫn`. `[P]` = làm song song được (file khác, không phụ thuộc việc chưa xong).

**Thứ tự quan trọng**: sửa constitution 1.4.2 (T002) phải xong **trước** khi có nút tròn (T010) và cùng PR; ba chấm vẫn hiện như 014 cho tới US3 (T013) để không commit nào đổi thời điểm hiện của nó khi chưa có hover; không đổi dữ liệu hay đường ghi.

## Phase 1: Setup

- [X] T001 Baseline: `npm ci`; `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` đều qua. Chụp ảnh "trước" (scratchpad, ngoài repo): demo 1440×900 và 924×540 (màn hình chính, hộp thoại New spec), thẻ đang mở có một nhận xét và một trả lời lúc nghỉ và lúc hover ở 1440×900 và 390; đo và ghi chiều cao thẻ.

## Phase 2: Foundational — luật và popover dùng chung (chặn US2)

- [X] T002 Sửa constitution lên 1.4.2 (patch) bằng `/speckit-constitution` (nhật ký sửa đổi, Sync Impact Report, Last Amended): nguyên tắc IV giữ "không bo góc" và thêm ngoại lệ duy nhất: nút emoji nổi của thẻ nhận xét (specs/015) hình tròn, qua token; các chỉ báo radio có sẵn của design system (`border-radius: 50%` trong `modernist.css`) không đổi; cập nhật `CLAUDE.md` (v1.4.1 → v1.4.2). Cùng PR với nút tròn.
- [X] T003 Tạo `src/annotations/usePopover.ts`: hàm thuần `placePopover(button: DOMRect, size: {width, height}, viewport, align)` (dưới nút, canh mép phải, lật lên khi hết chỗ, kẹp 8 px) và hook `usePopover(open, buttonRef, size)` trả `{ style, listRef }` (đặt vị trí cố định theo nút; đóng khi bấm ngoài, đổi cỡ, cuộn sau 400 ms đầu; sự kiện `sk-more-menu-opened` để một popover mở một lúc, đổi tên thành `sk-popover-opened`). Đổi `src/annotations/MoreMenu.tsx` sang dùng hook này, hành vi bàn phím giữ nguyên; `tests/moreMenu.test.tsx` vẫn qua.
- [X] T004 [P] Test `tests/placePopover.test.ts`: dưới nút khi đủ chỗ, lật lên khi hết chỗ, kẹp trái/phải ở 320 px, canh mép phải của nút, bề rộng lớn hơn màn hình.

**Checkpoint**: `npm test` và `npm run typecheck` qua; UI chưa đổi.

## Phase 3: User Story 1 — Mục đang hover đậm hơn (P1) 🎯 MVP

**Mục tiêu**: mỗi mục là một khối có hàng nội dung; hover hoặc tiêu điểm làm đậm hàng, không nhảy bố cục.

**Kiểm độc lập**: quickstart 1, 4, 10.

- [X] T005 [US1] Trong `src/annotations/CommentRail.tsx` (`Card`): bọc tiêu đề, trích và nội dung của nhận xét gốc trong `.sk-cm-item`, nội dung trong `.sk-cm-row` (`<div className="sk-cm-row"><p className="sk-cm-note">…</p>{rowTool}</div>`, nhận prop `rowTool?: ReactNode` và `rowToolFor?: (card) => ReactNode` ở `CommentRail`); trong `src/annotations/Thread.tsx`: mỗi trả lời là `.sk-cm-item` với nội dung trong `.sk-cm-row`; mục đang soạn tại chỗ (Edit) không có `.sk-cm-row`. Trong `src/styles/reader.css`: ở `.sk-cm-card.on` `.sk-cm-row` có `padding-right` cố định (R2); `.sk-cm-item:hover .sk-cm-row, .sk-cm-item:focus-within .sk-cm-row { background: color-mix(in srgb, var(--color-text) 8%, transparent); }`; thẻ đóng không có luật hover; chuyển nền ≤ 120 ms chỉ khi `prefers-reduced-motion: no-preference`.
- [X] T006 [P] [US1] Test: `tests/hoverCss.test.ts` (đọc `reader.css`: luật hover và `:focus-within` cho `.sk-cm-row`, không màu cứng, hover không đổi `padding`, `height`, `margin`, `border-width`; có `prefers-reduced-motion`), cập nhật `tests/threadMarkup.test.tsx` và `tests/commentRailMarkup.test.tsx` (mỗi mục là `.sk-cm-item` với một `.sk-cm-row`; reply đang sửa không có `.sk-cm-row`; thẻ đóng không có hàng hover).
- [X] T007 [US1] Playwright demo (1920): rê chuột lên nội dung nhận xét rồi từng trả lời: mỗi lúc đúng một dòng đậm, rời thẻ thì không dòng nào; thẻ đóng không hiệu ứng; Tab vào nút trong mục làm hàng đậm; chiều cao thẻ và vị trí các thẻ trước, trong và sau hover chênh 0 px; ghi kết quả vào `quickstart.md`.

**Checkpoint**: US1 chạy độc lập (nút "+" và ba chấm như cũ).

## Phase 4: User Story 2 — Nút emoji tròn nổi ở mép phải (P1)

**Mục tiêu**: nút tròn trắng có bóng, hiện khi hover; bấm mở bộ 6 emoji; thay "+" của 011.

**Kiểm độc lập**: quickstart 2, 3, 7, 8, 11.

- [X] T008 [US2] Tạo `src/annotations/EmojiButton.tsx`: `EmojiButton({ list, me, readOnly, what, onToggle })`: nút `.sk-cm-float` (`type="button"`, `aria-label="Add a reaction to {what}"`, `aria-haspopup="true"`, `aria-expanded`, `aria-disabled` + `title` lý do khi `readOnly`), biểu tượng mặt cười kèm dấu cộng bằng SVG nội tuyến `aria-hidden`; bấm mở bộ 6 emoji (`EMOJI_SET`, `role="group"`, mỗi nút `aria-label="React with 👍"` / `Remove 👍`, `aria-pressed`) đặt bằng `usePopover`; chọn gọi `onToggle(emoji, on)` rồi đóng; Escape đóng và trả tiêu điểm về nút; **chặn truyền phím và click lên thẻ/rail** như `MoreMenu` (nút của nhận xét gốc nằm ngoài `.sk-cm-thread`: click không được kích hoạt `onSelect` của thẻ và cuộn tới đoạn chữ; ↑/↓ không đổi thẻ đang chọn).
- [X] T009 [US2] Trong `src/annotations/Thread.tsx`: `ReactionBar` chỉ còn các viên emoji đã thả (bỏ nút "+" và bộ chọn, bỏ prop `what` nếu thừa); mỗi trả lời đặt `EmojiButton` trong `.sk-cm-row` (`what` = "the reply by NAME", `onToggle` → `onReact(r.id, …)`). Trong `src/annotations/Annotator.tsx`: thêm `.sk-cm-float, .sk-cm-picker` vào ngoại lệ của bộ nghe Escape toàn cục (Escape trong bộ emoji chỉ đóng bộ, không bỏ chọn thẻ; K1); dựng `rowToolFor = c => <EmojiButton … what="this comment" onToggle={(e, on) => react(c.id, undefined, e, on)} />` và truyền cho `CommentRail` và `Card` trong sheet.
- [X] T010 [US2] Trong `src/styles/reader.css`: `.sk-cm-float` (`position: absolute`, mép phải của `.sk-cm-row`, canh giữa theo dòng đầu; `border-radius: 50%` là `border-radius` duy nhất của khối này; nền `var(--color-bg)`, viền `var(--color-divider)`, bóng `var(--shadow-md)`; `opacity: 0` và `pointer-events: none` lúc nghỉ; hiện khi `.sk-cm-item:hover`, `.sk-cm-item:focus-within` hoặc `[aria-expanded="true"]`); bộ chọn cố định (`.sk-cm-picker` dùng `position: fixed`, vuông, `--shadow-md`); `@media (hover: none), (pointer: coarse)`: luôn hiện, 44 px; xoá luật cũ của nút "+" (`.sk-cm-add`) và bộ chọn nằm trong `.sk-cm-react`.
- [X] T011 [P] [US2] Test `tests/emojiButton.test.tsx` (nhãn theo `what`, `aria-haspopup`/`aria-expanded="false"`, SVG `aria-hidden`, `readOnly` → `aria-disabled` và `title`, bộ emoji kết xuất mở có đúng 6 nút với nhãn `React with`/`Remove`) và cập nhật `tests/threadMarkup.test.tsx` (`ReactionBar` không còn "+"; mỗi trả lời có một `EmojiButton`), `tests/moreMenu.test.tsx` (cắt khối CSS của 014 ở dòng chú thích mở đầu khối 015 thay vì đến hết file, để không bắt `border-radius` của nút tròn; T1) và `tests/hoverCss.test.ts` (đúng một `border-radius` trong khối của spec này, thuộc `.sk-cm-float`; `(hover: none)` đặt nút hiện sẵn; không màu cứng).
- [ ] T012 [US2] Playwright demo và GitHub giả: hover → nút tròn ở mép phải, không che chữ (thử một trả lời dài nhiều dòng và một trả lời đang Sending/Failed); click nút không cuộn tới đoạn chữ và không đổi thẻ đang chọn; Escape trong bộ emoji của nhận xét gốc đóng bộ và thẻ vẫn mở; bấm, chọn 👍: viên "👍 1" hiện và lưu một commit `[skip ci]`; chọn lại gỡ; Escape đóng và tiêu điểm về nút; bấm ngoài đóng; mở bộ emoji đóng menu ba chấm đang mở; `push:false` làm nút tắt kèm lý do và các viên emoji đã có vẫn thấy; bộ emoji trong sheet 390 px mở trong màn hình; giả lập cảm ứng: nút hiện sẵn, ≥ 44 px; ghi kết quả vào `quickstart.md`.

**Checkpoint**: US1 + US2 là MVP.

## Phase 5: User Story 3 — Ba chấm chỉ hiện khi hover (P2)

**Mục tiêu**: lúc nghỉ tiêu đề sạch; hover hoặc tiêu điểm hiện ba chấm; menu đang mở giữ nút.

**Kiểm độc lập**: quickstart 5, 6, 8.

- [ ] T013 [US3] Trong `src/styles/reader.css`: `.sk-cm-more` lúc nghỉ `opacity: 0` (vẫn trong thứ tự Tab); hiện (`opacity: 1`) khi `.sk-cm-item:hover`, `.sk-cm-item:focus-within` hoặc `.sk-cm-more[aria-expanded="true"]`; `(hover: none), (pointer: coarse)`: luôn hiện; chuyển `opacity` ngắn chỉ khi `prefers-reduced-motion: no-preference`. Không đổi `MoreMenu.tsx` ngoài việc nằm trong `.sk-cm-item`. Nút vẫn có tên ("More actions") và nằm trong thứ tự Tab dù lúc nghỉ trong suốt: có chủ ý, để bàn phím và trình đọc màn hình dùng được.
- [ ] T014 [P] [US3] Cập nhật `tests/hoverCss.test.ts` (luật ẩn lúc nghỉ, hiện khi hover/focus-within/mở, hiện sẵn khi `(hover: none)`); `tests/commentRailMarkup.test.tsx` và `tests/threadMarkup.test.tsx`: nút ba chấm vẫn là một nút trong DOM (đủ cho bàn phím) và nằm trong `.sk-cm-item` của mục của mình, không có ở mục của người khác.
- [ ] T015 [US3] Playwright demo (vai QA) và GitHub giả: lúc nghỉ không thấy ba chấm (`opacity` 0), hover mục của mình thì thấy; Tab tới nút làm nó hiện và hàng đậm; mở menu rồi rời chuột: nút còn tới khi menu đóng; mục của người khác không có nút; cảm ứng giả lập: nút hiện sẵn, 44 px; ghi kết quả vào `quickstart.md`.

## Phase 6: Polish & cross-cutting

- [ ] T016 [P] Cập nhật `README.md` mục Highlights: hover làm đậm hàng, nút emoji nổi, ba chấm hiện khi hover (hiện sẵn trên cảm ứng); liên kết `specs/015-comment-hover/`.
- [ ] T017 Chụp thẻ lúc hover ở bốn giao diện trang (White, Sepia, Green, Dark) và ở 390 px giả lập cảm ứng; xác nhận nền đậm và nút nổi đọc được và tách khỏi nền; sửa `reader.css` nếu cần; ghi kết quả vào `quickstart.md`.
- [ ] T018 Chạy quickstart 1–14 ở demo và server (GitHub giả); static (`build:pages`) và local chỉ ghi rõ có chạy hay chỉ build; chạy đủ bốn cổng: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`; kiểm không còn mã chết (`.sk-cm-add`, bộ chọn cũ trong `ReactionBar`, tên sự kiện cũ) bằng `tsc` và grep.
- [ ] T019 So ảnh demo với ảnh T001 ở 1440×900 và 924×540 (màn hình chính, hộp thoại New spec): giống hệt; liệt kê trong PR phần chênh (hiệu ứng trên thẻ đang mở, nút tròn).
- [ ] T020 Mô tả PR: nêu `specs/015-comment-hover`, `Closes #<issue theo dõi "Spec 015: …">` (tạo issue nhãn `speckit` nếu chưa có), chế độ bị ảnh hưởng (cả bốn), không đổi dữ liệu hay cách lưu, ba chấm đổi sang hiện khi hover (thay 014), constitution 1.4.2 (ngoại lệ nút tròn). Không tạo PR trước khi người dùng yêu cầu.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6.
- T002 (constitution) trước T010 (nút tròn) và cùng PR; T003 trước T008 (EmojiButton dùng hook).
- Trong Phase 2: T002, T003 song song (file khác nhau); T004 sau T003.
- Trong Phase 3: T005 → T006, T007 (T006 song song được với T007 sau T005).
- Trong Phase 4: T008 → T009 → T010; T011 sau T009–T010; T012 sau cùng. T005 phải xong trước T009 (cần `.sk-cm-row` và `rowTool`).
- Trong Phase 5: T013 → T014, T015.
- Phase 6 sau cùng; T016 và T017 song song được.

## Parallel Example

```text
Phase 2:  T002 (constitution)  ∥  T003 (usePopover + MoreMenu)
Phase 3:  T006 (tests)  ∥  T007 (Playwright)   — sau T005
Polish:   T016 (README)  ∥  T017 (bốn giao diện)
```

## Implementation Strategy

- **MVP**: Phase 1–4 (US1 + US2): hàng đậm khi hover và nút emoji tròn nổi thay "+"; ba chấm vẫn như 014. Dừng và kiểm quickstart 1–4, 7, 8, 10, 11.
- **Tiếp**: US3 (ba chấm chỉ khi hover), rồi Polish.
- Mỗi phase kết thúc bằng một commit; `npm test` và `npm run typecheck` qua trước khi sang phase sau.
