# Data Model: Liệt kê spec trên nhiều nhánh

Các kiểu bổ sung cho `src/project/types.ts`. Định dạng issue theo dõi không đổi.

## SpecFeature (sửa)

| Trường mới | Kiểu | Ghi chú |
|---|---|---|
| `branch` | string \| null | Nhánh của bản đang hiển thị. `null` là nhánh chính |
| `sha` | string | Commit của bản đang hiển thị; dùng cho liên kết file |
| `unmerged` | boolean | `true` khi bản này có ở một nhánh `feat/…` và khác nhánh chính (FR-003) |
| `variants` | SpecVariant[] | Mọi bản của slug này, đã sắp theo R4; phần tử đầu là bản đang hiển thị |

## SpecVariant (mới)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `branches` | string[] | Các nhánh có cùng SHA thư mục, gộp lại (R4). Nhánh có tên chứa slug đứng đầu, sau đó theo tên tăng dần |
| `treeSha` | string | SHA cây `specs/NNN-slug` trên các nhánh đó |
| `sha` | string | Commit của nhánh đầu tiên trong `branches` |
| `onDefault` | boolean | Bản này trùng với nhánh chính |
| `stage` | number | Số bước `done` theo `phaseStatus` |
| `committedAt` | string \| null | Chỉ lấy khi cần phá hoà |
| `pointers` | Record<string, string> | Con trỏ submodule (đường dẫn → commit) trên nhánh của bản này; dùng cho cổng Implement (C1) |

Khi chọn bản khác bằng bộ chọn bản, giao diện xin bản đó qua tham số `branch` (R9). Server và bản Pages trả về `SpecFeature` của bản đó, không cần tải lại cả dự án.

## Project (sửa)

| Trường mới | Kiểu | Ghi chú |
|---|---|---|
| `branches` | BranchInfo[] | Các nhánh `feat/…` đã đọc; rỗng khi đã cố định nhánh (R7) |
| `skippedBranches` | number | Số nhánh bị bỏ qua vì vượt giới hạn 30 |

`warnings` có thêm: lỗi đọc từng nhánh (FR-008), trùng số thứ tự (FR-007), nhánh bị bỏ qua.

## BranchInfo (mới)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `name` | string | Ví dụ `feat/003-branch-specs` |
| `sha` | string | Commit đầu nhánh |
| `specsTreeSha` | string \| null | `null` nếu nhánh không có `specs/` |
| `unmergedSlugs` | string[] | Các slug có SHA khác nhánh chính |
| `error` | string \| null | Lỗi đọc nhánh này |

## UiConfig (sửa, `server/parse.ts`)

`{ mergeOrder: string[]; branchPrefixes: string[] }`. `branchPrefixes` mặc định là `["feat/"]` khi thiếu, và `[]` để tắt.

## Quy tắc

1. Gom theo `slug`. Bản trên nhánh chính và các bản có SHA thư mục khác là các phần tử của `variants`.
2. Bản hiển thị là bản có `stage` lớn nhất, rồi đến `committedAt` mới nhất, rồi đến tên nhánh đứng trước.
3. `unmerged = !variant.onDefault`.
4. Thứ tự danh sách spec giữ theo slug như hiện nay, nên spec mới (số lớn) nằm cuối.
