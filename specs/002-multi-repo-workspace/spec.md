# Feature Specification: Làm việc với nhiều repo trong một phiên

**Feature Branch**: `feat/002-multi-repo-workspace`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "speckit-workspace pages có thể làm việc với nhiều repo mà đã được cấp phép trong token"

## Clarifications

### Session 2026-10-17

- Q: Ngoài việc chuyển qua lại giữa các repo, có cần màn hình tổng hợp việc cần làm của nhiều repo cùng lúc không? → A: Có, cho các repo đã ghim (phương án B)
- Q: Tính năng áp dụng cho chế độ chạy nào? → A: Mọi chế độ. Danh sách repo và quyền luôn theo token của chính người dùng: bản Pages dùng token người dùng nhập; bản server bắt người dùng đăng nhập bằng GitHub và dùng quyền của người đó; chạy local dùng token của người dùng trong `.env.local`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chọn repo từ danh sách token được phép (Priority: P1)

Sau khi ứng dụng biết người dùng là ai (qua token họ nhập, lượt đăng nhập GitHub hoặc cấu hình local), nó liệt kê những
repo người đó có quyền đọc, đánh dấu repo nào là dự án Spec Kit, và người dùng chọn repo cần mở. Hiện nay mỗi lần chỉ
làm việc được với một repo đã gõ tay (bản Pages) hoặc cố định trong cấu hình (bản server), muốn xem repo khác phải nhập
lại hoặc đổi cấu hình.

**Why this priority**: Đây là cửa vào của mọi thứ còn lại. Không biết mình có quyền với repo nào thì người dùng phải nhớ
và gõ đúng tên từng repo.

**Independent Test**: Kết nối bằng một tài khoản có quyền với ít nhất 2 repo Spec Kit và 1 repo thường: danh sách hiện
đủ các repo được phép, các repo Spec Kit được đánh dấu, và chọn một repo thì mở đúng dự án đó.

**Acceptance Scenarios**:

1. **Given** người dùng đã được nhận diện và có quyền với nhiều repo, **When** vào ứng dụng, **Then** ứng dụng hiển thị danh sách các repo người đó có quyền đọc, mỗi repo cho biết có phải dự án Spec Kit hay không.
2. **Given** danh sách repo đang hiển thị, **When** người dùng chọn một repo Spec Kit, **Then** ứng dụng mở dự án đó mà không hỏi lại thông tin đăng nhập.
3. **Given** người dùng chỉ có quyền với đúng một repo Spec Kit, **When** vào ứng dụng, **Then** ứng dụng mở thẳng repo đó.
4. **Given** người dùng không có quyền với repo Spec Kit nào, **When** vào ứng dụng, **Then** ứng dụng báo rõ chưa tìm thấy dự án Spec Kit và vẫn cho nhập tên repo bằng tay.

---

### User Story 2 - Chuyển qua lại giữa các repo (Priority: P1)

Đang làm việc trong một repo, người dùng chuyển sang repo khác ngay từ thanh điều hướng, không phải đăng nhập hay nhập
lại gì. Khi quay lại repo cũ, ứng dụng nhớ spec và bước đang xem ở repo đó.

**Why this priority**: Người dùng thường quản lý nhiều dự án cùng lúc (ví dụ tohong và chính speckit-ui). Không chuyển
nhanh được thì tính năng nhiều repo không có ý nghĩa.

**Independent Test**: Mở repo A, chọn một spec và một bước, chuyển sang repo B, rồi quay lại A: A mở lại đúng spec và
bước đã xem, và trong suốt quá trình không phải đăng nhập lại.

**Acceptance Scenarios**:

1. **Given** người dùng đang ở repo A, **When** chọn repo B từ thanh điều hướng, **Then** ứng dụng hiển thị dự án B, không yêu cầu đăng nhập hay nhập token lại.
2. **Given** người dùng đã chuyển từ A sang B, **When** chuyển lại về A, **Then** ứng dụng mở lại spec và bước người dùng đã xem gần nhất ở A.
3. **Given** người dùng chuyển repo, **When** dự án mới hiện ra, **Then** không có dữ liệu nào của repo trước (spec, phê duyệt, PR, câu trả lời Copilot) còn hiển thị lẫn vào.

---

### User Story 3 - Ghim và tìm repo (Priority: P2)

Người dùng ghim những repo hay làm việc để chúng luôn nằm đầu danh sách, và tìm repo theo tên khi danh sách dài. Các repo
đã ghim cũng là các repo xuất hiện trên màn hình tổng quan (User Story 4).

**Why this priority**: Tài khoản trong tổ chức có thể có quyền với hàng chục, hàng trăm repo. Ghim vừa giúp danh sách
gọn, vừa xác định những repo người dùng theo dõi.

**Independent Test**: Ghim 2 repo, tải lại trang: 2 repo đó nằm đầu danh sách; gõ một phần tên repo thì danh sách chỉ
còn các repo khớp.

**Acceptance Scenarios**:

1. **Given** danh sách repo dài, **When** người dùng ghim một repo, **Then** repo đó nằm đầu danh sách ở các lần mở sau.
2. **Given** người dùng gõ vào ô tìm kiếm, **When** nhập một phần tên repo, **Then** danh sách chỉ còn các repo khớp.
3. **Given** một repo đã ghim, **When** người dùng bỏ ghim, **Then** repo đó trở về vị trí bình thường và không còn trên màn hình tổng quan.

---

### User Story 4 - Tổng quan các repo đã ghim (Priority: P2)

Người dùng mở màn hình tổng quan và thấy việc cần làm tiếp theo của mọi repo đã ghim: cổng nào đang chờ duyệt, spec nào
cần chạy lệnh gì. Bấm vào một mục thì mở đúng repo, spec và bước đó.

**Why this priority**: Giúp người quản lý nhiều dự án biết ngay việc nào đang chờ mình mà không phải mở từng repo. Chỉ
có ý nghĩa khi chọn, chuyển và ghim repo đã chạy được.

**Independent Test**: Ghim 3 repo Spec Kit, mở màn hình tổng quan: thấy việc cần làm của cả 3 repo; bấm một mục thì mở
đúng repo, spec và bước tương ứng.

**Acceptance Scenarios**:

1. **Given** người dùng đã ghim nhiều repo Spec Kit, **When** mở màn hình tổng quan, **Then** thấy danh sách việc cần làm tiếp theo (lệnh cần chạy, cổng chờ duyệt) của từng repo đã ghim, nhóm theo repo.
2. **Given** màn hình tổng quan đang hiển thị, **When** người dùng bấm một mục, **Then** ứng dụng mở đúng repo, spec và bước của mục đó.
3. **Given** một repo đã ghim không đọc được (mất quyền, lỗi mạng), **When** mở màn hình tổng quan, **Then** repo đó hiện thông báo lỗi riêng, các repo khác vẫn hiển thị bình thường.
4. **Given** người dùng chưa ghim repo nào, **When** mở màn hình tổng quan, **Then** ứng dụng hướng dẫn cách ghim repo.

---

### User Story 5 - Mọi chế độ đều dùng quyền của chính người dùng (Priority: P2)

Dù dùng bản Pages, bản server triển khai cho nhóm, hay chạy trên máy mình, ứng dụng luôn đọc và ghi bằng quyền GitHub
của chính người đang dùng. Bản server bắt đăng nhập bằng GitHub trước khi hiển thị bất cứ thứ gì; chạy local thì lấy
token người dùng đã khai báo trong cấu hình cục bộ của họ.

**Why this priority**: Cho phép triển khai bản server cho nhóm hay công ty mà không phải chia sẻ một token chung: mỗi người
chỉ thấy những gì GitHub cho họ thấy, và phê duyệt ghi đúng tên người bấm. Đây là điều kiện để bản server hỗ trợ nhiều
repo một cách an toàn.

**Independent Test**: Triển khai bản server, đăng nhập bằng hai tài khoản GitHub có quyền khác nhau: mỗi người chỉ thấy
repo của mình, và phê duyệt của mỗi người ghi đúng tên người đó. Chạy local với token trong cấu hình cục bộ: vào thẳng
danh sách repo, không cần màn hình nhập token.

**Acceptance Scenarios**:

1. **Given** bản server đã triển khai và người dùng chưa đăng nhập, **When** mở ứng dụng, **Then** chỉ thấy màn hình đăng nhập bằng GitHub, không thấy dữ liệu repo nào.
2. **Given** người dùng đăng nhập bản server bằng tài khoản GitHub của mình, **When** xem danh sách repo, **Then** chỉ thấy những repo tài khoản đó có quyền đọc.
3. **Given** hai người dùng có quyền khác nhau cùng dùng một bản server, **When** mỗi người duyệt một cổng, **Then** mỗi phê duyệt ghi đúng tên người bấm, và không ai thấy repo mà mình không có quyền.
4. **Given** người dùng chạy ứng dụng trên máy mình với token đã khai báo trong cấu hình cục bộ, **When** mở ứng dụng, **Then** vào thẳng danh sách repo của token đó.
5. **Given** người dùng đang đăng nhập bản server, **When** bấm đăng xuất, **Then** phiên kết thúc và mọi dữ liệu repo biến khỏi màn hình.

---

### Edge Cases

- Người dùng có quyền với rất nhiều repo (hàng trăm): danh sách vẫn mở trong thời gian của SC-002; việc kiểm tra repo nào là dự án Spec Kit không được chặn người dùng chọn repo.
- Một repo bị thu hồi quyền hoặc bị xoá sau khi đã ghim hoặc đã mở: ứng dụng báo repo không còn truy cập được, bỏ nó khỏi danh sách đang dùng, và không làm hỏng các repo khác.
- Repo là submodule của một dự án khác (ví dụ tohong-back) và không có Spec Kit: hiện là repo thường, không đánh dấu là dự án.
- Người dùng có quyền đọc nhưng không có quyền ghi issue ở một repo: vẫn xem được dự án; cổng duyệt báo thiếu quyền ở riêng repo đó.
- Hai repo có spec cùng số và cùng tên (ví dụ cả hai có `001-…`): dữ liệu và phê duyệt của chúng không bị lẫn.
- Người dùng mở trang bằng liên kết tới một repo cụ thể: ứng dụng mở thẳng repo đó nếu người dùng có quyền; nếu chưa đăng nhập (bản server) thì đăng nhập xong mới mở.
- Phiên đăng nhập bản server hết hạn, hoặc người dùng thu hồi quyền của ứng dụng trên GitHub: ứng dụng đưa về màn hình đăng nhập, không hiển thị dữ liệu cũ.
- Tổ chức bắt buộc đăng nhập một lần (SSO, ví dụ qua Okta): đăng nhập bản server đi qua bước SSO đó; repo của tổ chức chỉ hiện khi quyền đã được cấp cho tổ chức.
- Chạy local mà cấu hình cục bộ không có token, hoặc token sai: ứng dụng báo rõ cần khai báo token ở đâu, không hiển thị lỗi khó hiểu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ứng dụng MUST liệt kê các repo mà người dùng hiện tại có quyền đọc.
- **FR-002**: Ứng dụng MUST đánh dấu repo nào là dự án Spec Kit, và mặc định ưu tiên các repo này trong danh sách.
- **FR-003**: Người dùng MUST mở được bất kỳ repo nào trong danh sách mà không phải nhập lại thông tin đăng nhập.
- **FR-004**: Người dùng MUST chuyển được sang repo khác từ màn hình làm việc, không cần ngắt kết nối hay đăng nhập lại.
- **FR-005**: Khi quay lại một repo đã mở trong cùng phiên, ứng dụng MUST mở lại spec và bước đã xem gần nhất ở repo đó.
- **FR-006**: Dữ liệu của mỗi repo (spec, phê duyệt, PR, lịch sử Copilot) MUST tách biệt; không được hiển thị dữ liệu của repo này khi đang ở repo khác.
- **FR-007**: Người dùng MUST vẫn nhập được tên repo bằng tay, cho những repo không có trong danh sách hoặc khi danh sách trống.
- **FR-008**: Mỗi repo MUST có địa chỉ riêng để mở thẳng (dùng để đánh dấu trang hoặc chia sẻ trong nhóm); địa chỉ này KHÔNG được chứa token hay khoá nào.
- **FR-009**: Phê duyệt cổng MUST được ghi vào đúng repo đang mở, với danh nghĩa người dùng hiện tại.
- **FR-010**: Người dùng MUST tìm được repo theo tên khi danh sách dài.
- **FR-011**: Người dùng MUST ghim và bỏ ghim được repo; danh sách ghim được nhớ cho người dùng đó trên thiết bị đang dùng.
- **FR-012**: Khi một repo không còn truy cập được, ứng dụng MUST báo rõ và tiếp tục hoạt động với các repo khác.
- **FR-013**: Tính năng MUST áp dụng cho mọi chế độ chạy thật (bản Pages, bản server, chạy local), và ở mọi chế độ, danh sách repo cùng mọi thao tác đọc và ghi MUST dùng quyền GitHub của chính người dùng hiện tại.
- **FR-014**: Bản server MUST bắt người dùng đăng nhập bằng tài khoản GitHub trước khi hiển thị bất kỳ dữ liệu repo nào, và MUST không dùng một token chung cho mọi người dùng.
- **FR-015**: Ở bản server, quyền GitHub của người dùng MUST chỉ nằm ở phía server; trình duyệt KHÔNG được nhận token đó.
- **FR-016**: Chạy local, ứng dụng MUST dùng token người dùng khai báo trong cấu hình cục bộ không được đưa vào git, và MUST báo rõ cách khai báo khi thiếu hoặc sai.
- **FR-017**: Người dùng MUST đăng xuất (bản server) hoặc ngắt kết nối (bản Pages) được; sau đó MUST không còn dữ liệu repo nào hiển thị và quyền của phiên không còn dùng được.
- **FR-018**: Màn hình tổng quan MUST hiển thị việc cần làm tiếp theo (lệnh cần chạy, cổng chờ duyệt) của mọi repo đã ghim, nhóm theo repo, và mỗi mục MUST mở đúng repo, spec và bước khi được chọn.
- **FR-019**: Lỗi đọc một repo trên màn hình tổng quan MUST chỉ ảnh hưởng mục của repo đó.

### Key Entities

- **Người dùng hiện tại**: người đang dùng ứng dụng, được nhận diện qua token họ nhập (Pages), lượt đăng nhập GitHub (server) hoặc cấu hình cục bộ (local). Quyền của họ quyết định mọi thứ họ thấy và làm được.
- **Repo được phép**: một repo người dùng hiện tại có quyền đọc. Thuộc tính: chủ sở hữu, tên, riêng tư hay công khai, có phải dự án Spec Kit, đã ghim hay chưa.
- **Repo đang mở**: repo người dùng đang làm việc, cùng spec và bước đã xem gần nhất ở repo đó.
- **Phiên**: khoảng thời gian từ khi người dùng được nhận diện tới khi đăng xuất, ngắt kết nối hay hết hạn. Một phiên dùng chung cho mọi repo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng mở được repo thứ hai trong vòng 10 giây kể từ khi bấm chọn, không phải đăng nhập hay nhập token lại.
- **SC-002**: Với người dùng có quyền trên 200 repo, danh sách repo hiện ra trong vòng 5 giây.
- **SC-003**: Trong 100% lần chuyển repo, không có dữ liệu nào của repo trước còn hiển thị ở repo mới.
- **SC-004**: Quay lại một repo đã mở, người dùng thấy đúng spec và bước đã xem trước đó trong 100% lần thử.
- **SC-005**: Màn hình tổng quan với 5 repo đã ghim hiển thị đầy đủ trong vòng 10 giây.
- **SC-006**: Ở bản server, 0 trường hợp người dùng thấy repo mà tài khoản GitHub của họ không có quyền đọc, kiểm tra với ít nhất 2 tài khoản có quyền khác nhau.
- **SC-007**: Người mới dùng chọn đúng repo dự án mình cần ngay lần đầu, không cần gõ tên repo, trong ít nhất 9/10 lần thử.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): bản Pages, bản server và chạy local. Chế độ demo không đổi.
- **Theo constitution, đây là thay đổi phải đi đủ quy trình Spec Kit**: đổi cách giữ khoá ở bản server (nguyên tắc II), thêm cách đăng nhập mới, và ảnh hưởng nhiều chế độ.
- Bản server cần người vận hành đăng ký sẵn một ứng dụng đăng nhập GitHub cho tổ chức. Đây là cấu hình một lần, không phải việc của từng người dùng.
- Cấu hình hiện tại cố định một repo cho bản server được giữ lại làm repo mở mặc định, không còn là giới hạn.
- Chạy local bắt buộc có token của người dùng (FR-016). Bản server không còn đọc repo public khi không có token như trước: mọi lần đọc đều theo quyền của một người dùng cụ thể (FR-013).
- Repo "là dự án Spec Kit" khi có cấu hình Spec Kit ở gốc repo.
- Thiết bị chỉ ghi nhớ danh sách ghim và repo mở gần nhất; không có dữ liệu repo nào được lưu lâu dài trên thiết bị.
- Khoá Copilot (nếu có) dùng chung cho mọi repo trong phiên.
- Repo nằm trên GitHub.com, bao gồm GitHub Enterprise Cloud (có thể kèm SSO qua nhà cung cấp danh tính như Okta).

## Non-Goals

- Không gộp nhiều repo thành một dự án (ví dụ spec nằm ở nhiều repo).
- Không dùng nhiều tài khoản GitHub khác nhau trong cùng một phiên.
- Không có màn hình tổng quan cho mọi repo được phép, chỉ cho các repo đã ghim.
- Không thay đổi định dạng issue theo dõi hay cách suy ra trạng thái các bước.
- Không hỗ trợ GitHub Enterprise Server trong spec này.
- Không thay đổi chế độ demo.
