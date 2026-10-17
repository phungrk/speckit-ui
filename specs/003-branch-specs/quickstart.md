# Quickstart: Kiểm chứng spec trên nhiều nhánh

Chi tiết xem [contracts/branches.md](./contracts/branches.md) và [data-model.md](./data-model.md).

## Kiểm tra tự động

```bash
npm test && npm run typecheck && npm run build && npm run build:pages
```

Test mới dùng GitHub giả lập gồm:
- nhánh `main` có spec 001 và 002;
- `feat/001-a`, đã merge nên SHA giống `main`;
- `feat/003-x`, có spec 003 mới;
- `feat/004-y`, tạo từ `feat/003-x`, mang theo 003 và thêm 004;
- `feat/005-z`, có `005-other`, trùng số với một `005-…` khác;
- `feat/no-specs`, không có thư mục `specs/`;
- `fix/006-w`, có spec 006, không được đọc;
- một nhánh trả lỗi 500.

## Kịch bản 1: Bản Pages (Playwright, GitHub giả lập như trên)

1. Connect, rồi mở repo.
   - Kỳ vọng: panel Specs có 001, 002, 003 (`003-x`), 004 (`004-y`), cả hai `005-…` kèm cảnh báo trùng số. Không có 006 (US1-AS5, US1-AS6, FR-007).
   - Kỳ vọng: 003 chỉ hiện một lần, có ghi chú ở 2 nhánh (US3-AS1).
   - Kỳ vọng: nhánh lỗi có cảnh báo, các spec khác vẫn đủ (FR-008).
2. Chọn 004.
   - Kỳ vọng: các bước theo nội dung của `feat/004-y`; link file trỏ nhánh đó; thanh lệnh nhắc `git switch feat/004-y` (US2).
3. Duyệt cổng Specify của 004.
   - Kỳ vọng: ghi vào issue của `004-y` và link trong issue trỏ `feat/004-y` (US2-AS2).
4. Sao chép địa chỉ, mở ở tab mới.
   - Kỳ vọng: đúng spec 004 trên đúng nhánh (FR-009).
5. Đẩy thêm `plan.md` cho 003 trên `feat/003-x`, rồi bấm Refresh.
   - Kỳ vọng: 003 hiện plan ngay (SC-001). Lần làm mới khi không có gì đổi tốn 2 lần gọi danh sách (R3).
6. Mở repo với Branch cố định là `main` (Advanced).
   - Kỳ vọng: chỉ có 001 và 002 (FR-010).
7. Đo thời gian với 20 nhánh `feat/…` và độ trễ giả lập.
   - Kỳ vọng: lần đầu ≤ 10 giây, làm mới ≤ 3 giây (SC-002).

## Kịch bản 2: Bản server

Chạy lại các bước 1–5 với `npm start` ở chế độ token, GitHub giả lập trong tiến trình server.

Kỳ vọng: giống hệt bản Pages.

## Kịch bản 3: Repo này

Mở `phungrk/speckit-ui` trên bản Pages sau khi deploy.

Kỳ vọng:
- spec 003 (`feat/003-branch-specs`) và 004 (`feat/004-approval-gates-next`) hiện với nhãn nhánh;
- `feat/001-…` và `feat/002-…` đã merge, nên không gây trùng;
- 4 nhánh `feat/` cũ không có `specs/` bị bỏ qua, không cảnh báo.

## Kịch bản 4: Chế độ demo

So ảnh `?demo` với `main` ở 1440×900 và 924×540.

Kỳ vọng: giống hệt từng pixel.
