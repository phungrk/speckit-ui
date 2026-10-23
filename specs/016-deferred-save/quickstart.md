# Quickstart: kiểm lưu hoãn (016)

Chuẩn bị: `npm run dev` với GitHub giả (`FAKE_STATE`, như 011–017) cho chế độ server; `npm run build:pages` và chạy bản tĩnh với GitHub giả cho Pages nếu có; demo `?demo` và thư mục local để kiểm phần không đổi. Dữ liệu tự tạo.

1. **Tức thì.** Viết một nhận xét và thả một emoji: cả hai hiện ngay (dưới 0,3 giây), thẻ ghi "Not saved", thanh "2 changes not saved" hiện; kho giả: 0 commit. (US1-1, 2, SC-001)
2. **Tải lại.** Tải lại trang: nhận xét và emoji vẫn còn, vẫn "Not saved". Mở tab khác cùng spec: cùng thấy. (US1-3, SC-003)
3. **Save một lần.** Viết hai nhận xét, thả ba emoji, bấm Save: lần đầu hiện hộp xác nhận, chấp nhận: đúng một commit `[skip ci]` chứa cả năm thay đổi, thanh biến mất, dấu "Not saved" mất. (US2-1–3, SC-002)
4. **Lỗi giữ nguyên.** Làm lần lưu lỗi (500): thanh ở lại với lý do và Retry, hàng đợi nguyên; Retry thành công thì đúng một commit, không nhân đôi. (US2-4)
5. **Hợp nhất.** Trong lúc có thay đổi chưa lưu, ghi một nhận xét của người khác vào kho giả và làm mới: thấy cả hai; Save: file có cả hai. (US1-4, US2-5, SC-004)
6. **Mục bị xoá.** Người khác xoá nhận xét mình đã trả lời (chưa lưu) rồi mình Save: các thay đổi khác vẫn lưu, báo "1 change skipped". (US3-4)
7. **Discard.** Bấm Discard: hỏi xác nhận; xác nhận thì trở về trạng thái đã lưu, 0 yêu cầu ghi. (US3-1)
8. **Rời trang.** Có hàng đợi: đóng tab thì trình duyệt nhắc; hết hàng đợi thì không. (US3-2)
9. **Gộp.** Viết một nhận xét rồi xoá nó trước khi Save: Save không có gì để ghi (không commit). Thả rồi gỡ cùng emoji: không ghi. (FR-015)
10. **Chỉ đọc.** `push:false`: không tạo được thay đổi mới, kèm lý do; nếu còn hàng đợi cũ, Save tắt kèm lý do.
11. **Hai tài khoản.** Đổi tài khoản: không thấy hàng đợi của tài khoản trước.
12. **Local và demo.** Mỗi thao tác ghi ngay như trước, không thanh chưa lưu; ảnh demo giống hệt; test local qua. (US4, SC-005)
13. **Màn hình hẹp 390 px.** Thanh Save hiện, không cuộn ngang; Save, Discard dùng được; bộ nhớ chặn (chế độ riêng tư): thanh nói thay đổi sẽ mất khi đóng tab.
14. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.

## Kết quả kiểm (Playwright, GitHub giả, server, 2026-10-23)

- **1 (tức thì):** viết một nhận xét hiện sau 89 ms, thả emoji sau 73 ms; thẻ và trả lời ghi "Not saved"; 0 yêu cầu POST tới `/api/highlights`, 0 commit, không hộp xác nhận, không trạng thái "Sending".
- **2 (tải lại):** sau khi tải lại, nhận xét vẫn còn và vẫn "Not saved"; hàng đợi nằm ở một khoá `sk.pending.v1.mai.o/r@main.003-transfer-limits` trong bộ nhớ trình duyệt.
- **9 (gộp):** viết một nhận xét rồi xoá nó từ thẻ đóng (ba chấm, Delete) trước khi Save: hàng đợi rỗng, khoá bị gỡ, 0 commit; thả emoji rồi gỡ: hàng đợi rỗng.
- **11 (hai tài khoản):** khoá có tên tài khoản; `tests/pendingStorage.test.ts` kiểm hàng đợi của tài khoản khác không được thấy (chưa thử bằng hai phiên đăng nhập).
- **3 (Save một lần):** hai nhận xét, ba emoji và một trả lời: thanh "6 changes not saved" hiện ở đầu khung đọc và ở đầu tab Highlights; Save lần đầu hiện "Commit highlights?" (0 commit trước khi chấp nhận); sau đó đúng một commit `mai saved 6 comment changes on 003-transfer-limits [skip ci]`, thanh và "Not saved" mất, file có đủ.
- **4 (lỗi giữ nguyên):** Save lỗi 500: thanh ở lại "1 change not saved · Retry · Discard · GitHub is down", 0 commit; Retry thành công: đúng một commit.
- **5 (hợp nhất):** khi còn một nhận xét chờ, người khác ghi một nhận xét vào kho giả; Save: một commit, file có cả hai.
- **6 (mục bị xoá):** người khác xoá nhận xét mình vừa thả emoji (chưa lưu): Save lưu phần còn lại, thông báo "Saved · commit c4abcde · 1 change skipped (the comment was removed)".
- **10 (chỉ đọc):** hàng đợi còn từ trước, `push:false`: thanh hiện "1 change not saved", Save `aria-disabled` kèm lý do của 012.
- **7 (Discard):** Discard hỏi "Discard 2 changes? Keep / Discard"; Keep giữ nguyên; Discard xoá emoji vừa thêm, thanh mất, 0 POST, 0 commit, khoá trong bộ nhớ bị gỡ.
- **8 (rời trang):** `beforeunload` được huỷ mặc định (trình duyệt hỏi) khi còn thay đổi chưa lưu, im lặng khi hết; thay đổi ở spec khác (`004-card-freeze`) hiện "1 unsaved in other specs" và cũng làm trình duyệt hỏi.
- **2 (hai tab):** thay đổi ở tab A hiện ở tab B không cần tải lại (sự kiện `storage`); Discard ở A làm thanh ở B mất.
- **13 (bộ nhớ chặn):** `setItem` ném lỗi: thanh vẫn dùng được và thêm dòng "These changes are only in this tab and are lost if you close it."; đổi repo (Overview) hỏi "The changes not saved are only in this tab and will be lost. Leave this repository?".
- **12 (local và demo):** ảnh demo (chính, New spec, popup; 1440×900, 924×540, 390) giống từng byte với ảnh trước (ảnh 924 chập chờn giữa các lần chạy, lần so sánh cuối giống hệt); `tests/storeKinds.test.ts` kiểm `LocalWorkspace` và các cửa hàng local, demo không biết hàng đợi; `LocalWorkspace.tsx` không đổi so với `main`; test local (`localMode`, `localPrivacy`, `localProject`, `localRepositoryPersistence`) qua. Chưa thử ghi thư mục thật bằng trình duyệt (cần File System Access).
- **13 (390 px, bốn giao diện):** bốn giao diện: thanh dùng token (nền thẻ, chữ của giao diện, nút Save là `btn-primary` như các nút khác); ở 390 px thanh hiện, Save 71×44 px, không cuộn ngang.
