# Implementation Plan: Luồng nhận xét kiểu Google Docs trên tài liệu spec

**Branch**: `feat/012-docs-style-comment-flow` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-docs-style-comment-flow/spec.md`

## Summary

Đổi cách người dùng nhận xét trên lớp chú thích của 010, không đổi cơ chế lưu. Chọn chữ thì thanh công cụ có nút **Comment** nổi bật nhất; bấm vào mở hộp soạn ở một **rail nhận xét** bên phải cột đọc, có avatar chữ cái và tên. Các thẻ nhận xét nằm trong rail, **thẳng hàng với đoạn chữ** và cuộn cùng tài liệu; chọn thẻ, chọn đoạn chữ, bấm ghim hay bấm mục ở tab Highlights đều cho **một trạng thái chọn duy nhất**, đoạn chữ đang chọn đậm hơn. Nhận xét không bắt chọn màu (giá trị màu thứ năm `n`). Mỗi thẻ cho biết đang gửi, đã lưu hay lỗi; người khác thêm nhận xét thì sidebar hiện dấu "New comments", kiểm tra định kỳ bằng yêu cầu có điều kiện (ETag, trả 304) và chỉ chèn khi người dùng bấm. Người không có quyền ghi thấy nút bị tắt kèm lý do. Tất cả dựng trên `src/annotations/` của 010; không thêm dependency, không thêm điểm đến mạng, không thêm loại ghi.

## Technical Context

**Language/Version**: TypeScript 7 (`strict`, `erasableSyntaxOnly` ở `server/`), React 18.3, Node ≥ 22.18

**Primary Dependencies**: Có sẵn. Không thêm dependency. API trình duyệt dùng thêm: `Highlight.priority` và `::highlight()` (CSS Custom Highlight API, đã dùng ở 010), `ResizeObserver`, `document.visibilityState`. GitHub REST: Contents API `GET` với `If-None-Match` (đã có `GET`/`PUT` từ 010).

**Storage**: Không đổi: `specs/NNN-slug/highlights.json`, `version: 1`. Chỉ thêm giá trị màu `n`. Trạng thái giao diện (chọn, bản nháp, đang gửi, ETag) nằm trong bộ nhớ của trang, không ghi ra ngoài.

**Testing**: Vitest. Logic thuần (bố trí thẻ, view model, reducer đang gửi, so sánh nhận xét mới, thứ tự brief), render tĩnh cho markup, GitHub giả lập thêm ETag và 304 trong `tests/fakeGitHub.ts`. So ảnh và kiểm tay bằng Playwright ngoài repo (1440×900, 924×540, 390).

**Target Platform**: Trình duyệt hiện đại như 010. Trình duyệt không có Custom Highlight API: không tô, rail và panel vẫn đủ.

**Project Type**: Ứng dụng web một repo (`src/` trình duyệt, `server/` API).

**Performance Goals**: 200 nhận xét: mở tài liệu, chuyển bước và đổi cỡ chữ hiện đủ thẻ trong dưới 1 giây, bố trí O(n), chỉ dựng thẻ gần vùng nhìn thấy (SC-006). Kiểm tra nhận xét mới: tối đa 1 yêu cầu mỗi phút mỗi tab, và 304 không tính vào giới hạn tốc độ (SC-010).

**Constraints**: Không thêm điểm đến mạng (CSP không đổi, nên avatar là chữ cái đầu); chỉ đổi đúng một file mỗi lần ghi như 010; không tự chèn nhận xét của người khác; không làm nhảy thẻ lúc đang soạn.

**Scale/Scope**: khoảng 3 ngày: 5 file mới trong `src/annotations/`, sửa `Annotator`, `Toolbar`, `useHighlights`, `HighlightsPanel`, `colors`, `brief`, `store`, ba shell, `server/highlights.ts`, `server/highlightsFile.ts`, `server/routes.ts`, `reader.css`, README.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Ghi chú |
|---|---|---|
| I. Git là nguồn sự thật | ✅ | Không thêm loại ghi. Vẫn chỉ ghi `specs/*/highlights.json` theo constitution 1.4.0 của 010. Spec đã bỏ đường issue (Q1 = C). Trạng thái "đang chọn", bản nháp, ETag chỉ ở bộ nhớ trang. Giá trị màu `n` là mở rộng tuỳ chọn có mặc định của định dạng. |
| II. Khoá thuộc về người dùng | ✅ | Không thêm điểm đến mạng: CSP `connect-src` và `img-src` giữ nguyên, vì avatar là chữ cái đầu, không tải ảnh (R10). Không thêm quyền token (vẫn Contents: write của 010). Server mode kiểm tra nhận xét mới qua route cùng origin, token ở server. Nội dung nhận xét render như chữ thuần (FR-004). |
| III. Ba chế độ, một hành vi | ✅ | Rail, thẻ, composer, chọn, trạng thái lưu là component dùng chung của `src/annotations/`; chỉ `HighlightStore.refresh` khác theo chế độ (R8). Demo và local không cần kiểm tra định kỳ. |
| IV. Trung thành với thiết kế | ✅ có điều kiện | Rail không có trong bản thiết kế hiện tại; người dùng chọn **cập nhật bản thiết kế** (Clarify 2026-10-21). Điều kiện: bản `Speckit Workspace.html` mới có rail được cung cấp trước khi merge, và demo khớp bản đó từng pixel. Chỉ dùng token và class Modernist, màu `n` suy từ `--color-text` bằng `color-mix`, không thêm hex. |
| V. Test trước khi merge | ✅ | Unit test cho bố trí, reducer, so sánh, parser với `n`, route GET với ETag/304 và lỗi; không ghi GitHub thật. |
| VI. AI chỉ đề xuất | ✅ | Không đổi. Nhận xét không tự chặn hay tự duyệt cổng. |
| VII. Đơn giản trước | ✅ | Không dependency, không kết nối đẩy, không lớp đa ngôn ngữ. Kiểm tra định kỳ dùng yêu cầu có điều kiện thay vì máy chủ thời gian thực. |

Checklist cho cổng Plan của speckit-ui (tick khi pass):

- [x] **I. Git là nguồn sự thật**: không thêm loại ghi, cùng một file của 010
- [x] **II. Khoá thuộc về người dùng**: không điểm đến mạng mới, không quyền mới
- [x] **III. Ba chế độ, một hành vi**
- [x] **IV. Trung thành với thiết kế**: cập nhật bản thiết kế có rail (Complexity Tracking); điều kiện merge: có bản thiết kế mới
- [x] **V. Test trước khi merge**
- [x] **VI. AI chỉ đề xuất**
- [x] **VII. Đơn giản trước**

**Sau Phase 1**: pass. Mục IV có điều kiện: bản thiết kế `Speckit Workspace.html` cập nhật có rail do người dùng cung cấp. Implement dựng theo `contracts/comment-rail-ui.md`; khi có bản thiết kế mới thì so lại và chỉnh. Không có bản đó thì PR chưa merge được (ngoại lệ của constitution IV chỉ áp cho phần thuộc spec khác chưa xong, không áp cho rail).

## Project Structure

### Documentation (this feature)

```text
specs/012-docs-style-comment-flow/
├── spec.md
├── plan.md                      # file này
├── research.md                  # R1–R14
├── data-model.md                # màu n, view model, nháp, đang gửi, trạng thái cập nhật
├── quickstart.md
├── contracts/
│   ├── comment-rail-ui.md       # rail, thẻ, composer, chọn, bàn phím, màn hình hẹp
│   └── refresh-api.md           # GET /api/highlights, HighlightStore.refresh, ETag, backoff
└── checklists/requirements.md
```

### Source Code (repository root)

Trạng thái nền là `main` sau khi 010 merge (PR #30); đường dẫn dưới đây đã có trong cây làm việc.

```text
server/
├── highlightsFile.ts    # sửa: COLORS thêm 'n'; commitMessage cho 'n' ("commented")
├── github.ts            # sửa: gh() nhận header thêm (If-None-Match) và trả 304; getProject đọc permissions.push (map riêng, đọc lại khi làm mới) → Project.canWrite (R16)
├── highlights.ts        # sửa: readHighlights(src, {slug, branch, etag}) → items | 'unchanged'
└── routes.ts            # sửa: GET /api/highlights (cùng origin), thêm vào ROUTES
src/
├── annotations/
│   ├── layout.ts        # mới, thuần: layoutCards(anchors, selected, heights) → top của từng thẻ
│   ├── comments.ts      # mới, thuần: view model thẻ, nhóm Outdated, reducer đang gửi, so nhận xét mới
│   ├── Composer.tsx     # mới: hộp soạn (avatar, tên, ô nhập, Cancel/Comment)
│   ├── CommentRail.tsx  # mới: rail, thẻ, ngăn kéo/sheet ở màn hình hẹp, dấu "New comments"
│   ├── freshness.ts     # mới, thuần: controller kiểm tra định kỳ (đồng hồ và đọc được tiêm vào), ETag, backoff
│   ├── useFreshness.ts  # mới: nối controller vào React, dừng khi tab ẩn, áp khi bấm
│   ├── Avatar.tsx       # mới: avatar chữ cái đầu, `src?` tuỳ chọn cho sau này
│   ├── Annotator.tsx    # sửa: selectedId có kiểm soát, nháp, lưu lạc quan, chủ rail, Ctrl/Cmd+Alt+M
│   ├── Toolbar.tsx      # sửa: Comment là nút chính; màu thành tuỳ chọn; bỏ trình sửa ghi chú nổi
│   ├── useHighlights.ts # sửa: đăng ký sk-sel-{màu}, sk-draft; xuất top của neo và của nháp cho rail
│   ├── HighlightsPanel.tsx # sửa: chip "Comment", chọn dùng chung, dấu và nút làm mới
│   ├── colors.ts        # sửa: HL_NONE ('n', "Comment"), meaningOf
│   ├── brief.ts         # sửa: briefNotes thứ tự Issue, rồi n, rồi còn lại
│   └── store.ts         # sửa: HighlightStore.refresh? (github, local)
├── backend.ts           # sửa: readHighlights (server: GET route; Pages: gọi server/highlights.ts)
├── project/
│   ├── types.ts         # sửa: HighlightColor thêm 'n'; Project.canWrite: boolean | null (R16)
│   ├── LiveWorkspace.tsx    # sửa: selectedId, freshness, bố cục rail
│   └── LocalWorkspace.tsx   # sửa: selectedId, làm mới khi cửa sổ được focus
├── App.tsx              # sửa: demo dùng chung selectedId và rail
└── styles/reader.css    # sửa: .sk-cm-* (rail, thẻ, composer, sheet), ::highlight(sk-sel-{k}|sk-draft|sk-n), .hl-n
tests/
├── layout.test.ts       # mới
├── comments.test.ts     # mới
├── freshness.test.ts    # mới: backoff, ETag, dừng khi ẩn (giả lập đồng hồ)
├── commentRailMarkup.test.tsx # mới: rail, thẻ, composer, trạng thái
├── highlights.test.ts   # sửa: 'n', GET readHighlights
└── fakeGitHub.ts        # sửa: ETag, If-None-Match → 304
README.md                # sửa: mục Highlights nói về nhận xét, kiểm tra định kỳ, người chỉ đọc không nhận xét được
```

**Structure Decision**: Giữ cấu trúc của 010. Logic không đụng DOM (bố cục, view model, reducer, so sánh) nằm ở module thuần để test không cần trình duyệt; component chỉ ghép. Đọc lại file ở `server/highlights.ts` để Pages và server dùng một code (constitution III).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| IV: rail nhận xét không có trong bản thiết kế `Speckit Workspace.html` hiện tại, nên demo (có highlight mẫu) sẽ khác ảnh thiết kế ở 1440×900 cho tới khi thiết kế được cập nhật | Spec 012 yêu cầu thẻ thẳng hàng với đoạn chữ như Google Docs (FR-007); ghim ở lề và tab Highlights của 010 không đạt. | Giữ nguyên ghim và danh sách của 010: không đạt G4/G5. Đặt rail sau công tắc "Show comments" mặc định tắt: giữ được ảnh thiết kế nhưng giấu đúng tính năng người dùng muốn thấy. Người dùng đã chọn cập nhật bản thiết kế (Clarify 2026-10-21); việc này là điều kiện merge, không phải điều kiện bắt đầu code. |
| Hoạt động mạng nền: kiểm tra `highlights.json` mỗi phút khi tab mở (server, Pages) | Q3 = B yêu cầu biết có nhận xét mới mà không phải tải lại. | Chỉ làm mới thủ công (Q3 = A) bị bỏ. Yêu cầu có điều kiện cho 304 nên không tốn giới hạn tốc độ; dừng khi tab ẩn; có backoff. |
