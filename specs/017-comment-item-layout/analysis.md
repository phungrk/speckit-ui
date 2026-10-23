# Analysis: 017 comment-item-layout (2026-10-23)

Báo cáo `/speckit-analyze`, kèm cách xử lý đã áp dụng. 13 FR + 7 SC, 16 task (nay 17 với T001b), phủ 100%.

| ID | Mức | Vấn đề | Xử lý |
|----|-----|--------|-------|
| C1 | CRITICAL | Phương án A (chừa chỗ cho ba chấm) làm giờ ở tiêu đề thẻ đóng của mình dịch ~32 px, nên ảnh demo đổi; hiến pháp IV chỉ cho lệch ở phần thuộc spec khác chưa xong, và 012 chỉ quyết định so demo với bản thiết kế đã cập nhật có rail. | Người dùng chọn cách (a): sẽ cập nhật bản thiết kế `Speckit Workspace.html` sau. Spec (Q1, FR-013, Assumptions) và plan (hàng IV) ghi rõ; thêm T001b chặn merge cho tới khi có xác nhận; ảnh demo so với ảnh trước spec cho tới lúc đó. |
| I1 | MEDIUM | US2-5 nói nút của thẻ đóng vào được bằng Tab, mâu thuẫn FR-010, R5, T008 (`tabindex=-1`). | US2-5 sửa: chỉ thẻ đang mở có nút trong thứ tự Tab. |
| U1 | MEDIUM | Hook `matchMedia` của T003 chưa nói về dựng phía máy chủ và lần vẽ đầu. | T003: trả `false` cho tới khi gắn vào trang, cập nhật trong `useEffect`; thêm test lần dựng đầu. |
| T1 | MEDIUM | Test 015 về khối cảm ứng dùng `.sk-cm-card.on` sẽ vỡ khi T009 bỏ giới hạn; lát cắt `block` chạy tới cuối file. | T010 nêu rõ các khẳng định cần cập nhật và quy ước khối 017 nằm sau khối 015, không `border-radius`. |
| E1 | LOW | "Thẻ đóng không emoji giữ chiều cao" không đúng trên cảm ứng. | Spec Edge Cases sửa. |
| T2 | LOW | T010 nói test luồng Delete tương tác, repo chỉ có kết xuất tĩnh. | Luồng Delete chỉ kiểm bằng T011 (Playwright). |
| C2 | LOW | `near()` dựng thẻ theo `height` cố định. | Ghi chú R9 trong research.md; không đổi (có vùng đệm một màn hình). |
| G1 | LOW | Chỉ đọc trên thẻ đóng chỉ có Playwright. | T010 thêm một ca markup. |
