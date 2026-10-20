# Quickstart: kiểm tra chế độ đọc (010)

Giá trị mong đợi nằm ở [contracts/reader-ui.md](contracts/reader-ui.md); luồng lưu ở
[data-model.md](data-model.md).

## Chuẩn bị

```bash
npm install
npm test && npm run typecheck && npm run build && npm run build:pages
npm run dev            # http://localhost:5173 ; demo: http://localhost:5173/?demo
```

Playwright (chỉ để kiểm tay và chụp ảnh, không nằm trong `npm test`): dùng Chromium có sẵn với
`executablePath: '/opt/pw-browsers/chromium'`. Không chạy `playwright install`.

## Kịch bản

### 1. Cài đặt đọc chỉ đổi văn xuôi (US1, SC-001)

1. Mở demo, bước Specify. Bấm **Aa**: popover mở, `aria-expanded="true"`, focus ở ô Literata.
2. Chọn Atkinson, bấm "Larger" tới 22px, Spacing 1.9, Width 820.
3. Mong đợi: đoạn văn trong cột đọc đổi font, cỡ, giãn dòng; cột rộng tối đa 820px.
   `FR-001`, tiêu đề, đường dẫn file, nút và nhãn vẫn là Archivo; `.sk-id` vẫn 12px
   (`getComputedStyle`).
4. Nhấn Escape: popover đóng, focus về nút Aa. Mở lại, bấm ra ngoài: đóng. Bấm Aa lần nữa: đóng.
5. Bấm "Reset to default": Literata, 18px, 1.7, 700px, White.
6. FR-011: ghi lại `getBoundingClientRect()` của `nav.sk-nav`, `.sk-rail`, `aside.sk-side`, `aside.sk-right`; đổi cỡ 15→22 và độ rộng 600→820; bốn khung này không đổi, chỉ nội dung `.sk-col` dàn lại.

### 2. Nền phủ toàn bộ khung (US2, SC-002)

1. Chọn lần lượt Sepia, Green, Dark.
2. Mong đợi: header, hai sidebar, cột giữa, popover Aa và hộp thoại "+ New spec" đều đổi màu theo
   bảng. Không vùng nào còn nền `#f3f2f2` hoặc trắng cứng.
3. Ở Dark, khung cảnh báo và chữ `--color-accent-700` vẫn đọc được.
4. Bật "giảm chuyển động" của hệ điều hành: đổi nền không có hiệu ứng chuyển màu.
5. `npm test` có test tương phản: mọi cặp ≥ 4.5:1.

### 3. Không nháy theme khi tải lại (SC-003)

1. Chọn Dark, tải lại trang.
2. Mong đợi: khung hình đầu tiên đã là Dark (Playwright: `page.on('framenavigated')` rồi chụp ngay
   sau `domcontentloaded`; hoặc DevTools Performance → khung hình đầu không có nền trắng).
3. Lặp lại trên bản Pages (`npm run build:pages && npx vite preview`): CSP không báo lỗi nạp font.

### 4. Ẩn/hiện sidebar (US3, SC-005)

1. Bấm nút sidebar trái, rồi phải (hoặc phím `[` và `]`). Mong đợi: còn một cột đọc ở giữa;
   `aria-pressed="false"` trên cả hai nút.
2. Nhấn Tab qua cả trang: không có phần tử nào của sidebar nhận focus (sidebar không còn trong DOM).
3. Gõ `[` trong ô lệnh: không có gì bị ẩn.
4. Tải lại: vẫn ẩn. Thu về 1180px và 760px: nút vẫn hoạt động, lưới theo bảng ở contracts §6.

### 5. Theo người dùng và theo chế độ (FR-004, FR-012)

1. Server hoặc Pages: đăng nhập tài khoản A, chọn Sepia. Đăng xuất, đăng nhập tài khoản B: B thấy
   cài đặt của chính B (mặc định nếu chưa có). Đăng nhập lại A: Sepia.
2. Local: chọn một thư mục, đổi cài đặt, tải lại và chọn lại thư mục: cài đặt còn.
3. Chế độ riêng tư hoặc chặn bộ nhớ: đổi cài đặt vẫn áp ngay, không lỗi; tải lại thì về mặc định.

### 6. Bàn phím (SC-004)

Chỉ dùng Tab, Shift+Tab, Enter, Space, Escape: mở Aa, đổi từng mục, Reset, đóng popover, ẩn/hiện
hai sidebar. Mỗi điều khiển có viền focus `2px var(--color-accent)`.

### 7. So ảnh thiết kế (constitution IV)

Chụp demo ở 1440×900 và 924×540 (màn hình chính và hộp thoại New spec) với nền White, cộng một ảnh
1440×900 cho mỗi nền Sepia, Green, Dark. So với `Speckit Workspace.html` của bản thiết kế. Phần
chênh được chấp nhận: tab Highlights, thanh công cụ highlight và ghim (thuộc
`010-spec-annotations`). Ảnh không commit vào repo nếu chứa dữ liệu của repo private.
