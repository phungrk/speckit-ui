# Tasks: Bố cục mục nhận xét (emoji dưới nội dung, ba chấm khi hover ở mọi thẻ)

**Input**: `specs/017-comment-item-layout/` (spec.md, plan.md, research.md, data-model.md, contracts/item-ui.md, quickstart.md)

**Tests**: Có. Constitution V; test của 011/014/015 phải cập nhật vì hàng emoji gốc rời `Thread`, thẻ đóng có ba chấm và nút emoji. Dữ liệu tự tạo, GitHub giả.

**Format**: `- [ ] T### [P?] [US?] Mô tả kèm đường dẫn`. `[P]` = làm song song được (file khác, không phụ thuộc việc chưa xong).

**Thứ tự quan trọng**: không đổi dữ liệu hay đường ghi; hàng emoji gốc chuyển vào `Card` **và** rời `Thread` trong cùng một commit (không bao giờ có hai hàng); thẻ không emoji, màn hình có hover giữ `height: 124` để ảnh demo không đổi ngoài hai ngoại lệ đã ghi (tiêu đề thẻ đóng của mình, hàng emoji).

## Phase 1: Setup

- [X] T001 Baseline trên `main` mới nhất: `npm ci`; `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` đều qua. Chụp ảnh "trước" vào scratchpad (ngoài repo): demo 1440×900 và 924×540 (màn hình chính, hộp thoại New spec), popup 1440 và 390 (`base.cjs before17`); thẻ đóng của mình và thẻ đóng có emoji ở GitHub giả (1440 và 390). Ghi số test đang qua.

- [ ] T001b Chặn merge: xác nhận với người dùng rằng bản thiết kế `Speckit Workspace.html` (ngoài repo) đã cập nhật tiêu đề thẻ đóng của mình (giờ dịch trái, chỗ cho ba chấm) và hàng emoji dưới nội dung; ghi xác nhận (ngày, nội dung) vào `quickstart.md`. Có thể làm song song mọi việc khác, nhưng không merge khi chưa có (constitution IV, analyze C1).

## Phase 2: Foundational — quy tắc đo thẻ (chặn US1, US2)

- [X] T002 Trong `src/annotations/comments.ts`: thêm hàm thuần `isMeasured(card, { open, coarse })` (mở, đang soạn, có ít nhất một emoji, hoặc màn hình cảm ứng thì đo, ngược lại cố định `CLOSED_CARD_HEIGHT`) và `outdatedExtra(card, coarse)` (ước lượng chiều cao thêm cho thẻ Outdated có emoji/cảm ứng; hằng số tên rõ). Test `tests/measured.test.ts`: thẻ đóng không emoji → không đo; có emoji → đo; cảm ứng → đo; mở/soạn → đo; ước lượng 0 khi không cần.

**Checkpoint**: `npm test` và `npm run typecheck` qua; UI chưa đổi.

## Phase 3: User Story 1 — Emoji dưới nội dung của mục (P1) 🎯 MVP

**Mục tiêu**: hàng emoji gốc nằm dưới nội dung ở mọi thẻ; tiêu đề thẻ đóng không còn chuỗi emoji; thẻ có emoji được đo.

**Kiểm độc lập**: quickstart 1–4, 12.

- [X] T003 [US1] Trong `src/annotations/CommentRail.tsx`: `Card` nhận `chips?: ReactNode` và `measured?: boolean`; dựng `chips` trong `.sk-cm-item` ngay sau `.sk-cm-row`, bọc trong khối chặn `click` và `keydown` lên thẻ và rail (R6); `.sk-cm-count` của thẻ đóng chỉ còn "N reply/replies" (R8); `style` bỏ `height` cố định và hiệu ứng đo (`onMeasure` với `ResizeObserver`) chạy khi `measured` (không chỉ `open`). `CommentRail` nhận `chipsFor?: (card, open) => ReactNode`, dùng `isMeasured` và hook nhỏ đọc `matchMedia('(hover: none), (pointer: coarse)')` (an toàn khi dựng phía máy chủ và lần vẽ đầu: trả `false` cho tới khi gắn vào trang rồi cập nhật trong `useEffect`, như `unsupported` trong `useHighlights`; test giá trị lần dựng đầu) để tính `heightOf` cho thẻ trong rail và thêm `outdatedExtra` vào `outdatedHeight`; truyền `chips` và `measured` cho `Card` ở rail và nhóm Outdated.
- [X] T004 [US1] Trong `src/annotations/Thread.tsx`: bỏ `ReactionBar` của nhận xét gốc khỏi `Thread` (trả lời giữ `ReactionBar` của chúng); `ReactionBar` nhận `tabbable?: boolean` (mặc định true) đặt `tabIndex={-1}` cho viên emoji khi false. Trong `src/annotations/Annotator.tsx`: `chipsFor = (c, open) => <ReactionBar list={c.highlight.reactions} me={author} person={person} readOnly={store.readOnly} what="this comment" tabbable={open} onToggle={(emoji, on) => react(c.id, undefined, emoji, on)} />` (trả `null` khi không có emoji), truyền cho `CommentRail` và cho `Card` trong sheet (`chips={chipsFor(selectedCard!, true)}`).
- [X] T005 [US1] Trong `src/styles/reader.css`: khối "Emoji under the text (specs/017)": `.sk-cm-item > .sk-cm-react` có lề trên như hàng emoji của trả lời, nằm trong `.sk-cm-item` (hover của 015 phủ cả hàng); thẻ `measured` không còn `height` cố định (đã bỏ ở T003) nhưng vẫn `overflow` như cũ; hàng xuống dòng gọn ở 390 px. Không màu mới, không `border-radius`.
- [X] T006 [P] [US1] Test: cập nhật `tests/threadMarkup.test.tsx` (thread không còn hàng emoji gốc, trả lời vẫn có), `tests/commentRailMarkup.test.tsx` (thẻ đóng và mở đều có hàng emoji ngay sau `.sk-cm-row`, tiêu đề đóng chỉ có số trả lời, không emoji; thẻ không emoji không có hàng; `chipsFor` nhận `open` đúng), `tests/hoverCss.test.ts` (khối spec 017: không `border-radius`, không màu cứng); test đo `tests/measured.test.ts` đã có ở T002.
- [X] T007 [US1] Playwright demo và GitHub giả: thả 👍 lên thẻ đóng qua nút nổi, hàng "👍 1" nằm dưới nội dung, tiêu đề chỉ có số trả lời; bấm viên gỡ được mà không mở thẻ; thẻ mở có hàng dưới nội dung và dưới từng trả lời; hai thẻ gần nhau: thả/gỡ emoji không làm thẻ đè nhau (1920, 1440, 924, 390); thẻ không emoji vẫn cao 124 px; ghi kết quả vào `quickstart.md`.

**Checkpoint**: US1 chạy độc lập; ba chấm vẫn chỉ ở thẻ mở.

## Phase 4: User Story 2 — Ba chấm cùng emoji khi hover ở mọi thẻ (P1)

**Mục tiêu**: ba chấm của mình hiện ở thẻ đóng, ngoài cùng bên phải; Edit/Delete dùng luồng của thẻ mở.

**Kiểm độc lập**: quickstart 5–9.

- [ ] T008 [US2] Trong `src/annotations/MoreMenu.tsx`: prop `tabbable?: boolean` (mặc định true) đặt `tabIndex={-1}` cho nút khi false. Trong `src/annotations/CommentRail.tsx` (`Card`): dựng `MoreMenu` khi `card.mine && actions` (bỏ `selected`), `tabbable={open}`; Edit gọi `actions.onEdit(card.id)`; Delete gọi `onSelect(card.id)` rồi `setConfirming(true)` (R4); `rowTool` dựng cho mọi thẻ như bản sửa PR #41 với `tabbable={open}` (đã có). Kiểm hiệu ứng `if (!selected) setConfirming(false)` không xoá cờ vừa đặt.
- [ ] T009 [US2] Trong `src/styles/reader.css`: tiêu đề thẻ đóng của mình chừa chỗ cho ba chấm (đã có `.sk-cm-more-wrap`), tên cắt bằng ellipsis (`min-width: 0`) để không xuống dòng ở rail 300 px và sheet 390 px; `@media (hover: none), (pointer: coarse)`: bỏ giới hạn `.sk-cm-card.on` cho nút emoji, hàng nội dung thẻ đóng có `min-height: 52px` và `padding-right: 60px`. Không `border-radius` mới.
- [ ] T010 [P] [US2] Test: `tests/commentRailMarkup.test.tsx` (thẻ đóng của mình có `MoreMenu` ở cuối tiêu đề sau giờ, `tabindex="-1"`; thẻ đóng của người khác không có; thẻ mở có `tabindex` mặc định), `tests/moreMenu.test.tsx` (`tabbable=false`), `tests/hoverCss.test.ts` (cập nhật các khẳng định của 015 bị ảnh hưởng: luật cảm ứng nay áp cả thẻ đóng nên bỏ `.sk-cm-card.on` khỏi regex khối `(hover: none)`, và "đúng một `border-radius`"; khối CSS của 017 nằm sau các khối 015, không có `border-radius`; tên có ellipsis), một ca chỉ đọc: `aria-disabled` và lý do trên ba chấm của thẻ đóng. Luồng Delete từ thẻ đóng (chọn thẻ rồi hiện xác nhận, cờ `confirming` không bị xoá) chỉ kiểm bằng T011 (Playwright), vì repo chỉ có test kết xuất tĩnh.
- [ ] T011 [US2] Playwright demo (vai QA) và GitHub giả: hover thẻ đóng của mình: ba chấm ngoài cùng bên phải và nút emoji cùng hiện, tiêu đề không xuống dòng; thẻ của người khác chỉ có nút emoji; Edit: soạn tại chỗ, Save/Cancel; Delete: thẻ mở với xác nhận, Keep và Delete; `push:false`: nút và mục tắt kèm lý do; ↑/↓ chọn thẻ, Enter mở, Tab tới ba chấm và nút emoji; cảm ứng giả lập 390: ba chấm và nút emoji hiện sẵn ở thẻ đóng, ≥ 44 px, không cuộn ngang, bấm không chọn thẻ; ghi kết quả vào `quickstart.md`.

## Phase 5: Polish & cross-cutting

- [ ] T012 [P] Cập nhật `README.md` mục Highlights: emoji dưới nội dung ở mọi thẻ, ba chấm cùng nút emoji khi hover ở mọi thẻ của mình; liên kết `specs/017-comment-item-layout/`.
- [ ] T013 Chụp thẻ đóng và mở có emoji ở bốn giao diện trang (White, Sepia, Green, Dark) và ở 390 px giả lập cảm ứng; xác nhận hàng emoji, ba chấm, nút nổi đọc được; sửa `reader.css` nếu cần; ghi kết quả vào `quickstart.md`.
- [ ] T014 Chạy quickstart 1–13 ở demo và server (GitHub giả); static (`build:pages`) và local chỉ ghi rõ có chạy hay chỉ build; chạy đủ bốn cổng: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`; kiểm không còn mã chết (`ReactionBar` gốc trong `Thread`, chuỗi emoji trong `.sk-cm-count`) bằng `tsc` và grep.
- [ ] T015 So ảnh demo với ảnh T001 ở 1440×900 và 924×540 (màn hình chính, hộp thoại New spec) và popup: giống hệt ngoài tiêu đề thẻ đóng của mình; liệt kê phần chênh trong PR (ngoại lệ đã ghi ở spec Q1).
- [ ] T016 Mô tả PR: nêu `specs/017-comment-item-layout`, `Closes #<issue "Spec 017: …">` (tạo issue nhãn `speckit` nếu chưa có), chế độ bị ảnh hưởng (cả bốn), không đổi dữ liệu hay cách lưu, hai ngoại lệ demo (giờ ở tiêu đề thẻ đóng của mình dịch trái, hàng emoji dưới nội dung), thẻ đóng không còn chuỗi emoji ở tiêu đề. Không tạo PR trước khi người dùng yêu cầu.

## Dependencies & Execution Order

- T001b chạy song song, nhưng chặn merge. Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5.
- T002 trước T003 (rail dùng `isMeasured`). Trong Phase 3: T003 → T004 → T005; T006 sau T004–T005; T007 sau cùng. T003 và T004 phải vào cùng một commit (không có hai hàng emoji).
- Trong Phase 4: T008 → T009; T010 sau T008–T009; T011 sau cùng.
- Phase 5 sau cùng; T012 và T013 song song được.

## Parallel Example

```text
Phase 3:  T006 (tests)  ∥  T007 (Playwright)   — sau T005
Phase 4:  T010 (tests)  ∥  T011 (Playwright)   — sau T009
Polish:   T012 (README) ∥  T013 (bốn giao diện)
```

## Implementation Strategy

- **MVP**: Phase 1–3 (US1): hàng emoji dưới nội dung ở mọi thẻ, thẻ có emoji được đo. Dừng và kiểm quickstart 1–4, 12.
- **Tiếp**: US2 (ba chấm ở thẻ đóng), rồi Polish.
- Mỗi phase kết thúc bằng một commit; `npm test` và `npm run typecheck` qua trước khi sang phase sau.
