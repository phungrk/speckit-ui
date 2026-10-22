# Quickstart: kiểm thẻ nhận xét gọn (014)

Chuẩn bị: `npm run dev` (demo `http://localhost:5173/?demo`, đổi vai sang QA để là tác giả của nhận xét mình tạo); server dùng GitHub giả như 012/011. Dữ liệu tự tạo, không ghi GitHub thật.

1. **Một màu.** Chọn câu → Comment → gõ → gửi: đoạn chữ tô cam (`--hl-o`), thẻ không có ô màu hay nhãn màu; file lưu `color: "o"`. (US1-1, 2, SC-001)
2. **Thêm ghi chú vào highlight chỉ-màu của mình** (013): thành nhận xét, giữ màu có sẵn. (US1-3)
3. **Nhận xét cũ.** Nhận xét lưu với `y`, `b`, `p`, `n` vẫn đúng màu trên đoạn chữ; mở tài liệu không tạo commit hay đổi file. (US1-4, SC-004)
4. **Ba chấm.** Thẻ của mình mở: nút ba chấm ở tiêu đề nhận xét và ở từng trả lời của mình; thẻ hay trả lời của người khác không có. (US2-1, 2)
5. **Menu.** Edit soạn tại chỗ; Delete hỏi xác nhận (nêu số trả lời); Escape/bấm ngoài đóng và tiêu điểm về nút; một menu mở một lúc. (US2-3, 4)
6. **Bàn phím.** Tab tới nút, Enter mở, ↓/↑ di chuyển, Enter chọn, Escape đóng. (US2-6, SC-003)
7. **Chỉ đọc** (`push:false`): mở menu của mục mình: Edit và Delete tắt kèm lý do. (US2-5)
8. **Không Copy/Ask.** Thẻ và tab không còn Copy, Ask. (US3, SC-002)
9. **Bố cục.** Nhận xét + một trả lời: tiêu đề → nội dung → tiêu đề trả lời → nội dung → ô trả lời; Cancel/Reply ẩn lúc nghỉ, hiện khi chọn ô hoặc có chữ; Cancel có chữ hỏi bỏ. (US4, SC-006)
10. **Hẹp.** 390 px: sheet có đủ, không cuộn ngang, ba chấm ≥ 44 px (`pointer: coarse`). (US4-4, SC-005)
11. **Tab Highlights.** Không ô lọc màu, không nhãn màu; còn dải màu nhỏ; mục chỉ-màu của mình: chỉ Delete (có xác nhận). (FR-013)
12. **Before you approve** (demo, Gate): ghi chú theo thời gian, không Issue trước. (US2/Q2)
13. **Dữ liệu và lưu.** `npm test` qua các test lưu/đọc/commit; mỗi lần lưu một commit `[skip ci]` ở GitHub giả. (FR-011)
14. **Demo 1440×900 và 924×540** (màn hình chính, hộp thoại New spec) giống hệt trước khi sửa.
15. **Cổng.** `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.

## Results (2026-10-22, implement)

Run with Playwright outside the repo, synthetic data, fake GitHub (no real GitHub written). Demo at 1920 and 390 (touch emulation for the coarse-pointer checks); server mode against the fake with the page's own `POST /api/highlights`.

| Scenario | Mode | Result |
|---|---|---|
| 1 one colour | demo; server (fake) | Pass: a new comment is saved with `color: "o"`, the text is painted orange (`sk-o` registered), the card has no swatches or colour label; the edge of an unselected card uses the saved colour |
| 2 note on a colour-only highlight of mine | server (fake) | Pass: the popup has only Comment; sending kept colour `b` and added the note; one `[skip ci]` commit |
| 3 old comments | demo; server | Pass: comments saved with `p` and `y` keep their colour on the text and the card edge; opening and selecting wrote nothing (no commit, file unchanged, demo storage still empty); unit test writes a file with all five colours back byte for byte |
| 4 three dots | demo (QA) | Pass: the button is on the open card, once for the comment and once for each reply of mine; none on a closed card, none on Director's view of QA's comment, none on lan's comment on the server |
| 5 menu | demo | Pass: Edit edits in place and hides the button until Save/Cancel; Delete asks ("Delete this comment?" / "Delete this reply?"); Escape and a click outside close it; opening a second menu closes the first; focus returns to the button |
| 6 keyboard | demo | Pass: Enter or ArrowDown opens, focus on Edit, ↓/↑ wrap, Escape closes without deselecting the card, ArrowDown/Up in the menu do not move the selected card, Tab closes |
| 7 read-only | server (fake, `push:false`) | Pass: the menu is there on my comment and reply; Edit and Delete are `aria-disabled` with "Your GitHub account has read-only access…"; choosing one does nothing |
| 8 no Copy/Ask | demo | Pass: none on the card or in the Highlights tab |
| 9 layout | demo 1920 | Pass: header (avatar, name, time, ⋮), text, emoji, replies, box to answer; Cancel/Reply hidden at rest, shown when the box is focused or has words; Cancel on words asks to discard; Discard leaves the box at rest |
| 10 narrow | demo 390, touch | Pass: sheet has the whole card; ⋮ is 44×44; menu items 44 px tall; the menu opens inside the screen; no horizontal scroll |
| 11 Highlights tab | demo | Pass: no filter chips, no colour words; colour bars kept; my colour-only entry offers only Delete (asks first); an entry with a note and somebody else's entry do not expand |
| 12 Before you approve | demo | Pass: notes in the order written |
| 13 data and saving | tests; server | Pass: 476 tests; each save one commit, `[skip ci]`, only `highlights.json` |
| 14 demo screenshots | demo | 1440×900 and 924×540 (main screen, New spec dialog) byte-identical to before |
| 15 gates | — | `npm test` (476), `npm run typecheck`, `npm run build`, `npm run build:pages` pass |

Found and fixed while checking: the first item of an opened menu took the focus only after the menu had a place (it was hidden when asked); in the narrow sheet the page scrolling just after opening closed the menu at once.

Not run in a browser: static (Pages) and local mode (same components and `applyChange`, built only), and the real GitHub. The commit message for a new comment now reads "noted" instead of "commented" because new comments are colour Change rather than the plain colour `n`.
