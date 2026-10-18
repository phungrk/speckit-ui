# Data Model: Liên kết PR với issue

Không có dữ liệu lưu mới. Liên kết nằm trong mô tả PR trên GitHub. Mọi thứ dưới đây được tính lại mỗi lần đọc.

## SpecPR (thêm một trường)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `link` | `'closes' \| 'mentions' \| 'none' \| null` | Mô tả PR trỏ tới issue theo dõi của spec thế nào (R2). `null` khi spec chưa có issue. |

Cách đánh giá một PR (`linkStatus(pr, rootRepo)`):

| PR ở | `link` | Kết quả hiển thị | Đúng? |
|---|---|---|---|
| repo gốc | `closes` | Closes #N | ✓ |
| repo gốc | `mentions` | Linked to #N (PR trước, không đóng) | ✓ |
| repo submodule | `mentions` | Linked to #N | ✓ |
| repo submodule | `closes` | Closes #N early | ✗ (cảnh báo) |
| bất kỳ | `none` | Not linked to #N | ✗ (cảnh báo) |
| bất kỳ | `null` | (không hiện nhãn) | — |

## Dòng liên kết (tính, không lưu)

`linkLine(issueNumber, rootRepo, prRepo)`:
- PR ở repo gốc: `Closes #N` (PR cuối) hoặc `Part of #N` (PR trước)
- PR ở repo khác: `Part of <rootRepo>#N`

## Cấu hình repo: `.specify/speckit-ui.json`

| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `prLinks` | `"block"` \| `"off"` | `"block"` | `"off"` để bước kiểm tra trong Claude Code không chặn PR thiếu liên kết (R6). |

`Project.gateCheck` thêm giá trị:

| Giá trị | Khi nào |
|---|---|
| `installed` | Có script, và `settings.json` có đủ ba điểm móc (gõ lệnh, gọi skill, tạo PR). |
| `outdated` | Có script và `settings.json` chạy nó, nhưng thiếu điểm móc tạo PR (R5). |
| `missing` | Như trước. |

## Kiểm tra cổng Implement (thêm một cảnh báo)

Hai cảnh báo, không chặn. Cả hai bỏ qua khi spec chưa có issue:
- `Every PR links to #N`: đạt khi mọi PR của spec có trạng thái ✓ ở bảng trên.
- `A PR in this repo closes #N`: đạt khi ít nhất một PR ở repo gốc có `link: 'closes'`; bỏ qua khi spec chưa có PR nào ở repo gốc.

## Yêu cầu tạo PR mà hook nhận ra (R4)

| Trường | Từ |
|---|---|
| `repo` | `--repo`/`-R`, đường dẫn `repos/<o>/<r>/pulls`, `owner`+`repo` (MCP), hoặc `origin` của thư mục lệnh |
| `head` | `--head`/`-H`, `-f head=`, `head` (MCP), hoặc nhánh hiện tại |
| `body` | `--body`/`-b`, `--body-file`/`-F`, `-f body=`/`-F body=@file`, `body` (MCP); không đọc được → `unknown` |
| `specs` | các slug khớp `head` hoặc `specs/<slug>` trong body |
