# Tasks: Lưu nhận xét theo hai cách (tức thì, hoặc giữ trong trình duyệt tới khi Save)

**Input**: `specs/016-deferred-save/` (spec.md, plan.md, research.md, data-model.md, contracts/batch-save-api.md, contracts/save-bar-ui.md, quickstart.md)

**Tests**: Có. Constitution V; thêm test cho phần thuần (`foldPending`, `compactPending`, lưu trữ), `saveHighlights` (dùng `tests/fakeGitHub.ts` như `tests/highlights.test.ts`), `deferredStore`, `SaveBar` và CSS. Dữ liệu tự tạo, GitHub giả. Test hiện có của 010–015 phải giữ nguyên hành vi cho local và demo.

**Format**: `- [ ] T### [P?] [US?] Mô tả kèm đường dẫn`. `[P]` = làm song song được (file khác, không phụ thuộc việc chưa xong).

**Thứ tự quan trọng**: sửa constitution 1.4.3 (T002) **trước** khi có mã ghi một lần (T005) và cùng PR; chế độ local và demo không được đổi (US4 kiểm ở Phase 6, và mọi phase phải giữ `localFileStore`, `demoStore` nguyên vẹn); đường `change` cũ của `/api/highlights` giữ nguyên (tương thích); không phase nào đổi `highlights.json`.

## Phase 1: Setup

- [X] T001 Baseline trên nhánh đã gộp `main`: `npm ci`; `npm test` (530), `npm run typecheck`, `npm run build`, `npm run build:pages` đều qua. Chụp ảnh "trước" vào scratchpad (ngoài repo): demo 1440×900 và 924×540 (chính, New spec), popup 1440/390; ghi các test của local (`tests/localMode.test.tsx`, `tests/localHighlights*.test.*` nếu có) đang qua. Ghi số test.

## Phase 2: Foundational — hàng đợi thuần và ghi một lần (chặn mọi story)

- [X] T002 Sửa constitution lên 1.4.3 (patch) bằng `/speckit-constitution` (nhật ký sửa đổi, Sync Impact Report, Last Amended): nguyên tắc I làm rõ "mỗi lần lưu" là mỗi lần người dùng bấm Save, một commit có thể gồm nhiều thay đổi nhận xét của spec đang xem; hàng đợi thay đổi chưa lưu trong trình duyệt là nháp, không phải kho dữ liệu của dự án (như nháp bình luận và `prefs`). Cập nhật số phiên bản tham chiếu trong `CLAUDE.md` (1.4.2 → 1.4.3). Không đổi nguyên tắc nào khác.
- [X] T003 [P] Tạo `src/annotations/pending.ts` (phần thuần): kiểu `PendingChange { id, change, by, at }`; `foldPending(saved, queue)` (truyền `at` của từng mục làm `now` cho `applyChange`, R11) trả `{ items, applied, skipped }` (áp từng thay đổi bằng `applyChange` từ `server/highlightsFile`, bắt `HighlightError` và bỏ qua thay đổi đó, không chặn các thay đổi sau; thứ tự giữ nguyên); `compactPending(queue)` với các quy tắc R4 (xoá mục do hàng đợi `add` bỏ `add` và mọi thay đổi tới nó; hai `update` cùng mục gộp, `update` sau `add` gộp vào `add`; `react` bật rồi tắt cùng emoji cùng đích bỏ cả hai; `reply` rồi `reply-remove` cùng id bỏ cả hai, `reply` rồi `reply-edit` gộp thành `reply` chữ mới; còn lại giữ nguyên thứ tự); `unsavedIds(queue)` (id nhận xét và trả lời chưa lưu, cho dấu "Not saved"). Test `tests/pending.test.ts`: từng quy tắc gộp, bất biến `fold(saved, compact(q))` cho cùng nhận xét và nội dung như `fold(saved, q)` (so sánh bỏ `updatedAt`) trên một bộ hàng đợi tổ hợp, thay đổi bị bỏ qua khi đích không còn, thứ tự, hàng đợi rỗng.
- [X] T004 Trong `src/annotations/pending.ts` (lưu trữ; sau T003, cùng file): `pendingKey(login, repo, branch, slug)` = `sk.pending.v1.{login}.{repo}@{branch}.{slug}`; `pendingStorage(where: 'local' | 'session')` (theo `storage` của `Root`: bật "Remember" thì `localStorage`, tắt thì `sessionStorage`, R5), `listPending(login, repo, where)` (đếm thay đổi chưa lưu ở mọi spec và nhánh của repo) với `load`, `save`, `clear` (JSON `{ v: 1, changes }`, sai khuôn dạng hoặc phiên bản lạ → rỗng, tối đa 500 thay đổi, mọi truy cập `try/catch`, trả `persistent: false` khi chặn hoặc đầy và giữ trong bộ nhớ); hook `usePending(key, storage)` trả `{ queue, add(change, by), discard(), clear(), persistent }`, dùng `compactPending` khi thêm, đồng bộ qua sự kiện `storage` giữa hai tab, đổi `key` thì nạp hàng đợi của key mới. Test `tests/pendingStorage.test.ts` với `Storage` giả (cả hai loại): chỉ có `v` và `changes` trong giá trị lưu (không khoá, token), `listPending`, nạp/lưu, khoá riêng theo tài khoản, repo, nhánh, spec, sai khuôn dạng, đầy bộ nhớ → `persistent: false`, giới hạn 500, đổi tài khoản không thấy hàng đợi cũ.
- [X] T005 Ghi một lần ở server và Pages. Trong `server/highlightsFile.ts`: `commitMessageBatch(changes, user, slug)` (một thay đổi dùng `commitMessage` cũ; nhiều thay đổi: `{user} saved {N} comment changes on {slug} [skip ci]`, luôn có `[skip ci]`). Trong `server/highlights.ts`: `saveHighlights(src, { slug, branch, changes, user })` trả `{ items, commit: {sha,url} | null, skipped: {index,error}[] }`: đọc file, áp lần lượt, thay đổi ném `HighlightError` 409 hoặc 403 bị bỏ qua và ghi vào `skipped`, lỗi khác dừng cả lần; không commit khi danh sách không đổi; một PUT, vòng thử lại 3 lần khi 409/422 đọc lại và áp lại cả danh sách; giữ `saveHighlight` cũ làm trường hợp một thay đổi (gọi `saveHighlights`). Trong `server/routes.ts`: `handleHighlight` nhận `changes` (1–200 phần tử, mỗi phần tử qua `changeShapeOk`) bên cạnh `change`, và đọc thân với giới hạn `MAX_BYTES` (512 KiB) thay cho 8.000 ký tự của `readJson` mặc định (U1; các đường khác giữ nguyên). Trong `src/backend.ts`: `Backend.saveHighlights(repo, slug, branch, changes)` cho server (POST `changes`) và Pages (gọi `saveHighlights` trực tiếp với `me.login`). Test `tests/saveHighlights.test.ts` (dùng `tests/fakeGitHub.ts`): N thay đổi → đúng một PUT và một commit `[skip ci]`; thay đổi tới mục đã bị xoá bị bỏ qua và phần còn lại vẫn ghi; không đổi gì → không commit; thử lại khi 409; 0 hoặc quá 200 phần tử bị từ chối; một lô 20 nhận xét dài được nhận qua `handleApi`, quá `MAX_BYTES` bị từ chối; thân `change` cũ vẫn chạy; tác giả là người đăng nhập, không tin trang; thông điệp một thay đổi giống cũ.

**Checkpoint**: `npm test` và `npm run typecheck` qua; UI chưa đổi.

## Phase 3: User Story 1 — Thao tác tức thì, không chờ commit (P1) 🎯 MVP

**Mục tiêu**: ở Pages và server, mọi thao tác nhận xét hiện ngay, được giữ trong trình duyệt, đánh dấu "Not saved", không gọi GitHub.

**Kiểm độc lập**: quickstart 1, 2, 9, 11.

- [X] T006 [US1] Trong `src/annotations/store.ts`: `HighlightStore.deferred?: boolean`; `deferredStore(inner, { view, saved, add })` trả cửa hàng cùng giao diện với `kind: 'github'`, `deferred: true`, `refresh` và `readOnly` của `inner`; `save({slug, branch}, change, by)` chạy `applyChange(view(), change, by)` (để lỗi quyền, mục đã xoá, ghi chú quá dài báo ngay như trước), rồi `add(change, by)` và trả `{ items: saved() }` (dữ liệu đã lưu, không đổi, không `commit`). Test `tests/deferredStore.test.ts`: lưu không gọi `inner.save`, lỗi `applyChange` được ném và không vào hàng đợi, trả đúng `items` đã lưu, `readOnly` và `refresh` truyền qua, `kind` và `deferred`.
- [X] T007 [P] [US1] Trạng thái "Not saved": trong `src/annotations/comments.ts` thêm `{ state: 'queued' }` vào `SaveState`; trong `src/annotations/CommentRail.tsx` (`SaveNote`) hiển thị "Not saved" (`data-state="queued"`, `role="status"`, không có Retry); `reducePending` bỏ qua `queued` (chỉ do hàng đợi sinh ra). Trong `src/styles/reader.css` thêm kiểu cho `.sk-cm-state[data-state="queued"]` (token, không màu mới, không bo góc). Test: `tests/commentRailMarkup.test.tsx` và `tests/threadMarkup.test.tsx` (thẻ và trả lời có `queued` hiện "Not saved", không phai), `tests/hoverCss.test.ts` (không `border-radius`, không màu cứng trong khối mới).
- [X] T008 [US1] Trong `src/annotations/Annotator.tsx`: khi `store.deferred`: `save()` không mở hộp xác nhận từng thao tác, `run()` không phát trạng thái `sending` hay `saved` (dispatch `clear` hoặc bỏ qua), vẫn gọi `onItems` (nhận danh sách đã lưu, vô hại), `forget` và `dropOverlay` như cũ; nhận prop `unsaved?: Record<string, SaveState>` (từ `unsavedIds`) trộn vào `pending` cho `toCards` và `Thread.save`; xuất `ConsentDialog` để dùng ở nơi khác (T013). Không đổi hành vi khi `store.deferred` vắng (local, demo, test cũ).
- [X] T009 [US1] Trong `src/project/LiveWorkspace.tsx`: `usePending` theo `pendingKey(user.login, project.repo, hlBranch, f.slug)` (localStorage luôn dùng, không theo "Remember"); `savedHls` giữ dữ liệu đã lưu; `view = foldPending(saved, queue).items` là danh sách đưa cho `Annotator`, `HighlightsPanel`, `briefNotes`; `hlStore = deferredStore(gitHubStore(...), { view, saved, add })`; bộ kiểm làm mới (`useFreshness.current`) dùng danh sách đã lưu, không dùng danh sách có hàng đợi; truyền `unsaved` (từ `unsavedIds`) cho `Annotator`; đổi spec hoặc nhánh thì nạp hàng đợi của spec đó (đã có trong `usePending`). Không đổi `LocalWorkspace` hay demo.
- [X] T010 [P] [US1] Test kết xuất `tests/commentRailMarkup.test.tsx` và `tests/annotationsMarkup.test.tsx` cho đường `store.deferred` (không hộp xác nhận, không `Sending`); cập nhật các test cũ phụ thuộc "Saved · commit" chỉ cho nhánh github không hoãn (giữ cho `gitHubStore` thường).
- [X] T011 [US1] Playwright (GitHub giả, server): viết nhận xét và thả emoji: hiện ngay dưới 0,3 giây, "Not saved", kho giả 0 commit; tải lại: còn nguyên, vẫn "Not saved"; viết rồi xoá một nhận xét chưa lưu: không còn gì; thả rồi gỡ emoji: không còn gì; đổi tài khoản (`me`): không thấy hàng đợi; ghi kết quả vào `quickstart.md`.

**Checkpoint**: US1 chạy độc lập (chưa có nút Save: thay đổi nằm trong trình duyệt).

## Phase 4: User Story 2 — Bấm Save một lần để ghi tất cả (P1)

**Mục tiêu**: thanh "N changes not saved" với Save; một commit; xác nhận lần đầu; lỗi giữ nguyên; hợp nhất với người khác.

**Kiểm độc lập**: quickstart 3, 4, 5, 6, 10.

- [X] T012 [US2] Tạo `src/annotations/SaveBar.tsx` theo `contracts/save-bar-ui.md`: props `{ count, saving, error, readOnly, persistent, onSave, onDiscard }`; `role="status"`; chữ "N change(s) not saved"; nút Save (nhãn "Saving…" khi đang lưu, `aria-disabled` kèm lý do khi `readOnly`) và Discard (bước xác nhận tại chỗ "Discard N changes? Keep / Discard", làm trong T015); lỗi kèm Retry; dòng cảnh báo khi `persistent` là false; không hiện khi `count` là 0. CSS trong `src/styles/reader.css` (token, vuông, không màu mới, 44 px trên cảm ứng, không cuộn ngang ở 390 px). Test `tests/saveBar.test.tsx` (kết xuất tĩnh cho các trạng thái) và kiểm CSS trong `tests/hoverCss.test.ts`.
- [X] T013 [US2] Trong `src/project/LiveWorkspace.tsx`: `saveAll()`: nếu `askConsent` hiện `ConsentDialog` (xuất từ T008) trước khi ghi (chấp nhận thì `prefs.setHighlightConsent`, từ chối giữ nguyên hàng đợi); gọi `backend.saveHighlights(project.repo, f.slug, hlBranch, compactPending(queue).map(q => q.change))`; chụp danh sách gửi đi trước khi ghi và tắt Save trong lúc ghi; thành công: `setSavedHls` bằng `items` trả về, chỉ bỏ khỏi hàng đợi các mục đã gửi (giữ mục làm trong lúc ghi, R10), hiện "Saved · commit abc1234" (liên kết) và, nếu có `skipped`, "N changes skipped" kèm lý do; thất bại: giữ hàng đợi, hiện lý do trong `SaveBar`, Retry gọi lại; lỗi `cannot commit to|no longer exists|read-only` gọi `setRefused` như cũ. Đặt `SaveBar` giữa thanh bước và khung đọc, và truyền cùng props cho đầu tab Highlights (`HighlightsPanel`). `hlReadOnly` làm Save tắt kèm lý do.
- [X] T014 [P] [US2] Cập nhật `src/annotations/HighlightsPanel.tsx` để nhận và hiện `SaveBar` ở đầu (prop `saveBar?: ReactNode`), kèm test `tests/highlightsPanelActions.test.tsx` (có thanh khi có `saveBar`, không có thì như cũ).
- [X] T015 [US2] Playwright (GitHub giả, server): viết hai nhận xét và thả ba emoji, bấm Save: lần đầu hiện hộp xác nhận, chấp nhận: đúng một commit `[skip ci]` chứa cả năm thay đổi, thanh và "Not saved" mất, toast "Saved · commit"; Save lỗi (route 500): thanh ở lại với lý do và Retry, hàng đợi còn nguyên, Retry thành công đúng một commit, không nhân đôi; hợp nhất: ghi nhận xét của người khác vào kho giả khi còn thay đổi chưa lưu, làm mới, thấy cả hai, Save: file có cả hai; người khác xoá nhận xét mình đã trả lời: Save lưu phần còn lại, báo "1 change skipped"; `push:false`: Save tắt kèm lý do; ghi kết quả vào `quickstart.md`.

**Checkpoint**: US1 + US2 là MVP.

## Phase 5: User Story 3 — Bỏ thay đổi và không mất dữ liệu bất ngờ (P2)

**Mục tiêu**: Discard có xác nhận; nhắc khi rời trang; hai tab; bộ nhớ chặn.

**Kiểm độc lập**: quickstart 7, 8, 13.

- [ ] T016 [US3] Trong `src/annotations/SaveBar.tsx` và `src/project/LiveWorkspace.tsx`: Discard với bước xác nhận (Keep / Discard), Discard xoá hàng đợi qua `usePending.discard()` và không gọi mạng; `beforeunload` (đăng ký khi có thay đổi chưa lưu ở bất kỳ spec hoặc nhánh nào của repo qua `listPending`, gỡ khi không còn), thông báo "N unsaved in other specs" trong `SaveBar`, và hỏi xác nhận khi đổi repo lúc hàng đợi không lưu được vào bộ nhớ trình duyệt (`persistent: false`) với `preventDefault` và `returnValue`; khi `persistent` là false thanh nói thay đổi sẽ mất nếu đóng tab. Test: `tests/saveBar.test.tsx` (xác nhận Discard) và test nhỏ cho hàm đăng ký `beforeunload` (tách thành hàm thuần `guardUnload(active)`).
- [ ] T017 [US3] Playwright: Discard: hỏi xác nhận, xác nhận thì về trạng thái đã lưu và 0 yêu cầu ghi; đóng tab khi có hàng đợi: có hộp nhắc của trình duyệt (bắt sự kiện `beforeunload`), hết hàng đợi: không nhắc; hai tab cùng spec: thao tác ở tab A hiện ở tab B qua sự kiện `storage`, Save ở A xoá "Not saved" ở B; chặn `localStorage` (chế độ riêng tư): thanh có cảnh báo, thay đổi vẫn dùng được trong tab; ghi kết quả vào `quickstart.md`.

## Phase 6: User Story 4 — Local và demo giữ nguyên lưu tức thì (P1)

**Mục tiêu**: chắc chắn hai chế độ không qua commit không đổi hành vi hay hình ảnh.

**Kiểm độc lập**: quickstart 12.

- [ ] T018 [US4] Xác nhận không đổi: grep `deferredStore`, `usePending`, `SaveBar` chỉ nằm ở `LiveWorkspace` và phần dùng chung; `LocalWorkspace.tsx`, `localFileStore`, `demoStore` không đổi; `npm test` giữ nguyên toàn bộ test của local và demo (không sửa khẳng định nào của chúng); thêm test `tests/storeKinds.test.ts`: `localFileStore` và `demoStore` không có `deferred`, `gitHubStore` thường cũng không (chỉ `deferredStore` có).
- [ ] T019 [US4] Playwright: ở demo (`?demo`) và thư mục local (nếu giả lập được; nếu không, ghi rõ chỉ kiểm bằng test) mỗi thao tác ghi ngay, không thanh chưa lưu, không "Not saved"; so ảnh demo 1440×900 và 924×540 (chính, New spec) và popup với ảnh T001: giống từng byte; ghi kết quả vào `quickstart.md`.

## Phase 7: Polish & cross-cutting

- [ ] T020 [P] Cập nhật `README.md` mục Highlights: ở GitHub Pages và server, nhận xét được giữ trong trình duyệt ("Not saved") cho tới khi bấm Save (một commit), có Discard, nhắc khi đóng tab; local và demo lưu ngay; liên kết `specs/016-deferred-save/`.
- [ ] T021 Chụp màn hình 390 px giả lập và bốn giao diện trang (White, Sepia, Green, Dark) cho `SaveBar` và dấu "Not saved"; xác nhận đọc được, không cuộn ngang, nút ≥ 44 px trên cảm ứng; sửa `reader.css` nếu cần; ghi kết quả vào `quickstart.md`.
- [ ] T022 Chạy quickstart 1–14 ở server (GitHub giả) và demo; Pages: `build:pages` và, nếu chạy được bản tĩnh với GitHub giả, kiểm tay; local chỉ ghi rõ có chạy hay chỉ test; chạy đủ bốn cổng: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`; kiểm không còn mã chết (hộp xác nhận từng thao tác trong đường github thường, `saveHighlight` không ai gọi) bằng `tsc` và grep.
- [ ] T023 Mô tả PR (nháp, chưa tạo PR): nêu `specs/016-deferred-save`, `Closes #<issue "Spec 016: …">` (tạo issue nhãn `speckit` khi người dùng yêu cầu PR), chế độ bị ảnh hưởng (Pages và server đổi; local và demo không), API `changes` mới ở `/api/highlights` (cùng đường ghi, không loại ghi mới), constitution 1.4.3, ảnh demo giống hệt trước. Không tạo PR trước khi người dùng yêu cầu.

## Dependencies & Execution Order

- Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7.
- T002 (constitution) trước T005 (mã ghi một lần) và cùng PR. Trong Phase 2: T003, T004 song song (cùng file `pending.ts` nhưng hai phần độc lập: làm T003 rồi T004 trong một commit, hoặc tách file nếu cần); T005 song song với T003–T004 (file khác).
- Trong Phase 3: T006 sau T003–T004; T007 song song với T006 (file khác); T008 sau T006–T007; T009 sau T008; T010 sau T009; T011 sau cùng.
- Trong Phase 4: T012 trước T013; T014 song song với T012; T015 sau cùng. T013 cần T005 (API) và T008 (`ConsentDialog`).
- Phase 5 sau Phase 4 (cần thanh Save). Phase 6 có thể chạy sớm hơn bằng test nhưng ảnh so sánh làm sau Phase 4.
- Phase 7 sau cùng; T020 và T021 song song được.

## Parallel Example

```text
Phase 2:  T003→T004 (pending)   ∥  T005 (ghi một lần, server và Pages)  — sau T002 cho T005
Phase 3:  T006 (deferredStore)  ∥  T007 (trạng thái queued)
Phase 4:  T012 (SaveBar)        ∥  T014 (HighlightsPanel)
Polish:   T020 (README)         ∥  T021 (390 px và bốn giao diện)
```

## Implementation Strategy

- **MVP**: Phase 1–4 (US1 + US2): thao tác tức thì, giữ trong trình duyệt, bấm Save một commit. Dừng và kiểm quickstart 1–6, 9–12.
- **Tiếp**: US3 (Discard, nhắc rời trang, hai tab), US4 (xác nhận local và demo), rồi Polish.
- Mỗi phase kết thúc bằng một commit; `npm test` và `npm run typecheck` qua trước khi sang phase sau. Không merge nếu constitution 1.4.3 chưa vào cùng PR.
