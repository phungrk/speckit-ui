# Research: Liệt kê spec trên nhiều nhánh

Mỗi mục ghi quyết định, lý do và các phương án đã cân nhắc. Không còn mục nào ở trạng thái NEEDS CLARIFICATION.

## R1. Liệt kê nhánh `feat/`

- **Decision**:
  - Gọi `GET /repos/{o}/{r}/branches?per_page=100`, phân trang tối đa 3 trang. Mỗi nhánh trả kèm SHA commit đầu.
  - Lọc theo danh sách tiền tố (mặc định `["feat/"]`, FR-002 và FR-012).
  - Đọc tối đa **30 nhánh**, ưu tiên theo tên giảm dần, vì quy ước `feat/NNN-…` làm số lớn hơn là spec mới hơn.
  - Nếu bỏ bớt nhánh, ghi cảnh báo "đã bỏ qua N nhánh" (edge case "rất nhiều nhánh").
- **Rationale**:
  - Một lần gọi cho mọi repo vừa và nhỏ, và có ngay SHA của từng nhánh để so sánh và cache (R3).
  - Endpoint này nằm trong `api.github.com`, nên CSP không đổi.
- **Alternatives considered**:
  - **GraphQL `refs`:** GraphQL không nằm trong CSP của bản Pages. Đã loại.
  - **Sắp theo ngày commit:** endpoint branches không trả ngày, nên phải tốn thêm 1 lần gọi mỗi nhánh. Đã loại; sắp theo tên là đủ với quy ước `feat/NNN-…`.

## R2. Chỉ đọc thư mục spec khác với nhánh chính

- **Decision**: So sánh bằng SHA của cây git, vì SHA xác định duy nhất nội dung. Với mỗi nhánh:
  1. `GET git/trees/{commitSha}` (không đệ quy), lấy SHA của cây `specs`.
     - Không có `specs/`: bỏ qua nhánh, không cảnh báo.
     - SHA bằng của nhánh chính: nhánh không có spec nào chưa merge, nên dừng ở 1 lần gọi.
  2. Nếu khác: `GET git/trees/{specsSha}` (không đệ quy) để lấy SHA của từng thư mục `specs/NNN-slug`.
  3. Chỉ những thư mục **có SHA khác** nhánh chính, hoặc nhánh chính chưa có, mới được tải. Mỗi thư mục tốn `git/trees/{dirSha}?recursive=1`, cộng các file cần hiển thị (giống `loadAt` hiện nay).
- **Rationale**:
  - Đúng định nghĩa "chưa merge" của FR-002, và là cách so sánh chính xác chứ không phỏng đoán.
  - Nhánh đã merge mà chưa xoá chỉ tốn 1 lần gọi.
  - Với 20 nhánh, mỗi nhánh 1 spec khác, lần mở đầu tốn khoảng 20 × (2 + 1 + 5) = 160 lần gọi, chạy song song 8. Đạt SC-002 (10 giây).
- **Alternatives considered**:
  - **Compare API giữa hai nhánh:** trả cả danh sách file thay đổi, nặng hơn, và vẫn phải đọc lại cây.
  - **Đọc cây đệ quy của cả nhánh:** repo lớn có thể bị cắt bớt (`truncated`), và tốn băng thông hơn.

## R3. Cache theo SHA

- **Decision**:
  - Kết quả đọc một thư mục spec được cache theo **SHA của cây thư mục đó**. Nội dung theo SHA không bao giờ đổi, nên giữ được mãi trong giới hạn LRU (mặc định 64 mục).
  - Lần làm mới gọi lại `branches` (1 lần) và so SHA từng nhánh. Nhánh không đổi thì dùng lại kết quả; nhánh đổi thì đọc lại theo R2, nhưng các thư mục có SHA đã biết vẫn lấy từ cache.
  - `getProject` hiện chỉ kiểm tra SHA của nhánh chính trước khi dùng lại cache. Từ giờ nó kiểm tra cả danh sách SHA của các nhánh.
- **Rationale**: Làm mới khi không có gì thay đổi chỉ tốn 2 lần gọi (commit của nhánh chính và danh sách nhánh), nên đạt SC-002 (3 giây). Spec vừa đẩy lên hiện ngay ở lần làm mới đầu (SC-001).
- **Alternatives considered**: Cache theo tên nhánh có hạn dùng: sai ngay khi có push mới. Đã loại.

## R4. Chọn bản hiển thị khi một spec có ở nhiều nhánh (FR-006)

- **Decision**:
  - Mỗi slug gom các bản: bản trên nhánh chính (nếu có), cộng các bản trên nhánh có SHA thư mục khác.
  - "Đi xa nhất" = số bước có trạng thái `done` theo `phaseStatus`.
  - Nếu bằng nhau thì chọn bản có commit mới nhất. Ngày commit chỉ lấy khi cần phá hoà, bằng `GET commits/{sha}` (1 lần mỗi nhánh, có cache).
  - Nhiều nhánh cùng SHA thư mục (nhánh tạo từ nhánh khác) được gộp thành **một bản**, kèm danh sách các nhánh.
- **Rationale**: Bản trên nhánh thường đi trước bản trên nhánh chính (đã có plan, tasks). Gộp theo SHA khiến hai nhánh mang cùng spec không tạo ra hai bản giống nhau.
- **Alternatives considered**: Luôn ưu tiên nhánh chính: sẽ giấu đúng phần việc cần duyệt. Đã loại.

## R5. Trùng số thứ tự (FR-007)

- **Decision**: Gom theo `slug` (ví dụ `003-export`), không theo số. Hai slug khác nhau nhưng cùng số đều hiện, và `Project.warnings` có dòng "Spec number 003 is used by 003-export (feat/a) and 003-search (feat/b)".

## R6. Duyệt cổng và PR cho spec trên nhánh

- **Decision**:
  - Issue theo dõi vẫn xác định theo slug (spec 001 và 002 không đổi).
  - `POST /api/gates` và `Backend.decide` nhận thêm `branch` tuỳ chọn. Server tìm đúng bản theo `slug` và `branch` để chạy lại kiểm tra cổng trên **đúng nội dung đó**.
  - Link `specs/…` trong issue mới trỏ tới nhánh của bản đó.
  - PR được liên kết theo slug như hiện nay (`prMatches`), nên PR của nhánh `feat/NNN-slug` tự gắn vào spec.
- **Rationale**: FR-005 yêu cầu ghi vào cùng nơi; nguyên tắc III yêu cầu kiểm tra lại đúng nội dung trước khi ghi.

## R7. Cố định nhánh (FR-010)

- **Decision**: Khi `Source.ref` được đặt (ô Branch trong Advanced ở bản Pages, hoặc `GITHUB_REF` ở server), chỉ đọc nhánh đó, như hiện nay.
- **Rationale**: Giữ hành vi cũ cho người đã cố ý cố định nhánh.

## R8. Cấu hình theo repo (FR-012)

- **Decision**:
  - Thêm trường tuỳ chọn `branchPrefixes: string[]` vào `.specify/speckit-ui.json` của nhánh chính, cạnh `mergeOrder`.
  - Không có trường thì dùng `["feat/"]`. Giá trị `[]` tắt việc đọc thêm nhánh.
  - `parseUiConfig` bỏ qua giá trị không hợp lệ.
- **Rationale**: Quy ước thêm phải là tuỳ chọn và có mặc định (constitution I).

## R9. Địa chỉ trang (FR-009)

- **Decision**: Thêm tham số `branch` vào `urlState` (`?repo=…&spec=…&branch=feat/x&step=plan`). Không có `branch` thì dùng bản mặc định theo R4. Tham số này cũng được giữ qua bước đăng nhập (`safeReturn`).
- **Rationale**: Cần xác định cả spec lẫn nhánh để người mở link thấy đúng bản.

## R10. Lệnh gợi ý (FR-011)

- **Decision**: Khi bản đang xem nằm trên nhánh chưa merge, thanh lệnh và log hiện thêm dòng "Run on `feat/x`: `git switch feat/x`". Nội dung sao chép vẫn chỉ là lệnh `/speckit-…`.
- **Rationale**: Lệnh phải chạy trên đúng nhánh, nhưng speckit-ui không đổi nhánh thay người dùng.
