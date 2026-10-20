# Contract: giao diện chế độ đọc (010)

Giá trị chép từ prototype người dùng gửi (`speckit/reader.jsx`, `speckit/app.jsx`,
`Speckit Workspace.html`, 2026-10-20). Implement phải khớp bảng này; đổi giá trị thì sửa ở đây
trước.

## 1. Nền (FR-005, FR-005a, FR-006)

Ghi lên `:root` (R1). Các token khác của Modernist giữ nguyên.

| Nền (`theme`) | Tên hiện | `--color-bg` | `--color-surface` | `--color-text` | `--color-divider` |
|---|---|---|---|---|---|
| `white` (mặc định) | White | `#FFFFFF` | `#F3F3F1` | `#1A1A1A` | `rgba(26,26,26,.18)` |
| `sepia` | Sepia | `#F6EEDC` | `#EDE2CA` | `#5B4636` | `rgba(91,70,54,.22)` |
| `green` | Green | `#D6E9D5` | `#C7DEC6` | `#22301F` | `rgba(34,48,31,.20)` |
| `dark` | Dark | `#121212` | `#1E1E1E` | `#D8D2C6` | `rgba(216,210,198,.18)` |

Dark ghi đè thêm: `--color-accent-100: #3b1e19; --color-accent-200: #55241b;
--color-accent-700: #ff9a86; --color-accent-800: #ffc0b3; --color-neutral-300: #333`, và
`--shadow-sm/md/lg` thành viền mảnh `0 0 0 1px var(--color-divider)` (R8).

`<html data-reader-theme="…">` luôn có giá trị. `:root` có
`transition: background-color .2s, color .2s`, tắt khi `prefers-reduced-motion: reduce` (FR-010).

## 2. Cài đặt đọc (FR-001 – FR-003)

| Mục | Giá trị | Mặc định |
|---|---|---|
| Font | `literata` `"Literata", Georgia, serif` · `source` `"Source Serif 4", Georgia, serif` · `atkinson` `"Atkinson Hyperlegible", system-ui, sans-serif` · `archivo` `"Archivo", system-ui, sans-serif` | literata |
| Tên hiện của font | Literata · Source Serif · Atkinson · Archivo | |
| Size | 15 · 16 · 17 · 18 · 20 · 22 px | 18 |
| Spacing | 1.5 · 1.7 · 1.9 | 1.7 |
| Width | 600 · 700 · 820 px (nhãn đọc: narrow, medium, wide) | 700 |

Biến trên `:root`: `--rd-font`, `--rd-size`, `--rd-size-sm` (size − 2), `--rd-size-xs`
(size − 3), `--rd-lh`, `--rd-measure`.

## 3. Cột đọc (FR-002, R4)

```text
.sk-doc            padding-inline: var(--space-8) (giữ như hiện tại; annotations sẽ thêm 28px cho ghim)
└─ .sk-col         max-width: var(--rd-measure); margin: 0 auto
```

| Bộ chọn trong `.sk-col` | font-family | font-size | line-height |
|---|---|---|---|
| `p`, `li`, `blockquote`, `q` | `--rd-font` | `--rd-size` | `--rd-lh` |
| `td`, `.sk-ac`, `.sk-cl li` | `--rd-font` | `--rd-size-sm` | `--rd-lh` |
| `.sk-opt`, `.sk-kv b` | `--rd-font` | `--rd-size-xs` | `--rd-lh` |
| `h1`–`h6`, `.sk-id`, `.sk-path`, `.sk-owner`, `.sk-meta`, `.sk-file`, `.tag`, `button`, `.btn`, `.sk-pass`, `.sk-nc`, `code`, `pre`, `th` | Archivo (font giao diện) | không đổi | không đổi |

`.sk-id` giữ `var(--fs-12)`. Bộ chọn giao diện thắng bộ chọn văn xuôi (ví dụ `li` chứa `.sk-id`).

## 4. Header (FR-001, FR-007)

Thứ tự trong `nav.sk-nav` ở cả ba shell:

```text
[nút sidebar trái] Speckit  <nội dung riêng của shell…>  │ [Aa] [nút sidebar phải]
```

| Phần tử | Kích thước | Thuộc tính |
|---|---|---|
| Nút sidebar trái `.sk-navbtn` | 36×36, không viền, icon panel-left 18px | `aria-pressed={left}`, `aria-label="Hide left sidebar"`/`"Show left sidebar"`, `title="Queue & features"` |
| Vạch ngăn `.sk-navsep` | 1×24px, `--color-divider` | `aria-hidden` |
| Nút `.sk-aa` | 40×36, viền `1.5px var(--color-divider)`; "A" `--fs-22` + "a" `--fs-16`, Literata, canh baseline | `aria-label="Reading settings"`, `aria-expanded`, `aria-haspopup="dialog"` |
| Nút sidebar phải `.sk-navbtn` | như nút trái, icon panel-right | `aria-pressed={right}`, nhãn "Hide/Show right sidebar", `title="Gate, highlights & Copilot"` |

`.sk-navbtn`: chữ 55% mực khi ẩn (`aria-pressed=false`), 100% khi hiện, nền 7% mực khi hover,
focus `2px var(--color-accent)`. `.sk-aa`: hover viền `--color-text`; mở thì nền `--color-text`,
chữ `--color-bg`.

Icon (Lucide, thêm vào `ICONS` trong `src/ui.tsx`):
`panelL` = `<rect width="18" height="18" x="3" y="3"/><path d="M9 3v18"/>`,
`panelR` = `<rect width="18" height="18" x="3" y="3"/><path d="M15 3v18"/>`.

## 5. Popover "Aa" (FR-001, FR-009)

- `div.sk-rdp[role=dialog][aria-label="Reading settings"]`, neo dưới nút: `top: calc(100% + 10px);
  right: 0`, rộng 340px (trên màn hình < 372px: `width: calc(100vw - 32px)`), `z-index` trên
  sidebar, viền `2px solid var(--color-text)`, không bo góc, không bóng, nền `--color-bg`.
- Đóng khi: bấm ra ngoài (mousedown ngoài popover và ngoài nút), Escape, bấm lại Aa. Đóng bằng
  Escape thì focus về nút Aa. Mở thì focus vào ô font đang chọn.
- Các mục, từ trên xuống (nhãn: `--fs-11`, chữ hoa, `letter-spacing: .08em`, 62% mực):

| Mục | Điều khiển | Ghi chú |
|---|---|---|
| Font | lưới 4 ô; mỗi ô "Aa" (`--fs-22`) bằng font đó + tên (`--fs-11`) | ô chọn: nền mực, chữ giấy; `aria-pressed` |
| Size · {n}px | nút `A` nhỏ (`aria-label="Smaller"`) · 6 vạch (`aria-label="{n}px"`) · nút `A` lớn (`"Larger"`) | vạch ≤ cỡ hiện tại được tô; hai đầu `disabled` ở giới hạn |
| Spacing | 3 ô, icon 3 dòng giãn dần | `aria-label="Line spacing 1.5"`… |
| Width | 3 ô, icon 3 dòng dài dần | `aria-label="narrow width"`… |
| Page | 4 ô mẫu cao 44px, "Aa" `--fs-18` màu mực của nền trên nền của nó, tên dưới | ô chọn: viền ngoài `2px var(--color-accent)`, cách 2px; `aria-pressed` |
| — | "Reset to default" | `--fs-12`, đậm 600, `--color-accent-700` |

Mọi điều khiển là `<button>` thật, vùng bấm ≥ 36px (vạch cỡ chữ: cao 20px, vùng bấm mở rộng bằng
padding tới 36px; ≥ 44px khi `pointer: coarse`), FR-010.

## 6. Lưới sidebar (FR-008, R7)

| Trạng thái | `.sk-body` | ≤ 1180px | ≤ 760px |
|---|---|---|---|
| cả hai | `272px minmax(0,1fr) 312px` | `240px minmax(0,1fr)`, phải xuống dưới | 1 cột |
| `no-left` | `minmax(0,1fr) 312px` | `minmax(0,1fr)`, phải xuống dưới | 1 cột |
| `no-right` | `272px minmax(0,1fr)` | `240px minmax(0,1fr)` | 1 cột |
| `no-left no-right` | `minmax(0,1fr)` | `minmax(0,1fr)` | 1 cột |

Sidebar ẩn không được render. Phím `[` và `]` bật/tắt trái/phải, bỏ qua khi đang gõ trong
`input`, `textarea`, `select`, `[contenteditable]` hoặc có Ctrl/⌘/Alt.

## 7. Không thay đổi

- Không gọi mạng ngoài Google Fonts (đã có trong CSP). Không ghi GitHub hay file repo (FR-013).
- Font giao diện, màu nhấn `--color-accent`, khoảng cách, viền, bố cục của từng view.
