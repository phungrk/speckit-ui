# Quickstart: kiểm tra luồng nhận xét kiểu Google Docs (012-docs-style-comment-flow)

Hướng dẫn chạy và kiểm tra, không phải mã triển khai. Chi tiết giao diện ở
[contracts/comment-rail-ui.md](contracts/comment-rail-ui.md), kiểm tra định kỳ ở
[contracts/refresh-api.md](contracts/refresh-api.md), dữ liệu ở [data-model.md](data-model.md).

## Điều kiện

- `specs/010-spec-annotations` đã merge vào `main` (PR #30); 012 mở rộng code của nó. Làm việc trên `feat/012-docs-style-comment-flow` tách từ `main`.
- Node ≥ 22.18, `npm install`.
- Tài khoản thử có **quyền ghi nội dung** repo và một tài khoản **chỉ có quyền đọc** (hoặc dùng GitHub giả lập của test).
- Một spec có tài liệu dài vài trang, đã có 2–3 highlight mẫu.

## Lệnh

```bash
npm run dev            # app + API ở http://localhost:5173 (đọc .env rồi .env.local)
npm test               # Vitest
npm run typecheck
npm run build          # bản server
npm run build:pages    # bản tĩnh GitHub Pages
```

Cả bốn phải qua trước khi merge (constitution V).

## Kịch bản kiểm tra tay (chạy ở server; Pages và local cùng luồng, demo không commit)

| # | Làm | Kỳ vọng | Spec |
|---|-----|---------|------|
| 1 | Bôi chọn một câu trong spec.md | Thanh công cụ có **Add comment** nổi bật; không tô gì | FR-001 |
| 2 | Bấm Add comment | Hộp soạn ở rail ngang câu, có avatar chữ cái và tên; ô nhập có focus; câu được đánh dấu nháp | FR-002 |
| 3 | Gõ rồi bấm Comment (hoặc ⌘/Ctrl+Enter) | Thẻ hiện ngay "Sending…", rồi "Saved · commit abc1234"; câu được tô trung tính; **không chọn màu nào** | SC-001, FR-003, FR-013 |
| 4 | Mở lịch sử nhánh trên GitHub | Đúng một commit mới, chỉ đổi `specs/NNN-…/highlights.json`, thông điệp kết thúc `[skip ci]` | 010 SC-003 |
| 5 | Bôi chọn câu khác, gõ chữ, rồi bôi chọn câu thứ ba | Nháp đầu không mất; hỏi trước khi bỏ nếu huỷ | FR-005 |
| 6 | Cuộn tài liệu | Mỗi thẻ đi cùng đoạn chữ của nó; hai thẻ gần nhau không đè | FR-007, SC-003 |
| 7 | Bấm thẻ 2, rồi đoạn chữ 3, rồi ghim ở lề, rồi mục ở tab Highlights | Mỗi lần chỉ một thẻ mở rộng và một đoạn chữ đậm | FR-008, SC-004 |
| 8 | Tắt mạng rồi gửi một nhận xét | Thẻ "Failed: …" và nút Retry, nội dung còn; bật mạng, Retry: lưu một lần, không trùng | FR-013 |
| 9 | Ở máy khác (hoặc tài khoản khác) thêm một nhận xét | Trong vòng 2 phút máy đầu hiện "New comments (1)"; tài liệu, cuộn, thẻ đang soạn không đổi; bấm dấu thì thẻ mới hiện | FR-014, SC-010 |
| 10 | Chuyển sang tab khác 5 phút | Không có yêu cầu mạng nền (xem tab Network); quay lại thì kiểm tra ngay | contracts/refresh-api.md |
| 11 | Đăng nhập tài khoản chỉ có quyền đọc | Nút Add comment tắt kèm lý do và cách khắc phục; vẫn xem và chọn mọi nhận xét; 0 yêu cầu ghi | FR-016, SC-009 |
| 12 | Sửa câu đã có nhận xét trong tài liệu rồi tải lại | Thẻ vào nhóm "Outdated, text changed" với nguyên văn cũ | FR-010 |
| 13 | Mở "Before you approve" của bước có ghi chú Issue, ghi chú không màu, ghi chú Key | Thứ tự: Issue, Comment, Key | FR-003 |
| 14 | Thu hẹp cửa sổ tới 390px | Rail ẩn, ghim hiện; chọn nhận xét mở sheet dưới; không cuộn ngang | FR-011, SC-007 |
| 15 | Chỉ dùng bàn phím: chọn chữ (Shift+mũi tên), Ctrl/Cmd+Alt+M, gõ, Ctrl/Cmd+Enter, ↑/↓ giữa các thẻ | Làm được hết; thẻ chọn được công bố | SC-007 |
| 16 | Tạo 200 nhận xét mẫu, mở tài liệu và cuộn | Mượt; DOM chỉ có thẻ gần vùng nhìn | SC-006 |

## Kiểm tra giao diện (constitution IV)

- Chụp 1440×900 và 924×540 màn hình chính và hộp thoại New spec **khi chưa có nhận xét nào**: phải khớp thiết kế từng pixel (SC-008).
- Demo có highlight mẫu có ghi chú nên rail hiện: so với bản `Speckit Workspace.html` **cập nhật có rail** (người dùng cung cấp, điều kiện merge), phải khớp từng pixel. Chưa có bản đó thì chỉ so được trạng thái chưa có nhận xét nào.
- Kiểm tra bốn nền của chế độ đọc: màu tô `n`, `sk-sel` và `sk-draft` đọc được.

## Kiểm tra tự động (điểm chính)

- `layoutCards`: không đè, chọn thẻ giữ đúng `anchorTop`, thẻ phía trên bị đẩy lên, nhiều thẻ cùng `top`.
- `reducePending`: sending → saved, sending → failed → Retry không tạo `id` mới.
- `diffIncoming` và `nextPollDelay`: 60 s, backoff nhân đôi tới 10 phút, về 60 s khi thành công, dừng khi ẩn.
- `parseHighlights` và `applyChange` chấp nhận `n`; file cũ không có `n` đọc như trước.
- `briefNotes`: Issue, rồi `n`, rồi các màu còn lại.
- `GET /api/highlights`: 200 kèm `etag`, 304 khi `If-None-Match` khớp, 404 thành danh sách rỗng, 401/403/429, không rò token.
- Render tĩnh: rail, thẻ (đóng, chọn, nháp, đang gửi, lỗi, Outdated), nút Add comment tắt kèm lý do.
- Không test nào ghi GitHub thật (constitution V).
