# Feature Specification: Chú thích (annotation) trên tài liệu của spec

**Feature Branch**: `feat/009-spec-annotations`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "thêm chức năng annotation, 1. highlight: user có thể highligh và commentt cho đoạn đó. 2. data annotation, được lưu cùng user - spec - content được highlight."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Highlight một đoạn và thêm comment (Priority: P1)

Người dùng đang đọc tài liệu của một spec trong speckit-ui (spec, plan, tasks, analysis và các tài liệu khác của spec). Họ bôi đen một đoạn chữ và chọn thêm chú thích. Đoạn đó được tô nổi bật, và họ có thể viết một comment cho đoạn đó, ví dụ "chỗ này mơ hồ, cần nêu rõ giới hạn". Sau khi lưu, đoạn được highlight vẫn nổi bật khi họ cuộn, chuyển bước hoặc tải lại trang, và comment xem lại được bằng cách chọn đoạn đó.

**Why this priority**: Đây là yêu cầu cốt lõi: không có highlight kèm comment thì không có gì để lưu hay xem lại. Người duyệt cổng cần một cách gắn nhận xét vào đúng chỗ trong spec thay vì ghi ra chỗ khác.

**Independent Test**: Mở một spec, bôi đen một câu, thêm comment và lưu. Đoạn đó được tô nổi bật, chọn nó thì thấy comment, tải lại trang vẫn thấy lại.

**Acceptance Scenarios**:

1. **Given** người dùng đang xem một tài liệu của spec, **When** họ chọn một đoạn chữ, **Then** có một thao tác rõ ràng để thêm chú thích cho đoạn đó.
2. **Given** họ viết comment và lưu, **When** việc lưu hoàn tất, **Then** đoạn chữ được tô nổi bật và chọn vào nó thì hiện comment, tên người tạo và thời điểm tạo.
3. **Given** họ chọn một đoạn và lưu mà không viết comment, **When** việc lưu hoàn tất, **Then** đoạn vẫn được highlight (chú thích không có comment).
4. **Given** chú thích đã lưu, **When** người dùng tải lại trang hoặc mở lại spec ở lần khác, **Then** chú thích vẫn nằm đúng đoạn cũ.
5. **Given** người dùng dùng điện thoại hoặc chỉ dùng bàn phím, **When** họ muốn thêm chú thích, **Then** họ chọn đoạn chữ bằng thao tác chạm hoặc bàn phím và vẫn thêm được.

---

### User Story 2 - Chú thích được lưu cùng người tạo, spec và nội dung được highlight (Priority: P1)

Mỗi chú thích là một bản ghi dữ liệu gắn chặt với ba thứ: **người tạo**, **spec** và **nội dung đoạn được highlight**. Từ bản ghi, biết được ai ghi nhận xét này, cho spec nào, tài liệu nào, về đoạn chữ nào (nguyên văn), comment là gì và khi nào. Dữ liệu này dùng được lại: xem danh sách chú thích của một spec, nhìn đoạn gốc ngay cả khi tài liệu đã đổi, và biết đúng tác giả.

**Why this priority**: Đây là nửa thứ hai của yêu cầu. Nếu bản ghi không mang theo cả người, spec và đoạn chữ thì không thể tra cứu theo người hay theo spec, và không thể đối chiếu khi tài liệu thay đổi.

**Independent Test**: Tạo hai chú thích bằng hai tài khoản trên hai spec khác nhau. Mỗi bản ghi nêu đúng tài khoản, đúng spec, đúng đoạn chữ nguyên văn và đúng comment, và không lẫn sang bản ghi kia.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập tạo chú thích, **When** xem lại bản ghi, **Then** nó nêu đúng người tạo (tài khoản GitHub), đúng spec, đúng tài liệu, nguyên văn đoạn được highlight, comment, thời điểm tạo và thời điểm sửa gần nhất.
2. **Given** hai spec cùng có một câu giống hệt nhau, **When** người dùng chú thích câu đó ở spec A, **Then** spec B không hiện highlight đó.
3. **Given** một spec có chú thích từ nhiều người, **When** xem danh sách chú thích của spec, **Then** mỗi mục nêu người tạo, đoạn chữ và comment, và người dùng lọc được theo người tạo.
4. **Given** người dùng ở chế độ cục bộ (không có tài khoản GitHub), **When** tạo chú thích, **Then** bản ghi nêu rõ đó là chú thích cục bộ, không gắn với tài khoản GitHub nào.
5. **Given** chú thích đã lưu, **When** người dùng mở lại spec, **Then** họ thấy lại chú thích theo đúng phạm vi lưu trữ và chia sẻ đã chọn ở FR-004 (riêng một người hay cả nhóm).

---

### User Story 3 - Xem danh sách, sửa và xoá chú thích của mình (Priority: P2)

Người dùng cần một nơi xem mọi chú thích của spec đang mở, chọn một mục để nhảy tới đúng đoạn, và sửa hoặc xoá chú thích do chính mình tạo. Chú thích của người khác chỉ xem được, không sửa hoặc xoá được.

**Why this priority**: Nhiều chú thích sẽ khó dùng nếu không có danh sách, và người dùng phải sửa được nhầm lẫn. Nhưng nó không cản việc tạo và lưu ở P1.

**Independent Test**: Tạo ba chú thích ở các tài liệu khác nhau của một spec. Danh sách liệt kê đủ ba mục, chọn từng mục thì tới đúng đoạn, sửa comment của một mục thì danh sách và đoạn đều hiện bản mới, xoá một mục thì highlight biến mất.

**Acceptance Scenarios**:

1. **Given** spec có nhiều chú thích, **When** người dùng mở danh sách, **Then** thấy mọi chú thích của spec, nhóm theo tài liệu, kèm số lượng.
2. **Given** một mục trong danh sách, **When** người dùng chọn nó, **Then** màn hình mở đúng tài liệu và cuộn tới đoạn được highlight.
3. **Given** chú thích do chính họ tạo, **When** họ sửa comment hoặc xoá, **Then** thay đổi áp dụng ngay và lưu lại.
4. **Given** chú thích do người khác tạo, **When** người dùng xem, **Then** không có thao tác sửa hay xoá.
5. **Given** thao tác xoá, **When** người dùng chọn xoá, **Then** có bước xác nhận trước khi chú thích mất.

---

### User Story 4 - Chú thích còn đúng khi tài liệu đổi (Priority: P3)

Tài liệu của spec đổi sau khi đã có chú thích (ví dụ spec được sửa sau clarify). Chú thích không được biến mất hay trỏ sai chỗ: nếu đoạn chữ vẫn còn thì chú thích vẫn gắn vào đó, nếu đoạn đã đổi hoặc không còn thì chú thích hiện là "đoạn đã đổi" cùng nội dung cũ và comment, để người dùng vẫn đọc được nhận xét.

**Why this priority**: Spec thay đổi liên tục qua các bước, nên điều này quan trọng, nhưng có thể làm sau khi tạo và lưu đã chạy.

**Independent Test**: Chú thích một câu, rồi đổi câu đó trong tài liệu. Chú thích hiện "đoạn đã đổi" với nguyên văn cũ. Đưa câu về như cũ thì chú thích gắn lại đúng chỗ.

**Acceptance Scenarios**:

1. **Given** đoạn được highlight vẫn còn nguyên trong tài liệu sau khi tài liệu đổi chỗ khác, **When** người dùng mở lại, **Then** chú thích vẫn gắn vào đúng đoạn đó.
2. **Given** đoạn được highlight đã bị sửa hoặc xoá, **When** người dùng mở lại, **Then** chú thích không hiện trên văn bản, nhưng vẫn có trong danh sách với nhãn "đoạn đã đổi", nguyên văn cũ và comment.
3. **Given** đoạn chữ xuất hiện nhiều lần trong một tài liệu, **When** người dùng chú thích một lần xuất hiện, **Then** highlight gắn vào đúng lần xuất hiện đó, không gắn sang các lần khác.

---

### Edge Cases

- Người dùng chọn đoạn chữ trải qua nhiều đoạn văn, tiêu đề, danh sách hoặc bảng: chú thích vẫn tạo được nếu nội dung chọn là văn bản liên tục, hoặc người dùng được báo lý do không tạo được và cách chọn lại.
- Chọn đoạn quá ngắn (một ký tự) hoặc chỉ là khoảng trắng: không tạo chú thích.
- Hai chú thích chồng lên nhau hoặc lồng nhau trên cùng một đoạn: cả hai vẫn chọn và xem được.
- Comment dài hoặc chứa ký tự đặc biệt, đoạn chữ có dấu nhắc mã hoặc ký hiệu markdown: lưu và hiện đúng như người dùng gõ, không bị hiểu thành định dạng hay mã HTML.
- Tài liệu chưa có chú thích nào: không hiện gì thừa, danh sách nói rõ "Chưa có chú thích".
- Người dùng chuyển spec hoặc nhánh khi đang soạn comment chưa lưu: nháp không bị mất âm thầm và không bị lưu nhầm sang spec khác.
- Không lưu được chú thích (mất mạng, bị từ chối quyền, hết dung lượng): người dùng được báo rõ, comment đang soạn vẫn còn để thử lại, không có chú thích "nửa vời" xuất hiện.
- Hai người cùng sửa một chú thích hoặc cùng tạo trong lúc mất đồng bộ: không có chú thích nào bị mất hoặc nhân đôi âm thầm.
- Spec có hàng trăm chú thích: danh sách và highlight vẫn dùng mượt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Người dùng MUST chọn được một đoạn chữ trong tài liệu hiển thị của một spec và tạo chú thích cho đoạn đó gồm highlight và comment; comment là tuỳ chọn.
- **FR-002**: Đoạn có chú thích MUST được tô nổi bật nhất quán trong tài liệu, và người dùng MUST xem được comment, người tạo và thời điểm của chú thích bằng cách chọn đoạn đó (bằng chuột, chạm hoặc bàn phím).
- **FR-003**: Mỗi chú thích MUST được lưu thành một bản ghi gồm: người tạo, spec, tài liệu chứa đoạn, nguyên văn đoạn được highlight cùng đủ ngữ cảnh quanh nó để tìm lại, comment, thời điểm tạo và thời điểm sửa gần nhất.
- **FR-004**: Chú thích đã lưu MUST còn sau khi tải lại trang hoặc mở lại spec ở lần khác, trong đúng phạm vi lưu trữ đã chọn: [NEEDS CLARIFICATION: phạm vi lưu trữ và chia sẻ, xem câu hỏi ở User Story 2].
- **FR-005**: Chú thích của spec này MUST không bao giờ hiện ở spec khác, kể cả khi đoạn chữ giống hệt.
- **FR-006**: Người dùng MUST xem được danh sách chú thích của spec đang mở, lọc được theo người tạo và theo tài liệu, và chọn một mục thì MUST tới đúng đoạn trong tài liệu.
- **FR-007**: Người tạo MUST sửa được comment và xoá được chú thích của mình; xoá MUST có bước xác nhận. Người dùng khác MUST không sửa hoặc xoá được chú thích đó.
- **FR-008**: Khi tài liệu đổi, chú thích MUST gắn lại vào đoạn nếu tìm thấy đoạn đó; nếu không tìm thấy, chú thích MUST được giữ cùng nguyên văn cũ và comment, và MUST được đánh dấu "đoạn đã đổi" trong danh sách, không bị xoá hay gắn sai.
- **FR-009**: Nguyên văn đoạn chữ và comment MUST được hiển thị như văn bản thuần: không bao giờ được hiểu thành HTML, mã hay định dạng (nguyên tắc II của constitution).
- **FR-010**: Chú thích MUST không ảnh hưởng tới cổng duyệt: chú thích còn mở không chặn và không tự duyệt cổng nào, chỉ có tính thông tin.
- **FR-011**: Tạo, xem, sửa và xoá chú thích MUST dùng được ở bề rộng điện thoại và bằng bàn phím, và mọi nút MUST có nhãn cho trình đọc màn hình (nguyên tắc IV).
- **FR-012**: Khi không lưu được, hệ thống MUST báo rõ cho người dùng, giữ comment đang soạn và MUST không tạo chú thích không đầy đủ.
- **FR-013**: Comment MUST có giới hạn độ dài hợp lý (2.000 ký tự); vượt giới hạn thì người dùng được báo trước khi lưu.
- **FR-014**: Chế độ demo MUST không đổi so với bản thiết kế (giống từng pixel ở bề rộng máy tính, nguyên tắc IV); chú thích hoạt động ở bản có server, bản Pages và chế độ cục bộ.
- **FR-015**: Trong chế độ cục bộ (chỉ đọc, không có tài khoản), người dùng vẫn tạo được chú thích; chúng không ghi vào thư mục repo của người dùng và không gắn với tài khoản GitHub.

### Key Entities *(include if feature involves data)*

- **Chú thích (annotation)**: một bản ghi có mã nhận diện, người tạo, spec, tài liệu, đoạn được highlight (neo), comment tuỳ chọn, thời điểm tạo và sửa, và trạng thái gắn (còn gắn hay "đoạn đã đổi").
- **Neo (anchor)**: nguyên văn đoạn được highlight, ngữ cảnh ngay trước và sau nó, và phiên bản của tài liệu lúc tạo; dùng để tìm lại đoạn khi tài liệu đổi và phân biệt các lần xuất hiện của cùng một câu.
- **Người tạo**: tài khoản GitHub đang đăng nhập, hoặc "cục bộ" khi không có tài khoản.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng tạo được một chú thích (chọn đoạn, viết comment, lưu) trong tối đa 3 thao tác và dưới 15 giây, ở cả máy tính và điện thoại.
- **SC-002**: 100% chú thích đã lưu hiện lại đúng đoạn cũ sau khi tải lại trang, trong phạm vi lưu trữ đã chọn.
- **SC-003**: Khi tài liệu đổi, 0 chú thích bị mất: mỗi chú thích hoặc gắn lại đúng đoạn, hoặc hiện là "đoạn đã đổi" kèm nguyên văn cũ và comment.
- **SC-004**: 0 chú thích hiện ở spec không phải spec của nó, và 0 chú thích của người này sửa hoặc xoá được bởi người khác.
- **SC-005**: Với 200 chú thích trong một spec, mở một tài liệu và chuyển bước vẫn hiện highlight trong dưới 1 giây.
- **SC-006**: Ở bề rộng 390px, người dùng tạo, xem, sửa và xoá được một chú thích mà không phải kéo ngang trang.

## Assumptions

- **Tài liệu hỗ trợ:** mọi tài liệu markdown của spec mà speckit-ui đã hiển thị (spec, plan, research, data-model, quickstart, tasks, analysis, checklist và constitution của dự án). Ảnh và sơ đồ nằm ngoài phạm vi.
- **Danh tính:** "user" là tài khoản GitHub đang đăng nhập (bản server và bản Pages), lấy từ phiên hiện có. Chế độ cục bộ không có tài khoản, nên người tạo ghi là "cục bộ".
- **Chế độ bị ảnh hưởng** (nguyên tắc III): bản server, bản Pages và chế độ cục bộ. Chế độ demo không đổi (FR-014).
- **Quyền:** ưu tiên không thêm quyền token mới. Nếu cách lưu được chọn ở User Story 2 cần quyền ghi mới, spec và plan phải nêu rõ quyền đó (nguyên tắc II).
- **Quy trình:** việc lưu chú thích là một loại ghi mới của ứng dụng. Nếu nó ghi ra ngoài trình duyệt (GitHub hoặc nơi khác), thay đổi này phải đi đủ quy trình Spec Kit và có bước xác nhận rõ ràng trong giao diện trước khi ghi (nguyên tắc I).
- **Neo bằng nội dung:** chú thích tìm lại đoạn bằng nguyên văn và ngữ cảnh quanh nó, không bằng số dòng, để chịu được việc tài liệu đổi.
- **Comment tuỳ chọn:** một highlight không có comment là hợp lệ.

## Non-Goals

- Không có luồng trả lời (thread), không nhắc tên (@mention), không thông báo qua email hay đẩy.
- Chú thích không chặn, không tự duyệt và không thay thế cổng duyệt hay "Request changes".
- Không chú thích trên ảnh, sơ đồ hoặc code đang xem ngoài các tài liệu markdown của spec.
- Không sửa nội dung tài liệu của spec từ chú thích.
- Không đồng bộ chú thích với công cụ ngoài (Slack, Jira, ...).
