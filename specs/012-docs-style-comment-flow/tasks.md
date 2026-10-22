---

description: "Task list for 012 docs-style comment flow"
---

# Tasks: Luồng nhận xét kiểu Google Docs trên tài liệu spec

**Input**: Design documents from `/specs/012-docs-style-comment-flow/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/comment-rail-ui.md, contracts/refresh-api.md, quickstart.md

**Tests**: Có. Constitution V bắt buộc unit test cho logic và luồng ghi; spec nêu SC đo được. Test viết trước, phải fail cho tới khi code tương ứng xong. GitHub luôn giả lập (`tests/fakeGitHub.ts`), không ghi GitHub thật. Không thêm dependency: logic thuần và render tĩnh bằng `react-dom/server` như 010. Kiểm tay theo quickstart bằng Playwright ngoài repo.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Chế độ bị ảnh hưởng**: cả bốn (demo, server, Pages, local). Kiểm tra nhận xét mới (US3) chỉ chạy ở server và Pages; local kiểm tra khi cửa sổ được focus; demo không kiểm tra.

**Nền**: code của 010 trên `main` (`src/annotations/`, `server/highlights*.ts`, `src/styles/reader.css`). Spec chỉ ghi vào `specs/NNN-slug/highlights.json` như 010; không thêm loại ghi, không thêm quyền token, không thêm điểm đến mạng (CSP không đổi).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US3)
- Include exact file paths in descriptions

## Path Conventions

- Ghi và đọc dùng chung: `server/highlights.ts`, `server/highlightsFile.ts` (chỉ cú pháp xoá được, import có đuôi `.ts`, không API riêng của Node).
- Giao diện dùng chung: `src/annotations/`. Ba shell: `src/App.tsx` (demo), `src/project/LiveWorkspace.tsx` (server, Pages), `src/project/LocalWorkspace.tsx` (local).
- CSS trong `src/styles/reader.css`; chỉ token và class Modernist, màu `n` suy từ `--color-text` bằng `color-mix`, không thêm mã màu.
- Mọi chữ và nhãn lấy từ `contracts/comment-rail-ui.md` (tiếng Anh, research R11).

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Baseline: `npm ci`; xác nhận `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` đều qua; làm việc trên nhánh của session `claude/bold-hawking-k3ffwk` (nhánh này đã merge `main` và mang spec 005, 011, 012; xem T060 về cách tách PR); bằng Playwright ngoài repo chụp demo (`/?demo`) ở 1440×900 và 924×540, giữ làm ảnh gốc để so (quickstart, mục Kiểm tra giao diện).
- [x] T002 Đồng bộ tài liệu thiết kế với phát hiện khi đọc code (đã làm trong phiên `/speckit-tasks`: `plan.md` mục cấu trúc có `freshness.ts`, `Avatar.tsx`, `server/github.ts`; `research.md` R15).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: màu `n`, bố trí thẻ, view model và khung rail; sau phase này các nhận xét có sẵn hiện thành thẻ thẳng hàng trong rail ở cả bốn chế độ (chưa tạo, chưa chọn).

**⚠️ CRITICAL**: không story nào bắt đầu trước khi phase này xong.

### Màu `n` (research R6)

- [X] T003 Thêm `'n'` vào `HighlightColor` trong `src/project/types.ts` (chú thích: n = nhận xét thường, "Comment").
- [X] T004 [P] Viết test trước trong `tests/highlights.test.ts`: `parseHighlights` chấp nhận phần tử có `color: 'n'`; `applyChange` `update` đổi màu sang và từ `n`; file không có `n` đọc như cũ; `commitMessage` cho `add` có ghi chú màu `n` dùng "commented" và vẫn kết thúc `[skip ci]`. Phải fail.
- [X] T005 Trong `server/highlightsFile.ts`: thêm `'n'` vào `COLORS`, `commitMessage` có động từ "commented" cho `n`. Làm T004 pass.
- [X] T006 [P] Viết test trước trong `tests/comments.test.ts` (file mới): `briefNotes` sắp Issue (`p`), rồi `n`, rồi `y`/`b`/`o`, trong mỗi nhóm theo `createdAt`; `meaningOf('n')` là "Comment"; `HL_COLORS` vẫn đúng bốn màu của thanh công cụ. Phải fail.
- [X] T007 Trong `src/annotations/colors.ts` thêm `HL_NONE = { key: 'n', meaning: 'Comment' }` và cho `meaningOf` nhận `n`; trong `src/annotations/brief.ts` đổi thứ tự `briefNotes` theo T006. Làm T006 pass.
- [X] T008 [P] Trong `src/styles/reader.css`: thêm `.hl-n`, `.hl-n-solid`, `::highlight(sk-n)`, `::highlight(sk-sel)` (nền đậm hơn cộng gạch chân, dùng được khi không có `priority`), `::highlight(sk-draft)` (trung tính, gạch chân đứt); tất cả bằng `color-mix(in srgb, var(--color-text) N%, transparent)` hoặc token `--hl-*` sẵn có; không mã màu cứng. Thêm `:focus-visible` theo hệ thống cho mọi nút, thẻ và ô nhập `.sk-cm-*` (constitution IV; thẻ đang chọn không chỉ dựa vào màu). Chạy test chặn màu cứng hiện có (`tests/typescale.test.ts` hoặc test tương đương) và sửa nếu fail.

### Bố trí và view model (research R2)

- [X] T009 [P] Viết test trước `tests/layout.test.ts`: `layoutCards(items, selectedId, heights, gap)` — không đè nhau, thẻ không chen chỗ nằm đúng `anchorTop`, chen chỗ thì đẩy xuống, cùng `top` xếp theo `createdAt`, thẻ đang chọn giữ đúng `anchorTop` và các thẻ phía trên bị đẩy lên rồi phía dưới chạy lại, 200 thẻ ngẫu nhiên vẫn không đè và chạy O(n). Phải fail.
- [X] T010 Tạo `src/annotations/layout.ts` (thuần, không đụng DOM) với `layoutCards`. Làm T009 pass.
- [X] T011 Viết test trước trong `tests/comments.test.ts`: `toCards(highlights, anchored, pending, me)` tạo thẻ cho mỗi highlight có `note` (data-model: CommentCard), đặt `anchorTop`, nhóm thẻ không còn neo thành `outdated` (không `top`), `mine` đúng theo tác giả. Phải fail.
- [X] T012 Tạo `src/annotations/comments.ts` với kiểu `CommentCard`, `SaveState` và `toCards`. Làm T011 pass.
- [X] T013 [P] Tạo `src/annotations/Avatar.tsx`: avatar chữ cái đầu dùng lại `.sk-avatar`, hàm `initials` chuyển từ `src/annotations/HighlightsPanel.tsx` sang đây (và HighlightsPanel import lại); prop `src?` tuỳ chọn, hiện không ai truyền (research R10, không đổi CSP).

### Khung rail (research R1, R9)

- [X] T014 Mở rộng `src/annotations/useHighlights.ts`: đăng ký `sk-n` cùng bốn màu; xuất vị trí `top` của neo cho từng highlight trong `.sk-doc` (dùng lại tính toán ghim); chừa chỗ cho `sk-sel` và `sk-draft` (đăng ký ở US1, US2). Giữ nguyên hành vi 010 (ghim, focus, Outdated).
- [X] T015 [P] Viết test trước `tests/commentRailMarkup.test.tsx` (render tĩnh): rail `aside.sk-cm-rail[role=complementary][aria-label="Comments"]`, header "Comments · n" và nhãn nhánh, thẻ đóng theo contract (avatar, tên, thời gian, `q`, `p` cắt hai dòng, `role=group` và `aria-label` đúng), nhóm "Outdated, text changed", rail không dựng khi không có thẻ, nháp hay gì để cập nhật; ghi chú chứa `<script>` hoặc HTML hiển thị như chữ thuần (constitution II); nhãn nhánh chỉ hiện khi có nhánh (không hiện ở local và demo, FR-015). Phải fail.
- [X] T016 Tạo `src/annotations/CommentRail.tsx`: rail, `Card` ở trạng thái đóng, header; đo bề rộng `.sk-doc` bằng `ResizeObserver` để chỉ dựng khi đủ chỗ (research R1); chỉ dựng thẻ trong `[scrollTop − 1 màn hình, scrollTop + 2 màn hình]`; gọi `layoutCards`. Làm T015 pass.
- [X] T017 Trong `src/annotations/Annotator.tsx`: dựng `CommentRail` trong `.sk-doc` với `items`, `anchors`, `target.branch`; thêm class `has-rail` khi rail hiện (CSS thay lề phải 28px của 010, ghim ẩn khi rail hiện); props mới đều tuỳ chọn để ba shell chưa phải đổi. Nối CSS `.sk-cm-*` từ T008.
- [X] T018 Sau T017: cập nhật test cũ của 010 nếu T017 làm chúng fail (`tests/annotationsMarkup.test.tsx`): chỉ đổi kỳ vọng liên quan tới ghim khi rail hiện, không đổi hành vi khác.

**Checkpoint**: các nhận xét có sẵn hiện thành thẻ thẳng hàng trong rail ở server, Pages, local và demo; không thẻ nào đè nhau; ghim vẫn có khi hẹp.

---

## Phase 3: User Story 1 - Nhận xét là hành động chính khi chọn chữ (Priority: P1) 🎯 MVP

**Goal**: chọn chữ, bấm Add comment, soạn trong rail với avatar và tên, gửi; không bắt chọn màu.

**Independent Test**: bôi chọn một câu, bấm Add comment, gõ, bấm Comment. Thẻ hiện ở rail ngang câu, mang avatar và tên; câu được tô trung tính. Bấm Cancel: không tạo gì. Người chỉ có quyền đọc: nút tắt kèm lý do. (quickstart kịch bản 1–5, 11, 13)

### Tests for User Story 1 (viết trước, phải fail)

- [X] T019 [P] [US1] Trong `tests/commentRailMarkup.test.tsx`: thanh công cụ có nút đầu "Add comment" (`.sk-tb-primary`, `aria-label`), vùng chọn **mới** không còn nút "Note", thứ tự `Add comment │ bốn màu │ Copy Ask` (chế độ sửa highlight có sẵn vẫn có trình sửa ghi chú nổi `.sk-tb-note` tới khi T038 bỏ nó); nút Add comment tắt kèm `aria-disabled`, `title` và `.sk-tb-msg` cho từng lý do (chỉ quyền đọc, nhánh bị bảo vệ hoặc đã xoá; phiên hết hạn không có trạng thái tắt riêng), Copy và Ask vẫn có.
- [X] T020 [US1] Trong `tests/commentRailMarkup.test.tsx`: `Composer` có avatar và tên người dùng hiện tại, `q` đoạn trích, `textarea[maxlength=2000][aria-label="Comment"]`, nút Cancel và Comment; gửi trống thì `aria-invalid="true"` và dòng "Write a comment first"; nút Comment tắt khi `busy`; nội dung chứa HTML hoặc script hiển thị như chữ thuần.
- [X] T021 [P] [US1] Trong `tests/comments.test.ts`: khoá nháp `slug|doc|startHint`; chuyển đoạn chữ hoặc bước giữ nháp; đổi spec hoặc nhánh khi có `text` thì báo cần hỏi (dùng `pendingTarget` của `src/annotations/brief.ts`); thẻ nháp của đoạn chữ ở tài liệu hoặc bước khác được đánh dấu "Draft" và mở lại khi quay về đúng đoạn chữ.
- [X] T022 [US1] Viết test trước (`tests/project.test.ts` hoặc test của `loadProject`, và `tests/fakeGitHub.ts`: repo trả `permissions: { push: boolean }` tuỳ cấu hình): `Project.canWrite` là `false` khi `permissions.push` là false, `true` khi true, `null` khi không có trường quyền hoặc khi nhánh đã ghim (không gọi repo); quyền đổi từ false sang true khi commit mặc định **không đổi**: `getProject(src, true)` trả `canWrite` mới, còn `getProject(src)` không làm mới thì giữ giá trị cũ; hai người dùng khác nhau trên cùng repo không dùng chung `canWrite`; `canWrite` không nằm trong `Project` được cache; `hlReadOnly` của shell có lý do "Your GitHub account has read-only access to {repo}. Ask for write access to comment." khi `canWrite === false`. Phải fail (research R16, spec FR-016 (a)).
- [X] T023 [US1] Trong `server/github.ts` đọc `permissions.push` từ `GET /repos/{o}/{r}` vào một map riêng theo `projectKey` (không vào `Cached.project`, vì `getProject` dùng lại `hit.main` khi commit không đổi: research R16), đọc khi tải lần đầu, và đọc lại khi `refresh === true` chỉ khi giá trị hiện tại là `false` (một lần làm mới yên tĩnh vẫn chỉ gọi commits và branches, spec 003 SC-001), và gắn `Project.canWrite` (`src/project/types.ts`) vào bản `getProject` trả về (`{ ...project, canWrite }`); kiểm tra đường tải của Pages (`src/backend.ts`) dùng cùng mã; trong `src/project/LiveWorkspace.tsx` thêm vào `hlReadOnly` lý do ở T022 (đứng sau `pinned` và lỗi file, trước `refused`); không thêm điểm đến mạng (tối đa một lời gọi repo mỗi lần làm mới, và chỉ cho người đang bị coi là chỉ đọc), không dò bằng ghi thử; trường hợp `null` giữ như 010 (học sau lần bị từ chối đầu, nhớ trong phiên). Làm T022 pass.

### Implementation for User Story 1

- [X] T024 [US1] Sửa `src/annotations/Toolbar.tsx`: thêm nút chính "Add comment" (thứ tự theo contract), bỏ nút "Note" khỏi hàng nút của vùng chọn **mới**; **giữ** trình sửa ghi chú nổi (`.sk-tb-note`, `onNote`) cho highlight có sẵn và cho bố cục hẹp cho tới khi thẻ có sửa/xoá (task xoá Note editor ở US2); trạng thái tắt kèm lý do (FR-016); chế độ sửa highlight có sẵn vẫn có ô màu (gồm đánh dấu đúng khi màu hiện tại là `n`) và Remove cho tác giả. Làm cùng commit với T026 (Toolbar và Annotator phải biên dịch cùng nhau). Cập nhật `tests/annotationsMarkup.test.tsx` cho nút mới.
- [X] T025 [P] [US1] Tạo `src/annotations/Composer.tsx`: thẻ `sk-cm-draft` với avatar (`src/annotations/Avatar.tsx`), tên, trích, textarea (tự lấy focus, ⌘/Ctrl+Enter gửi, Esc huỷ), Cancel / Comment, kiểm tra trống, hỏi "Discard this comment?" khi đã gõ.
- [X] T026 [US1] Sửa `src/annotations/Annotator.tsx`: state `drafts` theo khoá T021; Add comment (và `Ctrl+Alt+M` / `Cmd+Option+M` ở luồng `onKeyUp` của 010) mở `Composer` trong rail tại `top` của đoạn chữ; đánh dấu đoạn chữ bằng `::highlight(sk-draft)` (đăng ký trong `src/annotations/useHighlights.ts`); gửi thì tạo highlight màu `n` với `note` qua `save` có sẵn của 010 (xác nhận commit lần đầu, toast, lỗi giữ nội dung); chuyển đoạn chữ hoặc bước giữ nháp (hiện chấm "Draft" và nhắc khi quay lại, research R5), đổi spec hoặc nhánh khi có chữ thì hỏi (010 `pendingTarget`); lý do không lưu được lấy từ `store.readOnly` và `onRefused` (chỉ quyền đọc, nhánh bị bảo vệ hoặc đã xoá; lỗi 401 do hết phiên chỉ hiện thông báo và giữ nội dung, không tắt nút: spec edge case). **Ở bố cục hẹp** (chưa có sheet cho tới T037), Add comment dùng trình sửa ghi chú nổi của 010 làm hộp soạn tạm, vẫn tạo highlight màu `n`; T037 chuyển việc này sang sheet.
- [X] T027 [P] [US1] Sửa `src/annotations/HighlightsPanel.tsx`: chip lọc "Comment" kèm số (màu `n`) sau bốn màu; mục màu `n` có thanh `hl-n-solid` và nhãn "Comment"; `person` dùng `Avatar`. Test markup tương ứng trong `tests/annotationsMarkup.test.tsx`.
- [X] T028 [US1] Kiểm tra "Before you approve" (`src/project/GatePanel.tsx`, `src/App.tsx` demo): ghi chú màu `n` hiện sau Issue và trước các màu còn lại (dùng `briefNotes` từ T007); thêm test render vào `tests/annotationsMarkup.test.tsx` nếu chưa có.
- [ ] T029 [US1] Chạy quickstart kịch bản 1–5, 11, 13 ở server (và Pages, local, demo cùng luồng); sửa lỗi phát hiện.

**Checkpoint**: US1 chạy độc lập: tạo nhận xét không cần màu, thấy thẻ ở rail, nháp không mất, người chỉ có quyền đọc thấy nút tắt kèm lý do.

---

## Phase 4: User Story 2 - Thẻ thẳng hàng với đoạn chữ, chọn hai chiều (Priority: P1)

**Goal**: một trạng thái chọn duy nhất; thẻ mở rộng, đoạn chữ đậm hơn; chọn từ thẻ, đoạn chữ, ghim, tab Highlights; màn hình hẹp dùng sheet.

**Independent Test**: tài liệu có 3 nhận xét. Cuộn: mỗi thẻ đi cùng đoạn chữ. Bấm thẻ 2: đoạn chữ 2 đậm, hai đoạn kia dịu. Bấm đoạn chữ 3: thẻ 3 được chọn. Thu hẹp 390px: sheet dưới thay rail. (quickstart kịch bản 6, 7, 12, 14, 15, 16)

### Tests for User Story 2 (viết trước, phải fail)

- [X] T030 [P] [US2] Trong `tests/commentRailMarkup.test.tsx`: thẻ đang chọn có `aria-current="true"`, `.sk-cm-card.on`, hiện ghi chú đầy đủ và ô đổi màu cho tác giả; chỉ một thẻ chọn; vùng `aria-live="polite"` công bố "Comment n of m selected"; sheet `div.sk-cm-sheet[role=dialog]` chứa một thẻ hoặc Composer và nút đóng; thẻ Outdated chọn được.
- [X] T031 [P] [US2] Trong `tests/comments.test.ts`: `pickOverlap(anchors, offset, lastId)` chọn nhận xét mới nhất trong vùng chồng nhau và luân phiên khi bấm lại cùng chỗ (research R13); `nextSelection` cho ↑/↓ và Esc.

### Implementation for User Story 2

- [X] T032 [US2] Thêm `pickOverlap` và `nextSelection` (thuần) vào `src/annotations/comments.ts`. Làm T031 pass.
- [X] T033 [US2] Nâng trạng thái chọn lên shell (research R3): trong `src/App.tsx`, `src/project/LiveWorkspace.tsx`, `src/project/LocalWorkspace.tsx` thêm `selectedId` và `onSelect(id, { jump })`; `focusId` của 010 nay suy ra từ `jump`; (việc nối tab Highlights nằm ở T036); truyền `selectedId`, `onSelect` vào `Annotator` và `HighlightsPanel`.
- [X] T034 [US2] Sửa `src/annotations/useHighlights.ts` và `src/annotations/Annotator.tsx`: đăng ký `sk-sel` cho nhận xét đang chọn (đặt `priority` khi có hỗ trợ); bấm đoạn chữ (vùng chọn rỗng) chọn nhận xét (highlight có ghi chú) qua `pickOverlap`; bấm đoạn chữ của highlight chỉ có màu vẫn mở thanh công cụ của 010, không chọn thẻ (spec FR-008); bấm ghim chọn nhận xét; bấm ra ngoài hoặc Esc bỏ chọn; cuộn tới đoạn chữ khi `jump`.
- [X] T035 [US2] Sửa `src/annotations/CommentRail.tsx`: thẻ đang chọn mở rộng (đo chiều cao bằng `ResizeObserver`, truyền vào `layoutCards`), cuộn rail tới thẻ khi chọn từ đoạn chữ, ↑/↓ chọn thẻ trước và sau (`tabindex` 0 ở thẻ chọn, -1 ở thẻ khác), vùng `aria-live`, nhóm Outdated chọn được và sửa được cho tác giả; thẻ mở rộng có ô màu và menu Edit / Delete cho tác giả (dùng `update` / `remove` của 010; Edit sửa ghi chú ngay trong thẻ bằng `Composer` ở chế độ sửa; Delete có xác nhận) với khe `.sk-cm-thread` để 011 gắn nội dung.
- [X] T036 [US2] Sửa `src/annotations/HighlightsPanel.tsx`: mục đang chọn có trạng thái chọn; bấm mục gọi `onSelect(h.id, { jump: true })` thay cho `onOpen` cũ (giữ chữ ký tương thích cho ba shell).
- [X] T037 [US2] Bố cục hẹp (research R9) trong `src/annotations/CommentRail.tsx` và `src/styles/reader.css`: khi `.sk-doc` không đủ chỗ rail ẩn, ghim hiện; chọn nhận xét hoặc Add comment mở `sheet` dính đáy `.sk-doc` (tối đa 60% chiều cao, nút đóng, vùng bấm ≥ 44px); không cuộn ngang ở 390px; tôn trọng `prefers-reduced-motion` khi thẻ đổi chỗ.
- [X] T038 [US2] Sau khi thẻ có Edit/Delete (T035) và sheet ở bố cục hẹp (T037), bỏ trình sửa ghi chú nổi của 010: xoá `.sk-tb-note`, `noting` và `onNote` khỏi `src/annotations/Toolbar.tsx`, `src/annotations/Annotator.tsx` và `src/styles/reader.css`; bấm ghim (bố cục hẹp) mở thẻ trong sheet thay cho trình sửa nổi; cập nhật `tests/annotationsMarkup.test.tsx` cho phần đã bỏ.
- [X] T039 [US2] Chạy quickstart kịch bản 6, 7, 12, 14, 15, 16 (tạo 200 nhận xét mẫu; đo mở tài liệu, chuyển bước, đổi cỡ chữ dưới 1 giây, SC-006); sửa lỗi phát hiện.

**Checkpoint**: US1 và US2 chạy cùng nhau: đây là MVP (nhận xét kiểu Google Docs, một trạng thái chọn, dùng được trên điện thoại).

---

## Phase 5: User Story 3 - Biết nhận xét đã lưu, và hiểu khi nào người khác thấy (Priority: P2)

**Goal**: trạng thái lưu trên từng thẻ; kiểm tra nhận xét mới định kỳ với dấu "New comments", chỉ áp khi bấm.

**Independent Test**: gửi nhận xét lúc mạng chậm: thẻ "Sending…", rồi "Saved · commit abc1234". Ngắt mạng: thẻ lỗi và Retry, nội dung còn. Ở máy khác thêm nhận xét: máy đầu thấy "New comments (1)" trong 2 phút, không thay đổi gì khác, bấm thì áp. (quickstart kịch bản 8, 9, 10)

### Tests for User Story 3 (viết trước, phải fail)

- [ ] T040 [P] [US3] Trong `tests/comments.test.ts`: `reducePending` (`start` → `sending`; `ok` → `saved` kèm commit; `fail` → `failed` kèm `error` và `change`; `retry` giữ nguyên `id`, không tạo `id` mới; một `id` tối đa một thay đổi `sending`); `diffIncoming` đếm `added` và `changed` theo `id` và `updatedAt`; `nextPollDelay`: 60 s, lỗi nhân đôi tới 10 phút, thành công về 60 s, `visible=false` không hẹn giờ.
- [ ] T041 [P] [US3] Tạo `tests/freshness.test.ts`: controller trong `src/annotations/freshness.ts` với đồng hồ và `read` được tiêm: gọi đúng chu kỳ; 304 chỉ cập nhật `checkedAt`; 200 có khác biệt lưu `incoming` và tăng `newCount` mà không áp; dừng khi tab ẩn và kiểm tra ngay khi hiện lại; đổi spec hoặc nhánh đặt lại `etag`; backoff; 401 dừng; áp dữ liệu giữ thay đổi đang gửi.
- [ ] T042 [P] [US3] Trong `tests/fakeGitHub.ts` thêm `ETag` cho `GET …/contents/specs/*/highlights.json` (dùng `blobSha`), trả 304 khi `If-None-Match` khớp, và bộ đếm số yêu cầu GET để test chu kỳ.
- [ ] T043 [P] [US3] Trong `tests/highlights.test.ts`: `readHighlights` trả `ok` kèm `etag`, `unchanged` khi `etag` khớp, danh sách rỗng khi 404, lỗi 401/403/429 đúng loại, `error` của `parseHighlights` khi file hỏng; route `GET /api/highlights` (200, 304, 404 → rỗng, 405 với phương thức khác, thiếu `repo`/`slug`/`branch` → 400) và không rò token hay lỗi thô của GitHub.

### Implementation for User Story 3

- [ ] T044 [US3] Trong `server/github.ts` thêm tham số tuỳ chọn `extra?: { headers?: Record<string, string>; allow304?: boolean }` cho `gh()` (research R15); `allow304` trả 304 như `Response` thường; mặc định không đổi hành vi. Kiểm tra các lời gọi hiện có không bị ảnh hưởng (`tests/backend.test.ts`, `tests/tracking.test.ts`).
- [ ] T045 [US3] Trong `server/highlights.ts` thêm `readHighlights(src, { slug, branch, etag })` → `{ status: 'ok', items, error, etag } | { status: 'unchanged' }` (404 → rỗng); dùng `gh` với `If-None-Match` và `allow304`; dùng `parseHighlights`. Làm T043 phần đọc pass.
- [ ] T046 [US3] Trong `server/routes.ts` cho phép `GET /api/highlights` (hiện đường dẫn này nằm trong `POSTS` nên GET bị 405): tách theo phương thức, GET không thuộc `JSON_WRITES`, kiểm tra tham số, chuyển `ETag` và 304 theo `contracts/refresh-api.md`, dùng lại đúng kiểm tra `access`/`sourceFor` của các route GET khác (như `/api/spec`), không đưa token hay lỗi thô vào phản hồi.
- [ ] T047 [US3] Trong `src/backend.ts` thêm `readHighlights(repo, slug, branch, etag)` vào `Backend`: server gọi `GET /api/highlights`, Pages gọi `readHighlights` từ `server/highlights.ts` với `src` hiện có.
- [ ] T048 [US3] Sau T047: trong `src/annotations/store.ts` thêm `refresh?` cho `HighlightStore`: `gitHubStore` gọi `backend.readHighlights`; `localFileStore` đọc lại `specs/{slug}/highlights.json` và dùng `lastModified` làm `etag`; `demoStore` không có.
- [ ] T049 [US3] Thêm `reducePending`, `diffIncoming`, `nextPollDelay` (thuần) vào `src/annotations/comments.ts`. Làm T040 pass.
- [ ] T050 [US3] Tạo `src/annotations/freshness.ts` (controller thuần theo T041) và `src/annotations/useFreshness.ts` (nối React: `document.visibilityState`, `visibilitychange`, cửa sổ focus cho local, dọn timer). Làm T041 pass.
- [ ] T051 [US3] Sửa `src/annotations/Annotator.tsx`: gửi nhận xét ở dạng lạc quan (thẻ hiện ngay `sending`), thành công thì thẻ ghi "Saved · commit {sha7}" (liên kết) hoặc "Saved to folder" / "Saved in this browser", thất bại thì "Failed: {lý do}" kèm "Retry" gọi lại đúng `change` (không tạo trùng nhờ `applyChange` bỏ qua `id` đã có), chặn gửi lặp khi `sending`, công bố qua vùng `aria-live`. Thêm khung `.sk-cm-state` ở `src/annotations/CommentRail.tsx`.
- [ ] T052 [US3] Sửa `src/annotations/CommentRail.tsx` và `src/annotations/HighlightsPanel.tsx`: nút `button.sk-cm-new` "New comments (n)" ở đầu rail và cùng số ở đầu tab Highlights, nút "↻ Refresh", dòng "Updated {rel}"; bấm thì áp `incoming` giữ thay đổi đang gửi, thẻ đang chọn và nháp; không đổi gì khác trên màn hình khi chỉ có dấu (SC-010).
- [ ] T053 [US3] Nối `useFreshness` vào shell: `src/project/LiveWorkspace.tsx` (server và Pages, chu kỳ 60 s), `src/project/LocalWorkspace.tsx` (khi cửa sổ được focus và khi bấm làm mới), `src/App.tsx` (demo: không kiểm tra, nút làm mới ẩn). Đổi spec hoặc nhánh thì đặt lại `etag`, `incoming`, `failures`.
- [ ] T054 [US3] Chạy quickstart kịch bản 8, 9, 10 trên GitHub thật bằng tay (kiểm chứng `If-None-Match` qua CORS ở Pages, research R15; nếu preflight từ chối thì dùng phương án dự phòng trong R15 và ghi vào research); sửa lỗi phát hiện.

**Checkpoint**: cả ba story hoạt động độc lập và cùng nhau.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T055 [P] Cập nhật `README.md` mục Highlights: nút Add comment và phím tắt, rail, nhận xét không màu, trạng thái lưu, kiểm tra nhận xét mới định kỳ (và ở local khi cửa sổ được focus), người chỉ có quyền đọc xem được nhưng không nhận xét được, không có quyền hay điểm đến mạng mới.
- [ ] T056 Chạy cả bốn cổng chất lượng: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`; sửa mọi lỗi. Không test nào được ghi GitHub thật.
- [ ] T057 **[BLOCKED bởi bản thiết kế]** So ảnh giao diện (constitution IV): demo ở 1440×900 và 924×540, màn hình chính và hộp thoại New spec. Demo mở sẵn feature `003` có nhận xét mẫu, nên phải khớp bản `Speckit Workspace.html` **cập nhật có rail do người dùng cung cấp** từng pixel (SC-008, điều kiện merge, plan mục Constitution Check IV); xoá `sk.demo.highlights` thì không có rail và phải khớp thiết kế gốc. Kiểm tra màu `n`, `sk-sel`, `sk-draft` đọc được trên cả bốn nền chế độ đọc và không có mã màu cứng mới.
- [ ] T058 **[BLOCKED bởi bản thiết kế]** Nếu bản thiết kế mới khác `contracts/comment-rail-ui.md` thì bản thiết kế thắng: sửa contract và code theo, ghi lại trong `specs/012-docs-style-comment-flow/research.md`.
- [ ] T059 Chạy toàn bộ quickstart (kịch bản 1–17, gồm thử người dùng mới bấm giờ ở kịch bản 17 cho SC-002) ở bốn chế độ, ghi kết quả vào `specs/012-docs-style-comment-flow/quickstart.md` (mục kết quả); chụp ảnh ở 390px.
- [ ] T060 Mô tả PR: nêu `specs/012-docs-style-comment-flow`, `Closes #<issue theo dõi "Spec 012: …">` (hoặc `Part of #…` nếu còn PR sau), liệt kê chế độ bị ảnh hưởng (cả bốn) và phần demo khác thiết kế cũ (rail). Nhánh session đang mang spec 005 (chưa có trên `main`) và spec 011: tạo `feat/012-docs-style-comment-flow` từ `main` rồi cherry-pick chỉ các commit của 012 (`specs/012-…` và code), hoặc tách lúc mở PR, để PR không kéo theo 005 và 011.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: không phụ thuộc.
- **Foundational (Phase 2)**: sau Setup; **chặn** mọi user story.
- **US1 (Phase 3, P1)**: sau Foundational.
- **US2 (Phase 4, P1)**: sau Foundational; làm được song song với US1 ở file khác nhau nhưng cả hai sửa `Annotator.tsx` và `CommentRail.tsx`, nên nên làm tuần tự US1 rồi US2 (hoặc phối hợp merge).
- **US3 (Phase 5, P2)**: sau Foundational; phần server và store (T044–T048) làm được song song với US1 và US2; phần giao diện (T051–T053) cần `CommentRail.tsx` ổn định (sau US2).
- **Polish (Phase 6)**: sau các story cần có; T057 và T058 (so ảnh với thiết kế và sửa contract theo thiết kế) **bị chặn** cho tới khi bạn cung cấp bản `Speckit Workspace.html` có rail.

### Within Each Story

- Test viết trước và phải fail, rồi mới code.
- Logic thuần (`layout.ts`, `comments.ts`, `freshness.ts`) trước component.
- Server trước client trước shell trước kiểm tay.

### Parallel Opportunities

- Phase 2: T004, T006, T008, T009, T013, T015 (file khác nhau; T011 cùng file với T006 nên chạy sau T006).
- US1: T019 và T021 (test, file khác nhau; T020 cùng file với T019 nên chạy sau); T025 và T027 (file khác nhau).
- US2: T030, T031 (test).
- US3: T040, T041, T042, T043 (test); T048 chạy sau T047 vì dùng chữ ký của `readHighlights` (T047).

### Parallel Example: Foundational

```text
Song song:   T004 (tests/highlights.test.ts)   T006 (tests/comments.test.ts)   T009 (tests/layout.test.ts)
             T008 (src/styles/reader.css)      T013 (src/annotations/Avatar.tsx)
Rồi:         T005 → T007 → T010 → T012 → T014 → T016 → T017
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1 và Phase 2 (màu `n`, bố trí, khung rail).
2. US1: Add comment, Composer, không bắt chọn màu.
3. US2: một trạng thái chọn, thẻ thẳng hàng, màn hình hẹp.
4. **DỪNG và kiểm**: quickstart 1–7, 11–16. Đây đã là trải nghiệm nhận xét kiểu Google Docs; có thể demo.

### Incremental Delivery

1. Foundational → rail hiện nhận xét có sẵn.
2. + US1 → tạo nhận xét bằng nút chính.
3. + US2 → chọn hai chiều, điện thoại.
4. + US3 → trạng thái lưu và nhận xét mới của người khác.
5. Polish → README, cổng chất lượng, so ảnh với bản thiết kế cập nhật.

### Ghi chú

- Điều kiện merge: bản `Speckit Workspace.html` có rail (T057, T058). Không có thì PR chưa merge được.
- Spec 011 (trả lời, emoji, giải quyết) dùng khe `.sk-cm-thread` từ T035; không làm ở đây.
- Mỗi lần ghi vẫn chỉ đổi `specs/NNN-slug/highlights.json`; không task nào được thêm file ghi khác, quyền token hay điểm đến mạng.
