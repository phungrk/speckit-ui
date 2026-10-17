# Feature Specification: Làm việc với nhiều repo trong một phiên

**Feature Branch**: `feat/002-multi-repo-workspace`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "speckit-workspace pages có thể làm việc với nhiều repo mà đã được cấp phép trong token"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chọn repo từ danh sách token được phép (Priority: P1)

Người dùng dán token một lần. Thay vì tự gõ tên một repo, ứng dụng liệt kê những repo mà token có quyền đọc, đánh dấu
repo nào là dự án Spec Kit, và người dùng chọn repo cần mở. Hiện nay mỗi lần chỉ làm việc được với một repo đã gõ tay,
muốn xem repo khác phải mở Settings và nhập lại.

**Why this priority**: Đây là cửa vào của mọi thứ còn lại. Không biết token có quyền với repo nào thì người dùng phải
nhớ và gõ đúng tên từng repo.

**Independent Test**: Kết nối bằng một token có quyền với ít nhất 2 repo Spec Kit và 1 repo thường: danh sách hiện đủ các
repo được phép, các repo Spec Kit được đánh dấu, và chọn một repo thì mở đúng dự án đó.

**Acceptance Scenarios**:

1. **Given** người dùng đã dán một token có quyền với nhiều repo, **When** kết nối, **Then** ứng dụng hiển thị danh sách các repo token có quyền đọc, mỗi repo cho biết có phải dự án Spec Kit hay không.
2. **Given** danh sách repo đang hiển thị, **When** người dùng chọn một repo Spec Kit, **Then** ứng dụng mở dự án đó mà không hỏi lại token.
3. **Given** token chỉ có quyền với đúng một repo Spec Kit, **When** kết nối, **Then** ứng dụng mở thẳng repo đó.
4. **Given** token không có quyền với repo Spec Kit nào, **When** kết nối, **Then** ứng dụng báo rõ chưa tìm thấy dự án Spec Kit và vẫn cho nhập tên repo bằng tay.

---

### User Story 2 - Chuyển qua lại giữa các repo (Priority: P1)

Đang làm việc trong một repo, người dùng chuyển sang repo khác ngay từ thanh điều hướng, không phải ngắt kết nối hay nhập
lại gì. Khi quay lại repo cũ, ứng dụng nhớ spec và bước đang xem ở repo đó.

**Why this priority**: Người dùng thường quản lý nhiều dự án cùng lúc (ví dụ tohong và chính speckit-ui). Không chuyển
nhanh được thì tính năng nhiều repo không có ý nghĩa.

**Independent Test**: Mở repo A, chọn một spec và một bước, chuyển sang repo B, rồi quay lại A: A mở lại đúng spec và
bước đã xem, và trong suốt quá trình không phải nhập lại token.

**Acceptance Scenarios**:

1. **Given** người dùng đang ở repo A, **When** chọn repo B từ thanh điều hướng, **Then** ứng dụng hiển thị dự án B, không yêu cầu nhập lại token.
2. **Given** người dùng đã chuyển từ A sang B, **When** chuyển lại về A, **Then** ứng dụng mở lại spec và bước người dùng đã xem gần nhất ở A.
3. **Given** người dùng chuyển repo, **When** dự án mới hiện ra, **Then** không có dữ liệu nào của repo trước (spec, phê duyệt, PR, câu trả lời Copilot) còn hiển thị lẫn vào.

---

### User Story 3 - Tổng quan nhiều repo (Priority: P2)

[NEEDS CLARIFICATION: Ngoài việc chuyển qua lại giữa các repo, có cần một màn hình tổng hợp hiển thị việc cần làm (Next up, cổng chờ duyệt) của tất cả repo cùng lúc không?]

**Why this priority**: Giúp người quản lý nhiều dự án biết ngay việc nào đang chờ mình mà không phải mở từng repo.
Có giá trị nhưng chỉ sau khi chọn và chuyển repo đã chạy được.

**Independent Test**: Với token có quyền trên 3 repo Spec Kit, mở màn hình tổng quan: thấy việc cần làm của cả 3 repo, bấm
một mục thì mở đúng repo, spec và bước tương ứng.

**Acceptance Scenarios**:

1. **Given** người dùng đã chọn nhiều repo để theo dõi, **When** mở màn hình tổng quan, **Then** thấy danh sách việc cần làm tiếp theo (lệnh cần chạy, cổng chờ duyệt) của từng repo.
2. **Given** màn hình tổng quan đang hiển thị, **When** người dùng bấm một mục, **Then** ứng dụng mở đúng repo, spec và bước của mục đó.

---

### User Story 4 - Ghim các repo hay dùng (Priority: P3)

Người dùng ghim những repo hay làm việc để chúng luôn nằm đầu danh sách, và ẩn những repo không liên quan.

**Why this priority**: Token trong tổ chức có thể có quyền với hàng chục, hàng trăm repo. Ghim giúp danh sách gọn,
nhưng không bắt buộc để dùng được.

**Independent Test**: Ghim 2 repo, tải lại trang: 2 repo đó nằm đầu danh sách.

**Acceptance Scenarios**:

1. **Given** danh sách repo dài, **When** người dùng ghim một repo, **Then** repo đó nằm đầu danh sách ở các lần mở sau trên cùng thiết bị.
2. **Given** người dùng gõ vào ô tìm kiếm, **When** nhập một phần tên repo, **Then** danh sách chỉ còn các repo khớp.

---

### Edge Cases

- Token có quyền với rất nhiều repo (hàng trăm): danh sách vẫn mở được nhanh; việc kiểm tra repo nào là dự án Spec Kit không được chặn người dùng chọn repo.
- Một repo bị thu hồi quyền hoặc bị xoá sau khi đã ghim hoặc đã mở: ứng dụng báo repo không còn truy cập được, bỏ nó khỏi danh sách đang dùng, và không làm hỏng các repo khác.
- Repo là submodule của một dự án khác (ví dụ tohong-back) và không có Spec Kit: hiện là repo thường, không đánh dấu là dự án.
- Token có quyền đọc nhưng không có quyền ghi issue ở một repo: vẫn xem được dự án; cổng duyệt báo thiếu quyền ở riêng repo đó.
- Hai repo có spec cùng số và cùng tên (ví dụ cả hai có `001-…`): dữ liệu và phê duyệt của chúng không bị lẫn.
- Người dùng mở trang bằng liên kết tới một repo cụ thể: ứng dụng mở thẳng repo đó nếu token có quyền.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sau khi người dùng nhập token, ứng dụng MUST liệt kê các repo mà token có quyền đọc.
- **FR-002**: Ứng dụng MUST đánh dấu repo nào là dự án Spec Kit (có cấu hình Spec Kit), và mặc định ưu tiên các repo này trong danh sách.
- **FR-003**: Người dùng MUST mở được bất kỳ repo nào trong danh sách mà không phải nhập lại token.
- **FR-004**: Người dùng MUST chuyển được sang repo khác từ màn hình làm việc, không cần ngắt kết nối.
- **FR-005**: Khi quay lại một repo đã mở trong cùng phiên, ứng dụng MUST mở lại spec và bước đã xem gần nhất ở repo đó.
- **FR-006**: Dữ liệu của mỗi repo (spec, phê duyệt, PR, lịch sử Copilot) MUST tách biệt; không được hiển thị dữ liệu của repo này khi đang ở repo khác.
- **FR-007**: Người dùng MUST vẫn nhập được tên repo bằng tay, cho những repo không có trong danh sách hoặc khi danh sách trống.
- **FR-008**: Mỗi repo MUST có địa chỉ riêng để mở thẳng (dùng để đánh dấu trang hoặc chia sẻ trong nhóm); địa chỉ này KHÔNG được chứa token hay khoá nào.
- **FR-009**: Phê duyệt cổng MUST được ghi vào đúng repo đang mở, với danh nghĩa người dùng của token.
- **FR-010**: Người dùng MUST tìm được repo theo tên khi danh sách dài.
- **FR-011**: Người dùng MUST ghim được repo; danh sách ghim được nhớ trên thiết bị đó nếu người dùng đã chọn "Remember on this device".
- **FR-012**: Khi một repo không còn truy cập được, ứng dụng MUST báo rõ và tiếp tục hoạt động với các repo khác.
- **FR-013**: Phạm vi chế độ chạy: [NEEDS CLARIFICATION: Chỉ áp dụng cho bản GitHub Pages (người dùng tự nhập token), hay cả chế độ có server (hiện cố định một repo qua cấu hình)?]

### Key Entities

- **Repo được phép**: một repo mà token có quyền đọc. Thuộc tính: chủ sở hữu, tên, riêng tư hay công khai, có phải dự án Spec Kit, đã ghim hay chưa.
- **Repo đang mở**: repo người dùng đang làm việc, cùng spec và bước đã xem gần nhất ở repo đó.
- **Phiên kết nối**: token và các thiết lập đi kèm (khoá Copilot, ghi nhớ trên thiết bị). Một phiên dùng chung cho mọi repo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng mở được repo thứ hai trong vòng 10 giây kể từ khi bấm chọn, không phải nhập lại token.
- **SC-002**: Với token có quyền trên 200 repo, danh sách repo hiện ra trong vòng 5 giây.
- **SC-003**: Trong 100% lần chuyển repo, không có dữ liệu nào của repo trước còn hiển thị ở repo mới.
- **SC-004**: Quay lại một repo đã mở, người dùng thấy đúng spec và bước đã xem trước đó trong 100% lần thử.
- **SC-005**: Người mới dùng chọn đúng repo dự án mình cần ngay lần đầu, không cần gõ tên repo, trong ít nhất 9/10 lần thử.

## Assumptions

- Token là fine-grained token hoặc token tương đương, như hiện nay. Quyền với từng repo do GitHub quyết định; ứng dụng không mở rộng quyền.
- Repo "là dự án Spec Kit" khi có cấu hình Spec Kit ở gốc repo.
- Ghi nhớ trên thiết bị chỉ gồm danh sách ghim và repo mở gần nhất; không có dữ liệu repo nào được lưu lâu dài trên thiết bị.
- Khoá Copilot (nếu có) dùng chung cho mọi repo trong phiên.
- Repo nằm trên GitHub.com (bao gồm GitHub Enterprise Cloud). GitHub Enterprise Server là spec riêng.

## Non-Goals

- Không gộp nhiều repo thành một dự án (ví dụ spec nằm ở nhiều repo).
- Không dùng nhiều token khác nhau cho các repo khác nhau trong cùng một phiên.
- Không thay đổi định dạng issue theo dõi hay cách suy ra trạng thái các bước.
- Không hỗ trợ GitHub Enterprise Server trong spec này.
- Không thay đổi chế độ demo.
