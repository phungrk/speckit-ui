# Feature Specification: Trạng thái nút Approve sau khi duyệt

**Feature Branch**: `feat/001-approve-button-state`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "hiện tại sau khi approve, button approve vẫn active, user vẫn có thể click được. mong muốn: sau khi approve thành công thì button lập tức chuyển sang trạng thái sau khi được approve"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cổng chuyển ngay sang trạng thái đã duyệt (Priority: P1)

Người duyệt mở một cổng đã đủ điều kiện và bấm Approve. Ngay khi việc duyệt được ghi nhận thành công, khu vực
hành động của cổng đổi sang trạng thái đã duyệt: hiện người duyệt, ngày duyệt và nút Reopen gate. Nút Approve
không còn xuất hiện, nên người duyệt không thể bấm lại. Hiện nay nút Approve vẫn còn và bấm được sau khi duyệt
thành công, khiến người duyệt không biết việc duyệt đã có tác dụng hay chưa và có thể duyệt lại.

**Why this priority**: Đây là toàn bộ yêu cầu của người dùng. Thiếu nó thì người duyệt không tin được kết quả duyệt
và dễ tạo bản ghi duyệt trùng.

**Independent Test**: Duyệt một cổng đủ điều kiện, rồi quan sát khu vực cổng mà không tải lại trang: nút Approve phải
biến mất ngay, thay bằng trạng thái đã duyệt.

**Acceptance Scenarios**:

1. **Given** một cổng đủ điều kiện và chưa được duyệt, **When** người duyệt bấm Approve và việc duyệt được ghi nhận thành công, **Then** nút Approve biến mất ngay, thay bằng trạng thái đã duyệt có tên người duyệt, ngày duyệt và nút Reopen gate, mà không cần tải lại hay bấm Refresh.
2. **Given** một cổng vừa được duyệt thành công, **When** ứng dụng làm mới dữ liệu (tự động hoặc người dùng bấm Refresh) trong lúc nguồn dữ liệu chưa kịp cập nhật, **Then** cổng vẫn hiển thị trạng thái đã duyệt và không quay lại nút Approve.
3. **Given** một cổng vừa được duyệt thành công, **When** người dùng tải lại toàn bộ trang, **Then** cổng vẫn hiển thị đã duyệt với đúng người duyệt và ngày duyệt.
4. **Given** một cổng vừa được duyệt thành công, **When** người dùng nhìn thanh bước và danh sách Next up, **Then** bước đó hiện Approved và Next up không còn mục "Approve" cho bước đó.

---

### User Story 2 - Không thể duyệt hai lần trong lúc đang xử lý (Priority: P1)

Từ lúc bấm Approve cho đến khi có kết quả, nút cho biết đang lưu và không bấm được. Bấm liên tiếp hay nhấp đúp
chỉ tạo đúng một lần duyệt.

**Why this priority**: Bản ghi duyệt trùng làm nhiễu lịch sử duyệt mà nhóm dựa vào để kiểm tra ai đã duyệt gì. Lỗi
này xảy ra đúng trong tình huống người dùng đã báo.

**Independent Test**: Nhấp đúp hoặc bấm nhanh 5 lần vào Approve, rồi kiểm tra lịch sử duyệt của spec: chỉ có một
bản ghi duyệt cho cổng đó.

**Acceptance Scenarios**:

1. **Given** người duyệt vừa bấm Approve và kết quả chưa về, **When** người duyệt nhìn nút, **Then** nút không bấm được và hiển thị trạng thái đang lưu.
2. **Given** một cổng chưa được duyệt, **When** người duyệt nhấp đúp hoặc bấm liên tiếp vào Approve, **Then** chỉ có đúng một bản ghi duyệt được tạo.
3. **Given** cổng đã được người khác duyệt nhưng màn hình của người duyệt chưa cập nhật, **When** người duyệt bấm Approve, **Then** không có bản ghi duyệt thứ hai và cổng hiện đã duyệt kèm tên người đã duyệt trước đó.

---

### User Story 3 - Duyệt thất bại thì báo rõ và cho thử lại (Priority: P2)

Khi việc duyệt không thành công (mất mạng, thiếu quyền, cổng không còn đủ điều kiện), người duyệt thấy thông báo lỗi
dễ hiểu. Nút Approve dùng lại được và cổng không hiện trạng thái đã duyệt.

**Why this priority**: Chuyển trạng thái ngay chỉ đáng tin nếu nó không bao giờ báo thành công khi việc duyệt thất bại.

**Independent Test**: Duyệt một cổng bằng tài khoản không có quyền ghi: phải thấy lỗi, nút Approve dùng lại được,
và không có trạng thái đã duyệt.

**Acceptance Scenarios**:

1. **Given** người duyệt không có quyền ghi kết quả duyệt, **When** bấm Approve, **Then** hiển thị thông báo lỗi nêu nguyên nhân, nút Approve dùng lại được, và cổng vẫn ở trạng thái chưa duyệt.
2. **Given** kết nối mạng bị mất khi đang duyệt, **When** yêu cầu duyệt thất bại, **Then** hiển thị lỗi và người duyệt có thể thử lại.

---

### User Story 4 - Reopen gate có hành vi tương tự (Priority: P3)

Sau khi mở lại một cổng đã duyệt thành công, cổng chuyển ngay về trạng thái chưa duyệt với nút Approve. Trong lúc
xử lý, nút Reopen gate không bấm được. Nếu thất bại, cổng giữ trạng thái đã duyệt và báo lỗi.

**Why this priority**: Giữ hai thao tác ngược nhau nhất quán. Ít gặp hơn Approve nên xếp sau.

**Independent Test**: Mở lại một cổng đã duyệt và quan sát khu vực cổng mà không tải lại trang.

**Acceptance Scenarios**:

1. **Given** một cổng đã được duyệt, **When** người duyệt bấm Reopen gate và thao tác thành công, **Then** cổng chuyển ngay về trạng thái chưa duyệt và nút Approve xuất hiện lại.
2. **Given** người duyệt vừa bấm Reopen gate, **When** kết quả chưa về, **Then** nút Reopen gate không bấm được.

---

### Edge Cases

- Duyệt cổng Implement cũng kết thúc spec (issue theo dõi được đóng): khu vực cổng hiện đã duyệt và ghi chú cho biết issue đã đóng.
- Hai người, hoặc hai tab, cùng mở một cổng: người thứ hai bấm Approve sau người thứ nhất thì không tạo bản ghi trùng và thấy tên người đã duyệt trước.
- Cổng được tick trực tiếp trên GitHub trong lúc trang đang mở: sau lần làm mới kế tiếp, cổng hiện đã duyệt như hiện nay (không đổi).
- Việc duyệt đã ghi thành công nhưng phản hồi bị mất trên đường về: lần làm mới hoặc lần bấm tiếp theo phải hiện đã duyệt, không tạo bản ghi thứ hai.
- Lần duyệt đầu tiên của một spec, khi issue theo dõi được tạo mới: cổng cũng phải chuyển ngay sang đã duyệt như mọi lần khác.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sau khi việc duyệt được ghi nhận thành công, khu vực hành động của cổng MUST chuyển ngay sang trạng thái đã duyệt (người duyệt, ngày duyệt, nút Reopen gate) mà không cần tải lại hay làm mới.
- **FR-002**: Từ lúc bấm Approve đến khi có kết quả, nút MUST không bấm được và MUST hiển thị trạng thái đang lưu.
- **FR-003**: Nhấp đúp hoặc bấm liên tiếp MUST tạo tối đa một bản ghi duyệt cho mỗi cổng.
- **FR-004**: Trạng thái đã duyệt vừa ghi MUST không bị dữ liệu cũ hơn ghi đè khi ứng dụng làm mới dữ liệu.
- **FR-005**: Thanh bước, danh sách Next up và thanh tiến độ trong danh sách spec MUST cập nhật cùng lúc với khu vực cổng.
- **FR-006**: Khi việc duyệt thất bại, ứng dụng MUST hiển thị thông báo lỗi, giữ cổng ở trạng thái chưa duyệt và cho bấm Approve lại.
- **FR-007**: Duyệt một cổng mà người khác đã duyệt MUST không tạo bản ghi duyệt thứ hai, và MUST hiển thị cổng đã duyệt kèm người đã duyệt thật.
- **FR-008**: Reopen gate MUST tuân theo FR-001, FR-002, FR-004 và FR-006 theo chiều ngược lại: thành công thì về ngay trạng thái chưa duyệt; thất bại thì giữ trạng thái đã duyệt.
- **FR-009**: Hành vi trên MUST giống nhau ở chế độ có server và ở bản tĩnh (GitHub Pages).
- **FR-010**: Chế độ demo MUST giữ nguyên hành vi và giao diện hiện tại.

### Key Entities

- **Phê duyệt cổng**: một bước của spec (Specify đến Implement) cùng trạng thái đã duyệt hay chưa, người duyệt và ngày duyệt.
- **Issue theo dõi**: nơi lưu các phê duyệt của một spec, cùng lịch sử comment cho từng lần duyệt, yêu cầu sửa hoặc mở lại.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Trong 100% lần duyệt thành công, trạng thái đã duyệt xuất hiện trong vòng 1 giây sau khi việc duyệt được xác nhận, và nút Approve không bấm được ở bất kỳ thời điểm nào sau đó.
- **SC-002**: Bấm nhanh 5 lần liên tiếp vào Approve tạo đúng 1 bản ghi duyệt, kiểm tra trên 10 lần thử.
- **SC-003**: Làm mới dữ liệu nhiều lần trong 2 phút sau khi duyệt, cổng không lần nào quay về nút Approve.
- **SC-004**: Mọi lần duyệt thất bại được thử nghiệm (thiếu quyền, mất mạng, cổng không đủ điều kiện) đều hiện thông báo lỗi và không lần nào hiện trạng thái đã duyệt.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III của constitution): GitHub mode, ở cả chế độ có server và bản tĩnh. Chế độ demo đã ẩn nút sau khi duyệt và không thay đổi.
- Sau khi ghi, GitHub có thể vẫn trả dữ liệu cũ trong một khoảng ngắn (tối đa khoảng 1 phút). Đây là nguyên nhân có thể khiến nút Approve hiện lại.
- Người duyệt dùng tài khoản GitHub của chính mình; tên người duyệt lấy từ tài khoản đó như hiện nay.
- Định dạng issue theo dõi và nội dung comment duyệt giữ nguyên.
- Request changes không đổi trạng thái cổng nên nằm ngoài phạm vi, chỉ cần không cho gửi hai lần trong lúc đang xử lý như hiện nay.

## Non-Goals

- Không cảnh báo "duyệt đã cũ" khi file của bước thay đổi sau khi duyệt.
- Không thêm nhiều người duyệt cho một cổng hay phân quyền theo vai trò.
- ~~Không khoá bước sau cho tới khi cổng trước được duyệt.~~ Đã được thay bằng spec 004 (`specs/004-approval-gates-next`): bước sau bị khoá cho tới khi cổng trước được duyệt.
- Không thay đổi giao diện hay hành vi của chế độ demo.
