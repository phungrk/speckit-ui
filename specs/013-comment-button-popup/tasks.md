# Tasks: Hộp chọn chữ chỉ còn một nút "Comment"

**Input**: `specs/013-comment-button-popup/` (spec.md, plan.md, research.md, data-model.md, contracts/selection-popup-ui.md, quickstart.md)

**Tests**: Có. Constitution V cần test cho phần đổi; test dùng dữ liệu tự tạo và GitHub giả.

**Format**: `- [ ] T### [P?] [US?] Mô tả kèm đường dẫn`. `[P]` = làm song song được (file khác, không phụ thuộc việc chưa xong).

**Thứ tự quan trọng**: các hành động bỏ khỏi hộp (màu, Copy, Ask, Xoá) PHẢI có chỗ mới (Phase 2) **trước** khi hộp thu lại một nút (Phase 3), để không có commit nào làm mất tính năng.

## Phase 1: Setup

- [ ] T001 Baseline: `npm ci`; `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` đều qua trên nhánh trước khi sửa. Chụp ảnh "trước": hộp chọn chữ ở demo 1440×900 và 390, màn hình chính và hộp thoại New spec ở 1440×900 và 924×540 (lưu ngoài repo, scratchpad).

## Phase 2: Foundational — chỗ mới cho màu, Copy, Ask, Xoá (chặn US1)

**Mục tiêu**: thẻ và tab Highlights làm được mọi việc mà hộp cũ làm, trước khi hộp thu nhỏ.

- [ ] T002 [P] Tạo `src/annotations/highlightActions.ts`: kiểu `HighlightActions` (`onCopy`, `onAsk`, `onColor`, `onEdit`, `onDelete`, `canWrite(h)`) theo data-model.md.
- [ ] T003 Trong `src/annotations/CommentRail.tsx` (`Card`): thêm hàng **Copy · Ask** cho mọi người xem thẻ đang chọn (kể cả người chỉ có quyền đọc); giữ ô màu, Edit, Delete cho tác giả; hành động ghi `aria-disabled` kèm lý do khi `readOnly`. Mở rộng `CardActions` bằng `onCopy`, `onAsk`.
- [ ] T004 Trong `src/annotations/Annotator.tsx`: dựng đối tượng `HighlightActions` (Copy ghi clipboard; Ask gọi `onAsk(quote)`; màu/xoá/sửa dùng `save` hiện có; `canWrite` = cùng tác giả và không `store.readOnly`), đưa vào `actions` của `Card` và `CommentSheet`; xuất qua prop mới `onActions?(a: HighlightActions)` gọi một lần, hàm ổn định đọc state mới nhất qua ref (research R5).
- [ ] T005 Trong `src/annotations/HighlightsPanel.tsx`: nhận prop `actions?: HighlightActions`; state cục bộ `openId`, `confirmId`; mục **không có ghi chú** mở hàng hành động ngay dưới khi bấm (tác giả: ô màu, Copy, Ask, Delete hai bước; người khác: Copy, Ask), bấm lại hoặc bấm mục khác thì thu; hàng là phần tử anh em của `<button>` mục; hành động ghi tắt kèm lý do khi `readOnly`. Mục có ghi chú không có hàng.
- [ ] T006 Nối `onActions` ở ba shell: `src/App.tsx` (demo), `src/project/LiveWorkspace.tsx`, `src/project/LocalWorkspace.tsx`: `useState<HighlightActions | null>`, đưa `onActions={setHlActions}` cho `Annotator` và `actions={hlActions}` cho `HighlightsPanel`.
- [ ] T007 [P] Trong `src/styles/reader.css`: kiểu `.sk-hlp-acts` (hàng hành động ở tab) dùng lại ô màu `.sk-cm-sw` và nút `.btn` của thẻ; chỉ token có sẵn.
- [ ] T008 [P] Test: trong `tests/commentRailMarkup.test.tsx` thêm kiểm thẻ (tác giả có ô màu, Edit, Delete, Copy, Ask; người khác chỉ Copy, Ask; `readOnly` tắt hành động ghi, Copy/Ask còn); tạo `tests/highlightsPanelActions.test.tsx` kiểm hàng hành động của tab (mục chỉ-màu mở hàng, mục có ghi chú không có hàng, tác giả so với người khác, `readOnly`, xoá hai bước).

**Checkpoint**: `npm test` và `npm run typecheck` qua; hộp cũ chưa đổi, thẻ và tab đã có đủ hành động.

## Phase 3: User Story 1 — Chọn chữ, thấy đúng một nút "Comment" (P1) 🎯 MVP

**Mục tiêu**: hộp chỉ có một nút "Comment", một dòng ở mọi bề rộng, bấm mở hộp soạn của 012.

**Kiểm độc lập**: quickstart 1–6, 11, 12.

- [ ] T009 [US1] Viết lại `src/annotations/Toolbar.tsx`: một nút nhãn và `aria-label` "Comment" kèm `Icon n="note"`, `white-space: nowrap`; bỏ ô màu, Copy, Ask, Xoá và props tương ứng (`onColor`, `onCopy`, `onAsk`, `onDelete`, `color` của `ToolbarState`); `readOnly`/`error` hiện trong hộp (`role="status"`); `toolbarPosition(tb, viewport, width)` nhận bề rộng hộp (132, hoặc `min(260, viewport − 16)` khi có thông báo), cao hơn vùng chọn 44 px, kẹp 8 px.
- [ ] T010 [US1] Trong `src/annotations/Annotator.tsx`: bỏ `add(color)` và các callback màu/Copy/Ask/Xoá khỏi `HlToolbar`; `openFor` chỉ mở hộp khi highlight **chỉ có màu và do chính người dùng tạo** (người khác: không làm gì); `canComment` đơn giản lại; phím tắt Ctrl/Cmd+Alt+M giữ nguyên.
- [ ] T011 [US1] Trong `src/styles/reader.css`: kiểu hộp sáng (`--color-bg`, `--color-text`, viền 1 px `--color-text`, `--shadow-md`, không bo góc, nút `:focus-visible` theo hệ thống); xoá luật thanh tối `.sk-tb*` không còn dùng; xoá token `--hl-ink`, `--hl-paper*` nếu không còn nơi nào dùng (cập nhật test chặn màu cứng nếu nó liệt kê chúng).
- [ ] T012 [P] [US1] Đổi nhãn "Add comment" → "Comment" ở chỗ nói về nút: `src/annotations/Toolbar.tsx`, `Annotator.tsx`, `colors.ts` (chỉ chú thích), `README.md`, và `specs/012-docs-style-comment-flow/{spec.md,research.md,quickstart.md,contracts/comment-rail-ui.md}`; không sửa `analysis.md`, `tasks.md` của 012 (lịch sử).
- [ ] T013 [US1] Cập nhật test: `tests/annotationsMarkup.test.tsx` và `tests/commentRailMarkup.test.tsx` (hộp chỉ có một nút "Comment", không `sk-tb-c`, không Copy/Ask/Xoá; `aria-disabled` và lý do khi `readOnly`); thêm test `toolbarPosition` (trên, dưới khi hết chỗ, kẹp trái/phải ở 320 px, bề rộng khi có thông báo).
- [ ] T014 [US1] Kiểm bằng Playwright ở demo (không ghi GitHub thật): 1440×900, 390, 320: hộp một nút, nhãn một dòng, không tràn; bấm mở hộp soạn (rail ở rộng, sheet ở hẹp); gửi tạo nhận xét `n`; bấm ra ngoài/Escape/đổi vùng chọn đóng hộp; Tab tới nút, Enter; Ctrl/Cmd+Alt+M. Ghi kết quả vào cuối `quickstart.md`.

**Checkpoint**: US1 chạy độc lập; mọi hành động cũ vẫn dùng được nhờ Phase 2.

## Phase 4: User Story 2 — Hộp trông như của Google Docs (P2)

**Mục tiêu**: bề mặt sáng nhỏ, đọc được ở mọi nền đọc, không lọt khỏi màn hình.

**Kiểm độc lập**: quickstart 7, 8.

- [ ] T015 [US2] Chụp hộp ở White, Sepia, Green, Dark (1440 và 390) và ở mép trên/dưới màn hình; xác nhận tương phản (nền đọc đã có test ≥ 4,5:1; thêm một test tính tương phản `--color-text` trên `--color-bg` cho cả bốn nền nếu `tests/` chưa có cho cặp này) và vị trí xuống dưới khi không đủ chỗ trên. Sửa `src/styles/reader.css` nếu cần.
- [ ] T016 [US2] Sửa `.specify/memory/constitution.md` lên 1.4.1 (patch): nguyên tắc IV bỏ cụm "thanh công cụ luôn tối", giữ bảng `--hl-*` (màu tô, màu đặc); thêm dòng nhật ký sửa đổi; cập nhật `CLAUDE.md` (v1.4.0 → v1.4.1) và nơi khác nhắc 1.4.0 (`grep -rn "1\.4\.0"`), trừ nội dung lịch sử của spec.

**Checkpoint**: US2 độc lập với US1 về dữ liệu; hai story cùng đạt SC-003, SC-004.

## Phase 5: User Story 3 — Màu, Copy, Ask dùng được ở chỗ mới (P2)

**Mục tiêu**: không mất tính năng. Phần dựng nằm ở Phase 2; phase này kiểm hành vi đầu-cuối và các ca biên.

**Kiểm độc lập**: quickstart 5, 9, 10, 11.

- [ ] T017 [US3] Kiểm bằng Playwright ở demo: chọn nhận xét của mình → đổi màu, Edit, Delete (hai bước), Copy (clipboard), Ask (mở Copilot với đoạn chữ); nhận xét của người khác (seed demo) → chỉ Copy, Ask; tab Highlights → mục chỉ-màu (seed demo) mở hàng hành động, xoá hỏi xác nhận.
- [ ] T018 [US3] Kiểm server với GitHub giả (cách của spec 012): `push:false` → hành động ghi tắt kèm lý do ở thẻ và tab, Copy/Ask dùng được; bấm highlight chỉ-màu của mình trong văn bản → hộp chỉ có "Comment", gửi thì highlight giữ màu và có thẻ; của người khác → không hộp. Đủ một commit `[skip ci]` mỗi lần lưu.

## Phase 6: Polish & cross-cutting

- [ ] T019 Chạy quickstart 1–15 ở demo, server (GitHub giả), static (`build:pages`) và local; ghi kết quả và ảnh 390 vào `quickstart.md`. (FR-011)
- [ ] T020 Chạy đủ bốn cổng: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.
- [ ] T021 So ảnh demo với ảnh T001 ở 1440×900 và 924×540 (màn hình chính và hộp thoại New spec): phần chênh duy nhất là hộp chọn chữ; liệt kê trong PR (constitution IV).
- [ ] T022 Mô tả PR: nêu `specs/013-comment-button-popup`, `Closes #<issue theo dõi "Spec 013: …">` (tạo issue nhãn `speckit` nếu chưa có), chế độ bị ảnh hưởng (cả bốn), phần chênh với thiết kế (hộp chọn chữ) và đề nghị cập nhật `Speckit Workspace.html`, sửa constitution 1.4.1. Không tạo PR trước khi người dùng yêu cầu.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (US1). Phase 2 chặn Phase 3: không thu hộp trước khi thẻ và tab có đủ hành động.
- US2 (Phase 4) cần hộp mới từ T009–T011; T016 độc lập với code, làm song song được.
- US3 (Phase 5) cần Phase 2 và Phase 3 xong để kiểm đầu-cuối.
- Phase 6 sau cùng.
- Trong Phase 2: T002 trước T003–T005; T003, T004, T005 chạm file khác nhau nhưng T004 cần kiểu của T002; T006 sau T004, T005; T007, T008 song song với T003–T006 sau T002.
- Trong Phase 3: T009 → T010 → T011; T012 song song; T013 sau T009–T010; T014 sau tất cả.

## Parallel Example

```text
Sau T002:  T003 (CommentRail.tsx)  ∥  T005 (HighlightsPanel.tsx)  ∥  T007 (reader.css)  ∥  T008 (tests)
Trong US1: T012 (nhãn, tài liệu)  ∥  T009–T011 (code hộp)
Trong US2: T016 (constitution)  ∥  T015 (ảnh theo nền)
```

## Implementation Strategy

- **MVP**: Phase 1 + 2 + 3 (US1): hộp một nút, không mất tính năng. Dừng và kiểm quickstart 1–6, 11, 12 ở demo.
- **Tiếp**: US2 (giao diện, constitution 1.4.1), US3 (kiểm đầu-cuối), rồi Phase 6.
- Mỗi phase kết thúc bằng một commit; `npm test` và `npm run typecheck` qua trước khi sang phase sau.
