# Quickstart: Kiểm chứng trạng thái nút Approve

Chi tiết hành vi xem [contracts/gates.md](./contracts/gates.md).

## Kiểm tra tự động (bắt buộc trước khi merge)

```bash
npm test && npm run typecheck && npm run build && npm run build:pages
```

Các test mới dùng GitHub giả lập. GitHub giả lập này có thể trả **danh sách issue cũ** sau khi ghi, để tái hiện lỗi gốc. Các test cần có:

- Duyệt xong, tracking trả về có cổng đã duyệt, dù danh sách issue vẫn là bản cũ (US1-AS1, FR-004).
- `getTracking(…, true)` trong 2 phút sau khi ghi vẫn thấy đã duyệt; bản trên GitHub có `updated_at` mới hơn thì thắng.
- Hai lệnh duyệt song song cho cùng spec: đúng 1 PATCH và 1 comment; lệnh thứ hai trả `unchanged: true` (FR-003, FR-007).
- Lần duyệt đầu tạo issue, lệnh duyệt thứ hai ngay sau đó không tạo issue thứ hai.
- Lỗi 403, 409 và mất mạng: không có trạng thái đã duyệt (SC-004).
- Lệnh đọc GitHub gửi `cache: 'no-cache'`.

## Kịch bản 1: Bản Pages (Playwright, GitHub giả lập có độ trễ và danh sách cũ trong 60 giây)

1. Mở một spec có cổng Plan đủ điều kiện, rồi bấm **Approve Plan**.
   - Kỳ vọng: nút hiện "Saving…" và bị khoá. Ngay khi ghi xong (≤ 1 giây), khu vực cổng hiện "Approved by @…", có nút Reopen gate, không còn nút Approve. Thanh bước hiện Approved, và Next up không còn "Approve Plan" (US1, FR-005).
2. Bấm **Refresh** 5 lần trong 2 phút.
   - Kỳ vọng: không lần nào quay lại nút Approve (SC-003).
3. Tải lại trang.
   - Kỳ vọng: vẫn đã duyệt, đúng người và ngày (US1-AS3).
4. Ở một cổng khác, nhấp đúp hoặc bấm nhanh 5 lần vào Approve.
   - Kỳ vọng: GitHub giả lập nhận đúng 1 PATCH và 1 comment (SC-002).
5. Mở cùng spec ở tab thứ hai trước khi duyệt. Duyệt ở tab 1, rồi bấm Approve ở tab 2.
   - Kỳ vọng: tab 2 hiện đã duyệt bởi người ở tab 1, kèm ghi chú "Already approved"; không có comment thứ hai (US2-AS3).
6. **Reopen gate** ở một cổng đã duyệt.
   - Kỳ vọng: về ngay trạng thái chưa duyệt; nút bị khoá trong lúc lưu (US4).

## Kịch bản 2: Bản server

Chạy lại các bước 1–6 với `npm start` ở chế độ token, GitHub giả lập trong tiến trình server.

Kỳ vọng: giống hệt bản Pages (FR-009).

## Kịch bản 3: Chế độ demo

So ảnh `?demo` với `main` ở 1440×900 và 924×540.

Kỳ vọng: giống hệt từng pixel (FR-010).
