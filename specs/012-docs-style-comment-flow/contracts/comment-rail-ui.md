# Contract: rail nhận xét (012-docs-style-comment-flow)

Nền: `specs/010-spec-annotations/contracts/annotations-ui.md` (class `.sk-tb`,
`.sk-hl-pin`, `.sk-hlp`, `::highlight(sk-*)`, `--hl-*` trong `src/styles/reader.css`). Dưới đây chỉ nêu
phần thêm hoặc đổi. Nhãn bằng tiếng Anh (research R11). Class mới có tiền tố `sk-cm-`.

## Thanh công cụ (FR-001, FR-006)

```text
[ Comment ] │ [■ Key][■ Issue][■ Question][■ Change] │ [Copy] [AI Ask] [× Remove]?
```

- Nút đầu `button.sk-tb-b.sk-tb-primary` nhãn "Comment", `aria-label="Comment"`, bấm mở Composer.
- Ô màu như 010; chọn màu khi vùng chọn mới tạo highlight không ghi chú (không đổi so với 010).
- Bỏ nút "Note" và `.sk-tb-note`. Người không lưu được: chỉ còn Copy, Ask và nút Comment ở trạng thái
  tắt (`aria-disabled="true"`, `title` và dòng `.sk-tb-msg` nêu lý do, FR-016).
- `Ctrl+Alt+M` / `Cmd+Option+M` với vùng chọn hợp lệ: mở Composer.

## Rail (FR-007, FR-008)

```text
aside.sk-cm-rail[role=complementary][aria-label="Comments"]   (con của .sk-doc, tuyệt đối, rộng 300px)
├── header.sk-cm-head      "Comments · {n}"   [branch: feat/012-…]   [Updated 2 min ago] [↻ Refresh]
│   └── button.sk-cm-new   "New comments (3)"   (chỉ khi newCount > 0)
├── article.sk-cm-card × n      (đặt `top` bằng layoutCards, chỉ dựng thẻ gần vùng nhìn)
├── article.sk-cm-card.sk-cm-draft   (Composer)
└── section.sk-cm-out      "Outdated, text changed"   (thẻ không có neo, cuối rail)
```

- Rail chỉ dựng khi `.sk-doc.clientWidth ≥ var(--rd-measure) + 32px + 364px` (32px lề đầu, 300px rail và 2 × 32px
  lề cuối; đo bằng `ResizeObserver`, hàm `railPlacement`): cột đọc giữ bề rộng người đọc chọn, rail không bóp nó.
  Ví dụ với cột 700px cần `.sk-doc` ≥ 1096px, tức cửa sổ ≥ 1680px khi cả hai sidebar mở, hoặc ≥ 1410px khi
  ẩn sidebar trái (`[`). Rail đặt cách cột đọc 24px; `.sk-doc` thêm class `has-rail` để chừa chỗ, thay cho 28px lề phải của 010. Khi rail hiện,
  thẻ trong rail thay vai trò của ghim nên **ghim ẩn**; ghim chỉ hiện ở bố cục hẹp (spec FR-012).
- Không dựng rail khi không có thẻ nào, không có nháp và không có gì để cập nhật (tài liệu trống nhận xét
  trông như bản thiết kế).
- Bố cục thẻ không đè nhau (SC-003); thẻ đổi chỗ không hoạt ảnh khi `prefers-reduced-motion`.

## Thẻ (FR-003, FR-008, FR-013)

```text
article.sk-cm-card[role=group][aria-label="Comment by {tác giả} on “{trích 40 ký tự}”"]
   [aria-current=true khi chọn]
├── header: .sk-avatar.sm {chữ cái đầu}  {tên}  ·  {thời gian tương đối}   [⋮ menu: Edit, Delete (chỉ tác giả)]
├── q.sk-cm-quote          {trích, tối đa 90 ký tự khi đóng}
├── p.sk-cm-note           {ghi chú, cắt 2 dòng khi đóng, đầy đủ khi chọn}
├── .sk-cm-meta            [■ màu / "Comment"] ô đổi màu (tác giả, khi chọn)
├── .sk-cm-state           Sending… | Saved · commit abc1234 | Failed: {lý do} [Retry]
└── .sk-cm-thread          (khe cho 011: trả lời, emoji, giải quyết)
```

- Thẻ đang chọn: mở rộng, `.sk-cm-card.on`, viền đậm theo token. Đoạn chữ tương ứng: `::highlight(sk-sel-{k})` (một tên cho mỗi màu `y|b|p|o|n`, chỉ đăng ký tên của màu đang chọn; nền đậm hơn của chính màu đó cộng gạch chân, nên vẫn thấy khi trình duyệt không có `priority`). Thẻ đóng cao đúng `CLOSED_CARD_HEIGHT` = 124px (đặt inline, để bố cục không phải đo); thẻ mở cao theo nội dung và được đo. Rail cao bằng thẻ cuối cùng của nó (`height` inline) để tài liệu cuộn tới được các thẻ ở xa, vì thẻ ngoài vùng nhìn không được dựng.
  (nền đậm hơn và gạch chân), đăng ký sau các màu với `priority = 1`.
- Màu `n`: `.hl-n-solid` thanh bên thẻ; chip "Comment" ở bộ lọc tab Highlights.
- Trạng thái lưu hiện trong `role="status"` của vùng live (research R12).
- Thẻ Outdated: không `top`, nhãn "Outdated, text changed", vẫn chọn được và sửa được (tác giả).

## Composer (FR-002, FR-004, FR-005)

```text
article.sk-cm-card.sk-cm-draft
├── header: .sk-avatar.sm {chữ cái đầu}  {tên người dùng hiện tại}
├── q.sk-cm-quote  {trích đoạn chữ}
├── textarea[rows=3][maxlength=2000][aria-label="Comment"][placeholder="Add a comment…"]
└── .sk-cm-acts    [Cancel] [Comment]    (⌘/Ctrl+Enter gửi, Esc hủy)
```

- Mở ra tự lấy focus; đoạn chữ đánh dấu bằng `::highlight(sk-draft)` (trung tính, gạch chân đứt).
- Gửi khi trống: không gọi `store.save`, ô nhập `aria-invalid="true"` và dòng nhắc "Write a comment first".
- Hủy hoặc Esc khi đã gõ chữ: hỏi "Discard this comment?" (Discard / Keep editing).
- Gửi: nhận xét hiện ngay thẻ `sending` (research R7), Composer đóng, thẻ mới được chọn.
- Nháp giữ khi đổi đoạn chữ hoặc bước (research R5); đổi spec hoặc nhánh thì hỏi.
- Nút Comment tắt khi `busy`; không cho gửi lặp.

## Chọn (FR-008, FR-009, FR-012)

| Hành động | Kết quả |
|---|---|
| Bấm thẻ | `onSelect(id, { jump: true })`: đoạn chữ sáng, cuộn tới nếu ngoài tầm nhìn |
| Bấm đoạn chữ đang tô (vùng chọn rỗng) | `onSelect(id)`: thẻ mở rộng, cuộn rail tới nếu cần; bấm lại cùng chỗ thì sang nhận xét chồng kế tiếp |
| Bấm ghim ở lề (010, chỉ ở bố cục hẹp) | như bấm thẻ |
| Bấm mục tab Highlights (010) | `onSelect(id, { jump: true })` kèm chuyển bước như 010 FR-021 |
| ↑ / ↓ khi focus ở thẻ | chọn thẻ trước / sau |
| Esc, bấm ra ngoài rail và tài liệu | bỏ chọn |

Luôn một `selectedId` (shell giữ). `focusId` của 010 (gạch chân 1,6 giây) chỉ chạy khi `jump: true`.

## Bố cục hẹp (FR-011)

- Không đủ chỗ cho rail: ghim ở lề của 010 vẫn hiện; chọn nhận xét mở **sheet**
  `div.sk-cm-sheet[role=dialog][aria-label="Comment"]` dính đáy `.sk-doc`, chứa một thẻ hoặc Composer,
  cao tối đa 60% khung nhìn, có nút đóng; không cuộn ngang.
- Tab Highlights (sidebar phải) vẫn là danh sách theo bước, có dấu "New comments" và nút làm mới.
- Vùng bấm tối thiểu 44px trên cảm ứng.
- Mọi nút và thẻ trong rail, sheet và Composer có `:focus-visible` theo hệ thống (constitution IV), thẻ đang chọn không dựa vào màu một mình.

## Dấu "New comments" và làm mới (FR-014)

- Dấu `button.sk-cm-new` "New comments (n)" ở đầu rail (và cùng số ở đầu tab Highlights), xuất hiện khi
  kiểm tra định kỳ thấy khác biệt. **Không đổi gì khác** trên màn hình (SC-010).
- Bấm dấu hoặc `↻ Refresh` thì áp (data-model, quy tắc áp). `Updated {rel}` cập nhật mỗi lần kiểm tra
  (kể cả 304).
- Local: dấu và nút làm mới hoạt động theo cùng cách, kích hoạt khi cửa sổ được focus hoặc khi bấm.

## Demo (constitution IV)

- Demo dùng chung component; dữ liệu mẫu của 010 có ghi chú nên rail hiện ở 1440×900. Bản thiết kế sẽ được
  cập nhật có rail (Clarify 2026-10-21); demo PHẢI khớp bản mới từng pixel. Khi chưa có nhận xét nào,
  màn hình khớp thiết kế (SC-008). Nếu bản thiết kế mới khác contract này thì bản thiết kế thắng và
  contract được sửa theo.
