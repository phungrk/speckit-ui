# Data Model: Làm việc với nhiều repo trong một phiên

Các kiểu dưới đây bổ sung cho `src/project/types.ts`. `Project`, `Tracking`, `GateIssue` giữ nguyên định dạng.

## CurrentUser

Người đang dùng ứng dụng. Mọi quyền đọc và ghi đều theo người này (FR-013).

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `login` | string | Tên đăng nhập GitHub; dùng làm namespace cho ghim và vị trí đang xem |
| `mode` | `'pages' \| 'signin' \| 'token'` | Bản Pages, bản server có đăng nhập, hoặc token cục bộ |
| `avatarUrl` | string \| null | Chỉ để hiển thị |

**Quy tắc**: chưa xác định được `login` thì không hiển thị dữ liệu repo nào (FR-014).

## AccessibleRepo

Một repo mà `CurrentUser` có quyền đọc (FR-001).

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `fullName` | string | `owner/name`; định danh duy nhất |
| `private` | boolean | |
| `defaultBranch` | string | |
| `pushedAt` | string (ISO) | Dùng để sắp xếp và làm khoá cache khi nhận diện |
| `speckit` | `true \| false \| null` | `null` = chưa kiểm tra (R2) |
| `pinned` | boolean | Lấy từ `Pins` |

**Sắp xếp**: repo đã ghim → repo Spec Kit → repo chưa rõ → repo thường. Trong mỗi nhóm, mới push nhất lên trước (FR-002).

## RepoListing

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `repos` | AccessibleRepo[] | |
| `truncated` | boolean | `true` khi chạm trần 1.000 repo; giao diện gợi ý tìm kiếm hoặc nhập tay |
| `fetchedAt` | string (ISO) | |

## Pins

Danh sách repo đã ghim của một người dùng trên một thiết bị (FR-011).

- **Khoá lưu**: `sk.u.<login>.pins` → `string[]` (danh sách `fullName`, giữ thứ tự ghim).
- **Ràng buộc**: không trùng lặp; tối đa 20 repo.
- **Chuyển trạng thái**: ghim, rồi bỏ ghim. Một repo không còn truy cập được bị bỏ khỏi danh sách đang dùng, nhưng vẫn giữ trong dữ liệu đã lưu cho tới khi người dùng bỏ ghim, phòng trường hợp mất quyền chỉ là tạm thời (FR-012).

## LastViewed

Vị trí đang xem gần nhất trong từng repo (FR-005).

- **Khoá lưu**: `sk.u.<login>.last` → `{ [fullName]: { spec: string \| null, step: number \| null } }`, cùng `sk.u.<login>.lastRepo` → `string`.
- **Quy tắc**:
  - Nếu spec đã lưu không còn tồn tại thì rơi về spec mới nhất của repo.
  - `step` là số thứ tự bước `0–6`, giống `OverviewItem.step`. Chỉ URL dùng tên bước (xem contracts/client-state.md).

## RepoContext

Trạng thái gắn với một repo đang mở. Mọi dữ liệu trong đây được khoá theo `fullName` (FR-006).

| Trường | Nguồn |
|---|---|
| `project` | `getProject` (cache theo `identity\|owner/repo@ref`, R3) |
| `tracking` | `getTracking` (cache cùng khoá) |
| `copilotThreads` | `{ [slug]: CopilotMsg[] }`, chỉ trong bộ nhớ, khoá theo `fullName` |

**Quy tắc**: khi chuyển repo, giao diện chỉ hiển thị `RepoContext` của repo mới. Mọi kết quả trả về muộn của repo cũ bị bỏ qua (so sánh `fullName` trước khi gán).

## OverviewItem

Một việc cần làm trên màn hình tổng quan (FR-018).

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `repo` | string | `fullName` |
| `slug` | string | Spec |
| `title` | string | Tên spec |
| `kind` | `'approve' \| 'run' \| 'implement'` | Từ `unapprovedGates` và `nextStep` |
| `label` | string | Ví dụ "Approve Plan", "Run /speckit-tasks", "Implement · 3/11 tasks" |
| `step` | number | Bước để mở khi bấm |

Mỗi repo trên màn hình tổng quan ở một trong các trạng thái `loading`, `ready` (kèm danh sách `OverviewItem`), hoặc `error` (kèm thông báo, FR-019).

## ServerSession (chỉ bản server, chỉ phía server)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | string | 32 byte ngẫu nhiên, hex; nằm trong cookie `sk_session` |
| `login` | string | |
| `accessToken` | string | **Không bao giờ gửi xuống trình duyệt** (FR-015) |
| `refreshToken` | string \| null | |
| `accessExpiresAt` | number | Thời điểm hết hạn của access token |
| `createdAt` | number | Phiên hết hạn sau 7 ngày |

**Chuyển trạng thái**:
1. Chưa đăng nhập → `/auth/login` → GitHub → `/auth/callback` với `code` và `state` hợp lệ → **active**.
2. **active** gặp access token hết hạn: làm mới thành công thì vẫn active; thất bại thì **ended**.
3. **active** → `POST /auth/logout`, hoặc quá 7 ngày, hoặc GitHub trả 401 → **ended**. Phiên bị xoá khỏi bộ nhớ và cookie bị xoá.

## Ghi nhớ khoá cache (R3)

`identity`:
- **Bản server:** `CurrentUser.login`.
- **Bản Pages và bản local:** 8 ký tự hex đầu của SHA-256 của token. Dùng dấu vân tay để không giữ token trong khoá; token mới thì cache cũ không bị dùng lại.
