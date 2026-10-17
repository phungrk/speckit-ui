# Research: Trạng thái nút Approve sau khi duyệt

Mỗi mục ghi quyết định, lý do và các phương án đã cân nhắc. Không còn mục nào ở trạng thái NEEDS CLARIFICATION.

## R1. Vì sao nút Approve hiện lại sau khi duyệt thành công

Luồng hiện tại (sau spec 002):

1. `GatePanel` gọi `onDecide`.
2. `LiveWorkspace` gọi `backend.decide(repo, …)`.
3. `decideGate` ghi issue: PATCH thân issue, rồi POST comment. Hàm nhận về **GateIssue mới nhất** từ response của PATCH.
4. Nhưng `backend.decide` (bản Pages) và `POST /api/gates` (bản server) **bỏ kết quả đó**. Chúng gọi `getTracking(…, true)` để đọc lại toàn bộ danh sách issue và PR, rồi trả danh sách này cho giao diện.

Bước 4 có thể trả dữ liệu cũ vì hai nguyên nhân:

- **Cache HTTP của trình duyệt (bản Pages, nguyên nhân chính).**
  - GitHub trả `Cache-Control: private, max-age=60` cho các lệnh đọc.
  - `fetch()` trong `server/github.ts` dùng chế độ cache mặc định, nên trong 60 giây trình duyệt trả lại danh sách issue **trước khi duyệt**.
  - Vì vậy nút Approve hiện lại, và bấm Refresh trong khoảng đó vẫn thấy dữ liệu cũ. Điều này khớp với giả định "tối đa khoảng 1 phút" trong spec.
- **Độ trễ của endpoint danh sách trên GitHub (cả hai chế độ).** Endpoint đọc một issue (`GET /issues/{n}`) trả dữ liệu mới, nhưng endpoint danh sách có thể chậm vài giây.

Ngoài ra, bước 4 đọc lại PR của mọi repo submodule, nên mất vài giây trước khi giao diện đổi. Điều này đi ngược SC-001 (đổi trạng thái trong vòng 1 giây).

## R2. Lấy kết quả ghi làm nguồn sự thật, không đọc lại danh sách

- **Decision**:
  - `decideGate` trả `GateIssue` lấy từ response của PATCH, có thêm `updatedAt`.
  - `POST /api/gates` và `browserBackend.decide` trả tracking gồm tracking hiện có **cộng** issue vừa ghi, qua hàm thuần `applyIssue(tracking, slug, issue)`. Không đọc lại danh sách issue và PR.
- **Rationale**:
  - Response của PATCH là dữ liệu chính xác nhất mà GitHub có ngay lúc đó (FR-001).
  - Bỏ được 1 + N lần gọi, nên giao diện đổi gần như ngay khi ghi xong (SC-001).
  - Thanh bước, Next up và thanh tiến độ đều suy ra từ cùng một `tracking`, nên cập nhật cùng lúc (FR-005).
- **Alternatives considered**:
  - **Cập nhật lạc quan (đổi giao diện trước khi ghi xong):** trái US3. Chỉ được báo thành công khi ghi đã thành công.
  - **Chờ một khoảng rồi đọc lại:** chậm, và vẫn có thể gặp dữ liệu cũ.

## R3. Không để dữ liệu cũ ghi đè lần ghi vừa xong

- **Decision**:
  - Lệnh đọc GitHub dùng `fetch(…, { cache: 'no-cache' })`. Trình duyệt luôn hỏi lại GitHub bằng ETag; nếu dữ liệu không đổi thì GitHub trả 304, rẻ và không tính vào giới hạn số lần gọi.
  - `server/tracking.ts` giữ thêm một **bản ghi gần đây** trong bộ nhớ: mỗi lần ghi thành công lưu `{ issue, updatedAt }`, khoá theo `identity|repo|slug`, trong 5 phút. 5 phút dài hơn khoảng 2 phút mà SC-003 đo.
  - `loadTracking` gộp bản ghi gần đây vào danh sách đọc được. Với mỗi spec, giữ bản có `updatedAt` mới hơn.
- **Rationale**:
  - FR-004 và SC-003: làm mới nhiều lần trong 2 phút không quay lại nút Approve.
  - Cùng một đoạn code chạy ở cả server lẫn trình duyệt (nguyên tắc III).
  - So bằng `updated_at` của GitHub, nên nếu ai đó sửa issue trên GitHub sau lần ghi của mình thì bản của GitHub thắng (edge case "tick trực tiếp trên GitHub").
- **Alternatives considered**:
  - **Chỉ dùng `no-cache`:** không xử lý được độ trễ của endpoint danh sách.
  - **`cache: 'no-store'`:** luôn tải lại toàn bộ, tốn hạn mức gọi hơn `no-cache` + ETag.

## R4. Không tạo bản ghi duyệt trùng

- **Decision**:
  1. **Trong giao diện:** `GatePanel` khoá thao tác bằng `useRef` ngay đầu hàm xử lý click, cộng với `busy` để hiện "Saving…" (FR-002, FR-003). Ref được đặt đồng bộ, nên lần bấm thứ hai bị chặn ngay cả trước khi React vẽ lại.
  2. **Trong logic ghi (dùng chung):**
     - Ghi lần lượt từng cái theo khoá `repo|slug`. Hai lệnh duyệt cùng spec trong một tiến trình (cùng tab, hoặc cùng server) chạy nối tiếp nhau.
     - **Ghi lặp lại thì không làm gì (idempotent):** `decideGate` đọc lại issue bằng `GET /issues/{n}`. Nếu cổng đã ở trạng thái đích (đã duyệt khi bấm Approve, chưa duyệt khi Reopen) thì không PATCH và không comment, mà trả `{ issue, unchanged: true }` kèm người đã duyệt thật (FR-007, US2-AS3).
     - Lần duyệt đầu tiên tạo issue: nhờ bản ghi gần đây (R3), lệnh duyệt thứ hai của cùng người biết issue đã tồn tại. Với người khác, tiến trình còn giữ bảng `repo|slug → số issue` dùng chung (không khoá theo người dùng). Bảng này chỉ dùng để tránh tạo trùng; việc đọc issue vẫn dùng token của từng người (analysis U1).
     - Kiểm tra "đã ở trạng thái đích" chạy trước kiểm tra cổng, nên cổng đã duyệt trả "Already approved" thay vì 409 (analysis C1).
- **Rationale**: Nhiều lớp bảo vệ ở những chỗ rẻ. Hai tab hoặc hai người khác nhau vẫn được chặn nhờ việc đọc lại issue ngay trước khi ghi.
- **Alternatives considered**:
  - **Khoá phía GitHub:** GitHub không có compare-and-swap cho thân issue.
  - **Chỉ khoá giao diện:** không chặn được hai tab.
- **Giới hạn đã biết**: hai người bấm cách nhau vài mili-giây trên hai server hoặc hai trình duyệt khác nhau vẫn có thể cùng ghi. Kết quả vẫn đúng (cổng đã duyệt), chỉ thừa một comment. Trên bản Pages, vì mỗi trình duyệt có bộ nhớ riêng, lần duyệt **đầu tiên** của một spec từ hai trình duyệt trong vài giây đầu vẫn có thể tạo hai issue. Chấp nhận được với công cụ nội bộ.

## R5. Lỗi khi duyệt

- **Decision**: Giữ cách xử lý lỗi hiện tại: lỗi hiện trong GatePanel, nút dùng lại được. Lỗi 403 khi ghi đã có thông báo thiếu quyền Issues từ spec 002 (`accessProblem`). Thêm test cho mất mạng, cổng không đủ điều kiện (409) và thiếu quyền (403): sau mỗi lỗi, trạng thái cổng không đổi (FR-006, SC-004).
- **Rationale**: Hành vi gần như đã đúng; chỉ thiếu test chứng minh.
