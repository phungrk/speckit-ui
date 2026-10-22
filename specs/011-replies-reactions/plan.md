# Implementation Plan: Trả lời và thả emoji trên nhận xét

**Branch**: `feat/011-replies-reactions` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-replies-reactions/spec.md`

## Summary

Mỗi nhận xét trở thành một cuộc thảo luận: dưới nhận xét gốc có danh sách **trả lời** và dải **emoji**, trong khe `.sk-cm-thread` mà thẻ của 012 đã chừa. Mọi người có quyền lưu chú thích đều trả lời và thả emoji được; chỉ người viết sửa/xoá trả lời của mình. Dữ liệu nằm cùng file `highlights.json` của spec, thêm hai trường tuỳ chọn (`replies`, `reactions`). Có bốn loại thay đổi mới (`reply`, `reply-edit`, `reply-remove`, `react`) đi qua đúng đường lưu của 010: đọc bản mới nhất, gộp theo mã, ghi một commit `[skip ci]`. Điểm cần cẩn thận nhất là **tương thích file**: file có trả lời/emoji ghi `version: 2` để bản app cũ từ chối ghi thay vì âm thầm xoá chúng. Không dependency, không điểm đến mạng, không quyền token mới.

## Technical Context

**Language/Version**: TypeScript (`strict`; `erasableSyntaxOnly` ở `server/`), React 18.3, Node ≥ 22.18.

**Primary Dependencies**: Có sẵn, không thêm.

**Storage**: `specs/NNN-slug/highlights.json`. Thêm tuỳ chọn `replies[]` và `reactions[]` trên highlight (data-model.md). `version` là 1 khi không có trả lời/emoji nào, 2 khi có (R1). Trạng thái soạn (bản nháp trả lời, đang gửi) nằm trong bộ nhớ trang.

**Testing**: Vitest: `tests/highlights.test.ts` (parse, serialize, applyChange, commit, kích thước), `tests/fakeGitHub.ts` (gộp khi hai người lưu cùng lúc), render tĩnh cho `Thread`, helper thuần `reactions.ts`. Playwright ngoài repo (demo, server với GitHub giả; 1440×900, 390).

**Target Platform**: Trình duyệt hiện đại như 010/012/013; server Node; Pages.

**Project Type**: Ứng dụng web một repo.

**Performance Goals**: 200 nhận xét × 3 trả lời: mở tài liệu và chuyển bước hiện đủ thẻ dưới 1 giây (thẻ đóng không dựng trả lời, chỉ đếm).

**Constraints**: File tối đa 512 KB (010); trả lời tối đa 2.000 ký tự; emoji thuộc bộ cố định, ngoài bộ thì bỏ qua khi đọc; chữ thuần; không đổi quyền token; bản app cũ không được làm mất dữ liệu mới.

**Scale/Scope**: khoảng 3–4 ngày: file mới `Thread.tsx`, `reactions.ts`; sửa `server/highlightsFile.ts`, `server/routes.ts`, `types.ts`, `Annotator.tsx`, `CommentRail.tsx`, `comments.ts`, `reader.css`, README; test.

**Modes affected**: demo, server, static, local (một đường ghi chung `applyChange`).

## Constitution Check

| Nguyên tắc | Kết quả |
|---|---|
| I. Git là nguồn sự thật | Đạt. Không thêm loại file hay nơi ghi: vẫn chỉ `highlights.json` của spec đang xem, một commit `[skip ci]` mỗi lần lưu, xác nhận một lần mỗi repo. Định dạng được mở rộng có tương thích: trường tuỳ chọn, `version: 2` chỉ khi cần (R1). |
| II. Khoá thuộc về người dùng | Đạt. Không khoá, token, CSP, điểm đến mạng mới. Trả lời và tên hiển thị là chữ thuần (React escape, không `dangerouslySetInnerHTML`); emoji chỉ lấy từ danh sách trắng. |
| III. Ba chế độ, một hành vi | Đạt. `applyChange` ở `server/highlightsFile.ts` dùng chung cho server, Pages, local, demo; test chạy cả bốn đường. |
| IV. Trung thành với thiết kế | Đạt có điều kiện. Chỉ thêm trong khe thẻ nhận xét (đã là phần ngoài thiết kế từ 012); khi chưa có trả lời/emoji, thẻ và demo không đổi một điểm ảnh. Token Modernist, không bo góc, không màu mới; ảnh 1440×900 và 924×540 so trước/sau. |
| V. Test trước khi merge | Đạt khi qua bốn lệnh; parser và luồng ghi có unit test; GitHub giả. |
| VI. AI chỉ đề xuất | Đạt. Không liên quan Copilot; thảo luận không chặn hay tự duyệt cổng. |
| VII. Đơn giản trước | Đạt. Không dependency; emoji là danh sách cố định; không thời gian thực. Có Non-goals trong spec. |

Kiểm lại sau Phase 1: không đổi kết quả. Cần **quy trình đủ** (đổi định dạng file), nên có analyze trước implement.

## Project Structure

### Documentation (this feature)

```text
specs/011-replies-reactions/
├── spec.md
├── plan.md
├── research.md                     # R1–R10
├── data-model.md                   # Reply, Reaction, file version, thay đổi mới
├── quickstart.md                   # kịch bản kiểm
├── contracts/
│   ├── highlights-file.md          # định dạng v1/v2, kiểm tra khi đọc
│   ├── save-change-api.md          # bốn loại thay đổi mới, quy tắc quyền, lỗi
│   └── thread-ui.md                # thẻ: dòng đếm, danh sách, ô trả lời, dải emoji
├── checklists/requirements.md
└── tasks.md                        # /speckit-tasks
```

### Source Code (repository root)

```text
server/
├── highlightsFile.ts     # kiểu hợp lệ, parse (v1 và v2), serialize (v1 hoặc v2), applyChange cho 4 loại mới, commitMessage
├── highlights.ts         # không đổi logic; dùng applyChange
└── routes.ts             # kiểm hình dạng thay đổi mới

src/
├── project/types.ts      # Reply, Reaction, Highlight.replies/reactions, HighlightChange mở rộng
└── annotations/
    ├── reactions.ts      # thuần: bộ emoji, gom số lượng, ai đã thả, bật/tắt của người dùng
    ├── Thread.tsx        # danh sách trả lời, sửa/xoá, ô trả lời, dải emoji (một thẻ)
    ├── CommentRail.tsx   # Card: dòng "N replies" khi đóng, nhận `thread`; Sheet cũng
    ├── comments.ts       # khoá trạng thái đang gửi theo mã trả lời; diff tính cả thay đổi trả lời/emoji
    ├── Annotator.tsx     # bản nháp trả lời, các hàm lưu, truyền `threadFor`
    └── store.ts          # không đổi (applyChange dùng chung)

src/styles/reader.css     # .sk-cm-thread, .sk-cm-reply, .sk-cm-react, .sk-cm-count
README.md                 # mục Highlights

tests/highlights.test.ts, tests/fakeGitHub.ts, tests/reactions.test.ts, tests/threadMarkup.test.tsx, tests/comments.test.ts
```

**Structure Decision**: Giữ cấu trúc 010/012/013; hai file mới trong `src/annotations/`, không thêm thư mục.

## Complexity Tracking

| Việc | Vì sao cần | Cách đơn giản hơn đã bỏ |
|---|---|---|
| File ghi `version: 2` khi có trả lời/emoji (R1) | Bản app cũ chỉ ghi lại các trường nó biết; không có guard thì một lần lưu từ bản cũ xoá hết trả lời. `version` lạ làm bản cũ từ chối ghi (010 FR-014) | Giữ `version: 1` mãi: mất dữ liệu âm thầm khi hai bản app cùng làm việc (Pages cũ cache, máy local chưa cập nhật) |
| Bốn loại thay đổi thay vì sửa cả highlight | Gộp theo mã khi hai người lưu cùng lúc, và quyền khác nhau (ai cũng trả lời, chỉ tác giả sửa nhận xét gốc) | Ghi đè cả mảng `replies`: mất trả lời khi đồng thời |
