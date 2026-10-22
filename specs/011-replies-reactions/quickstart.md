# Quickstart: kiểm trả lời và emoji

Chuẩn bị: `npm run dev` (demo `http://localhost:5173/?demo`); server dùng GitHub giả như spec 012/013 (`FAKE_STATE`, hai người `mai` và `lan` bằng cách sửa file trạng thái). Dữ liệu tự tạo, không ghi GitHub thật.

1. **Trả lời.** Chọn một nhận xét, gõ ở ô Reply, gửi: trả lời hiện dưới nhận xét với tên, giờ; thẻ đóng ghi "1 reply". (US1-1)
2. **Người khác trả lời.** Ở server giả, `lan` trả lời nhận xét của `mai`; `mai` bấm "New comments": trả lời của `lan` hiện, `mai` không sửa/xoá được nó. (US1-1, SC-001)
3. **Trống và quá dài.** Gửi trống: không lưu, có lời nhắc; 2.001 ký tự: báo trước khi gửi. (US1-2, FR-005)
4. **Sửa và xoá.** Sửa trả lời của mình: hiện "edited"; xoá hỏi xác nhận; trả lời của người khác không có menu. (US1-3)
5. **Hai người cùng lúc.** Hai trả lời gần như đồng thời ở server giả: cả hai còn. (US1-4, SC-002)
6. **Xoá nhận xét gốc có trả lời:** hộp xác nhận nêu số trả lời. (US1-5)
7. **Chỉ đọc.** `push:false`: thấy trả lời và emoji, ô Reply và nút emoji tắt kèm lý do. (US1-6, US2-5)
8. **Hẹp.** 390 px: thẻ trong sheet có đủ phần trả lời và emoji, không cuộn ngang. (US1-7, SC-005)
9. **Emoji.** Thả 👍 và 🎉 lên hai mục: số 1; người thứ hai thả cùng emoji: 2; bấm lại emoji của mình: gỡ, số giảm; không gỡ được của người khác; tên người thả hiện ở `title`. (US2-1…3)
10. **Emoji đồng thời:** hai người thả cùng lúc, cả hai được tính. (US2-4)
11. **Tương thích.** File 010/012 thuần mở bình thường, lưu lại giống hệt từng byte khi không đổi; file có trả lời ghi `version: 2`; một emoji ngoài bộ trong file bị bỏ qua, không hỏng. (FR-013, SC-006)
12. **Bản cũ không xoá dữ liệu.** Bản parse cũ (v1 only, trong test) từ chối file `version: 2`. (R1)
13. **Commit.** Mỗi lần lưu ở server giả đúng một commit `[skip ci]` chỉ đổi `highlights.json` với thông điệp trong contract. (SC-003)
14. **Hiệu năng.** 200 nhận xét × 3 trả lời: mở tài liệu dưới 1 giây, rail không chồng thẻ. (SC-004)
15. **Bàn phím.** Chỉ bàn phím: chọn thẻ, Tab tới ô Reply, gõ, Ctrl+Enter, thả emoji bằng Enter. (SC-005)
16. **Demo.** Demo 1440×900 và 924×540 (màn hình chính, hộp thoại New spec) giống hệt trước khi sửa khi chưa có thảo luận.
17. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.

## Results (2026-10-22, implement)

Run with Playwright outside the repo, synthetic data, fake GitHub (no real GitHub written). Demo at 1920 and 390; server mode against the fake with the page's own `POST /api/highlights`.

| Scenario | Mode | Result |
|---|---|---|
| 1 reply | demo 1920 | Pass: reply under the comment with initials, name, "Just now"; box cleared; saved in the browser; closed card says "1 reply" |
| 2 another person replies | server (fake) | Pass: a reply and an emoji written by `lan` show after "New comments (1)"; no Edit/Delete on it; mai's reply made one `[skip ci]` commit and the file became `version: 2` |
| 3 empty / too long | demo; unit | Pass: empty → "Write a reply first"; 2,001 characters → warning and Reply off (tests) |
| 4 edit / delete | demo, server | Pass: "edited" shown; Delete asks first; mai deleted her own reply, lan's stayed |
| 5 two at once | unit (fake GitHub) | Pass: both replies, and both emoji, kept after a conflict re-read (`tests/highlights.test.ts`) |
| 6 delete a comment with replies | unit | Question names the replies (card text chosen from the count) |
| 7 read-only | server (fake, `push:false`) | Pass: replies and emoji visible; the Reply box and emoji buttons disabled; the reason shown |
| 8 narrow | demo 390 | Pass: pin → sheet with the thread; reply sent from the sheet with Ctrl+Enter; no horizontal scroll |
| 9 emoji | demo, server | Pass: 🎉 on a reply, 👍 on a comment, number 2 after a second person, tooltip "👍 1 person: An Vo (including you)", removing works |
| 10 emoji at once | unit | Pass |
| 11 compatibility | unit | Pass: a file from before this spec is written back byte for byte; an emoji outside the set is ignored; `version: 2` only when needed |
| 12 old build | unit | Pass: a parser that knows only version 1 refuses a version 2 file |
| 13 commits | server (fake) | Pass: one commit per save, only `highlights.json`, messages `replied`, `reacted 👍`, `removed a reply`, all ending `[skip ci]` |
| 14 performance | demo | 200 comments × 3 replies: rail shows 200 after 394 ms including page load; 12–19 cards in the DOM; 0 overlaps; selecting a card 54 ms |
| 15 keyboard | demo | Pass: Escape in the box asks "Discard this reply?" and keeps the card open; arrows on an emoji button do not move the selection; the picker opens with Enter |
| 16 demo screenshots | demo | 1440×900 and 924×540 (main screen, New spec dialog) byte-identical to before |
| 17 gates | — | `npm test` (463), `npm run typecheck`, `npm run build`, `npm run build:pages` pass |

Also checked: a failed save of an emoji is rolled back and "Not saved: …" is shown; a reply that failed stays with "Failed: … Retry", and Retry saved exactly one reply.

Not run in a browser: static (Pages) and local mode (same components and `applyChange`, built only), and the real GitHub (Contents API `If-None-Match` and token checks stay with spec 012's open items).
