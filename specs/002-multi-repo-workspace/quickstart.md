# Quickstart: Kiểm chứng tính năng nhiều repo

Hướng dẫn chạy để chứng minh tính năng hoạt động từ đầu đến cuối. Chi tiết endpoint và trạng thái xem ở
[contracts/server-api.md](./contracts/server-api.md) và [contracts/client-state.md](./contracts/client-state.md).

## Chuẩn bị

- Một fine-grained token có quyền đọc **ít nhất 2 repo Spec Kit** và **1 repo thường**, cùng quyền Issues đọc và ghi trên một trong các repo Spec Kit.
- Để kiểm bản server có đăng nhập: một GitHub App thử nghiệm với callback `http://localhost:8787/auth/callback`, quyền Contents đọc, Pull requests đọc, Issues đọc và ghi, cùng **hai tài khoản GitHub** có quyền khác nhau.
- Lệnh chung: `npm install`.

## Kiểm tra tự động (bắt buộc trước khi merge, nguyên tắc V)

```bash
npm test && npm run typecheck && npm run build && npm run build:pages
```

Kỳ vọng: mọi test đều qua. Test mới dùng GitHub giả lập và fixture tự tạo, không gọi GitHub thật.

## Kịch bản 1: Bản Pages (US1–US4)

1. `npm run build:pages`, rồi phục vụ `dist/` ở `/speckit-ui/` và mở trang.
2. Nhập token, **không nhập repo**, rồi Connect.
   - Kỳ vọng: danh sách repo hiện trong vòng 5 giây; repo Spec Kit có nhãn, repo thường không có (US1-AS1, SC-002).
3. Chọn repo A.
   - Kỳ vọng: mở workspace của A; địa chỉ có `?repo=` và không có token (FR-008).
4. Chọn một spec và bước Plan, rồi đổi sang repo B từ thanh điều hướng.
   - Kỳ vọng: B hiện ra trong vòng 10 giây; không còn spec hay phê duyệt nào của A (US2-AS1, US2-AS3).
5. Quay lại A.
   - Kỳ vọng: đúng spec và bước Plan đã xem (US2-AS2).
6. Ghim A và B, rồi mở **Overview**.
   - Kỳ vọng: hai khối A và B với việc cần làm; bấm một mục thì mở đúng repo, spec và bước (US4).
7. Thu hồi quyền repo B trong token trên GitHub, rồi tải lại Overview.
   - Kỳ vọng: khối B báo lỗi, khối A vẫn đúng (FR-019).
8. Disconnect.
   - Kỳ vọng: không còn dữ liệu repo nào hiện ra; tải lại thì trở về màn hình Connect (FR-017).

## Kịch bản 2: Chạy local bằng token cục bộ (US5-AS4)

1. Tạo `.env.local` có dòng `GITHUB_TOKEN=<token>`, rồi kiểm tra `git status`.
   - Kỳ vọng: `.env.local` không xuất hiện (FR-016).
2. `npm run dev`.
   - Kỳ vọng: vào thẳng danh sách repo, không có màn hình nhập token.
3. Sửa token cho sai, rồi khởi động lại.
   - Kỳ vọng: màn hình hướng dẫn nêu tên file `.env.local` và quyền cần cấp.
4. `npm start` với `HOST=0.0.0.0`, và `npm run dev -- --host`, khi không có thông tin App.
   - Kỳ vọng: cả hai đều từ chối lắng nghe ngoài `127.0.0.1` và in cảnh báo, trừ khi đặt `ALLOW_REMOTE_TOKEN_MODE=1` (R6).

## Kịch bản 3: Bản server có đăng nhập (US5)

1. Đặt `GITHUB_APP_CLIENT_ID` và `GITHUB_APP_CLIENT_SECRET` trong `.env.local`, xoá `GITHUB_TOKEN`, rồi `npm start`.
2. Mở `/?repo=<repo A>` khi chưa đăng nhập.
   - Kỳ vọng: chỉ thấy màn hình đăng nhập (US5-AS1). Đăng nhập xong thì mở thẳng repo A.
3. Mở DevTools, xem mọi response `/api/*` và cookie.
   - Kỳ vọng: không có token GitHub nào; chỉ có cookie `sk_session` với `HttpOnly` (FR-015).
4. Đăng nhập bằng tài khoản thứ hai, trong trình duyệt khác.
   - Kỳ vọng: chỉ thấy repo của tài khoản đó, kể cả khi tài khoản thứ nhất vừa mở một repo mà tài khoản thứ hai không có quyền (SC-006).
5. Mỗi tài khoản duyệt một cổng.
   - Kỳ vọng: issue ghi đúng tên từng người (US5-AS3).
6. Sign out.
   - Kỳ vọng: về màn hình đăng nhập; gọi `/api/repos` trả 401 (FR-017).

## Kịch bản 4: Chế độ demo không đổi

`npm run dev` khi không có cấu hình nào, rồi so ảnh chụp với bản thiết kế ở 1440×900 và 924×540.

Kỳ vọng: giống hệt từng pixel (nguyên tắc IV).
