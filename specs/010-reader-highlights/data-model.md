# Data model: Chế độ đọc kiểu Kindle (010)

Hai bản ghi tuỳ chọn hiển thị, chỉ nằm trong trình duyệt. Không phải trạng thái dự án
(constitution I), không ghi vào repo hay GitHub (FR-013).

## ReaderSettings

| Trường | Kiểu | Giá trị hợp lệ | Mặc định |
|---|---|---|---|
| `font` | string | `literata` · `source` · `atkinson` · `archivo` | `literata` |
| `size` | number (px) | 15 · 16 · 17 · 18 · 20 · 22 | 18 |
| `lh` | number | 1.5 · 1.7 · 1.9 | 1.7 |
| `width` | number (px) | 600 · 700 · 820 | 700 |
| `theme` | string | `white` · `sepia` · `green` · `dark` | `white` |

- Lưu giá trị thật (18, 1.7…), không lưu chỉ số như prototype, để đổi danh sách không làm lệch
  giá trị đã lưu.
- **Validate từng trường**: trường thiếu hoặc không nằm trong danh sách thì lấy mặc định của
  trường đó; các trường hợp lệ khác được giữ. JSON hỏng thì về mặc định toàn bộ.
- "Reset to default" ghi lại toàn bộ mặc định (US1 kịch bản 4).
- Giá trị suy ra (không lưu), do `readerVars(settings)` tính: `--rd-font`, `--rd-size`,
  `--rd-size-sm` (= size − 2), `--rd-size-xs` (= size − 3), `--rd-lh`, `--rd-measure`, cộng các
  token màu của nền (xem [contracts/reader-ui.md](contracts/reader-ui.md)).

## LayoutPrefs

| Trường | Kiểu | Mặc định |
|---|---|---|
| `left` | boolean (sidebar trái hiện) | `true` |
| `right` | boolean (sidebar phải hiện) | `true` |

Validate như trên: không phải boolean thì lấy mặc định.

## Nơi lưu

| Khoá | Kho | Chủ | Dùng khi |
|---|---|---|---|
| `sk.reader` | `localStorage` | thiết bị | `main.tsx` áp lúc khởi động (R2). Luôn là bản vừa dùng gần nhất. |
| `sk.reader.vars` | `localStorage` | thiết bị | `{theme, vars}` đã tính sẵn, cho `public/reader-boot.js` chép lên `<html>` trước lần vẽ đầu (R2). Ghi cùng lúc với `sk.reader`. |
| `sk.u.{login}.reader` | như `prefsFor` (local/session) | người dùng GitHub | Sau khi biết login (server, Pages). |
| `sk.u.{login}.layout` | như `prefsFor` | người dùng GitHub | Như trên. |
| `sk.u.~local.*`, `sk.u.~demo.*` | `localStorage` | trình duyệt | Local và demo không có login. |

**Luồng**:

1. Khởi động: đọc `sk.reader`, validate, `applyReader()` lên `:root`, rồi mới render.
2. Shell biết chủ (login, `~local` hoặc `~demo`): đọc `reader` và `layout` của chủ. Có bản của chủ
   mà khác bản đang áp thì áp bản của chủ và ghi `sk.reader`. Chưa có bản của chủ thì lấy bản đang
   áp làm bản của chủ.
3. Người dùng đổi một giá trị: áp ngay, ghi bản của chủ và `sk.reader`.
4. Bộ nhớ bị chặn: mọi đọc trả `null`, mọi ghi bỏ qua; cài đặt vẫn áp trong phiên (Edge case).

## Quan hệ

- Không liên kết với spec, repo hay issue. Đổi repo hoặc đổi spec không đổi cài đặt.
- Highlight và ghi chú không thuộc spec này (`010-spec-annotations`).
