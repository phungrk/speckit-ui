# Data Model: Phải duyệt xong mới sang bước tiếp theo

Không có dữ liệu lưu mới. Phê duyệt vẫn nằm trong issue theo dõi (định dạng không đổi). Mọi thứ dưới đây được tính lại mỗi lần từ file của spec, issue theo dõi và cấu hình repo.

## Cấu hình repo: `.specify/speckit-ui.json` (thêm một trường)

| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `approvalGates` | `"block"` \| `"off"` | `"block"` | `"off"` tắt khoá theo cổng cho repo này (FR-011). Giá trị khác hoặc thiếu thì coi là `"block"`. speckit-ui và bước kiểm tra trong Claude Code cùng đọc trường này (R6). |

`Project` thêm:

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `approvalGates` | `'block' \| 'off'` | Từ cấu hình trên, của nhánh đang hiển thị. |
| `gateCheck` | `'installed' \| 'missing'` | Repo đã cài bước kiểm tra trong Claude Code chưa (R7). Chỉ dùng để hiện hướng dẫn (FR-012). |

## Trạng thái bước

`LiveStatus` hiện có (`done`, `current`, `pending`, `skipped`) giữ nguyên ý nghĩa: chỉ suy ra từ file. Khoá theo cổng là một lớp tính trên đó, không thay nó:

```ts
/** Cổng đang chặn từng bước: null nếu bước không bị chặn. */
type Blocking = (GateKey | null)[];   // độ dài 7, theo thứ tự PHASES
```

`blockingGates(status, issue)` nằm trong `src/project/gates.ts` (R1):

- Bước `i` (1–6) bị chặn bởi cổng `k` khi `k` là cổng **đầu tiên chưa được duyệt** trong các bước `1 … i-1` có trạng thái `done`.
- Bước `skipped` (Not run) không bao giờ chặn (FR-001, Edge Cases).
- Constitution (bước 0) không có cổng nên không chặn.
- `issue == null` (chưa có issue theo dõi) nghĩa là chưa cổng nào được duyệt.
- Khi `approvalGates === 'off'`, mọi phần tử là `null`.

Trạng thái hiển thị (`ShownStatus`) ghép hai lớp. Chỉ phần giao diện dùng:

| File | Bị chặn | Hiển thị | Nhãn trên thanh bước | Class Modernist có sẵn |
|---|---|---|---|---|
| `current` | không | Tiếp theo | Next | `review` |
| `current` / `pending` | có | Khoá, chờ duyệt | Locked | `locked` (biểu tượng khoá) |
| `pending` | không | Chưa tới | Not started | `locked` |
| `done` | không | Xong, đã duyệt hoặc chờ duyệt | Approved / To approve | `done` / `review` |
| `done` | có | Chạy trước khi duyệt | Ran early | `review` |
| `skipped` | bất kỳ | Not run | Not run | `skipped` |

Lý do chặn luôn nêu tên cổng: "Waiting for Specify approval" (FR-002).

## Quyết định cổng (FR-005)

`decideGate(…, 'approve')` từ chối thêm một trường hợp, kiểm tra lại ngay trước khi ghi trên issue vừa đọc lại:

- `blockingGates(status, issue)[i]` khác `null` cho bước của cổng đang duyệt → `GateRefused("Approve Specify first.")`.
- `reopen` và `changes` không bị chặn. Mở lại một cổng làm các bước sau bị chặn lại theo quy tắc trên (FR-009). Không cần ghi gì thêm.

## Bước kiểm tra trong Claude Code (R2–R5)

Không lưu gì. Mỗi lần chạy nó tính:

| Giá trị | Nguồn |
|---|---|
| Lệnh và bước | Tên skill `speckit-<k>` → bước `k` theo `PHASES`. Các lệnh không phải bước (`constitution`, `specify`, `checklist`, `taskstoissues`, `converge`) không bị kiểm tra (R3). |
| Spec | Đối số dạng `NNN` nếu khớp một thư mục, rồi `SPECIFY_FEATURE`, rồi `.specify/feature.json`, rồi tên nhánh git (R4). |
| Trạng thái file | `phaseStatus` trên file trong thư mục làm việc, cùng parser với speckit-ui. |
| Phê duyệt | Issue theo dõi của slug, đọc bằng `gh api` hoặc token trong môi trường (R5). |
| Cấu hình | `.specify/speckit-ui.json` trong thư mục làm việc. |

Kết quả: cho chạy, chặn (kèm cổng và link issue), hoặc không kiểm tra được (chặn, kèm cách bỏ qua). Xem `contracts/gate-check.md`.
