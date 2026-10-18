# Quickstart: Cỡ chữ phù hợp màn hình điện thoại

Mọi kịch bản dùng dữ liệu tự tạo của chế độ demo, và GitHub giả lập cho bản server và bản tĩnh. Không kịch bản nào ghi vào GitHub thật (hiến pháp V). Playwright và Chromium có sẵn trong môi trường; không thêm dependency.

## Chuẩn bị

- Ảnh gốc: trước khi sửa CSS, chụp demo ở 1440×900 và 924×540 trên nhánh `main`, lưu ngoài repo.
- Chạy thử:
  - `npm run dev` (demo và server, `http://localhost:5173`);
  - `npm run build:pages` rồi phục vụ `dist` ở `:4173/speckit-ui/` (bản tĩnh).
- Bề rộng cần thử: 360, 390, 430, 760, 761 và 1440px.

## Kịch bản 1: kiểm tĩnh (chạy trong `npm test`)

`npx vitest run tests/typescale.test.ts`

- Kỳ vọng: pass. Không còn `font-size: <số>px` hay `fontSize: <số>` ngoài khối biến; mọi biến dùng đều có khai báo; giá trị máy tính bằng `Npx`; giá trị điện thoại khớp [data-model.md](./data-model.md) và đều ≥ 12px; có quy tắc ô nhập 16px (FR-003, FR-004, FR-008, SC-002, SC-005).

## Kịch bản 2: đọc nội dung trên điện thoại (US1)

1. Mở demo ở 390px, vào một spec có đủ spec, plan, tasks.
   - Kỳ vọng: đoạn văn và dòng danh sách có `font-size` tính ra 16px; bảng và thẻ ≥ 14px; nhãn nhỏ và tiêu đề cột đúng 12px (FR-001, FR-002).
2. Trong console của trang chạy:

   ```js
   [...document.querySelectorAll('body *')]
     .filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
     .map(e => parseFloat(getComputedStyle(e).fontSize))
     .reduce((a, b) => Math.min(a, b))
   ```

   - Kỳ vọng: kết quả ≥ 12 (SC-001, FR-003).
3. Lặp lại bước 1–2 trên bản server và bản tĩnh.
   - Kỳ vọng: cùng kết quả (FR-009).

## Kịch bản 3: ô nhập không bị phóng to (US2)

1. Ở 390px, mở màn hình kết nối (bản tĩnh) và ô tìm repo, ô thanh lệnh, ô ghi chú khi duyệt, ô Copilot.
   - Kỳ vọng: `getComputedStyle(el).fontSize === '16px'` cho từng `input`, `select`, `textarea` (FR-004).
2. Trên iPhone hoặc trình mô phỏng iOS, chạm vào từng ô.
   - Kỳ vọng: trang không bị phóng to (SC-003).

## Kịch bản 4: tiêu đề vừa màn hình hẹp (US3)

1. Ở 360px, mở lần lượt: màn hình kết nối, danh sách repo, workspace, hộp thoại New spec, hộp thoại duyệt cổng.
   - Kỳ vọng: không tiêu đề nào bị cắt; tiêu đề lớn nhất 30px (FR-001).

## Kịch bản 5: không tràn ngang (FR-007, SC-004)

Với mỗi bề rộng 360, 390, 430 và 760px, và mỗi màn hình ở kịch bản 4, cùng với bước khoá cổng, bảng task, Copilot:

```js
document.documentElement.scrollWidth <= window.innerWidth
```

- Kỳ vọng: `true`, và không chữ nào bị cắt hay đè lên nhau. Chỗ tràn thì sửa cục bộ (research R7).

## Kịch bản 6: ranh giới 760/761px (edge case)

1. Đặt bề rộng 760px: `getComputedStyle(document.body).fontSize` là `16px`.
2. Đặt bề rộng 761px: `15px`, đúng cỡ trước thay đổi.
   - Kỳ vọng: không có bề rộng nào lai giữa hai bộ (FR-005).

## Kịch bản 7: demo không đổi ở máy tính (hiến pháp IV, SC-002)

1. Chụp demo ở 1440×900 và 924×540 (màn hình chính và hộp thoại New spec) trên nhánh này.
2. So với ảnh gốc từ phần Chuẩn bị.
   - Kỳ vọng: giống hệt từng pixel.

## Kịch bản 8: phóng to trang (edge case)

Mở workspace ở 390px, phóng to trang tới 200% (Playwright: `page.setViewportSize` 195×… hoặc `Ctrl +` trên trình duyệt thật).

- Kỳ vọng: vẫn dùng được, không chữ nào đè lên nhau. Cỡ chữ tính bằng px nên thiết lập cỡ chữ của trình duyệt không ảnh hưởng; chỉ phóng to trang mới có tác dụng.

## Bốn lệnh kiểm tra

`npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages` đều phải qua (hiến pháp V).
