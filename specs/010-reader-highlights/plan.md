# Implementation Plan: Chế độ đọc kiểu Kindle

**Branch**: `feat/010-reader-highlights` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-reader-highlights/spec.md`

## Summary

Thêm nút **Aa** và popover cài đặt đọc (font, cỡ, giãn dòng, độ rộng, nền), bốn nền phủ toàn bộ
khung, và hai nút ẩn/hiện sidebar, cho cả bốn chế độ. Cách làm: một module dùng chung
`src/reader/` (giá trị, validate, ghi biến CSS lên `:root`, popover, nút header), một file
`src/styles/reader.css`, và một wrapper `.sk-col` trong ba shell. Cài đặt lưu trong trình duyệt
theo cơ chế `prefsFor` sẵn có, cộng một bản theo thiết bị để áp trước lần vẽ đầu. Không có ghi mới,
không có điểm đến mạng mới.

## Technical Context

**Language/Version**: TypeScript 7 (`strict`), React 18.3

**Primary Dependencies**: Vite 8, react-markdown + remark-gfm (sẵn có). Không thêm dependency.

**Storage**: `localStorage`/`sessionStorage` qua `src/project/prefs.ts` (R2, R3). Không có trạng thái
dự án mới.

**Testing**: Vitest (logic thuần, render tĩnh bằng `react-dom/server`, test đọc file nguồn). Kiểm tay
và so ảnh bằng Playwright với Chromium có sẵn (quickstart), không thêm vào `npm test` (R10).

**Target Platform**: Trình duyệt hiện đại trên máy tính và điện thoại; bản server (Node ≥ 22.18) và
bản tĩnh GitHub Pages.

**Project Type**: Ứng dụng web một repo (`src/` trình duyệt, `server/` API).

**Performance Goals**: Đổi một cài đặt áp trong cùng khung hình (chỉ ghi biến CSS). Khung hình đầu
đã đúng nền (SC-003).

**Constraints**: CSP bản Pages giữ nguyên (`fonts.googleapis.com`, `fonts.gstatic.com` đã có).
Chữ giao diện vẫn theo thang `--fs-N` của spec 006. Màu chỉ đến từ token.

**Scale/Scope**: 1 module mới (~4 file), 1 file CSS, sửa 3 shell + `main.tsx` + `prefs.ts` + `ui.tsx`;
khoảng 2 ngày.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá | Ghi chú |
|---|---|---|
| I. Git là nguồn sự thật | ✅ | Chỉ lưu tuỳ chọn hiển thị trong trình duyệt, như ghim repo (spec 003). Không ghi repo, issue hay dịch vụ nào (FR-013). |
| II. Khoá thuộc về người dùng | ✅ | Không đụng token. Google Fonts đã có trong CSP, nên không có điểm đến mới (R6). Cài đặt đọc không chứa dữ liệu nhạy cảm. |
| III. Ba chế độ, một hành vi | ✅ | Một module `src/reader/` dùng cho demo, server, Pages và local (FR-012). Plan và PR nêu rõ cả bốn chế độ. |
| IV. Trung thành với thiết kế | ⚠️ có biện minh | Bốn nền thêm màu ngoài bảng Modernist, và nền mặc định đổi sang `#FFFFFF`. Người dùng chốt ở Clarify; màu được định nghĩa một lần trong `settings.ts` và áp qua token, component vẫn chỉ đọc token. Demo theo bản thiết kế mới; phần highlight của bản thiết kế chưa có cho tới `010-spec-annotations`. Xem Complexity Tracking. Bàn phím, focus, nhãn, bề rộng điện thoại: có trong contracts. |
| V. Test trước khi merge | ✅ | Unit test cho validate, biến CSS, tương phản, lưu theo chủ, phím tắt; render tĩnh cho markup; test 006 được mở rộng cho `reader.css`. Không gọi GitHub. |
| VI. AI chỉ đề xuất | ✅ | Không đụng Copilot. |
| VII. Đơn giản trước | ✅ | Không dependency, không dịch vụ, không nơi lưu mới. Font tải từ Google Fonts thay vì tự host. |

**Sau Phase 1**: không đổi. Thiết kế không thêm ghi, không thêm mạng; vướng duy nhất vẫn là IV.

## Project Structure

### Documentation (this feature)

```text
specs/010-reader-highlights/
├── spec.md
├── plan.md                    # file này
├── research.md                # R1–R11
├── data-model.md              # ReaderSettings, LayoutPrefs, nơi lưu
├── quickstart.md              # kịch bản kiểm tra
├── contracts/reader-ui.md     # bảng giá trị, header, popover, lưới
├── moved-to-annotations.md    # phần highlight chuyển sang 010-spec-annotations (không làm ở đây)
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/
├── main.tsx                   # sửa: applyReader(loadDeviceReader()) trước render; import reader.css
├── ui.tsx                     # sửa: icon panelL, panelR
├── reader/                    # mới, dùng chung cho cả bốn chế độ
│   ├── settings.ts            #   giá trị, mặc định, validate, readerVars(), applyReader(), tương phản
│   ├── useReader.ts           #   hook: chủ (login/~local/~demo) → đọc, áp, lưu; layout; phím [ ]
│   └── ReaderControls.tsx     #   SidebarToggle, AaButton + ReaderPanel (popover)
├── styles/
│   ├── reader.css             # mới: @import font, .sk-col, header buttons, popover, lưới no-left/no-right, Dark shadow
│   └── modernist.css          # sửa: thêm --fs-22 (desktop 22, phone 21)
├── App.tsx                    # sửa: header, sidebar có điều kiện, .sk-col (demo, chủ ~demo)
└── project/
    ├── prefs.ts               # sửa: getReader/setReader, getLayout/setLayout
    ├── LiveWorkspace.tsx      # sửa: như App (server, Pages; chủ = login)
    └── LocalWorkspace.tsx     # sửa: như App (local; chủ ~local)

tests/
├── reader.test.ts             # mới: validate, readerVars, tương phản, luồng chủ/thiết bị, phím tắt
├── readerMarkup.test.tsx      # mới: render tĩnh popover và shell (aria, sidebar ẩn không có trong HTML)
├── prefs.test.ts              # sửa: reader/layout theo login, bộ nhớ bị chặn
└── typescale.test.ts          # sửa: thêm reader.css, chấp nhận var(--rd-size*), thang có --fs-22
```

**Structure Decision**: Giữ cấu trúc một repo hiện có. Code dùng chung nằm trong `src/reader/`
(chỉ dùng API trình duyệt, không có code Node), vì cả bốn shell đều chạy trong trình duyệt. Không
đụng `server/`.

Tài liệu cần sửa cùng PR: `specs/006-mobile-font-size/data-model.md` (thêm `--fs-22`), README (mục
mô tả chế độ: Aa và ẩn/hiện sidebar).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| IV: thêm màu ngoài bảng Modernist (bốn nền, Dark đổi màu nhấn nhạt) | Người dùng chọn theo bản thiết kế mới (Clarify 2026-10-20); đọc lâu cần nền giấy/tối. | Chỉ dùng token sẵn có: không có nền sepia/xanh/tối nào trong Modernist. |
| IV: nền mặc định đổi từ `#f3f2f2` sang `#FFFFFF` | Prototype đặt White là mặc định; người dùng chọn theo prototype. | Giữ `#f3f2f2` làm White: lệch bản thiết kế mà người dùng đã chốt. Hệ quả: lấy lại mọi mốc so ảnh. |
| IV: demo chưa giống hết bản thiết kế (thiếu tab Highlights, thanh công cụ, ghim) | Phạm vi highlight đã chuyển sang `010-spec-annotations` (Clarify). | Làm luôn highlight ở đây: trùng với spec annotations, hai cách lưu trái nhau. |
| 006 FR-008: cỡ chữ đọc không đi qua `--fs-N` | Cỡ đọc là lựa chọn của người dùng (15–22px), phải giữ đúng trên điện thoại. | Ánh xạ vào `--fs-N`: không có 22, và trên điện thoại 15 và 16 cùng thành 16 (R5). Test 006 vẫn chặn mọi cỡ chữ viết số khác. |

**Đề xuất cho constitution** (không làm trong spec này, cần người dùng đồng ý): sửa IV thành
"Không thêm màu mới ngoài `modernist.css` và bảng nền của chế độ đọc" (PATCH 1.1.1), để các nền
không còn là ngoại lệ lâu dài.
