# Tasks: Thẻ nhận xét gọn kiểu Google Docs (menu ba chấm, một màu)

**Input**: `specs/014-comment-card-menu/` (spec.md, plan.md, research.md, data-model.md, contracts/card-menu-ui.md, quickstart.md)

**Tests**: Có. Constitution V; nhiều test cũ phải cập nhật vì bỏ chức năng. Dữ liệu tự tạo, GitHub giả.

**Format**: `- [ ] T### [P?] [US?] Mô tả kèm đường dẫn`. `[P]` = làm song song được (file khác, không phụ thuộc việc chưa xong).

**Thứ tự quan trọng**: menu ba chấm (Phase 2) có trước khi gỡ Edit/Delete cố định, để không commit nào làm mất cách sửa/xoá. Không đổi dữ liệu hay đường ghi (R2); mở tài liệu không ghi gì.

## Phase 1: Setup

- [ ] T001 Baseline: `npm ci`; `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` đều qua. Chụp ảnh "trước" (scratchpad, ngoài repo): demo 1440×900 và 924×540 (màn hình chính, hộp thoại New spec), một thẻ nhận xét có một trả lời ở 1440×900 và 390, tab Highlights.

## Phase 2: Foundational — menu ba chấm và kiểu thẻ (chặn mọi story)

- [ ] T002 [P] Tạo `src/annotations/MoreMenu.tsx`: `MoreMenu({ label, items, readOnly })`; nút `aria-label="More actions"`, `aria-haspopup="menu"`, `aria-expanded`; menu `role="menu"` với `role="menuitem"`; Enter/Space/chuột mở và đưa tiêu điểm vào mục đầu; ↑/↓ di chuyển và quay vòng; Enter/Space chọn; Escape đóng và trả tiêu điểm về nút; Tab và bấm ngoài đóng; một menu mở một lúc (mở cái này đóng cái kia, qua sự kiện đóng chung); mục tắt `aria-disabled` kèm `title` là lý do (R3, contracts/card-menu-ui.md).
- [ ] T003 [P] Trong `src/styles/reader.css`: `.sk-cm-more` (nút ba chấm: vùng chạm ≥ 44 px ở `(pointer: coarse)`, `:focus-visible` theo hệ thống) và `.sk-cm-menu` (`--color-bg`, `--color-text`, viền 1 px, `--shadow-md`, không bo góc, mở về phía còn chỗ, không bị cắt ở cuối rail); chỉ token có sẵn.
- [ ] T004 [P] Test `tests/moreMenu.test.tsx` (render tĩnh + hành vi thuần): nút có nhãn "More actions" và `aria-haspopup`/`aria-expanded="false"` khi đóng; mở thì `role="menu"` với đúng hai `menuitem` Edit, Delete; mục tắt có `aria-disabled` và lý do; không dùng màu cứng. Hành vi phím và đóng ngoài kiểm ở Playwright (T017).

**Checkpoint**: thành phần có sẵn, chưa dùng; `npm test` qua.

## Phase 3: User Story 2 — Menu ba chấm cho Sửa và Xoá (P1) 🎯 MVP

**Mục tiêu**: Edit/Delete nằm trong menu ở tiêu đề mỗi mục của mình, không còn hàng nút cố định.

**Kiểm độc lập**: quickstart 4–7.

- [ ] T005 [US2] Trong `src/annotations/CommentRail.tsx` (`Card`): tiêu đề có `MoreMenu` khi `card.mine` và thẻ đang mở (R4), mục Edit và Delete (tắt kèm `actions.readOnly`); bỏ hàng Edit/Delete cố định; Delete mở dòng xác nhận hiện có ("Delete this comment?" hoặc "…and its N replies?", Keep/Delete), Edit gọi `actions.onEdit` và ẩn nút ba chấm khi mục đang soạn.
- [ ] T006 [US2] Trong `src/annotations/Thread.tsx`: mỗi trả lời của mình có `MoreMenu` (Edit, Delete) ở tiêu đề, bỏ hàng Edit/Delete cố định; Delete → "Delete this reply?" (Keep/Delete); đang sửa thì không có nút ba chấm.
- [ ] T007 [US2] Cập nhật test: `tests/commentRailMarkup.test.tsx` và `tests/threadMarkup.test.tsx` (nút "More actions" chỉ ở mục của mình và thẻ mở; không còn hàng Edit/Delete cố định; mục của người khác không có nút; xác nhận xoá nêu số trả lời; đang sửa không có nút).
- [ ] T008 [US2] Playwright demo (vai QA) và GitHub giả: ba chấm ở nhận xét và trả lời của mình, không ở của người khác; Edit soạn tại chỗ; Delete hỏi rồi xoá; Escape và bấm ngoài đóng, tiêu điểm về nút; một menu mở một lúc; bàn phím đủ vòng (Tab, Enter, ↓/↑, Enter, Escape); `push:false` làm Edit/Delete tắt kèm lý do; ghi kết quả vào `quickstart.md`.

**Checkpoint**: US2 chạy độc lập (màu, Copy, Ask còn nguyên).

## Phase 4: User Story 1 — Một màu mặc định (P1)

**Mục tiêu**: nhận xét mới lưu màu Change, không còn chọn màu; dữ liệu cũ nguyên vẹn.

**Kiểm độc lập**: quickstart 1–3.

- [ ] T009 [US1] Trong `src/annotations/Annotator.tsx`: `submitDraft` lưu `color: 'o'` (không còn `'n'`); thêm ghi chú vào highlight chỉ-màu của mình giữ màu có sẵn (đường `existingId`); bỏ `onColor` khỏi các hành động.
- [ ] T010 [US1] Trong `src/annotations/CommentRail.tsx`: bỏ hàng ô màu (`.sk-cm-colors`/`.sk-cm-sw`) và dòng nhãn màu (`.sk-cm-meta`) khỏi `Card`; giữ `data-color` để viền trái theo màu đã lưu (nhận xét cũ vẫn đúng màu). Trong `src/annotations/colors.ts`: bỏ `meaningOf`/`HL_NONE` khỏi giao diện (giữ khoá màu cho `useHighlights` và dải màu), kiểm tham chiếu còn lại bằng `tsc`.
- [ ] T011 [P] [US1] Test: cập nhật `tests/commentRailMarkup.test.tsx` (không `sk-cm-colors`, `sk-cm-meta`; `data-color` vẫn theo màu đã lưu), `tests/comments.test.ts` (tên "Comment" của màu `n` không còn là chip), và thêm test `submitDraft`-tương đương nếu có hàm thuần; `tests/highlights.test.ts` giữ nguyên `update` với `color` (đường ghi chung, R2) và thêm khẳng định: file có màu `y`,`b`,`p`,`n` đọc rồi ghi lại giống hệt từng byte (SC-004).
- [ ] T012 [US1] Playwright demo và GitHub giả: gửi nhận xét mới → file `color: "o"`, đoạn chữ tô cam, thẻ không ô màu/nhãn; thêm ghi chú vào highlight chỉ-màu của mình giữ màu; nhận xét cũ nhiều màu hiện đúng màu; mở tài liệu không tạo commit; ghi kết quả vào `quickstart.md`.

**Checkpoint**: US1 + US2 là MVP.

## Phase 5: User Story 3 — Bỏ Copy và Ask; tab Highlights gọn (P2)

**Mục tiêu**: không còn Copy, Ask; tab không lọc/nhãn màu; mục chỉ-màu chỉ còn Delete; "Before you approve" theo thời gian.

**Kiểm độc lập**: quickstart 8, 11, 12.

- [ ] T013 [US3] Trong `src/annotations/highlightActions.ts`: giảm `HighlightActions` còn `{ onEdit, onDelete, mine, readOnly }`. Trong `src/annotations/CommentRail.tsx`: bỏ hàng Copy/Ask (`.sk-cm-share`). Trong `src/annotations/Annotator.tsx`: bỏ `onCopy`, `onAsk` (prop và hàm), `byId` nếu thừa. Xoá `onAsk` truyền cho `Annotator` ở `src/App.tsx`, `src/project/LiveWorkspace.tsx`, `src/project/LocalWorkspace.tsx` (giữ `onAsk` riêng của `GateBrief` ở App) (R8).
- [ ] T014 [US3] Trong `src/annotations/HighlightsPanel.tsx`: bỏ ô lọc theo màu (`flt`, `.sk-hlp-flt`) và chữ nhãn màu (`meaningOf`) ở meta; giữ dải màu nhỏ `.sk-hlp-bar`; `EntryActions` chỉ còn Delete hai bước cho tác giả (tắt kèm lý do khi `readOnly`), người khác không có hàng; mục có ghi chú không có hàng. Trong `src/annotations/brief.ts`: `briefNotes` xếp theo `createdAt` (bỏ `briefRank`). Dọn `reader.css` các luật không còn dùng (`.sk-cm-colors`, `.sk-cm-sw`, `.sk-cm-meta`, `.sk-cm-share`, `.sk-hlp-flt`, `.sk-hlp-btns` nếu thừa).
- [ ] T015 [US3] Cập nhật test: `tests/highlightsPanelActions.test.tsx` (chỉ Delete cho tác giả, người khác không hàng, `readOnly` tắt kèm lý do, không swatch/Copy/Ask), `tests/annotationsMarkup.test.tsx` (không ô lọc màu, không nhãn màu, dải màu còn), test `briefNotes` theo thời gian (ví dụ Issue và Key xen kẽ giữ thứ tự `createdAt`), `tests/commentRailMarkup.test.tsx` (không Copy/Ask).
- [ ] T016 [US3] Playwright demo: tab Highlights không lọc/nhãn màu; mục chỉ-màu của mình chỉ có Delete; Gate "Before you approve" theo thời gian; thẻ và tab không Copy/Ask; ghi kết quả vào `quickstart.md`.

## Phase 6: User Story 4 — Bố cục như thẻ Google Docs (P2)

**Mục tiêu**: thứ tự tiêu đề → nội dung → emoji → trả lời → ô trả lời; Cancel/Reply chỉ khi chọn ô hoặc có chữ.

**Kiểm độc lập**: quickstart 9, 10.

- [ ] T017 [US4] Trong `src/annotations/Thread.tsx`: hộp trả lời hiện Cancel và Reply chỉ khi ô có tiêu điểm hoặc có chữ (trạng thái `active` theo `focus`/`blur` trong hộp và `draft`), góc vuông; Cancel có chữ hỏi bỏ ("Discard this reply?"), không chữ thì bỏ tiêu điểm; giữ quy tắc gửi/độ dài/chỉ đọc của 011. Trong `src/styles/reader.css`: kiểu hộp trả lời tinh gọn, `(pointer: coarse)` cho vùng chạm.
- [ ] T018 [US4] Cập nhật `tests/threadMarkup.test.tsx`: khi nghỉ không có Cancel/Reply; có chữ thì hiện cả hai; thứ tự phần trong thẻ (tiêu đề, nội dung, emoji, trả lời, ô trả lời); chỉ đọc vẫn tắt ô và nêu lý do.
- [ ] T019 [US4] Playwright demo 1440×900 và 390: bố cục khớp thứ tự ảnh tham chiếu; Cancel/Reply ẩn lúc nghỉ, hiện khi chọn; sheet hẹp không cuộn ngang, nút ba chấm ≥ 44 px (`pointer: coarse`); bàn phím; ghi kết quả vào `quickstart.md`.

## Phase 7: Polish & cross-cutting

- [ ] T020 [P] Cập nhật `README.md` mục Highlights: nhận xét một màu (Change), menu ba chấm, không Copy/Ask, tab không lọc màu, "Before you approve" theo thời gian; liên kết `specs/014-comment-card-menu/`.
- [ ] T021 Chạy toàn bộ quickstart 1–15 ở demo và server (GitHub giả); static (`build:pages`) và local chỉ ghi rõ có chạy hay chỉ build; ghi kết quả vào `quickstart.md`.
- [ ] T022 Chạy đủ bốn cổng: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`; kiểm không còn mã chết (`onAsk`, `HL_NONE`, `meaningOf`, CSS không dùng) bằng `tsc` và grep.
- [ ] T023 So ảnh demo với ảnh T001 ở 1440×900 và 924×540 (màn hình chính, hộp thoại New spec): giống hệt; liệt kê trong PR phần chênh (thẻ, tab, ô trả lời góc vuông so với ảnh tham chiếu).
- [ ] T024 Mô tả PR: nêu `specs/014-comment-card-menu`, `Closes #<issue theo dõi "Spec 014: …">` (tạo issue nhãn `speckit` nếu chưa có), chế độ bị ảnh hưởng (cả bốn), không đổi định dạng file, "Before you approve" đổi sang theo thời gian (thay thế thứ tự Issue trước của 012), ô trả lời góc vuông. Không tạo PR trước khi người dùng yêu cầu.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (US2) → Phase 4 (US1) → Phase 5 (US3) → Phase 6 (US4) → Phase 7.
- Phase 3 trước khi gỡ hàng nút cố định ở Phase 5/4: T005–T006 đã đưa Edit/Delete vào menu; T013 mới xoá Copy/Ask.
- Trong Phase 2: T002, T003, T004 song song (T004 cần T002 để chạy).
- Trong Phase 3: T005 và T006 chạm file khác nhau (`CommentRail.tsx`, `Thread.tsx`), làm song song được sau T002; T007 sau T005–T006; T008 sau cùng.
- Trong Phase 4: T009 → T010 (cùng `Annotator`/`CommentRail`, nhưng T010 sau T005); T011 sau T010; T012 sau cùng.
- Trong Phase 5: T013 → T014; T015 sau T014; T016 sau cùng. Phase 6: T017 → T018 → T019 (T017 sau T006 vì cùng `Thread.tsx`).

## Parallel Example

```text
Phase 2:  T002 (MoreMenu.tsx)  ∥  T003 (reader.css)  ∥  T004 (tests)
Phase 3:  T005 (CommentRail.tsx)  ∥  T006 (Thread.tsx)
Polish:   T020 (README)  ∥  T022 (kiểm mã chết)
```

## Implementation Strategy

- **MVP**: Phase 1–4 (US2 + US1): menu ba chấm và một màu mặc định, dữ liệu cũ nguyên vẹn. Dừng và kiểm quickstart 1–7.
- **Tiếp**: US3 (bỏ Copy/Ask, tab gọn), US4 (bố cục ô trả lời), rồi Polish.
- Mỗi phase kết thúc bằng một commit; `npm test` và `npm run typecheck` qua trước khi sang phase sau.
