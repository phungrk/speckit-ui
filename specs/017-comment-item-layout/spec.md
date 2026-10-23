# Feature Specification: Bố cục mục nhận xét: emoji dưới nội dung, ba chấm và emoji hiện khi hover ở mọi thẻ

**Feature Branch**: `feat/017-comment-item-layout`

**Created**: 2026-10-22

**Status**: Clarified

**Input**: User description: "update UI comment item: đặt emoji bên dưới đoạn text comment (giống google docs); khi hover item ba chấm sẽ hiển thị cùng emoji (hiện tại thì chỉ những item nào được click vào mới hiển thị được ba chấm khi hover)"

## Bối cảnh

Sau 011, 014 và 015 (cùng bản sửa PR #41), thẻ nhận xét có emoji, trả lời, menu ba chấm và hiệu ứng hover, nhưng còn hai chỗ lệch so với Google Docs:

- Ở **thẻ đóng**, emoji chỉ hiện dạng chữ tóm tắt ở tiêu đề ("2 replies · 👍1"), không phải các viên emoji nằm dưới nội dung. Viên emoji thật chỉ có ở thẻ đang mở.
- **Nút ba chấm** (Edit/Delete) chỉ có ở thẻ đang mở. Thẻ đóng khi hover có nút emoji nhưng không có ba chấm, nên phải bấm mở thẻ rồi mới sửa hoặc xoá được.

Spec này làm hai việc: emoji luôn nằm ngay dưới nội dung của mục, và hover vào bất kỳ mục nào của mình thì ba chấm hiện cùng nút emoji, kể cả khi thẻ chưa được bấm mở.

## Clarifications

### Session 2026-10-22

- Q1: Ba chấm trên thẻ đóng hiện thế nào? → A: Phương án A, và đặt ở **ngoài cùng bên phải** của tiêu đề (sau giờ), cùng vị trí với thẻ đang mở. Thẻ đóng của mình chừa sẵn chỗ cho nút ngay cả lúc nghỉ, nên giờ dịch sang trái khoảng 32 px. Ảnh demo của thẻ đóng của mình đổi vì điều này, ghi trong PR. Người dùng sẽ **cập nhật bản thiết kế `Speckit Workspace.html`** để thẻ đóng của mình có chỗ cho ba chấm (cách 012 đã làm với rail); demo được so với bản thiết kế đã cập nhật đó (analyze C1, phương án a). Người dùng nhắc lại yêu cầu gốc: emoji đã thả dời xuống dưới đoạn text của nhận xét (US1).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Emoji nằm dưới nội dung của mục (Priority: P1)

Ở mọi thẻ (đóng hay mở), các viên emoji đã thả của nhận xét hiện thành một hàng ngay dưới đoạn nội dung nhận xét, như Google Docs; mỗi trả lời (trong thẻ mở) cũng có hàng emoji ngay dưới nội dung của nó. Tiêu đề thẻ đóng chỉ còn số trả lời, không còn chuỗi emoji tóm tắt.

**Why this priority**: Là yêu cầu chính về bố cục; cho người đọc thấy phản ứng ngay chỗ đang đọc, không cần mở thẻ.

**Independent Test**: Thả 👍 lên một nhận xét có hai trả lời rồi đóng thẻ: hàng "👍 1" hiện ngay dưới nội dung của thẻ đóng, tiêu đề chỉ ghi "2 replies"; mở thẻ: hàng emoji vẫn ngay dưới nội dung nhận xét, phía trên các trả lời.

**Acceptance Scenarios**:

1. **Given** nhận xét có emoji, **When** nhìn thẻ đóng, **Then** các viên emoji nằm trong một hàng ngay dưới nội dung, và tiêu đề không có chuỗi emoji.
2. **Given** thẻ đang mở, **When** nhìn nhận xét và các trả lời, **Then** mỗi mục có hàng emoji ngay dưới nội dung của chính nó, trước trả lời kế tiếp.
3. **Given** mục chưa có emoji, **When** nhìn, **Then** không có hàng emoji và không chừa khoảng trống thừa.
4. **Given** viên emoji ở thẻ đóng, **When** bấm viên "👍 1" mình đã thả, **Then** gỡ emoji (giống thẻ mở) mà không mở thẻ; bấm viên của người khác thì thả thêm như cũ.
5. **Given** nhiều emoji và nội dung dài, **When** xem ở sheet hẹp 390 px, **Then** hàng emoji xuống dòng gọn, không cuộn ngang, không che nội dung.
6. **Given** thả hoặc gỡ emoji, **When** thẻ đóng, **Then** chiều cao thẻ và vị trí các thẻ khác trong rail điều chỉnh ngay, không chồng lên nhau.

---

### User Story 2 - Ba chấm hiện cùng emoji khi hover ở mọi thẻ (Priority: P1)

Rê chuột (hoặc đưa tiêu điểm) vào một mục của chính mình, ở thẻ đóng cũng như thẻ mở, thì nút ba chấm hiện cùng nút emoji tròn. Nhờ vậy sửa hoặc xoá nhận xét của mình không cần bấm mở thẻ trước.

**Why this priority**: Đây là chỗ người dùng báo thiếu: hiện chỉ thẻ đã bấm mới có ba chấm.

**Independent Test**: Ở thẻ đóng của mình, rê chuột lên: ba chấm và nút emoji cùng hiện; mở menu, chọn Edit: thẻ mở và vào soạn tại chỗ; chọn Delete: hỏi xác nhận như thẻ mở.

**Acceptance Scenarios**:

1. **Given** thẻ đóng chứa nhận xét của mình, **When** rê chuột vào mục, **Then** ba chấm và nút emoji cùng hiện; rời chuột thì cùng mất (trừ khi menu hoặc bộ emoji đang mở).
2. **Given** thẻ đóng của người khác, **When** hover, **Then** chỉ có nút emoji, không có ba chấm (như 014).
3. **Given** ba chấm trên thẻ đóng, **When** chọn Edit, **Then** vào soạn tại chỗ như khi sửa ở thẻ đang mở.
4. **Given** ba chấm trên thẻ đóng, **When** chọn Delete, **Then** thẻ mở và hiện câu hỏi xác nhận như ở thẻ mở; Keep giữ nguyên, Delete xoá và nhận xét biến mất.
5. **Given** bàn phím, **When** tiêu điểm vào thẻ hoặc vào nút trong mục (cả thẻ đóng), **Then** ba chấm và nút emoji hiện như khi hover; khi thẻ đang mở các nút này vào được bằng Tab theo thứ tự hợp lý (nút của thẻ đóng không nằm trong thứ tự Tab, FR-010).
6. **Given** màn hình cảm ứng, **When** nhìn thẻ đóng, **Then** nút ba chấm (của mình) và nút emoji hiện sẵn và đạt vùng chạm 44 px, bấm vào chúng không bị tính là bấm chọn thẻ.
7. **Given** người chỉ có quyền đọc hoặc nhánh bảo vệ, **When** hover, **Then** nút emoji và các mục Edit/Delete tắt kèm lý do (như 012).

---

### Edge Cases

- **Thẻ đóng có nhiều emoji và ghi chú dài:** thẻ đóng cao hơn hiện nay vì có hàng emoji; layout của rail đo lại để các thẻ không đè nhau (US1-6).
- **Thẻ đóng chưa có emoji:** giữ đúng chiều cao hiện nay trên màn hình có hover; trên màn hình cảm ứng thẻ đóng cao hơn (nút 44 px) và được đo.
- **Thẻ ở nhóm Outdated hoặc trong sheet hẹp:** cùng hành vi như trong rail.
- **Menu hoặc bộ emoji mở trên thẻ đóng rồi cuộn hoặc đổi cỡ cửa sổ:** đóng như ở thẻ mở, không treo.
- **Mục đang soạn tại chỗ (Edit):** không có hover, ba chấm, nút emoji hay hàng emoji tương tác (như 015 FR-013).
- **Mục có dòng Sending/Failed:** hàng emoji nằm dưới nội dung và trên dòng trạng thái; dòng trạng thái không bị che.
- **Hai thẻ gần nhau:** hover chỉ ảnh hưởng thẻ đang trỏ tới; các nút của thẻ này không che thẻ kia.
- **Giao diện trang khác nhau và giảm chuyển động:** như 015.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Trong mọi thẻ (đóng và mở), các viên emoji đã thả của một mục MUST hiện thành một hàng ngay dưới đoạn nội dung của chính mục đó (nhận xét hoặc từng trả lời); mục chưa có emoji MUST NOT có hàng trống.
- **FR-002**: Tiêu đề thẻ đóng MUST NOT còn chuỗi emoji tóm tắt; MUST giữ số trả lời (nếu có).
- **FR-003**: Viên emoji ở thẻ đóng MUST thả hoặc gỡ được theo đúng quy tắc, nhãn truy cập và cách lưu của 011 mà không làm mở thẻ.
- **FR-004**: Khi emoji thay đổi, chiều cao thẻ đóng và vị trí các thẻ trong rail MUST được cập nhật ngay, không chồng lên nhau và không để khoảng trống lớn.
- **FR-005**: Khi hover hoặc có tiêu điểm vào một mục do chính người dùng viết, ở thẻ đóng cũng như thẻ mở, nút ba chấm MUST hiện cùng nút emoji; mục của người khác MUST chỉ có nút emoji.
- **FR-006**: Trên thẻ đóng, chọn Edit MUST vào soạn tại chỗ như ở thẻ mở; chọn Delete MUST mở thẻ và hiện câu hỏi xác nhận như ở thẻ mở (Keep, Delete); không thao tác nào ghi gì trước khi người dùng xác nhận.
- **FR-007**: Nút ba chấm và nút emoji trên thẻ đóng MUST không làm đổi thẻ đang chọn khi chỉ mở menu hoặc bộ emoji, ngoại trừ việc Edit hoặc Delete (FR-006) mở thẻ đó.
- **FR-008**: Nút ba chấm MUST nằm ở ngoài cùng bên phải của tiêu đề mục, sau giờ, ở thẻ đóng cũng như thẻ mở, cùng một vị trí. Thẻ đóng của mình MUST chừa sẵn chỗ cho nút cả lúc nghỉ (giờ và số trả lời dịch sang trái cho vừa), để khi hover không có gì dịch chuyển; thẻ đóng của người khác MUST giữ tiêu đề như hiện nay.
- **FR-009**: Trên thiết bị không có hover, nút ba chấm (mục của mình) và nút emoji MUST hiện sẵn ở thẻ đóng và thẻ mở, vùng chạm tối thiểu 44 px; bấm chúng MUST NOT bị tính là chọn thẻ.
- **FR-010**: Các nút ẩn lúc nghỉ MUST vẫn truy cập được bằng bàn phím và trình đọc màn hình (có tên); thẻ đóng MUST giữ thứ tự Tab ngắn: người dùng bàn phím chọn thẻ bằng mũi tên và mở bằng Enter, rồi các nút của mục vào được bằng Tab (nút của thẻ đóng không nằm trong thứ tự Tab).
- **FR-011**: Quyền và điều kiện ghi MUST giữ như 012, 014, 015 (chỉ đọc, nhánh bảo vệ, ghim commit: nút tắt kèm lý do).
- **FR-012**: Chỉ dùng token Modernist, không màu cứng; nút emoji vẫn là phần tử tròn duy nhất (constitution 1.4.2); viên emoji, ba chấm, menu giữ hình vuông.
- **FR-013**: Không đổi dữ liệu, `highlights.json`, cách lưu hay quyền; áp dụng cả bốn chế độ (constitution III). Ảnh demo ở trạng thái nghỉ MUST giữ nguyên so với trước spec này, trừ tiêu đề thẻ đóng của mình (giờ dịch trái vì chỗ chừa cho ba chấm, Clarifications Q1) và hàng emoji dưới nội dung. Hai chỗ này MUST được đưa vào bản thiết kế đã cập nhật (người dùng cung cấp, ngoài repo) trước khi merge, và PR MUST liệt kê chúng; cho tới khi có bản thiết kế đã cập nhật, ảnh demo được so với ảnh trước spec này.

### Key Entities *(include if feature involves data)*

Không có thực thể hay trường dữ liệu mới. Đây là thay đổi bố cục và điều kiện hiển thị của emoji, ba chấm trên thẻ nhận xét và trả lời đã có (010–015).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% nhận xét và trả lời có emoji hiển thị hàng emoji ngay dưới nội dung của chúng, ở cả thẻ đóng và thẻ mở; 0 thẻ đóng còn chuỗi emoji trong tiêu đề.
- **SC-002**: Người dùng thả, gỡ emoji trên thẻ đóng trong tối đa 2 thao tác mà không phải mở thẻ.
- **SC-003**: Người dùng sửa hoặc xoá nhận xét của mình từ thẻ đóng trong tối đa 3 thao tác (hover, mở menu, chọn) không cần bấm mở thẻ trước.
- **SC-004**: Sau khi thả hoặc gỡ emoji, 0 thẻ chồng lên nhau trong rail ở các độ rộng 1920, 1440, 924 và 390 px.
- **SC-005**: Ở màn hình cảm ứng 390 px, nút ba chấm và nút emoji hiện sẵn ở thẻ đóng và thẻ mở, ≥ 44 px, không cuộn ngang.
- **SC-006**: Toàn bộ thao tác (hiện nút, mở menu, chọn Edit/Delete, thả emoji) làm được bằng bàn phím.
- **SC-007**: Không thay đổi dữ liệu lưu: các test lưu, đọc, commit cũ vẫn qua; 0 emoji hay trả lời bị mất hoặc nhân đôi.

## Assumptions

- **Dựa trên 010–015 và PR #41 (đã merge vào `main`).** Spec 016 (lưu theo hai cách) độc lập và chưa merge.
- **Chế độ bị ảnh hưởng** (constitution III): cả bốn; thành phần dùng chung.
- **Bản thiết kế đã cập nhật** do người dùng cung cấp sau (ngoài repo); việc merge chờ xác nhận bản đó có tiêu đề thẻ đóng mới và hàng emoji.
- **Nút emoji tròn** (015) vẫn ở mép phải của dòng nội dung khi hover; các viên emoji đã thả là hàng dưới nội dung (US1). Nếu ý là dời cả nút tròn xuống dưới nội dung thì cần nói lại.
- **Số trả lời** vẫn ở tiêu đề thẻ đóng; chỉ chuỗi emoji chuyển xuống dưới nội dung.
- **Hàng emoji của trả lời** vẫn dưới nội dung của trả lời như hiện nay; thay đổi chính là thẻ đóng và vị trí nhất quán.
- **Chỉnh sửa tại chỗ và xoá từ thẻ đóng** dùng đúng luồng của thẻ mở; thẻ mở ra như khi người dùng bấm vào thẻ.
- **Nhãn tiếng Anh trong ứng dụng**, theo quyết định của 012; spec viết bằng tiếng Việt.

## Non-Goals

- Không đổi bộ emoji, cách lưu hay quyền của emoji (011), không đổi nội dung menu ba chấm (014).
- Không thêm dấu tick "giải quyết", xem chi tiết người thả, hay lấy liên kết.
- Không đổi hiệu ứng hover của 015 ngoài việc mở rộng nút ba chấm cho thẻ đóng.
- Không đổi cách lưu (spec 016).
