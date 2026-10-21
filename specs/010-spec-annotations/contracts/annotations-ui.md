# Contract: giao diện highlight (theo bản thiết kế)

Nguồn: prototype `speckit/reader.jsx`, `speckit/app.jsx`, `Speckit Workspace.html` (bản xuất người
dùng gửi). CSS đã có trong `src/styles/reader.css`; class dưới đây là class đã có.

## Màu (FR-001)

| Khoá | Nghĩa | Tô chữ (`::highlight`) | Ô màu thanh công cụ | Màu đặc (thanh, ghim, bộ lọc) |
|---|---|---|---|---|
| `y` | Key | `--hl-y-text` | `.hl-y` | `.hl-y-solid` |
| `b` | Question | `--hl-b-text` | `.hl-b` | `.hl-b-solid` |
| `p` | Issue | `--hl-p-text` | `.hl-p` | `.hl-p-solid` |
| `o` | Change | `--hl-o-text` | `.hl-o` | `.hl-o-solid` |

Thứ tự hiện ở thanh công cụ và bộ lọc: Key, Issue, Question, Change (như prototype `HL`).

## Thanh công cụ (FR-003, FR-004) — `.sk-tb`

```text
[■ Key][■ Issue][■ Question][■ Change] │ [Note] [Copy] [AI Ask] [× Remove]?
```

- `div.sk-tb[role=dialog][aria-label="Highlight"]`, `position: fixed`, 52px trên đoạn chọn, lật
  xuống khi không đủ chỗ, kẹp 8px trong khung nhìn.
- Ô màu `button.sk-tb-c.hl-{k}` 26×26, `aria-label="Highlight {Nghĩa}"`, `title="{Nghĩa}"`; ô đang
  dùng có class `on`.
- Remove chỉ khi sửa highlight của chính mình, `aria-label="Remove highlight"`.
- Người không phải tác giả hoặc không có quyền ghi: chỉ Copy và Ask.
- Trình sửa ghi chú `.sk-tb-note`: `.sk-tb-quote` (≤ 90 ký tự + "…"), `textarea` 3 dòng
  `placeholder="Add a note for the team…"`, `.sk-tb-acts`: `<span>Visible to approvers</span>`,
  `button.btn.btn-secondary` Cancel, `button.btn.btn-primary` Save note.

## Ghim (FR-005) — `.sk-hl-pin`

22×22 trong `.sk-doc`, nền màu đặc của highlight, icon ghi chú, `aria-label="Note by {tác giả}"`.

## Sidebar phải (FR-019 – FR-021)

- `.sk-rtabs.is-3` với ba nút: `Gate` · `Highlights <span class="sk-rtab-n">{n}</span>` · `AI Copilot`.
- `.sk-hlp`: `.sk-hlp-flt` (nút `All {n}` và mỗi màu `<i class="hl-{k}-solid"> {Nghĩa} <b>{n}</b>`),
  rồi mỗi bước một `.sk-hlp-sec` với nhãn `02 · Specify`, mỗi mục `button.sk-hlp-item`:
  `.sk-hlp-bar.hl-{k}-solid`, `<q>` đoạn trích, `<p>` ghi chú, `.sk-hlp-meta` (avatar, tên, nghĩa,
  thời gian tương đối, và "Outdated, text changed" khi không gắn được).
- Rỗng: `.sk-hlp-empty` "Select text in any artifact to highlight it or leave a note for the team."
- Bấm mục: chuyển bước, cuộn đoạn văn tới 120px từ đỉnh `.sk-doc`, `sk-focus` 1.6 giây.

## "Before you approve" (FR-022)

`GateBrief` hiện có, thêm các dòng `{Tác giả}: {ghi chú}` của bước đang xem, Issue trước.

## Xác nhận và thông báo (FR-009a)

- Hộp thoại lần đầu: tiêu đề "Commit highlights?", nội dung "Highlights are committed to
  `{branch}` as {login}. Every save is a commit ending in [skip ci].", nút Cancel và
  "Commit highlights".
- Công tắc ở cuối tab Highlights: "Ask before committing highlights" (checkbox), bật lại hộp thoại.
- Toast `role="status"`: "Saved · commit {sha7}" (liên kết tới commit), 4 giây.
