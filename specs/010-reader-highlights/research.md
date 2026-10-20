# Research: Chế độ đọc kiểu Kindle (010)

Nguồn thiết kế: bản xuất dự án claude.ai/design mà người dùng gửi ngày 2026-10-20
(`Speckit Workspace.html`, `speckit/reader.jsx`, `speckit/app.jsx`, `styles.css`). Bản zip không
được commit; các giá trị cần dùng được chép vào [contracts/reader-ui.md](contracts/reader-ui.md).

## R1. Theme áp ở đâu để phủ cả hộp thoại và popover

- **Decision**: Ghi bộ biến của nền đã chọn lên `document.documentElement` (`:root`) bằng
  `style.setProperty`, không lên `div.sk`. Thêm `data-reader-theme="white|sepia|green|dark"` trên
  `<html>` để CSS chọn được theo nền (ví dụ viền ô mẫu trên nền Dark).
- **Rationale**: `body` đã lấy `--color-bg`/`--color-text` từ `:root`
  (`modernist.css`). Hộp thoại New spec, màn hình đăng nhập, Overview và trang chọn repo nằm ngoài
  `.sk`, nên đặt biến trên `.sk` như prototype sẽ bỏ sót chúng (FR-005).
- **Alternatives**: Biến trên `.sk` như prototype (bỏ sót các trang ngoài shell); bốn file CSS theo
  nền (thêm tải, khó giữ đồng bộ với `contracts/`).

## R2. Áp cài đặt trước lần hiển thị đầu (không nháy theme)

- **Decision**: `src/reader/settings.ts` có `applyReader(settings)` chạy đồng bộ trong `main.tsx`
  **trước** `createRoot().render()`, đọc từ khoá thiết bị `sk.reader` trong `localStorage`. Khi đã
  biết người dùng (sau đăng nhập), shell đọc bản theo login qua `prefsFor(login, where)`; nếu khác
  bản thiết bị thì áp và ghi đè `sk.reader` để lần mở sau đúng ngay từ đầu.
- **Rationale**: Bản Pages có CSP `script-src 'self'`, nên không dùng được script nội tuyến trong
  `index.html`. `main.tsx` là script đầu tiên chạy; ghi biến lên `:root` trước khi React vẽ là đủ
  để không có khung hình mặc định. Cài đặt đọc không phải bí mật, nên bản thiết bị luôn ở
  `localStorage`, kể cả Pages không bật Remember.
- **Alternatives**: Chỉ lưu theo login (nháy ở màn hình đăng nhập và lúc khởi động); script nội
  tuyến (CSP chặn); cookie (server phải đọc, bản Pages không có server).

## R3. Lưu theo người dùng (FR-004)

- **Decision**: Mở rộng `Prefs` trong `src/project/prefs.ts` với `getReader()/setReader()` và
  `getLayout()/setLayout()` (khoá `sk.u.{login}.reader`, `sk.u.{login}.layout`). Local và demo
  không có login: dùng login giả `~local` và `~demo` với `where = 'local'`.
- **Rationale**: Cùng cơ chế với ghim repo và vị trí đọc (spec 003), đã chịu được bộ nhớ bị chặn.
  Đọc lỗi hoặc giá trị lạ thì về mặc định (validate từng trường).
- **Alternatives**: Kho riêng cho reader (hai nơi lưu tuỳ chọn); server profile (ngoài phạm vi,
  Non-Goals).

## R4. Cột đọc và phạm vi font đọc (FR-002)

- **Decision**: Bọc nội dung của `.sk-doc` trong `<div className="sk-col">` ở cả ba shell
  (`App.tsx`, `LiveWorkspace.tsx`, `LocalWorkspace.tsx` gồm `LocalStageContent`). CSS trong file mới
  `src/styles/reader.css`:
  - văn xuôi: `.sk-col p, .sk-col li, .sk-col blockquote` → `--rd-font`, `--rd-size`, `--rd-lh`;
  - bảng, tiêu chí, checklist: `.sk-col td, .sk-col .sk-ac, .sk-col .sk-cl li` → `--rd-size-sm`;
  - giá trị ngắn: `.sk-col .sk-opt, .sk-col .sk-kv b` → `--rd-size-xs`;
  - giữ font giao diện: `h1–h6, .sk-id, .sk-path, .sk-owner, .sk-meta, .sk-file, .tag, button,
    .btn, .sk-pass, .sk-nc, code, pre` trong `.sk-col`.
  Markdown ở live/local (`.sk-md`) ra `p`, `li`, `td`, `code`, nên cùng bộ chọn phủ được.
- **Rationale**: Một wrapper chung cho ba shell giữ nguyên tắc III; không phải sửa từng view.
- **Alternatives**: Sửa từng view để gắn class (nhiều chỗ, dễ sót).

## R5. Cỡ chữ đọc và thang cỡ chữ của spec 006

- **Decision**: Cỡ đọc không đi qua `--fs-N`. `reader.css` chỉ dùng `var(--rd-size)`,
  `var(--rd-size-sm)`, `var(--rd-size-xs)`; ba biến này do `applyReader` ghi (đã trừ 2px và 3px sẵn,
  không dùng `calc` trong CSS). Test thang cỡ chữ (`tests/typescale.test.ts`, FR-008 của 006) được
  mở rộng để chấp nhận đúng ba biến này, và thêm `reader.css` vào danh sách file được kiểm.
  Chữ giao diện trong popover dùng `--fs-11`, `--fs-12`, `--fs-13`.
- **Chữ mẫu "Aa"** (nút 22px/16px, ô font 22px, ô nền 18px): thêm `--fs-22` vào thang (desktop
  22px, điện thoại 21px, giữ thứ tự 20→20 ≤ 22→21 ≤ 24→22). Bảng `PHONE` trong test và
  `specs/006-mobile-font-size/data-model.md` được cập nhật cùng PR.
- **Rationale**: Cỡ đọc là lựa chọn của người dùng, không phải thang của hệ thống; trên điện thoại
  vẫn giữ cỡ người dùng chọn. Chữ giao diện vẫn theo thang, nên 006 không bị phá.
- **Alternatives**: Ánh xạ 6 nấc vào `--fs-15…--fs-24` (không có 22, và trên điện thoại 15 và 16
  cùng thành 16, nút cỡ chữ mất tác dụng); bỏ test 006 cho reader.css (mất hàng rào FR-008).

## R6. Font đọc và CSP (nguyên tắc II)

- **Decision**: Một `@import` Google Fonts ở đầu `reader.css` cho Literata (opsz 7..72, 400/600,
  italic 400), Source Serif 4 (opsz 8..60, 400/600), Atkinson Hyperlegible (400/700), `display=swap`.
  Archivo đã có trong `modernist.css`.
- **Rationale**: CSP của bản Pages đã cho `style-src https://fonts.googleapis.com` và
  `font-src https://fonts.gstatic.com` (vite.config.ts). Không thêm điểm đến mạng mới, nên không
  phải sửa CSP hay mục Security của README. Bản server không đặt CSP. Ba họ font có đủ tiếng Việt
  (FR-003). `display=swap` dùng font dự phòng cùng loại khi chưa tải xong (Edge case).
- **Alternatives**: Tự host font trong `public/` (thêm ~1 MB vào bản build, phải theo dõi giấy
  phép OFL); chỉ tải font được chọn (cần JS nạp stylesheet động, lợi ích nhỏ vì Google Fonts chỉ
  tải file font khi có chữ dùng tới).

## R7. Sidebar ẩn: gỡ khỏi DOM

- **Decision**: Sidebar bị ẩn không được render (như prototype `{lOpen && <aside…>}`), và
  `.sk-body` nhận class `no-left`/`no-right` để đổi lưới (contracts). Phím `[` và `]` gắn ở
  `window`, bỏ qua khi focus ở `input`, `textarea`, `select` hoặc `[contenteditable]`, và khi có
  phím bổ trợ.
- **Rationale**: Gỡ khỏi DOM chắc chắn không nhận focus và không được đọc (FR-008, SC-005), không
  cần `inert`. Trạng thái của sidebar (tab Gate/Copilot, tin nhắn Copilot) nằm ở shell nên không
  mất khi gỡ.
- **Alternatives**: `inert` + ẩn bằng CSS (giữ được cuộn của sidebar, nhưng `inert` cần kiểm tra
  trên trình duyệt cũ).

## R8. Ánh xạ token và màu cứng

- **Decision**: Mỗi nền ghi đè đúng bốn token `--color-bg`, `--color-surface`, `--color-text`,
  `--color-divider`; Dark ghi đè thêm `--color-accent-100/200/700/800` và `--color-neutral-300`
  (contracts). Không đổi `--color-accent`, khoảng cách, font giao diện. Bóng (`--shadow-*`) dùng
  `#2d2b2b` cố định: trên Dark được ghi đè thành viền mảnh theo ghi chú "hairline edge" của
  Modernist. Kiểm tra: grep `#fff|white|black|#000` trong `src/styles` và TSX ngoài định nghĩa token
  không còn kết quả (hiện đã sạch; test giữ cho nó sạch).
- **Rationale**: Mọi component đã đọc token, nên đổi token ở `:root` là đủ.
- **Alternatives**: Nền riêng cho từng vùng (trái FR-005).

## R9. Tương phản (FR-006, SC-002)

- **Decision**: Unit test tính tỉ lệ tương phản WCAG 2.x giữa `--color-text` và cả `--color-bg`,
  `--color-surface` của từng nền, yêu cầu ≥ 4.5:1; với Dark kiểm thêm `--color-accent-700` trên
  `--color-bg`. Tính sẵn (chữ trên nền / trên bề mặt): White 17.4 / 15.7, Sepia 7.7 / 6.9, Green 10.9 / 9.7,
  Dark 12.4 / 11.1. Màu nhấn `--color-accent-700` trên nền: White 7.2, Sepia 6.2, Green 5.6, Dark
  (`#ff9a86`) 9.1. Mọi cặp đạt 4.5:1.
- **Rationale**: Không cần trình duyệt; bảng giá trị nằm trong TS (`settings.ts`), test đọc thẳng.

## R10. Kiểm thử không thêm dependency

- **Decision**: Theo cách hiện có (`renderToStaticMarkup`, test đọc file nguồn): logic thuần
  (`settings.ts`: giá trị, validate, `readerVars`, reducer của popover và phím tắt) có unit test;
  markup của `ReaderPanel` và shell (nút có `aria-*`, sidebar ẩn không có trong HTML) kiểm bằng
  render tĩnh. Hành vi trong trình duyệt (Escape, bấm ra ngoài, không nháy, so ảnh 1440×900 và
  924×540) kiểm bằng Playwright với Chromium có sẵn (`/opt/pw-browsers/chromium`) qua script trong
  quickstart, không thêm vào `npm test`.
- **Rationale**: Nguyên tắc VII; repo chưa có jsdom hay Playwright trong devDependencies.
- **Alternatives**: Thêm jsdom + Testing Library (dependency mới chỉ cho một tính năng).

## R11. Demo và bản thiết kế

- **Decision**: Demo theo `Speckit Workspace.html` mới cho phần A–C (nút sidebar, Aa, popover,
  nền, cột đọc). Tab Highlights, thanh công cụ highlight và ghim thuộc `010-spec-annotations`; tới
  khi spec đó xong, demo khác bản thiết kế ở đúng các phần đó. Mốc so ảnh được lấy lại ở 1440×900
  và 924×540 với nền White mặc định, cộng một ảnh mỗi nền khác.
- **Rationale**: Nguyên tắc IV đòi demo giống thiết kế; phần chênh được ghi trong Complexity
  Tracking thay vì làm luôn highlight trong spec này.
