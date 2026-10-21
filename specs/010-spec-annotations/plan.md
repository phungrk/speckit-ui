# Implementation Plan: Chú thích (highlight và ghi chú) trên tài liệu của spec

**Branch**: `feat/010-spec-annotations` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-spec-annotations/spec.md`

## Summary

Người review bôi đen chữ trong cột đọc, chọn một trong bốn màu (Key, Question, Issue, Change), thêm
ghi chú; highlight được lưu ngay vào `specs/NNN/highlights.json`: một commit `[skip ci]` trên nhánh
đang xem (server, Pages), ghi thẳng file (local), hoặc trình duyệt (demo). Highlight được vẽ bằng
CSS Custom Highlight API, neo bằng đoạn trích + ngữ cảnh, hiện trong tab Highlights và trong "Before
you approve". Một module dùng chung `src/annotations/` và một module ghi dùng chung
`server/highlights.ts` cho cả bốn chế độ; CSS đã có trong `reader.css`.

## Technical Context

**Language/Version**: TypeScript 7 (`strict`, `erasableSyntaxOnly` ở `server/`), React 18.3, Node ≥ 22.18

**Primary Dependencies**: Có sẵn (Vite 8, react-markdown). Không thêm dependency. API trình duyệt:
CSS Custom Highlight API, `caretPositionFromPoint`/`caretRangeFromPoint`, File System Access API
(local). GitHub REST: Contents API (`GET`/`PUT`).

**Storage**: `specs/NNN-slug/highlights.json` trong repo (git). Trình duyệt: xác nhận commit theo
repo, tên tác giả local, dữ liệu demo.

**Testing**: Vitest với GitHub giả lập (`tests/fakeGitHub.ts` thêm `PUT …/contents`), logic thuần
(neo, áp thay đổi, parse), render tĩnh cho markup. Kiểm tay và so ảnh bằng Playwright ngoài repo.

**Target Platform**: Trình duyệt hiện đại (Chromium, Firefox, Safari có Custom Highlight API; trình
duyệt cũ: không tô, panel vẫn đủ). Local ghi file: Chromium (File System Access API).

**Project Type**: Ứng dụng web một repo (`src/` trình duyệt, `server/` API).

**Performance Goals**: 200 highlight: vẽ lại dưới 1 giây khi chuyển bước (SC-006); lưu: một lần đọc
+ một lần ghi Contents API.

**Constraints**: Token chỉ ở server hoặc trong trình duyệt của chính người dùng (constitution II);
CSP Pages không đổi (`api.github.com` đã có); chỉ đổi đúng một file mỗi lần ghi; thông điệp commit có
`[skip ci]`.

**Scale/Scope**: khoảng 3–4 ngày: module `src/annotations/` (~6 file), `server/highlights.ts`, route,
sửa ba shell, `GatePanel`, `localProject`, `prefs`, README.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Ghi chú |
|---|---|---|
| I. Git là nguồn sự thật | ❌ cần sửa constitution | Ứng dụng sẽ tạo commit vào repo người dùng (file highlight), trong khi I ghi "Nơi ghi duy nhất là issue theo dõi… Ứng dụng KHÔNG tạo commit, branch hay file trong repo người dùng." Đây là loại ghi mới, đi đủ quy trình Spec Kit và có bước xác nhận trong UI (FR-009a), đúng điều kiện của I, nhưng câu cấm phải được sửa. Đề xuất ở Complexity Tracking; MUST được duyệt và gộp trước khi implement. |
| II. Khoá thuộc về người dùng | ✅ có cập nhật | Cần thêm quyền **Contents: Read and write** (R10); spec và README nêu rõ, đúng yêu cầu "tính năng cần thêm quyền PHẢI nêu rõ". Bản server ghi qua `POST /api/highlights` cùng origin, token ở server. Không có điểm đến mạng mới. Đoạn trích và ghi chú render như văn bản thuần (FR-007). |
| III. Ba chế độ, một hành vi | ✅ | `server/highlights.ts` dùng chung cho server và Pages; `HighlightStore` cho bốn chế độ (R14). |
| IV. Trung thành với thiết kế | ✅ | Theo prototype; CSS và màu `--hl-*` đã có (1.3.0). Demo có đủ highlight nên khớp bản thiết kế cả phần trước đây được miễn. Bàn phím, nhãn, điện thoại: contracts. |
| V. Test trước khi merge | ✅ | Unit test cho neo, áp thay đổi, parse, luồng ghi với GitHub giả lập (gồm 409, 403, file hỏng, tác giả); không ghi GitHub thật. |
| VI. AI chỉ đề xuất | ✅ | Ask chỉ mở Copilot với câu hỏi; "Before you approve" tính từ dữ liệu. |
| VII. Đơn giản trước | ✅ | Lưu trữ có sẵn của GitHub (file trong repo), không dịch vụ hay dependency mới. |

Checklist cho cổng Plan của speckit-ui (tick khi pass):

- [ ] **I. Git là nguồn sự thật**: chờ sửa constitution 1.4.0 (Complexity Tracking)
- [x] **II. Khoá thuộc về người dùng**: quyền Contents: write được nêu trong spec và README
- [x] **III. Ba chế độ, một hành vi**
- [x] **IV. Trung thành với thiết kế**
- [x] **V. Test trước khi merge**
- [x] **VI. AI chỉ đề xuất**
- [x] **VII. Đơn giản trước**

**Sau Phase 1**: vẫn chỉ vướng I (cần sửa constitution); các nguyên tắc khác pass.

## Project Structure

### Documentation (this feature)

```text
specs/010-spec-annotations/
├── spec.md
├── plan.md                      # file này
├── research.md                  # R1–R16
├── data-model.md                # Highlight, HighlightChange, file, trạng thái trình duyệt
├── quickstart.md
├── contracts/
│   ├── highlights-file.md       # định dạng file, ghi qua GitHub, route, local
│   └── annotations-ui.md        # thanh công cụ, ghim, panel, brief, xác nhận
└── checklists/requirements.md
```

### Source Code (repository root)

```text
server/
├── highlights.ts        # mới, dùng chung: parseHighlights, applyChange, saveHighlight (Contents API, retry)
├── github.ts            # sửa: gh() nhận PUT; thông báo 403 cho ghi nội dung
├── project.ts           # sửa: wantedInSpec + highlights.json; buildFeature gắn highlights
└── routes.ts            # sửa: POST /api/highlights (cùng origin, JSON)
src/
├── annotations/         # mới, dùng chung cho bốn chế độ
│   ├── anchor.ts        #   textOf, describe, locate (thuần)
│   ├── store.ts         #   HighlightStore + gitHubStore, localFileStore, demoStore
│   ├── useHighlights.ts #   tải, lưu (xác nhận lần đầu, toast), vẽ ::highlight, ghim, focus
│   ├── Toolbar.tsx      #   thanh công cụ + trình sửa ghi chú
│   ├── Pins.tsx         #   ghim ở lề
│   └── HighlightsPanel.tsx  # tab Highlights, bộ lọc, công tắc xác nhận
├── backend.ts           # sửa: saveHighlight (server: fetch route; Pages: gọi server/highlights.ts)
├── App.tsx              # sửa: demo — ba tab, Toolbar, Pins, brief có ghi chú
├── copilot/context.ts   # sửa: gateBrief nhận ghi chú
└── project/
    ├── types.ts         # sửa: SpecFeature.highlights, Highlight types
    ├── prefs.ts         # sửa: hlConsent, authorName
    ├── GatePanel.tsx    # sửa: "Before you approve" với ghi chú (R15)
    ├── LiveWorkspace.tsx    # sửa: ba tab, Toolbar, Pins
    ├── LocalWorkspace.tsx   # sửa: như trên, localFileStore
    ├── localProject.ts      # sửa: đọc highlights.json
    └── localRepositoryPersistence.ts # sửa: quyền readwrite khi cần (R12)
tests/
├── anchor.test.ts       # mới
├── highlights.test.ts   # mới: parse, applyChange, saveHighlight với GitHub giả lập
├── annotationsMarkup.test.tsx # mới: Toolbar, panel, brief (render tĩnh)
└── fakeGitHub.ts        # sửa: PUT contents, 409
```

**Structure Decision**: Giữ cấu trúc hiện có. Logic ghi GitHub ở `server/` để dùng chung (như
`server/tracking.ts`); giao diện ở `src/annotations/` (như `src/reader/`). Tài liệu cần sửa cùng PR:
README (quyền Contents: Read and write, mục Highlights), `specs/007-local-repo-browser/spec.md`
(ngoại lệ FR-006).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| I: ứng dụng tạo commit trong repo người dùng | Người dùng chọn "highlight đi kèm spec, file JSON riêng, lưu là chia sẻ ngay" (Clarify 2026-10-20, 2026-10-21). | Issue comment hoặc khối JSON trong issue (đã cân nhắc và bị người dùng thay); bản nháp + publish (người dùng bỏ ở 2026-10-21). |
| II: quyền token rộng hơn (Contents: write) | Commit cần quyền này. | Không có cách commit nào cần ít quyền hơn. Người không cấp vẫn xem được. |

**Đề xuất sửa constitution (cần người dùng duyệt, MINOR 1.4.0)**: nguyên tắc I đổi câu
"Nơi ghi duy nhất là issue theo dõi… Ứng dụng KHÔNG tạo commit, branch hay file trong repo người
dùng." thành:

> Ứng dụng chỉ ghi ở hai nơi: issue theo dõi cổng (nhãn `speckit`, dấu `<!-- speckit-ui:spec=... -->`)
> và file `specs/*/highlights.json` của chính spec đang xem (specs/010-spec-annotations): mỗi lần lưu
> là một commit chỉ đổi file đó, trên nhánh đang xem, bằng tài khoản người dùng, thông điệp có
> `[skip ci]`, sau bước xác nhận một lần cho mỗi repo. Ứng dụng KHÔNG tạo branch, PR hay file nào
> khác trong repo người dùng.

Cùng lần sửa: `CLAUDE.md` ("The app's only write is to tracking issues…").
