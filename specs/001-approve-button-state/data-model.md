# Data Model: Trạng thái nút Approve sau khi duyệt

Định dạng issue theo dõi và comment duyệt **không đổi**. Chỉ các kiểu trong bộ nhớ thay đổi.

## GateIssue (sửa, `src/project/types.ts`)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `number`, `url`, `state`, `gates` | như hiện tại | |
| `updatedAt` | string (ISO) \| null | **Mới.** Lấy từ `updated_at` của GitHub; dùng để chọn bản mới hơn khi gộp (R3) |

## RecentWrite (mới, chỉ trong bộ nhớ, `server/tracking.ts`)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| khoá | `identity\|owner/repo\|slug` | Không lẫn giữa người dùng và repo |
| `issue` | GateIssue | Kết quả của lần ghi thành công |
| `at` | number | Hết hạn sau 2 phút |

**Quy tắc gộp** (`loadTracking`): với mỗi `slug` có RecentWrite còn hạn:
- Nếu danh sách đọc được không có issue cho slug đó, hoặc `updatedAt` trong danh sách cũ hơn của RecentWrite, thì dùng `RecentWrite.issue`.
- Nếu không, dùng bản trong danh sách và xoá RecentWrite.

Disconnect và Sign out xoá toàn bộ, qua `clearTrackingCache()`.

## Kết quả ghi (`decideGate`)

`{ issue: GateIssue; unchanged: boolean }`. `unchanged = true` khi cổng đã ở trạng thái đích và không có gì được ghi (R4).

## Trạng thái khu vực hành động của cổng (GatePanel)

```text
chưa duyệt ──bấm Approve──► đang lưu (nút khoá, "Saving…")
đang lưu ──thành công──► đã duyệt (người duyệt, ngày, Reopen gate)
đang lưu ──thất bại──► chưa duyệt + thông báo lỗi (Approve dùng lại được)
đã duyệt ──bấm Reopen──► đang lưu ──thành công──► chưa duyệt
                                  └─thất bại──► đã duyệt + thông báo lỗi
```

`unchanged = true` khi bấm Approve thì vào thẳng "đã duyệt", hiện người đã duyệt trước và ghi chú "Already approved".
