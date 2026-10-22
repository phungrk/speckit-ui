# Feature Specification: Hiệu ứng hover trên thẻ nhận xét (nút emoji nổi, ba chấm)

**Feature Branch**: `feat/015-comment-hover`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "hiệu ứng hover: dòng nội dung được làm đậm hơn; ở mép phải của dòng đó nổi lên một nút tròn trắng có bóng, chứa biểu tượng mặt cười kèm dấu cộng, là nút thêm emoji, chỉ hiện khi hover; hiển thị menu ba chấm dọc." Tham chiếu: ảnh chụp thẻ nhận xét của Google Docs khi rê chuột lên một nhận xét: dòng nội dung có nền xám đậm hơn, nút tròn trắng có bóng chứa mặt cười kèm dấu cộng nổi ở mép phải dòng, ba chấm dọc và dấu tick ở tiêu đề, viên emoji "😃 1" bên dưới.

## Bối cảnh

Sau 011 và 014, thẻ nhận xét có emoji, trả lời và menu ba chấm, nhưng ở trạng thái nghỉ nó phẳng: nút thêm emoji là một nút "+" nhỏ luôn hiện, và không có dấu hiệu nào cho biết mục nào đang được trỏ tới. Google Docs cho thấy mục đang hover bằng nền đậm hơn và một nút emoji nổi ở mép phải, nên thẻ nhìn sạch lúc nghỉ và các thao tác hiện ra đúng lúc.

## Clarifications

### Session 2026-10-22

- Q: Nút ba chấm hiện khi nào? → A: [NEEDS CLARIFICATION: (A) luôn hiện trên thẻ đang mở như hiện nay (014), hover chỉ thêm nền đậm và nút emoji; (B) chỉ hiện khi hover (hoặc có tiêu điểm) trên mục đó, như mô tả "hiển thị menu ba chấm" gắn với hover.]
- Q: Nút emoji "tròn" mâu thuẫn với constitution IV ("không bo góc"). Xử lý ra sao? → A: [NEEDS CLARIFICATION: (A) chấp nhận một ngoại lệ có chủ đích: đúng một phần tử tròn (nút emoji nổi) được phép, sửa constitution lên 1.4.2 bằng `/speckit-constitution` và ghi vào Complexity Tracking của plan; (B) giữ nút vuông có bóng, đúng constitution nhưng khác ảnh tham chiếu.]

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mục đang hover được làm đậm hơn (Priority: P1)

Khi rê chuột lên phần nội dung của nhận xét hoặc của một trả lời trong thẻ đang mở, dòng nội dung đó có nền đậm hơn so với thẻ, cho biết đây là mục đang trỏ tới. Rời chuột thì nền trở lại như cũ.

**Why this priority**: Là dấu hiệu nền tảng, và là chỗ để các nút nổi bám vào (US2, US3).

**Independent Test**: Rê chuột lần lượt lên nhận xét và hai trả lời: mỗi lúc chỉ một dòng đậm hơn, các dòng khác không; rời chuột thì không dòng nào đậm.

**Acceptance Scenarios**:

1. **Given** thẻ đang mở có một nhận xét và các trả lời, **When** rê chuột lên nội dung một mục, **Then** nền của dòng nội dung mục đó đậm hơn nền thẻ, và các mục khác không đổi.
2. **Given** chuột đang ở một mục, **When** chuyển sang mục kế, **Then** nền đậm chuyển theo, tại mọi thời điểm không quá một mục đậm.
3. **Given** chuột rời khỏi thẻ, **When** nhìn thẻ, **Then** không còn dòng nào đậm.
4. **Given** thẻ đang đóng, **When** rê chuột qua, **Then** không có hiệu ứng nội dung đậm (thẻ đóng không có dòng nội dung riêng).
5. **Given** dùng bàn phím, **When** tiêu điểm vào một nút trong mục (ba chấm hoặc nút emoji), **Then** mục đó nhận cùng nền đậm và cùng các nút nổi, như khi hover.

---

### User Story 2 - Nút emoji nổi ở mép phải (Priority: P1)

Ở mép phải dòng đang hover nổi lên một nút tròn trắng có bóng, chứa biểu tượng mặt cười kèm dấu cộng; nút chỉ hiện khi hover. Bấm vào mở bộ emoji (6 emoji của 011) ngay cạnh nút; chọn một emoji thì thả (hoặc gỡ nếu đã thả) emoji đó lên mục. Nút này thay cho nút "+" luôn hiện của 011; các viên emoji đã thả vẫn hiện dưới nội dung.

**Why this priority**: Đây là thao tác chính của yêu cầu; cho phản hồi nhanh đúng chỗ đang đọc.

**Independent Test**: Rê chuột lên một trả lời: thấy nút tròn ở mép phải dòng; bấm, chọn 👍: viên "👍 1" hiện dưới nội dung; rời chuột thì nút biến mất, viên emoji còn.

**Acceptance Scenarios**:

1. **Given** chuột đang ở một mục, **When** nhìn mép phải dòng nội dung, **Then** có nút tròn trắng có bóng với biểu tượng mặt cười kèm dấu cộng, nhãn truy cập "Add a reaction", và nút không che chữ nội dung (chữ chừa chỗ ở mép phải).
2. **Given** chuột rời mục, **When** nhìn lại, **Then** nút không còn (trừ khi bộ emoji đang mở hoặc nút đang có tiêu điểm).
3. **Given** nút đang hiện, **When** bấm, **Then** bộ 6 emoji mở cạnh nút; chọn một emoji thì thả lên mục và bộ đóng; chọn emoji mình đã thả thì gỡ.
4. **Given** bộ emoji đang mở, **When** nhấn Escape hoặc bấm ra ngoài, **Then** bộ đóng, tiêu điểm về nút.
5. **Given** người chỉ có quyền đọc (hoặc nhánh bảo vệ), **When** hover, **Then** nút hiện ở trạng thái tắt kèm lý do (như 011), các viên emoji đã có vẫn thấy.
6. **Given** màn hình cảm ứng (không có hover), **When** thẻ đang mở, **Then** nút emoji hiện sẵn ở mỗi mục, vùng chạm tối thiểu 44 px.
7. **Given** hover vào một mục, **When** nút nổi lên, **Then** chiều cao thẻ và vị trí các thẻ khác trong rail không đổi (không nhảy bố cục).

---

### User Story 3 - Nút ba chấm cùng hiện khi hover (Priority: P2)

Khi hover vào một mục của chính mình, nút ba chấm dọc (menu Edit/Delete của 014) hiện ở tiêu đề mục đó, cạnh giờ. Khi nào nút ba chấm hiện lúc nghỉ do Clarifications câu hỏi 1 quyết định.

**Why this priority**: Giữ thẻ sạch lúc nghỉ như ảnh tham chiếu; nhưng menu đã dùng được từ 014 nên không chặn US1, US2.

**Independent Test**: Hover lên nhận xét của chính mình: ba chấm hiện ở tiêu đề; mở menu, chọn Edit: soạn tại chỗ như cũ.

**Acceptance Scenarios**:

1. **Given** hover (hoặc tiêu điểm) vào mục do mình viết, **When** nhìn tiêu đề, **Then** thấy nút ba chấm; mục của người khác không có ba chấm (như 014).
2. **Given** menu ba chấm đang mở, **When** chuột rời mục, **Then** menu và nút ba chấm vẫn giữ cho tới khi menu đóng.
3. **Given** màn hình cảm ứng, **When** thẻ đang mở, **Then** nút ba chấm hiện sẵn ở mục của mình, vùng chạm 44 px.

---

### Edge Cases

- **Mục đang soạn tại chỗ (Edit):** không hiệu ứng hover, không nút nổi cho tới Save/Cancel.
- **Mục có dòng trạng thái Sending/Failed:** hover vẫn hoạt động; dòng trạng thái không bị nút che.
- **Nội dung dài nhiều dòng:** nút nổi ở mép phải, canh với dòng đầu (hoặc giữa chiều cao mục), không che chữ.
- **Giao diện trang khác nhau (White, Sepia, Green, Dark):** nền đậm hơn và nút nổi đọc được và tách khỏi nền ở cả bốn.
- **Người dùng giảm chuyển động:** không có chuyển cảnh, chỉ đổi trạng thái.
- **Chuyển nhanh giữa các mục hoặc cuộn:** không nháy, không để lại nút treo.
- **Chuột đang ở nút nổi:** coi như còn hover mục (không tắt khi rời dòng chữ sang nút).
- **Thẻ cuối rail, sheet hẹp:** bộ emoji và menu mở về phía còn chỗ, không bị cắt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Trên thẻ đang mở, khi trỏ chuột lên nội dung của nhận xét hoặc của một trả lời, dòng nội dung đó MUST có nền đậm hơn nền thẻ; tại mọi thời điểm MUST không quá một mục ở trạng thái này; rời đi thì MUST trở lại như cũ.
- **FR-002**: Trạng thái hover MUST cũng xảy ra khi tiêu điểm bàn phím ở trong mục (ba chấm hoặc nút emoji), để người dùng bàn phím có cùng điều khiển.
- **FR-003**: Ở mép phải dòng đang hover MUST nổi một nút emoji: nền trắng, bóng, biểu tượng mặt cười kèm dấu cộng, nhãn truy cập "Add a reaction"; nút MUST chỉ hiện khi hover hoặc có tiêu điểm (hoặc bộ emoji đang mở) và MUST thay cho nút "+" luôn hiện của 011.
- **FR-004**: Nút emoji MUST NOT che chữ của nội dung và MUST NOT làm đổi chiều cao thẻ hay vị trí các thẻ khác.
- **FR-005**: Bấm nút emoji MUST mở bộ 6 emoji của 011 cạnh nút; chọn một emoji MUST thả hoặc gỡ emoji đó theo quy tắc, lưu và hiển thị của 011; Escape hoặc bấm ra ngoài MUST đóng bộ và trả tiêu điểm về nút.
- **FR-006**: Khi không lưu được (chỉ đọc, nhánh bảo vệ, ghim commit), nút emoji MUST tắt kèm lý do (cùng lý do của 012); các viên emoji đã thả MUST vẫn hiển thị dưới nội dung.
- **FR-007**: Nút ba chấm (menu Edit/Delete, 014) của mục do chính người dùng viết MUST hiện khi hover hoặc có tiêu điểm trên mục; thời điểm hiện lúc nghỉ MUST theo Clarifications câu hỏi 1; mục của người khác MUST NOT có nút này.
- **FR-008**: Menu ba chấm hoặc bộ emoji đang mở MUST giữ nút của nó hiện cho tới khi đóng, dù chuột đã rời mục.
- **FR-009**: Trên thiết bị không có hover (con trỏ thô/cảm ứng), nút emoji và ba chấm MUST hiện sẵn ở mỗi mục của thẻ đang mở, vùng chạm tối thiểu 44 px.
- **FR-010**: Hiệu ứng MUST dùng được ở cả bốn giao diện trang, không dùng màu cứng, chỉ qua token; nền đậm hơn tính từ token văn bản/nền hiện có; MUST có `:focus-visible` theo hệ thống; chuyển cảnh (nếu có) MUST tắt khi người dùng chọn giảm chuyển động.
- **FR-011**: Hình dạng của nút emoji MUST theo Clarifications câu hỏi 2.
- **FR-012**: Không đổi dữ liệu, cách lưu, loại ghi hay quyền: mọi thả/gỡ emoji dùng đúng đường ghi của 011; áp dụng cả bốn chế độ (constitution III).
- **FR-013**: Mục đang soạn tại chỗ (Edit) MUST NOT có hiệu ứng hover và nút nổi.

### Key Entities *(include if feature involves data)*

Không có thực thể hay trường dữ liệu mới. Đây là hành vi giao diện của thẻ nhận xét, trả lời và emoji đã có (010–014).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ở thẻ đang mở, 100% mục (nhận xét và trả lời) cho thấy nền đậm hơn khi hover, và không bao giờ có hơn một mục đậm cùng lúc.
- **SC-002**: Nút emoji nổi hiện ở 100% mục khi hover hoặc có tiêu điểm và không hiện khi nghỉ (trên thiết bị có hover); thả một emoji trong 2 thao tác (hover và bấm nút, chọn emoji).
- **SC-003**: Hover không làm đổi chiều cao thẻ hay vị trí thẻ nào trong rail (chênh lệch 0 px).
- **SC-004**: Hiệu ứng hover và nút nổi đọc được và tách khỏi nền ở cả bốn giao diện trang.
- **SC-005**: Ở màn hình cảm ứng 390 px, nút emoji và ba chấm hiện sẵn, đạt vùng chạm ≥ 44 px, không cuộn ngang.
- **SC-006**: Toàn bộ thao tác (hiện nút bằng Tab, mở bộ emoji, chọn, đóng bằng Escape) làm được chỉ bằng bàn phím.
- **SC-007**: Không có thay đổi dữ liệu lưu: các test lưu, đọc, commit cũ vẫn qua; 0 emoji hay trả lời bị mất hoặc nhân đôi.

## Assumptions

- **Dựa trên 010–014 (đã merge vào `main`).**
- **Chế độ bị ảnh hưởng** (constitution III): cả bốn; thành phần dùng chung.
- **Chỉ thẻ đang mở** có hiệu ứng hover: thẻ đóng không có dòng nội dung riêng và thao tác hover chỉ có nghĩa khi đang đọc thảo luận.
- **Nút emoji nổi thay cho nút "+"** của 011; bộ 6 emoji và cách lưu giữ nguyên.
- **Viên emoji đã thả** vẫn giữ hình vuông như 011 (ảnh tham chiếu bo tròn viên này; không thuộc yêu cầu lần này).
- **Dấu tick "giải quyết"** trong ảnh không thuộc spec này (đã ngoài phạm vi từ 011).
- **Nhãn tiếng Anh trong ứng dụng**, theo quyết định của 012.

## Non-Goals

- Không đổi bộ emoji, cách lưu hay quyền của emoji (011).
- Không thêm dấu tick giải quyết, xem chi tiết phản ứng, lấy liên kết.
- Không đổi hộp "Comment" (013), rail (012), menu ba chấm (nội dung Edit/Delete) ngoài thời điểm hiện (014).
- Không bo góc các phần tử khác; không đổi bảng màu `--hl-*`.
