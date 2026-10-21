# Feature Specification: Nhận xét trên tài liệu spec

**Feature Branch**: `feat/007-document-comments`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "hãy tham chiếu để xây tính năng comment trong app." (tham chiếu: 4 ảnh chụp luồng nhận xét kiểu Google Docs gồm chọn đoạn chữ → nút "Thêm nhận xét" → hộp soạn với nút Hủy / Nhận xét → thẻ nhận xét ở thanh bên → trả lời và thả emoji → "Đánh dấu là đã giải quyết và ẩn cuộc thảo luận")

## Clarifications

### Session 2026-10-21

- Q1: Nhận xét được lưu ở đâu, và ai thấy? → [NEEDS CLARIFICATION: xem câu hỏi 1]
- Q2: Nhận xét áp dụng cho tài liệu nào? → [NEEDS CLARIFICATION: xem câu hỏi 2]

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nhận xét trên một đoạn chữ của spec (Priority: P1)

Người duyệt đang đọc một tài liệu của spec trong speckit-ui (ví dụ `spec.md` hay `plan.md`) trước khi duyệt cổng. Họ bôi chọn một đoạn chữ. Cạnh đoạn chọn hiện nút **Thêm nhận xét**. Bấm vào, một hộp soạn hiện ở thanh bên, ghi tên người dùng hiện tại, có ô nhập và hai nút **Hủy** / **Nhận xét**. Gửi xong, nhận xét thành một thẻ ở thanh bên (tên người viết, giờ viết, nội dung) và đoạn chữ được tô nổi bật trong tài liệu.

**Why this priority**: Không có nhận xét gắn vào đúng đoạn chữ thì người duyệt phải chép đoạn đó sang chỗ khác để góp ý. Đây là nhịp cốt lõi của các ảnh tham chiếu.

**Independent Test**: Mở một tài liệu spec, bôi chọn một câu, bấm Thêm nhận xét, gõ nội dung, bấm Nhận xét. Thẻ nhận xét xuất hiện ở thanh bên và đoạn chữ được tô nổi bật. Bấm Hủy thì không có gì được tạo.

**Acceptance Scenarios**:

1. **Given** người dùng đang xem một tài liệu spec, **When** họ bôi chọn một đoạn chữ, **Then** nút Thêm nhận xét hiện cạnh đoạn chọn, có nhãn cho người dùng bàn phím và trình đọc màn hình.
2. **Given** hộp soạn đang mở, **When** người dùng bấm Hủy hoặc bỏ chọn mà chưa gửi, **Then** không có nhận xét nào được tạo và đoạn chữ trở lại bình thường.
3. **Given** hộp soạn có nội dung, **When** người dùng bấm Nhận xét, **Then** thẻ nhận xét hiện ở thanh bên với tên và giờ, đoạn chữ được tô nổi bật.
4. **Given** hộp soạn để trống, **When** người dùng bấm Nhận xét, **Then** không gửi gì và hộp soạn nhắc cần nhập nội dung.
5. **Given** tài liệu có nhận xét, **When** người dùng bấm vào đoạn chữ được tô, **Then** thẻ tương ứng ở thanh bên được chọn và cuộn tới; bấm vào thẻ thì đoạn chữ tương ứng được cuộn tới và nhấn mạnh.

---

### User Story 2 - Trả lời và thả cảm xúc (Priority: P2)

Người khác (hoặc chính người viết) mở thẻ nhận xét và trả lời. Các trả lời xếp theo thời gian dưới nhận xét gốc, mỗi trả lời có tên, giờ, nội dung. Dưới mỗi nhận xét hoặc trả lời, người dùng thả một emoji; emoji hiện kèm số người đã thả.

**Why this priority**: Biến nhận xét một chiều thành một cuộc thảo luận. Không cần cho phần hữu ích tối thiểu, nên đứng sau US1.

**Independent Test**: Trên một nhận xét có sẵn, gửi hai trả lời rồi thả hai emoji khác nhau. Cả hai trả lời hiện đúng thứ tự, mỗi emoji hiện số 1.

**Acceptance Scenarios**:

1. **Given** một nhận xét, **When** người dùng gõ và gửi một trả lời, **Then** trả lời hiện dưới nhận xét gốc với tên và giờ.
2. **Given** một nhận xét hoặc trả lời, **When** người dùng chọn một emoji, **Then** emoji hiện kèm số 1.
3. **Given** người dùng đã thả một emoji, **When** họ bấm lại đúng emoji đó, **Then** emoji bị gỡ và số giảm tương ứng.
4. **Given** nhận xét do chính người dùng viết, **When** họ mở menu thêm (ba chấm), **Then** họ sửa hoặc xoá được nhận xét của mình; người khác không thấy các lựa chọn này.

---

### User Story 3 - Đánh dấu đã giải quyết và ẩn (Priority: P2)

Khi góp ý đã được xử lý, người dùng bấm nút dấu tick có chú thích **Đánh dấu là đã giải quyết và ẩn cuộc thảo luận**. Cuộc thảo luận bị ẩn khỏi thanh bên và đoạn chữ hết nổi bật. Người dùng vẫn xem lại được các cuộc thảo luận đã giải quyết và mở lại khi cần.

**Why this priority**: Giữ thanh bên gọn khi spec đi qua nhiều vòng sửa, và cho biết còn bao nhiêu góp ý chưa xử lý trước khi duyệt cổng.

**Independent Test**: Giải quyết một cuộc thảo luận. Nó biến khỏi danh sách đang mở, đoạn chữ hết tô, và còn trong mục đã giải quyết. Mở lại thì nó trở về danh sách đang mở.

**Acceptance Scenarios**:

1. **Given** một cuộc thảo luận đang mở, **When** người dùng bấm dấu tick, **Then** cuộc thảo luận ẩn khỏi danh sách đang mở và đoạn chữ không còn nổi bật.
2. **Given** có cuộc thảo luận đã giải quyết, **When** người dùng chọn xem các cuộc thảo luận đã giải quyết, **Then** họ thấy chúng kèm người giải quyết và giờ giải quyết, và mở lại được.
3. **Given** cổng đang được duyệt, **When** còn cuộc thảo luận chưa giải quyết trên tài liệu của cổng đó, **Then** màn hình duyệt hiện số nhận xét còn mở. Con số này chỉ là thông tin, không chặn việc duyệt.

---

### Edge Cases

- **Tài liệu đổi sau khi đã nhận xét** (đoạn chữ được sửa hoặc xoá ở commit mới): nhận xét không được mất. Nó hiện ở thanh bên với đoạn trích gốc và nhãn "đoạn chữ đã thay đổi", không tô nổi bật nơi nào.
- **Chọn đoạn chữ trải qua nhiều đoạn, tiêu đề hoặc bảng:** vẫn nhận xét được; đoạn tô nổi bật phủ đúng phần đã chọn.
- **Hai nhận xét chồng lên nhau trên cùng một đoạn chữ:** cả hai đều hiện ở thanh bên và đều chọn được.
- **Người dùng chưa đăng nhập, hoặc token chỉ có quyền đọc:** không thêm được nhận xét; nút Thêm nhận xét báo rõ lý do thay vì lỗi trống.
- **Mất mạng hoặc GitHub từ chối lúc gửi:** nội dung đã gõ được giữ nguyên trong hộp soạn kèm thông báo lỗi để thử lại, không bị mất.
- **Nội dung nhận xét có HTML, script hay liên kết lạ:** hiển thị là chữ thường, không bao giờ thực thi (constitution II).
- **Màn hình hẹp (điện thoại):** thanh bên thành ngăn kéo hoặc khối dưới tài liệu; bôi chọn chữ và gửi nhận xét vẫn dùng được (constitution IV).
- **Bàn phím và trình đọc màn hình:** thêm, trả lời, thả emoji, giải quyết đều làm được không cần chuột.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Người dùng MUST bôi chọn được một đoạn chữ trong tài liệu spec và thấy lựa chọn Thêm nhận xét cạnh đoạn chọn.
- **FR-002**: Hộp soạn MUST hiện tên người dùng hiện tại, ô nhập, nút Hủy và nút Nhận xét; Nhận xét MUST không gửi khi nội dung trống.
- **FR-003**: Nhận xét đã gửi MUST hiện ở thanh bên với tên người viết, giờ viết và nội dung, và đoạn chữ được gắn MUST được tô nổi bật trong tài liệu.
- **FR-004**: Đoạn chữ tô và thẻ nhận xét MUST liên kết hai chiều: chọn bên này thì bên kia được cuộn tới và nhấn mạnh.
- **FR-005**: Người dùng MUST trả lời được một nhận xét; các trả lời MUST xếp theo thời gian dưới nhận xét gốc.
- **FR-006**: Người dùng MUST thả và gỡ được một emoji trên nhận xét hoặc trả lời; mỗi emoji MUST hiện số người đã thả, và mỗi người chỉ thả mỗi emoji một lần.
- **FR-007**: Người viết MUST sửa và xoá được nhận xét hoặc trả lời của chính mình; người khác MUST không làm được.
- **FR-008**: Người dùng MUST đánh dấu được một cuộc thảo luận là đã giải quyết (ẩn khỏi danh sách đang mở, hết tô nổi bật), xem lại danh sách đã giải quyết, và mở lại. Mỗi lần giải quyết hoặc mở lại MUST ghi người làm và giờ.
- **FR-009**: Khi đoạn chữ được gắn không còn tìm thấy trong phiên bản tài liệu hiện tại, nhận xét MUST vẫn hiện ở thanh bên kèm đoạn trích gốc và nhãn đã thay đổi; MUST không bị xoá hay ẩn ngầm.
- **FR-010**: Màn hình duyệt cổng MUST hiện số cuộc thảo luận còn mở của các tài liệu thuộc cổng đó; con số này MUST không tự chặn hay tự duyệt cổng (constitution VI).
- **FR-011**: Nội dung nhận xét MUST được hiển thị như chữ thường, không bao giờ như HTML hay script (constitution II).
- **FR-012**: Nhận xét MUST dùng quyền GitHub của chính người dùng hiện tại; nếu người dùng không đủ quyền, ứng dụng MUST nói rõ thiếu quyền gì và không thử ghi (constitution II, và quyền cần thêm PHẢI nêu trong spec).
- **FR-013**: Trước lần gửi nhận xét đầu tiên trong một phiên, giao diện MUST cho người dùng biết nhận xét sẽ được lưu ở đâu và ai thấy được nó (constitution I: loại ghi mới phải có bước xác nhận rõ ràng).
- **FR-014**: Tính năng MUST dùng được ở cả hai chế độ thật (server và tĩnh) với cùng ngữ nghĩa, và MUST có bản chạy trong chế độ demo trên dữ liệu mẫu, không ghi ra ngoài (constitution III).
- **FR-015**: Nơi lưu nhận xét MUST là [NEEDS CLARIFICATION: Q1, xem phần câu hỏi cuối tài liệu] .
- **FR-016**: Tính năng MUST áp dụng cho [NEEDS CLARIFICATION: Q2, xem phần câu hỏi cuối tài liệu] .

### Key Entities *(include if feature involves data)*

- **Nhận xét (comment thread)**: một cuộc thảo luận gắn với một đoạn chữ của một tài liệu ở một phiên bản (commit) cụ thể. Có: đoạn trích gốc, vị trí gắn, người mở, giờ mở, trạng thái (đang mở / đã giải quyết), người và giờ giải quyết.
- **Trả lời (reply)**: một tin trong cuộc thảo luận. Có: người viết, giờ viết, nội dung, có thể đã sửa.
- **Cảm xúc (reaction)**: một emoji do một người thả trên nhận xét hoặc trả lời. Có: loại emoji, người thả.
- **Neo (anchor)**: đoạn trích và ngữ cảnh quanh nó, dùng để tìm lại đoạn chữ khi tài liệu thay đổi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người duyệt thêm được một nhận xét lên đoạn chữ đã chọn trong không quá 4 thao tác (chọn, bấm Thêm nhận xét, gõ, bấm Nhận xét), và thấy nó trong dưới 3 giây sau khi gửi.
- **SC-002**: Trong 100% trường hợp thử với bộ tài liệu mẫu, nhận xét hiện đúng đoạn chữ khi tải lại trang; khi tài liệu đã đổi, 0 nhận xét bị mất (hoặc gắn lại đúng, hoặc hiện nhãn đã thay đổi).
- **SC-003**: Người dùng mới hoàn thành chuỗi chọn chữ → nhận xét → trả lời → giải quyết ở lần thử đầu tiên mà không cần hướng dẫn, trong dưới 2 phút.
- **SC-004**: Toàn bộ luồng (thêm, trả lời, thả emoji, giải quyết, mở lại) làm được chỉ bằng bàn phím, và dùng được ở bề rộng 375 px.
- **SC-005**: 0 lần khoá hoặc token xuất hiện trong repo, log, URL hay nội dung nhận xét trong các bài kiểm thử; 0 lần ghi ra GitHub thật trong bộ test.
- **SC-006**: Màn hình demo giữ giống thiết kế từng pixel ở 1440×900 và 924×540 khi chưa có nhận xét nào.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): cả ba. Demo chạy trên nhận xét mẫu trong bộ nhớ; server và tĩnh dùng cùng logic và cùng định dạng lưu.
- **Đây là một loại ghi mới** (constitution I) và có thể thêm quyền token (constitution II). Vì vậy tính năng đi **đủ quy trình Spec Kit**, kèm bước xác nhận trong UI ở FR-013. Quyền cụ thể do câu trả lời Q1 quyết định và được ghi vào plan.
- **Giao diện theo ảnh tham chiếu nhưng dùng Modernist:** thanh bên bên phải tài liệu, thẻ nhận xét, hộp soạn có Hủy / Nhận xét, tooltip chú thích, theo token và class trong `src/styles/modernist.css`. Không bo góc, không thêm màu mới; màu tô nổi bật lấy từ token sẵn có.
- **Ngôn ngữ giao diện** theo ngôn ngữ đang dùng của ứng dụng; nhãn tham chiếu (Thêm nhận xét, Nhận xét, Hủy, Đánh dấu là đã giải quyết và ẩn cuộc thảo luận) dùng làm bản tiếng Việt.
- **Người dùng là người đã đăng nhập GitHub** (token Pages, đăng nhập server hoặc token cục bộ). Tên và ảnh đại diện lấy từ tài khoản GitHub đó.
- **Bộ emoji hữu hạn** (tập nhỏ như 👍 ❤️ 😍 🎉 😄 😕), không có bộ chọn emoji đầy đủ.
- **Thời gian thực không bắt buộc:** nhận xét của người khác hiện khi tải lại hoặc làm mới, không cần đẩy tức thì.

## Non-Goals

- Không phải trình soạn thảo: không sửa nội dung tài liệu spec từ ứng dụng. Spec vẫn nằm trong git (constitution I).
- Không nhắc tên (@mention), không thông báo email hay đẩy, không giao việc cho ai.
- Không đính kèm ảnh hay tệp trong nhận xét; chỉ chữ thường.
- Không có thư mục "nhận xét của tôi" xuyên nhiều spec hay nhiều repo.
- Không để nhận xét tự chặn, tự duyệt hay tự sửa cổng; AI không tự viết nhận xét (constitution VI).
- Không có database hay dịch vụ lưu trữ riêng (constitution I, VII).
- Không đồng bộ ngược nhận xét sang Google Docs hay công cụ khác.
