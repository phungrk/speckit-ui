# Tasks: Trả lời và thả emoji trên nhận xét

**Input**: `specs/011-replies-reactions/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: Có. Constitution V: parser và luồng ghi PHẢI có unit test; GitHub giả, dữ liệu tự tạo.

**Format**: `- [ ] T### [P?] [US?] Mô tả kèm đường dẫn`. `[P]` = làm song song được (file khác, không phụ thuộc việc chưa xong).

**Thứ tự quan trọng**: tầng dữ liệu và ghi (Phase 2) xong và có test trước khi có giao diện; `version: 2` (R1) nằm trong Phase 2 để không có commit nào ghi file mà bản app cũ có thể làm mất dữ liệu.

## Phase 1: Setup

- [X] T001 Baseline: `npm ci`; `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` đều qua trên nhánh trước khi sửa. Chụp ảnh "trước" (scratchpad, ngoài repo): demo 1440×900 và 924×540 (màn hình chính và hộp thoại New spec) và một thẻ nhận xét đang chọn ở 1440×900 và 390.

## Phase 2: Foundational — dữ liệu, ghi, kiểm tra khi đọc (chặn mọi story)

**Mục tiêu**: file `highlights.json` mang được trả lời và emoji, ghi an toàn ở cả bốn chế độ, chưa có giao diện mới (chỉ phần dữ liệu và khoá trạng thái).

- [X] T002 [P] Trong `src/project/types.ts`: thêm `Reaction`, `Reply`, `Highlight.replies?`, `Highlight.reactions?`, mở rộng `HighlightChange` với `reply`, `reply-edit`, `reply-remove`, `react` (data-model.md); `HighlightsFile.version: 1 | 2`.
- [X] T003 Trong `server/highlightsFile.ts` (đọc): hằng `EMOJI = ['👍','❤️','😄','🎉','😕','👀']` xuất ra cho UI; `validReaction`, `validReply`; `parseHighlights` nhận `version` 1 và 2, bỏ qua phản ứng sai hình dạng hoặc ngoài bộ, bỏ qua trả lời hỏng **và tính vào số "không đọc được"** (chặn ghi như 010 FR-014), gộp trùng (emoji, người); trường thiếu coi là rỗng (contracts/highlights-file.md).
- [X] T004 Trong `server/highlightsFile.ts` (ghi): `serializeHighlights` ghi `replies`/`reactions` theo thứ tự trong contract, bỏ trường rỗng, `version: 1` khi không có trả lời/emoji nào và `2` khi có (R1); file 010/012 thuần ghi lại giống hệt từng byte.
- [X] T005 Trong `server/highlightsFile.ts` (`applyChange`): bốn loại thay đổi mới theo data-model.md và research R3–R4: `reply` (`by` làm tác giả, `createdAt` = giờ lưu, bỏ qua nếu trùng `reply.id`, rỗng/quá 2.000 ký tự → 400), `add` **bỏ `replies` và `reactions` do client gửi kèm** (R12), `reply-edit` và `reply-remove` (chỉ tác giả trả lời, 403), `react` (đặt/gỡ cho `by`, emoji ngoài bộ → 400, mục không còn → 409); mỗi thay đổi đặt `updatedAt` của highlight (R7); `remove` của nhận xét gốc vẫn chỉ tác giả và xoá kèm trả lời, emoji; `commitMessage` có mẫu cho bốn loại (contracts/save-change-api.md).
- [X] T006 [P] Trong `server/routes.ts`: kiểm hình dạng bốn loại mới (kiểu, độ dài chuỗi, `on` là boolean) và cập nhật thông điệp lỗi 400; `server/highlights.ts` không đổi logic.
- [X] T007 [P] Trong `src/annotations/reactions.ts` (mới): hàm thuần `groupReactions(list, me)` (gom theo emoji theo thứ tự bộ: số lượng, `mine`, tên người thả), `hasReacted`, nhãn đọc cho trình đọc màn hình.
- [X] T008 Trong `src/annotations/comments.ts`: `diffIncoming` coi thay đổi trả lời/emoji là "changed" (đã nhờ `updatedAt`, thêm test khẳng định) và `newCount`; helper `replyCount(h)` (đặt ở `reactions.ts`). Trong `src/annotations/Annotator.tsx`: `changeId` dùng `replyId` cho `reply`, `reply-edit`, `reply-remove` để mỗi trả lời có trạng thái Sending/Failed riêng (R8).
- [X] T009 [P] Test dữ liệu trong `tests/highlights.test.ts`: parse v1 và v2, trường thiếu, emoji ngoài bộ bị bỏ, trả lời hỏng bị đếm vào lỗi chặn ghi, trùng gộp; serialize `version` 1/2, bỏ trường rỗng, thứ tự, file 010 thuần ghi lại giống hệt từng byte; bản parse "chỉ v1" từ chối `version: 2` (R1, kịch bản quickstart 12); `add` mang `replies`/`reactions` giả bị bỏ, `reply` đặt `author`/`createdAt` bất kể payload; `applyChange` cho bốn loại: thêm, trùng bỏ qua, quyền (người khác trả lời được, sửa/xoá trả lời của người khác 403, nhận xét gốc bị xoá kéo theo trả lời), `react` đặt/gỡ/idempotent, nội dung trống/quá dài/emoji lạ, mục không còn 409, `updatedAt` đổi, `commitMessage` kết thúc `[skip ci]`; kích thước vượt 512 KB → 413.
- [X] T010 [P] Test gộp đồng thời trong `tests/fakeGitHub.ts` và `tests/highlights.test.ts`: hai người `reply`/`react` gần như cùng lúc (xung đột 409 rồi thử lại trên bản mới) giữ cả hai; `react` hai lần cùng người không nhân đôi.
- [X] T011 [P] Test `tests/reactions.test.ts` cho `groupReactions` (thứ tự theo bộ, `mine`, tên, mục rỗng).

**Checkpoint**: `npm test` và `npm run typecheck` qua; hợp đồng dữ liệu và ghi chốt, UI chưa đổi.

## Phase 3: User Story 1 — Trả lời một nhận xét (P1) 🎯 MVP

**Mục tiêu**: chọn thẻ, gõ, gửi; trả lời hiện cho mọi người; sửa/xoá của mình; xoá nhận xét gốc có xác nhận; chỉ đọc thì tắt kèm lý do.

**Kiểm độc lập**: quickstart 1–8, 11–13, 15.

- [X] T012 [US1] Tạo `src/annotations/Thread.tsx`: danh sách trả lời (`role="list"`, avatar chữ cái, tên, giờ, "edited", chữ thuần giữ xuống dòng), menu Edit/Delete cho trả lời của mình (Delete hai bước), dòng trạng thái Sending/Saved/Failed + Retry theo `pending[replyId]`, ô "Reply…" cuối thẻ với nút Reply (tắt khi trống/không ghi được, nhắc khi trống, báo khi vượt 2.000 ký tự), Ctrl/Cmd+Enter gửi, Escape thu (hỏi bỏ nếu có chữ), vùng `aria-live` (contracts/thread-ui.md).
- [X] T013 [US1] Trong `src/annotations/CommentRail.tsx`: `Card` thêm dòng "N replies" ở thẻ đóng (trong `CLOSED_CARD_HEIGHT`), `CommentRail` và `CommentSheet` nhận `threadFor(card)` và dựng `Thread` vào khe `.sk-cm-thread`; thẻ mở tự đo lại chiều cao (`onMeasure`) khi thêm trả lời.
- [X] T014 [US1] Trong `src/annotations/Annotator.tsx`: state `replyDrafts` theo mã nhận xét (giữ khi đổi thẻ, hỏi trước khi bỏ), `replyId` tạo cùng bản nháp và giữ qua Retry, hàm `sendReply`, `editReply`, `deleteReply` gọi `save(...)` với bốn loại mới; danh sách hiển thị = `applyChange(items, thayĐổiĐangChờ, tôi)` (R8): trả lời hiện ngay ở trạng thái Sending, `ok` thay bằng danh sách đã lưu, thất bại giữ nội dung và Retry; khi nhận xét biến mất sau "New comments", bản nháp trả lời được báo mất chỗ gắn thay vì bị bỏ im lặng; truyền `threadFor`; hộp xác nhận xoá nhận xét gốc nêu số trả lời bị xoá ("Delete this comment and its N replies?") trong `Card`.
- [X] T015 [US1] Trong `src/styles/reader.css`: `.sk-cm-thread`, `.sk-cm-reply`, `.sk-cm-count`, ô trả lời; token Modernist, không bo góc, không màu mới; dùng được ở 390 px, không cuộn ngang.
- [X] T016 [P] [US1] Test markup `tests/threadMarkup.test.tsx`: danh sách theo thời gian, tên/giờ, "edited", Edit/Delete chỉ ở trả lời của mình, ô Reply tắt khi chỉ đọc kèm lý do, chữ thuần (HTML trong trả lời bị escape), thẻ đóng "1 reply"/"N replies", không có dòng đếm khi chưa có trả lời (thẻ không đổi), hộp xoá nêu số trả lời. Cập nhật `tests/commentRailMarkup.test.tsx` nếu thay đổi chữ ký.
- [X] T017 [US1] Kiểm Playwright ở demo (1440×900, 390): trả lời, trống/quá dài, sửa/xoá, xác nhận xoá nhận xét gốc, bản nháp giữ khi đổi thẻ, bàn phím; ghi kết quả vào cuối `quickstart.md`.
- [X] T018 [US1] Kiểm server với GitHub giả (cách của 012/013): `lan` trả lời nhận xét của `mai`, `mai` thấy sau "New comments" và không sửa/xoá được; hai trả lời đồng thời; `push:false` tắt ô Reply kèm lý do; mỗi lần lưu đúng một commit `[skip ci]` chỉ đổi `highlights.json`.

**Checkpoint**: US1 chạy độc lập (chưa có emoji).

## Phase 4: User Story 2 — Thả emoji (P2)

**Mục tiêu**: thả, gỡ emoji trên nhận xét và trả lời; số lượng, ai thả; đồng thời không mất; chỉ đọc thì xem được.

**Kiểm độc lập**: quickstart 9, 10, 7 (emoji), 15.

- [X] T019 [US2] Trong `src/annotations/Thread.tsx`: dải emoji dùng `groupReactions`: nút "emoji + số" (`aria-pressed` khi của mình, tên người thả trong `title` và nhãn đọc), nút "+" mở bộ 6 emoji, ở nhận xét gốc và ở từng trả lời; `aria-live` "Reaction added/removed"; điều khiển ghi `aria-disabled` kèm lý do khi chỉ đọc (xem vẫn được).
- [X] T020 [US2] Trong `src/annotations/Annotator.tsx`: hàm `react(id, replyId, emoji, on)` gọi `save({ type: 'react', … })` **lạc quan** bằng cùng cơ chế `applyChange` cục bộ (đổi ngay; thất bại hoặc huỷ xác nhận commit thì bỏ thay đổi đang chờ, hoàn lại và báo lỗi; R8); không gỡ được emoji của người khác (nút của người khác chỉ thêm/gỡ phần của chính mình).
- [X] T021 [US2] Trong `src/styles/reader.css`: `.sk-cm-react` (nền `--color-surface`, viền `--color-divider`, "của mình" viền `--color-text`), bộ chọn emoji; token có sẵn, không màu mới.
- [X] T022 [P] [US2] Test markup trong `tests/threadMarkup.test.tsx`: số lượng, `aria-pressed`, tên người thả, nút "+" liệt kê đúng 6 emoji, tắt khi chỉ đọc nhưng vẫn hiện số.
- [X] T023 [US2] Kiểm Playwright demo và server giả: thả hai emoji khác nhau, người thứ hai thả cùng emoji (số 2), gỡ, không gỡ của người khác, hai người thả cùng lúc, thất bại thì hoàn lại; ghi kết quả vào `quickstart.md`.

## Phase 5: Polish & cross-cutting

- [X] T024 [P] Cập nhật `README.md` mục Highlights (trả lời, emoji, ai làm được gì, `version: 2` và việc bản app cũ sẽ từ chối ghi file có trả lời) và liên kết `specs/011-replies-reactions/`; nói rõ build cũ đọc file `version: 2` sẽ báo "unknown format" và không hiện nhận xét của spec đó tới khi tải lại bản mới (R11).
- [X] T025 Hiệu năng (quickstart 14): 200 nhận xét × 3 trả lời ở demo hoặc GitHub giả: mở tài liệu dưới 1 giây, thẻ đóng không dựng danh sách trả lời, rail không chồng thẻ; ghi số đo.
- [X] T026 Chạy toàn bộ quickstart 1–17 ở demo và server (GitHub giả); static (`build:pages`) và local chỉ ghi rõ có chạy hay chỉ build; ghi kết quả và ảnh 390 vào `quickstart.md`.
- [X] T027 Chạy đủ bốn cổng: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.
- [X] T028 So ảnh demo với ảnh T001 ở 1440×900 và 924×540 (màn hình chính, hộp thoại New spec): giống hệt khi chưa có thảo luận; thẻ có trả lời là phần ngoài thiết kế, liệt kê trong PR (constitution IV).
- [ ] T029 Mô tả PR: nêu `specs/011-replies-reactions`, `Closes #<issue theo dõi "Spec 011: …">` (tạo issue nhãn `speckit` nếu chưa có), chế độ bị ảnh hưởng (cả bốn), định dạng file `version: 2` và hệ quả với bản app cũ (không hiện nhận xét tới khi tải lại; đổi bộ emoji sau này cần tăng `version`), phần chênh thiết kế. Không tạo PR trước khi người dùng yêu cầu.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5. US2 cần `Thread.tsx` của US1.
- Trong Phase 2: T002 trước T003–T005; T003 → T004 → T005 (cùng một file); T006, T007 song song sau T002; T008 sau T005; T009 sau T005; T010, T011 song song sau T005/T007.
- Trong Phase 3: T012 → T013 → T014; T015 song song với T012–T014; T016 sau T012–T013; T017, T018 sau cùng.
- Trong Phase 4: T019 → T020; T021 song song; T022 sau T019; T023 sau cùng.

## Parallel Example

```text
Sau T002:  T006 (routes.ts)  ∥  T007 (reactions.ts)
Sau T005:  T009 (tests dữ liệu)  ∥  T010 (tests gộp)  ∥  T011 (tests reactions)
US1:       T015 (reader.css)  ∥  T012–T014 (Thread, Card, Annotator)
Polish:    T024 (README)  ∥  T025 (hiệu năng)
```

## Implementation Strategy

- **MVP**: Phase 1 + 2 + 3 (US1): trả lời hoạt động đầu-cuối, dữ liệu an toàn với bản app cũ. Dừng và kiểm quickstart 1–8, 11–13, 15.
- **Tiếp**: US2 (emoji), rồi Polish.
- Mỗi phase kết thúc bằng một commit; `npm test` và `npm run typecheck` qua trước khi sang phase sau.
