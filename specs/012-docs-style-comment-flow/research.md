# Research: Luồng nhận xét kiểu Google Docs (012-docs-style-comment-flow)

Nền là code của 010 trên `main` (`Annotator`, `Toolbar`, `useHighlights`, `HighlightsPanel`,
`store`, `brief`, `server/highlights*.ts`). Các quyết định dưới đây chỉ nói phần 012 thay đổi.

## R1. Rail nằm ở đâu

- **Decision**: Rail là phần tử con của `.sk-doc` (chính vùng cuộn của tài liệu), đặt tuyệt đối bên
  phải `.sk-col`, rộng 300px, như cách 010 đặt ghim (R7 của 010). Thẻ cuộn cùng tài liệu mà không
  cần xử lý sự kiện cuộn. Rail chỉ hiện khi bề rộng của `.sk-doc` đủ chỗ (đo bằng `ResizeObserver`,
  không dùng bề rộng cửa sổ vì sidebar phải có thể mở hoặc đóng); không đủ thì chuyển sang chế độ hẹp (R9).
- **Rationale**: Ghim ở lề đã dùng cùng cách và đã đúng vị trí; không cần đồng bộ cuộn giữa hai vùng.
  Đo trên `.sk-doc` đúng với bố cục thật của ba shell.
- **Alternatives**: Một cột riêng ngoài `.sk-doc` (phải đồng bộ cuộn, dễ lệch); dùng sidebar phải của
  010 (tab Highlights vẫn là danh sách theo bước, không thẳng hàng).

## R2. Bố trí thẻ và dựng cửa sổ trượt

- **Decision**: Hàm thuần `layoutCards(items, selectedId, heights, gap)` trong `src/annotations/layout.ts`:
  1. sắp theo `top` của neo (đoạn chữ), cùng `top` thì theo `createdAt`;
  2. lượt xuôi: `top = max(anchorTop, prevBottom + gap)`;
  3. nếu có thẻ đang chọn, đặt nó đúng `anchorTop` và chạy lượt ngược cho các thẻ phía trên:
     `bottom ≤ nextTop − gap` (đẩy lên), rồi chạy lại lượt xuôi cho các thẻ phía dưới.
  Chỉ thẻ đang chọn và hộp soạn mở rộng (chiều cao đo bằng `ResizeObserver`); thẻ khác có chiều cao
  cố định (trích một dòng, ghi chú cắt hai dòng). Chỉ dựng thẻ nằm trong `[scrollTop − 1 màn hình,
  scrollTop + 2 màn hình]`; thẻ ngoài vùng vẫn có `top` (O(n)) nhưng không dựng DOM.
- **Rationale**: Chiều cao cố định cho thẻ đóng nên không cần đo n thẻ; bố trí thuần nên test được
  hết tình huống chen chỗ (SC-003: không đè nhau).
- **Alternatives**: Đo tất cả thẻ (chậm với 200 thẻ, giật khi đổi cỡ chữ); dùng `position: sticky`
  (không xử lý được chen chỗ).

## R3. Một trạng thái chọn duy nhất

- **Decision**: `selectedId: string | null` thuộc về shell (App, LiveWorkspace, LocalWorkspace), truyền
  vào `Annotator`, `CommentRail` và `HighlightsPanel` cùng `onSelect(id, { jump })`. `focusId` của 010
  (gạch chân 1,6 giây khi nhảy tới) giữ nguyên, nay là hệ quả của `onSelect` khi `jump: true`.
  Chọn bằng: bấm thẻ, bấm đoạn chữ, bấm ghim, bấm mục ở tab Highlights, và phím mũi tên lên xuống giữa
  các thẻ. Bấm ra ngoài hoặc Escape thì bỏ chọn.
- **Rationale**: FR-008 và FR-012 đòi một nơi sự thật; để shell giữ thì tab Highlights (ở sidebar,
  ngoài `Annotator`) dùng chung được.
- **Alternatives**: State trong `Annotator` và đẩy lên bằng callback hai chiều (dễ lệch); context
  riêng (thêm một lớp không cần thiết).

## R4. Nút Add comment và phím tắt

- **Decision**: Giữ thanh công cụ của 010 (một thành phần, một vị trí) nhưng đổi thứ tự:
  `[Comment (nút chính)] │ [bốn ô màu] │ [Copy] [Ask]`. Nút Comment dùng `btn-primary` kiểu thanh công
  cụ tối, có nhãn "Add comment". Bấm màu vẫn tạo highlight không ghi chú (hành vi 010). Bỏ nút "Note" và
  trình sửa ghi chú nổi; sửa ghi chú đã có chuyển vào thẻ. Phím tắt `Ctrl+Alt+M` / `Cmd+Option+M` mở
  hộp soạn trên vùng chọn hiện tại (giống Google Docs), thêm vào luồng `onKeyUp` của 010.
- **Rationale**: Ít bề mặt giao diện hơn việc dựng thêm một nút nổi thứ hai; FR-006 yêu cầu thanh công
  cụ vẫn truy cập được. Người dùng 010 vẫn tạo highlight màu một thao tác.
- **Alternatives**: Hai thành phần nổi (nút Comment tách khỏi thanh công cụ): đúng ảnh hơn nhưng trùng
  vị trí, phải xử lý chồng; giữ "Note" và thêm "Comment": hai nút gần như cùng việc.

## R5. Hộp soạn và bản nháp

- **Decision**: `Composer` là thẻ đặc biệt trong rail, đặt tại `top` của đoạn chữ đang chọn, tự lấy
  focus, ⌘/Ctrl+Enter gửi, Escape hủy (hỏi nếu đã gõ). Bản nháp là state của `Annotator`, khoá theo
  `slug|doc|startHint`, giữ khi người dùng chọn đoạn khác hoặc đổi bước (hiện chấm "Draft" ở thẻ
  nháp, quay lại thì mở lại). Chỉ trong bộ nhớ trang, không ghi ra ngoài; đổi spec hoặc nhánh thì
  hỏi trước khi bỏ (kế thừa `pendingTarget` của 010).
- **Rationale**: FR-005 và edge case "soạn rồi chuyển bước": không mất âm thầm, không lưu nhầm spec.
- **Alternatives**: `localStorage` cho nháp (có thể lộ nội dung chưa gửi; ngoài phạm vi, constitution VII).

## R6. Màu thứ năm `n` (không màu)

- **Decision**: `HighlightColor = 'y' | 'b' | 'p' | 'o' | 'n'`. `server/highlightsFile.ts` thêm `'n'` vào
  `COLORS` (parse và `applyChange`); commit message dùng "commented" khi màu `n` có ghi chú.
  `colors.ts`: `HL_COLORS` giữ bốn màu của thanh công cụ; thêm `HL_NONE = { key: 'n', meaning: 'Comment' }`
  cho bộ lọc và nhãn. `briefNotes` sắp: Issue, rồi `n`, rồi các màu còn lại, trong mỗi nhóm theo
  `createdAt`. CSS: `::highlight(sk-n)` và `.hl-n`, `.hl-n-solid` suy từ `--color-text` bằng
  `color-mix(in srgb, var(--color-text) 14% | 40%, transparent)`; không thêm mã màu.
  Nhận xét tạo bằng nút Comment có màu `n` mặc định; gán màu sau bằng ô màu ở thẻ.
- **Rationale**: Mở rộng tuỳ chọn có mặc định (constitution I). `version` giữ 1 vì tăng version làm bản
  010 cũ từ chối cả file.
- **Rủi ro**: bản 010 thuần mở file có `n` sẽ bỏ các phần tử đó và chặn ghi ("could not be read").
  Giảm nhẹ: ứng dụng là một bản deploy duy nhất trên Pages, và 012 ra cùng hoặc ngay sau 010; thư mục
  local dùng bản build mới. Nếu cần, plan của 011 xem xét một `version` mới có đường nâng cấp.
- **Alternatives**: Lưu `color: 'y'` kèm cờ `plain: true` (bản cũ vẫn đọc được nhưng tô nhầm Key, trái G2);
  tăng `version` lên 2 (phá bản cũ hoàn toàn).

## R7. Lưu lạc quan và trạng thái trên thẻ

- **Decision**: Reducer thuần trong `comments.ts`: `pending: Record<id, { change, state: 'sending' |
  'failed', error? }>`. `Annotator.run` đưa nhận xét vào danh sách hiển thị ngay (thẻ trạng thái
  "Sending…"), gọi `store.save`; thành công thì thay bằng kết quả đọc lại (như 010) và thẻ ghi
  "Saved · commit abc1234" (liên kết) hoặc "Saved to folder" / "Saved in this browser" cho local và demo;
  thất bại thì thẻ ở trạng thái lỗi kèm lý do và nút "Retry" gọi lại đúng `change`. Thử lại không tạo
  trùng vì `applyChange` bỏ qua `add` có `id` đã tồn tại (010). Không cho gửi lặp khi đang "sending".
- **Rationale**: SC-005 (đúng trạng thái trong 1 giây) và "nội dung không mất khi lỗi" (010 FR-015).

## R8. Kiểm tra nhận xét mới (Q3 = B)

- **Decision**:
  - **Server và Pages**: `useFreshness` kiểm tra `highlights.json` của spec và nhánh đang xem mỗi 60 giây
    khi `document.visibilityState === 'visible'`; dừng khi tab ẩn, kiểm tra ngay khi tab hiện lại.
    Dùng `GET /contents/{path}?ref=` với `If-None-Match: <etag lần trước>`; `304` nghĩa là không đổi và
    không tính vào giới hạn tốc độ chính của GitHub. Server mode gọi route mới `GET /api/highlights`
    (xem contracts/refresh-api.md); Pages gọi `readHighlights` trong `server/highlights.ts`.
    Lỗi hoặc 403/429: backoff nhân đôi tới 10 phút rồi quay lại 60 giây khi thành công; hết hạn phiên
    thì dừng và dùng thông báo hiện có.
  - **Local**: không có đồng hồ; kiểm tra khi cửa sổ được focus và khi bấm làm mới, đọc lại file
    (`getFile().lastModified`). Người dùng local sửa file bằng `git pull` ở ngoài ứng dụng.
  - **Demo**: không cần.
  - Khi có dữ liệu mới, so theo `id` và `updatedAt` với danh sách đang hiển thị: số mục thêm và đổi là số
    hiển thị ở dấu "New comments (n)" trên đầu rail và đầu tab Highlights. **Không tự áp.** Bấm dấu hoặc nút
    làm mới thì áp: thay danh sách bằng dữ liệu mới, giữ nguyên các thay đổi đang gửi (`pending`),
    nhận xét đang chọn và bản nháp.
  - Cho biết lần cập nhật gần nhất ("Updated 2 min ago") ở đầu rail.
- **Rationale**: Khớp spec Q3 (FR-014), không nhảy thẻ, rẻ về giới hạn tốc độ: tối đa 60 yêu cầu mỗi giờ mỗi
  tab, phần lớn là 304.
- **Alternatives**: Webhook hoặc WebSocket (cần server luôn chạy, Pages không có; trái VII); thăm dò mỗi
  10 giây (tốn không cần thiết); áp tự động khi không soạn (làm nhảy thẻ khi đang đọc).

## R9. Bố cục hẹp

- **Decision**: Khi `.sk-doc` không đủ chỗ cho rail (≈ `--rd-measure` + 300px + lề), rail ẩn; ghim ở lề
  của 010 vẫn hiện. Chọn một nhận xét (bấm ghim, đoạn chữ, hoặc mục ở tab Highlights) mở một **sheet** cố
  định ở đáy `.sk-doc` (`position: sticky; bottom: 0`) chứa đúng thẻ đó hoặc hộp soạn. Nút Comment trên
  thanh công cụ mở hộp soạn trong sheet. Điện thoại 390px: sheet chiếm tối đa 60% chiều cao, có nút đóng.
- **Rationale**: FR-011: dùng được ở điện thoại, không cuộn ngang; tái dùng cùng `Card` và `Composer`.

## R10. Avatar

- **Decision**: Dùng avatar chữ cái đầu có sẵn (`.sk-avatar`, hàm `initials` của `HighlightsPanel`),
  không tải ảnh. CSP hiện `img-src 'self' data:` và `connect-src` chỉ có `api.github.com` và
  `api.anthropic.com`; ảnh từ `avatars.githubusercontent.com` là điểm đến mạng mới, theo constitution II
  phải sửa CSP và README. Để mở đường: component `Avatar` nhận `src?` tuỳ chọn, hiện chỉ truyền undefined.
- **Rationale**: Spec chọn không thêm điểm đến mạng ở Assumptions. Ảnh thật là một PR nhỏ về sau (CSP
  `img-src https://avatars.githubusercontent.com`, `referrerpolicy="no-referrer"`, README).
- **Alternatives**: Tải ảnh ngay (đúng ảnh tham chiếu hơn, nhưng đổi CSP trong spec này).

## R11. Nhãn và ngôn ngữ

- **Decision**: Nhãn trong ứng dụng bằng tiếng Anh, giống 010: "Add comment", "Comment", "Cancel",
  "Sending…", "Saved · commit {sha}", "Retry", "New comments", "Updated {rel}". Không dựng lớp i18n.
  Nhãn tiếng Việt trong spec là tham chiếu từ ảnh.
- **Rationale**: Toàn bộ giao diện hiện là tiếng Anh; một lớp đa ngôn ngữ là phạm vi riêng (VII).

## R12. Trợ năng

- **Decision**: Rail là `role="complementary"` có tên "Comments"; mỗi thẻ là `role="group"` với
  `aria-label="Comment by {tác giả} on “{trích 40 ký tự}”"`, `aria-current="true"` ở thẻ đang chọn,
  focusable (`tabindex=0` ở thẻ chọn, `-1` ở các thẻ khác, mũi tên di chuyển). Một vùng
  `aria-live="polite"` công bố "Comment {n} of {m} selected" và "Saved" / "Failed to save". Nút ở thẻ
  có `aria-label` đầy đủ; thanh công cụ giữ `role="dialog"` của 010. `prefers-reduced-motion`: không
  hoạt ảnh khi thẻ đổi chỗ.

## R13. Chọn bằng bấm vào đoạn chữ khi có nhiều nhận xét chồng nhau

- **Decision**: Dùng `caretOffset` của 010; nếu nhiều neo cùng chứa vị trí, chọn nhận xét mới nhất trong
  vùng đó, bấm lại cùng chỗ thì luân phiên sang nhận xét kế (vòng tròn). Các thẻ còn lại vẫn chọn được
  bằng thẻ hoặc bàn phím.
- **Rationale**: Edge case "hai nhận xét chồng nhau" không bỏ sót thẻ nào.

## R14. Quan hệ với 010 và 011

- **Decision**: 010 đã merge vào `main`, nên 012 implement được ngay trên nhánh `feat/012-docs-style-comment-flow` tách
  từ `main`. Thẻ có một khe `thread` (children) để 011 gắn trả lời, emoji và nút giải quyết mà
  không đổi bố cục; spec 012 quyết bố cục thẻ, 011 quyết nội dung. Cho tới khi 011 implement, thẻ chỉ có nhận xét gốc.
- **Rationale**: Hai spec cùng sửa `Annotator`; chia rõ ranh giới giảm xung đột khi merge.
