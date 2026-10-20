# Feature Specification: Persist Local Repository

**Feature Branch**: `feat/009-persist-local-repository`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "hiện tại, mỗi lần reload page tôi phải chọn lại folder chứa spec. tôi muốn: mỗi lẩn reload thì speckit-ui vẫn giữ lại repo đã mở trước đó"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Khôi phục repo local sau khi tải lại trang (Priority: P1)

Khi đang xem một repo local, người dùng tải lại trang và muốn tiếp tục với repo đó mà không phải chọn lại thư mục. Ứng dụng khôi phục nội dung repo và màn hình đang làm việc gần nhất khi quyền truy cập thư mục vẫn còn hiệu lực.

**Why this priority**: Việc phải chọn lại thư mục sau mỗi lần tải lại làm gián đoạn công việc và là vấn đề chính người dùng muốn giải quyết.

**Independent Test**: Chọn một repo local có nhiều spec, mở một spec, tải lại trang và xác nhận ứng dụng tự mở lại đúng repo cùng spec đó.

**Acceptance Scenarios**:

1. **Given** người dùng đã mở một repo local và quyền truy cập vẫn được cấp, **When** tải lại trang, **Then** ứng dụng khôi phục repo đó và hiển thị các spec của repo mà không yêu cầu chọn thư mục lại.
2. **Given** người dùng đã mở một spec trong repo local, **When** tải lại trang và repo được khôi phục, **Then** ứng dụng mở lại spec đang xem gần nhất.
3. **Given** người dùng chọn repo local khác, **When** repo mới được mở rồi trang được tải lại, **Then** ứng dụng khôi phục repo mới nhất thay vì repo trước đó.

### User Story 2 - Tiếp tục an toàn khi không thể khôi phục repo (Priority: P2)

Nếu ứng dụng không còn quyền đọc thư mục đã chọn hoặc repo không còn sẵn có, người dùng muốn biết cần làm gì để tiếp tục, đồng thời tránh nhầm dữ liệu mẫu với repo thật.

**Why this priority**: Khôi phục tự động chỉ hữu ích khi ứng dụng xử lý rõ ràng các giới hạn về quyền truy cập và trạng thái thư mục.

**Independent Test**: Thu hồi quyền hoặc làm cho repo đã chọn không còn truy cập được, tải lại trang và xác nhận ứng dụng thông báo vấn đề, cho phép chọn lại repo, và không hiển thị dữ liệu repo khác.

**Acceptance Scenarios**:

1. **Given** repo gần nhất đã mở nhưng quyền truy cập cần được cấp lại, **When** người dùng tải lại trang, **Then** ứng dụng giải thích cần cấp lại quyền và đưa ra cách tiếp tục với repo đã chọn.
2. **Given** repo gần nhất đã bị xoá, di chuyển hoặc không còn hợp lệ, **When** ứng dụng khôi phục lựa chọn, **Then** ứng dụng thông báo repo không truy cập được và cho phép chọn repo khác.
3. **Given** chưa có repo local nào được chọn, **When** người dùng mở hoặc tải lại trang, **Then** ứng dụng giữ nguyên trạng thái chưa chọn repo và không mở nhầm dữ liệu mẫu như dữ liệu local.
4. **Given** người dùng không muốn tiếp tục ghi nhớ repo local hiện tại, **When** họ bỏ lựa chọn repo đã ghi nhớ, **Then** ứng dụng quay về trạng thái chưa chọn repo và không tự khôi phục repo đó ở lần mở sau.

### Edge Cases

- Người dùng đóng rồi mở lại tab hoặc trình duyệt: lựa chọn repo gần nhất tiếp tục được nhớ trong cùng hồ sơ trình duyệt nếu quyền truy cập còn hiệu lực.
- Người dùng từ chối cấp lại quyền: ứng dụng giữ trạng thái yêu cầu chọn/cấp quyền, không hiển thị nội dung cũ như thể repo đang được đọc.
- Người dùng chuyển repo trong lúc dữ liệu repo trước đang tải: sau reload, chỉ repo được chọn gần nhất được khôi phục và kết quả tải trễ từ repo cũ không được hiển thị.
- Người dùng xoá dữ liệu trang hoặc dùng hồ sơ trình duyệt khác: không yêu cầu khôi phục lựa chọn đã bị xoá hoặc không thuộc hồ sơ đó.
- Trình duyệt không hỗ trợ khả năng ghi nhớ quyền truy cập thư mục: ứng dụng cho biết cần chọn lại thư mục và tiếp tục cung cấp luồng chọn repo hiện có.
- Repo được khôi phục nhưng cấu trúc không còn hợp lệ hoặc thiếu thư mục `specs/`: hiển thị trạng thái lỗi của repo đó, không chuyển âm thầm sang repo khác hoặc dữ liệu mẫu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sau khi người dùng mở một repo local thành công, ứng dụng MUST ghi nhớ repo local được mở gần nhất cho các lần truy cập tiếp theo trong cùng hồ sơ trình duyệt.
- **FR-002**: Khi trang được tải lại hoặc mở lại, ứng dụng MUST thử khôi phục repo local gần nhất trước khi yêu cầu người dùng chọn thư mục.
- **FR-003**: Khi quyền truy cập còn hiệu lực, ứng dụng MUST khôi phục nội dung repo và spec đang xem gần nhất mà không yêu cầu người dùng chọn lại thư mục.
- **FR-004**: Khi người dùng mở repo local khác, ứng dụng MUST cập nhật lựa chọn được ghi nhớ để lần khôi phục tiếp theo mở repo mới nhất.
- **FR-005**: Nếu cần cấp lại quyền, ứng dụng MUST giải thích tình trạng và cho phép người dùng tiếp tục bằng cách cấp quyền cho repo đã chọn hoặc chọn repo khác.
- **FR-006**: Nếu repo không còn tồn tại, không đọc được hoặc không hợp lệ, ứng dụng MUST báo rõ và cho phép chọn repo khác mà không hiển thị dữ liệu repo trước như nội dung hiện tại.
- **FR-007**: Nếu không có repo đã ghi nhớ hoặc không thể khôi phục lựa chọn, ứng dụng MUST hiển thị luồng chọn repo hiện có và MUST NOT tự thay bằng dữ liệu mẫu trong trạng thái local.
- **FR-008**: Ứng dụng MUST chỉ ghi nhớ thông tin cần thiết để nhận diện và mở lại lựa chọn repo; nội dung file của repo MUST không bị lưu lại như một bản sao lâu dài bởi tính năng này.
- **FR-009**: Người dùng MUST có thể bỏ lựa chọn repo local đã ghi nhớ; sau đó ứng dụng không tự mở repo đó trong các lần truy cập tiếp theo.
- **FR-010**: Lựa chọn repo MUST gắn với hồ sơ trình duyệt hiện tại và MUST NOT được chia sẻ sang hồ sơ trình duyệt khác.

### Key Entities *(include if feature involves data)*

- **Repo local gần nhất**: repo người dùng đã mở gần nhất, cùng thông tin lựa chọn tối thiểu để thử mở lại và trạng thái quyền truy cập.
- **Vị trí làm việc gần nhất**: spec và màn hình/giai đoạn người dùng đang xem trong repo local; được khôi phục khi repo mở lại thành công.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Trong 100% lần tải lại khi quyền truy cập còn hiệu lực, ứng dụng mở lại đúng repo local đã chọn gần nhất mà không yêu cầu chọn thư mục lại.
- **SC-002**: Trong 100% lần khôi phục repo thành công, ứng dụng hiển thị đúng spec đang xem gần nhất nếu spec đó còn tồn tại.
- **SC-003**: Trong mọi trường hợp quyền bị từ chối, repo không truy cập được hoặc cấu trúc repo không hợp lệ, người dùng nhận được hướng dẫn có thể hành động thay vì màn hình trống hoặc dữ liệu của repo khác.
- **SC-004**: Người dùng có thể bỏ lựa chọn repo đã ghi nhớ và quay về trạng thái chưa chọn repo trong tối đa 2 thao tác.

## Assumptions

- Tính năng áp dụng cho local mode đã được mô tả trong `specs/007-local-repo-browser`; không thay đổi cách mở repo GitHub, chế độ demo hay luồng đăng nhập.
- “Mỗi lần reload” bao gồm tải lại trang và mở lại ứng dụng trong cùng hồ sơ trình duyệt, khi trình duyệt còn cho phép truy cập repo đã chọn.
- Quyền truy cập có thể cần được cấp lại theo chính sách của trình duyệt; khi đó người dùng cần được hướng dẫn thay vì bị buộc chọn một repo khác.
- Chỉ repo local gần nhất cần được khôi phục; danh sách lịch sử nhiều repo không thuộc phạm vi tính năng này.
- Repo vẫn là dữ liệu chỉ đọc theo ranh giới đã nêu trong đặc tả local mode hiện có.

## Non-Goals

- Không ghi nội dung, chỉnh sửa hoặc đồng bộ file trong repo local.
- Không tạo danh sách lịch sử hoặc ghim nhiều repo local.
- Không thay đổi lựa chọn repo hoặc trạng thái đăng nhập trong chế độ GitHub hay demo.
- Không đảm bảo khôi phục khi người dùng xoá dữ liệu trang, đổi hồ sơ trình duyệt hoặc trình duyệt không hỗ trợ quyền truy cập cần thiết.
