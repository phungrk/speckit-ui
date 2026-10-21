# Research: Chú thích (highlight và ghi chú) trên tài liệu của spec (010-spec-annotations)

## R1. Ghi file highlight lên GitHub (server, Pages)

- **Decision**: Dùng Contents API: `GET /repos/{o}/{r}/contents/{path}?ref={branch}` lấy nội dung và
  `sha` của blob, rồi `PUT /repos/{o}/{r}/contents/{path}` với `message`, `content` (base64), `sha`
  (bỏ trống khi tạo file mới) và `branch`. Mỗi lần lưu là một commit (FR-009). Code nằm trong
  module dùng chung mới `server/highlights.ts` (không dùng API riêng của Node), để bản server và bản
  Pages chạy cùng một code (constitution III). `gh()` trong `server/github.ts` thêm phương thức `PUT`.
- **Rationale**: Contents API tạo đúng một commit, chỉ đổi đúng một file, và từ chối khi `sha`
  không khớp, nên ghi đồng thời không đè nhau (FR-012). Không cần Git Data API (blob, tree, commit,
  ref) vì chỉ có một file.
- **Alternatives**: Git Data API (4 lời gọi cho một commit, chỉ cần khi đổi nhiều file); đẩy qua PR
  (trái với "lưu là chia sẻ ngay").

## R2. Ghi đồng thời (FR-012)

- **Decision**: Đọc file mới nhất (`sha` + nội dung), áp thay đổi lên bản đó theo mã highlight
  (thêm, thay, xoá đúng mã), `PUT` với `sha` đã đọc. Gặp `409 Conflict` hoặc `422` có `sha` sai
  thì đọc lại và áp lại, tối đa 3 lần, rồi báo lỗi; thay đổi đang soạn còn nguyên (FR-015).
- **Rationale**: Thay đổi là theo từng mã, nên áp lại trên bản mới luôn đúng, trừ khi chính
  highlight đó bị người khác xoá (khi đó lưu bị từ chối với lý do rõ ràng).
- **Alternatives**: Khoá ở server (bản Pages không có server); ghi đè (mất dữ liệu).

## R3. Tên, vị trí và định dạng file

- **Decision**: `specs/NNN-slug/highlights.json`. Định dạng ở
  [contracts/highlights-file.md](contracts/highlights-file.md): `{ "version": 1, "highlights": [...] }`,
  mỗi phần tử theo data-model. JSON được ghi có thụt lề 2 và sắp theo `createdAt` để diff trong PR
  dễ đọc. Ngưỡng kích thước: 512 KB (khoảng 1.500 highlight có ghi chú dài tối đa), vượt thì từ chối
  lưu (FR-013).
- **Rationale**: Nằm trong thư mục spec nên đi theo spec qua nhánh và PR (US2 kịch bản 4). Contents
  API trả nội dung tới 1 MB qua JSON; 512 KB chừa xa giới hạn.
- **Alternatives**: `.speckit/highlights/NNN.json` (tách khỏi spec, không đi theo PR của spec);
  một file mỗi highlight (nhiều commit hơn, nhiều file hơn trong PR).

## R4. Đọc file highlight cùng với spec

- **Decision**: Thêm `highlights.json` vào `wantedInSpec` (`server/project.ts`); parser mới
  `parseHighlights(text)` trả `{ highlights, error }` và gắn vào `SpecFeature.highlights`. File
  hỏng thì `error` có lý do và danh sách rỗng hoặc phần đọc được, ứng dụng chặn ghi (FR-014).
  Sau một lần lưu, client cập nhật trạng thái từ file vừa ghi (có `sha` commit), không cần tải lại
  cả project.
- **Rationale**: Không thêm lời gọi API khi mở spec; cache theo tree sha của spec vẫn đúng vì mỗi
  commit đổi tree sha.
- **Alternatives**: Gọi riêng khi mở spec (thêm một lời gọi mỗi lần mở).

## R5. Neo đoạn văn (FR-006)

- **Decision**: Module thuần `src/annotations/anchor.ts`:
  - `textOf(root)`: chuỗi `textContent` của `.sk-col`, kèm bảng ánh xạ vị trí → (text node, offset);
  - `describe(range)`: `{quote, prefix, suffix, startHint}`, cắt khoảng trắng đầu cuối, prefix và
    suffix khoảng 32 ký tự;
  - `locate(text, anchor)`: mọi vị trí của `quote`, chấm điểm theo khớp prefix/suffix và khoảng cách
    tới `startHint`, trả vị trí tốt nhất hoặc `null` (Outdated).
- **Rationale**: Theo mô hình text-quote selector (W3C Web Annotation), chịu được tài liệu đổi chỗ
  khác; thuần nên test được không cần trình duyệt.
- **Alternatives**: Neo theo số dòng hay XPath (gãy khi markdown đổi).

## R6. Vẽ highlight không sửa DOM (FR-002)

- **Decision**: CSS Custom Highlight API: mỗi màu một `Highlight` đăng ký tên `sk-y`, `sk-b`,
  `sk-p`, `sk-o`, thêm `sk-focus` cho gạch chân khi nhảy tới. Vẽ lại khi tài liệu render lại (đổi
  bước, đổi spec, đổi cài đặt đọc) và khi đổi kích thước. Không có API (trình duyệt cũ): không tô,
  panel vẫn đủ, kèm một dòng "This browser cannot draw highlights in the text".
- **Rationale**: CSS đã có (`::highlight(sk-*)` trong `reader.css`); DOM của markdown không bị đổi,
  nên React và tìm kiếm trong trang không bị ảnh hưởng.
- **Alternatives**: Bọc `<mark>` (đổi DOM do React quản lý, dễ hỏng khi render lại).

## R7. Ghim ở lề (FR-005)

- **Decision**: Ghim `.sk-hl-pin` đặt tuyệt đối trong `.sk-doc` (đã `position: relative` và chừa
  28px bên phải), `top` = đỉnh hình chữ nhật đầu tiên của range trừ đỉnh `.sk-doc` cộng `scrollTop`,
  `left` kẹp trong bề rộng của `.sk-doc` để không cuộn ngang.
- **Rationale**: Như prototype (`speckit/reader.jsx`), dùng CSS đã có.

## R8. Thanh công cụ và trình sửa ghi chú (FR-003, FR-004)

- **Decision**: Component `HlToolbar` (`src/annotations/Toolbar.tsx`) theo prototype: vị trí cố định
  52px trên đoạn chọn, lật xuống dưới khi không đủ chỗ, kẹp trong khung nhìn 8px; `mousedown`
  `preventDefault` để giữ đoạn chọn; đóng khi bấm ra ngoài, cuộn `.sk-doc` hoặc Escape; trên cảm ứng
  chờ `selectionchange` dừng 300ms. Bấm một highlight có sẵn (vùng chọn rỗng) dùng
  `caretPositionFromPoint`/`caretRangeFromPoint` để tìm highlight dưới con trỏ và mở chế độ sửa.
  `role="dialog"` và `aria-label="Highlight"` (FR-023).

## R9. Xác nhận lần đầu và thông báo (FR-009a)

- **Decision**: Lần lưu đầu trong một repo hiện hộp thoại: "Highlights are committed to `<branch>`
  as `<login>`. Every save is a commit ending in [skip ci]." với Cancel / Commit highlights. Đồng ý
  thì nhớ trong `prefsFor(login).setHighlightConsent(repo, true)`. Cuối tab Highlights có công tắc
  "Ask before committing highlights" để bật lại (bản server không có màn hình Settings, nên đặt ở
  đây để hai chế độ giống nhau). Mỗi lần lưu thành công hiện toast "Saved · commit abc1234"
  (liên kết tới commit) trong 4 giây, `role="status"`.

## R10. Quyền token (constitution II)

- **Decision**: Commit cần **Contents: Read and write** trên repo Spec Kit. README cập nhật bảng
  quyền (token Pages, GitHub App của bản server) và nói rõ: không có quyền này vẫn xem được highlight.
  Lỗi 403/404 khi `PUT` được dịch thành "Your token cannot commit to `<branch>` (needs Contents: Read
  and write), or the branch is protected." và thanh công cụ chỉ còn Copy, Ask.
- **Kiểm tra trước**: không gọi thử để dò quyền; lần lưu đầu thất bại thì ghi nhớ "read-only" cho
  repo trong phiên để không hỏi lại mỗi lần chọn chữ.

## R11. Nhánh được ghi (FR-009)

- **Decision**: `branch = feature.branch ?? project.ref` (nhánh của phiên bản spec đang xem, spec
  003). Nếu `project.pinned` hoặc phiên bản đến từ một nhánh đã xoá (lỗi 404/422 khi `PUT`) thì báo
  lý do và chỉ cho đọc.

## R12. Local (FR-016, FR-017)

- **Decision**: Khi người dùng chọn thư mục bằng `showDirectoryPicker`, xin quyền `readwrite`
  (`requestPermission({ mode: 'readwrite' })`) chỉ ở lần lưu highlight đầu tiên, không lúc mở. Ghi
  bằng `getDirectoryHandle('specs')…getFileHandle('highlights.json', { create: true })` rồi
  `createWritable()`. Chọn thư mục bằng ô file (không có handle) thì chỉ đọc, kèm lý do. Tên tác
  giả tự nhập lưu ở `prefsFor('~local').setAuthorName()`. Ghi nhận trong spec 007 (FR-006) một ngoại
  lệ: đúng file `specs/*/highlights.json`.
- **Rationale**: File System Access API chỉ ghi được với handle có quyền ghi; xin muộn để người chỉ
  đọc không bị hỏi.

## R13. Demo (FR-018)

- **Decision**: Kho highlight trong `localStorage` (`sk.demo.highlights`), gieo bằng 4 highlight mẫu
  của prototype (`HL_SEED`: feature 003, Director/Designer/QA) khi chưa có gì. Không gọi GitHub. Tab
  Highlights, ghim và brief giống bản thiết kế, nên mốc so ảnh của demo sẽ khớp cả phần highlight.

## R14. Một nơi dùng chung cho cả bốn chế độ

- **Decision**: Giao diện kho `HighlightStore { list(slug), save(slug, change) }` với bốn bản:
  `gitHubStore` (server: qua `/api/highlights`; Pages: gọi thẳng `server/highlights.ts`),
  `localFileStore`, `demoStore`. Component (`Toolbar`, `Pins`, `HighlightsPanel`, `useHighlights`)
  chỉ biết `HighlightStore`, nên hành vi giống nhau ở mọi chế độ.
- **Route server**: `POST /api/highlights` (JSON, cùng origin như `/api/gates`), body
  `{repo, slug, branch, change}`; server dùng token của phiên, gọi `saveHighlight` trong
  `server/highlights.ts`. Thêm vào `POSTS`, `JSON_WRITES`, `ROUTES`.

## R15. "Before you approve" ở live (FR-022)

- **Decision**: Live `GatePanel` hiện chưa có phần "Before you approve" (chỉ demo có, `GateBrief`).
  Thêm `GateBrief` vào `GatePanel` cho bước đang chờ duyệt với: các kiểm tra chưa đạt từ `gateChecks`
  (như dòng cảnh báo hiện có) cộng ghi chú của bước, Issue lên đầu; ẩn khi rỗng. Demo dùng
  `gateBrief()` hiện có cộng ghi chú. Không gọi model (constitution VI).

## R16. CI (FR-010)

- **Decision**: Thông điệp commit: `{login} {verb} on {Phase}: "{60 ký tự đầu}" [skip ci]`, với
  verb là `highlighted`, `noted`, `recoloured`, `removed a highlight`. GitHub Actions bỏ qua push có
  `[skip ci]` trong thông điệp commit.
