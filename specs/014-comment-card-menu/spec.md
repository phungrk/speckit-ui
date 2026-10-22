# Feature Specification: Thẻ nhận xét gọn kiểu Google Docs (menu ba chấm, một màu)

**Feature Branch**: `feat/014-comment-card-menu`

**Created**: 2026-10-22

**Status**: Clarified

**Input**: User description: "UI sau khi comment và reply on comment như hình đính kèm. Mặc định dùng highlight color là màu Change (`--hl-o`). Các options còn lại như Key, Comment, Question, Issue thì bỏ đi. Gom nút Edit, Delete vào menu ba chấm dọc như hình thứ hai. Bỏ nút Copy, Ask." Hai ảnh tham chiếu là thẻ nhận xét của Google Docs: tên người, giờ, nội dung, nút ba chấm ở góc phải mỗi mục (nhận xét và mỗi trả lời); menu mở ra có "Chỉnh sửa", "Xóa" (và vài mục khác); ô trả lời bo tròn với "Hủy" và "Trả lời".

## Bối cảnh

Thẻ nhận xét hiện có (012, 013, 011) hiện đủ thứ cùng lúc khi mở: hàng 5 ô màu, nút Edit, Delete, Copy, Ask, rồi mới tới trả lời và emoji. Nó nặng và khác nhiều so với Google Docs, nơi mỗi mục chỉ có tên, giờ, nội dung và một nút ba chấm. Spec này gọn lại thẻ và tab Highlights cho giống, không đổi cách lưu.

## Clarifications

### Session 2026-10-22

- Q1: Nhận xét đã có màu khác (Key, Issue, Question, Comment) thì hiển thị thế nào? → A: Phương án A. Giữ nguyên màu đã lưu trên đoạn chữ của nhận xét cũ; chỉ nhận xét **mới** mặc định Change. Mở tài liệu không sửa gì trong file. Không còn chỗ nào để đổi màu, nên màu cũ chỉ đổi khi nhận xét đó bị xoá (FR-003).
- Q2: Tab Highlights và "Before you approve" xử lý màu thế nào? → A: Phương án A. Bỏ ô lọc theo màu và nhãn màu ở tab Highlights; "Before you approve" xếp ghi chú theo thời gian, không theo màu (bỏ thứ tự Issue trước của 012). Màu vẫn hiện như dải màu nhỏ cạnh mục (không có chữ), để nhận xét cũ còn phân biệt được (FR-013).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Một màu mặc định, không chọn màu (Priority: P1)

Người dùng viết nhận xét và gửi. Đoạn chữ được tô màu **Change** (cam, `--hl-o`) và đó là màu duy nhất: thẻ không còn hàng ô màu, không còn dòng nhãn "Issue/Key/…", không có chỗ nào để đổi màu.

**Why this priority**: Đây là thay đổi lớn nhất về trải nghiệm: bỏ một quyết định mà người viết thường không muốn đưa ra (013 đã làm nhận xét không cần màu; giờ màu là một và cố định).

**Independent Test**: Chọn một câu, bấm "Comment", gõ, gửi: câu được tô cam, thẻ chỉ có tên, giờ, nội dung (không có ô màu).

**Acceptance Scenarios**:

1. **Given** người dùng gửi một nhận xét mới, **When** nó được lưu, **Then** đoạn chữ được tô bằng màu Change (`--hl-o`) ở mọi giao diện trang, và thẻ không hiện nhãn màu.
2. **Given** thẻ nhận xét đang chọn, **When** người dùng nhìn thẻ, **Then** không có hàng ô màu và không có chỗ nào để đổi màu.
3. **Given** người dùng thêm ghi chú vào một highlight chỉ có màu của mình (013), **When** gửi, **Then** nhận xét thành nhận xét cam và nằm trong khe của thẻ như bình thường.
4. **Given** một nhận xét hoặc highlight đã lưu với màu khác từ trước, **When** mở tài liệu, **Then** giữ nguyên màu đã lưu và vẫn đọc được 100% (câu hỏi 1).

---

### User Story 2 - Menu ba chấm cho Sửa và Xoá (Priority: P1)

Ở góc phải tiêu đề của nhận xét và của từng trả lời có một nút ba chấm dọc. Bấm vào mở một menu nhỏ có **Edit** và **Delete**; chỉ người viết thấy nút này. Không còn hàng nút Edit/Delete nằm sẵn trong thẻ. Mục chỉ có màu ở tab Highlights chỉ còn Delete (có xác nhận) cho tác giả. Xoá vẫn hỏi lại trước khi xoá.

**Why this priority**: Khiến thẻ gọn như Google Docs; sửa/xoá là thao tác hiếm nên không đáng chiếm chỗ.

**Independent Test**: Ở thẻ của chính mình bấm ba chấm → thấy Edit và Delete; ở thẻ hoặc trả lời của người khác không có nút ba chấm.

**Acceptance Scenarios**:

1. **Given** nhận xét hoặc trả lời do chính mình viết, **When** nhìn tiêu đề, **Then** có nút ba chấm dọc có nhãn "More actions"; bấm mở menu gồm Edit và Delete.
2. **Given** nhận xét hoặc trả lời của người khác, **When** nhìn tiêu đề, **Then** không có nút ba chấm.
3. **Given** menu đang mở, **When** chọn Edit, **Then** mục chuyển sang soạn tại chỗ như hiện nay (Save/Cancel); chọn Delete thì hỏi xác nhận (nêu số trả lời nếu là nhận xét gốc) rồi mới xoá.
4. **Given** menu đang mở, **When** bấm ra ngoài hoặc nhấn Escape, **Then** menu đóng và tiêu điểm về nút ba chấm.
5. **Given** không lưu được (chỉ đọc, nhánh bảo vệ), **When** mở menu của mục mình viết, **Then** Edit và Delete tắt kèm lý do.
6. **Given** dùng bàn phím, **When** Tab tới nút ba chấm và nhấn Enter hoặc Space, **Then** menu mở, mũi tên di chuyển giữa các mục, Enter chọn, Escape đóng.

---

### User Story 3 - Bỏ Copy và Ask (Priority: P2)

Thẻ nhận xét và mục chỉ có màu ở tab Highlights không còn nút Copy và Ask.

**Why this priority**: Làm thẻ gọn và bám Google Docs; hai nút này ít dùng. Sau 013 chúng chỉ còn ở thẻ và tab.

**Independent Test**: Chọn thẻ bất kỳ và mục bất kỳ ở tab: không có Copy, không có Ask.

**Acceptance Scenarios**:

1. **Given** thẻ nhận xét của bất kỳ ai, **When** mở, **Then** không có nút Copy và Ask.
2. **Given** mục chỉ có màu ở tab Highlights, **When** mở, **Then** không có Copy và Ask (chỉ còn Delete cho tác giả).
3. **Given** người dùng muốn sao chép đoạn đã trích, **When** bôi chọn chữ trong thẻ, **Then** dùng được thao tác sao chép của trình duyệt.

---

### User Story 4 - Thẻ trông như thẻ Google Docs (Priority: P2)

Mỗi mục (nhận xét và từng trả lời) có dòng tiêu đề: ảnh đại diện chữ cái, tên, giờ, nút ba chấm ở bên phải; nội dung ngay dưới. Ô trả lời là một ô nhập bo tròn có nút "Cancel" và "Reply" ở dưới bên phải; cuối thẻ không còn hàng nút nào khác ngoài emoji.

**Why this priority**: Khớp hai ảnh tham chiếu; không đổi chức năng.

**Independent Test**: So ảnh chụp thẻ có một nhận xét và một trả lời với ảnh tham chiếu: cùng thứ tự (tiêu đề → nội dung → trả lời → ô trả lời → Cancel/Reply).

**Acceptance Scenarios**:

1. **Given** nhận xét có một trả lời, **When** thẻ mở, **Then** thấy theo thứ tự: tiêu đề nhận xét (avatar, tên, giờ, ba chấm), nội dung, tiêu đề trả lời (avatar, tên, giờ, ba chấm), nội dung trả lời, ô trả lời, hàng Cancel / Reply.
2. **Given** ô trả lời chưa nhập, **When** nhìn, **Then** nút Cancel và Reply chỉ hiện khi ô được chọn hoặc có chữ (như Google Docs), không chiếm chỗ lúc nghỉ.
3. **Given** Cancel khi có chữ, **When** bấm, **Then** hỏi bỏ như hiện nay; không chữ thì thu ô.
4. **Given** màn hình hẹp, **When** mở thẻ trong sheet, **Then** cùng bố cục, không cuộn ngang.

---

### Edge Cases

- **Nhận xét đã có emoji và trả lời (011):** giữ nguyên; emoji vẫn hiện dưới nội dung của mục.
- **Highlight chỉ có màu và tab Highlights:** không có thẻ; mục ở tab chỉ còn Delete cho tác giả (không đổi màu, không Copy, không Ask).
- **Menu gần mép thẻ hoặc cuối rail:** mở về phía còn chỗ, không bị cắt.
- **Một lần chỉ một menu mở:** mở menu khác hoặc chọn thẻ khác thì menu cũ đóng.
- **Mục đang soạn tại chỗ (Edit):** không có nút ba chấm cho tới khi Save/Cancel.
- **Lưu thất bại khi đổi sang một màu:** không còn thao tác đổi màu nên không còn trường hợp này.
- **File cũ có màu `y`, `b`, `p`, `n`:** đọc được; không bị ghi đè trừ khi người dùng sửa nhận xét đó (câu hỏi 1).
- **Chỉ dùng bàn phím và trình đọc màn hình:** nút ba chấm có nhãn, menu `role="menu"`, thông báo thay đổi.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Nhận xét mới MUST được lưu và tô bằng màu Change (`--hl-o`, qua token); người dùng MUST NOT thấy nơi chọn hay đổi màu (không hàng ô màu, không nhãn Key/Issue/Question/Comment trên thẻ).
- **FR-002**: Việc thêm ghi chú vào highlight chỉ có màu của chính mình (013) MUST cho ra nhận xét hiển thị như nhận xét mới.
- **FR-003**: Nhận xét hoặc highlight đã lưu với màu khác MUST đọc được và giữ nguyên màu đã lưu trên đoạn chữ (không bị đổi sang Change); MUST NOT bị mất hay sửa chỉ vì mở tài liệu. Màu cũ không còn có chỗ đổi (câu hỏi 1).
- **FR-004**: Mỗi nhận xét và mỗi trả lời do người dùng viết MUST có nút ba chấm dọc ở cuối tiêu đề, nhãn "More actions", mở menu gồm Edit và Delete; mục của người khác MUST NOT có nút này.
- **FR-005**: Không còn hàng nút Edit/Delete nằm sẵn trong thẻ.
- **FR-006**: Menu MUST đóng khi bấm ra ngoài, nhấn Escape (tiêu điểm về nút), hoặc chọn một mục; một lúc chỉ một menu mở; dùng được bằng bàn phím (mở, mũi tên, Enter, Escape) và có nhãn cho trình đọc màn hình.
- **FR-007**: Edit MUST chuyển mục sang soạn tại chỗ như hiện nay; Delete MUST hỏi xác nhận trước khi xoá, và với nhận xét có trả lời MUST nêu số trả lời bị xoá (011 FR-004).
- **FR-008**: Khi không lưu được, Edit và Delete MUST tắt kèm lý do (cùng lý do của 012).
- **FR-009**: Thẻ và mục ở tab Highlights MUST NOT có nút Copy và Ask.
- **FR-010**: Bố cục thẻ MUST theo thứ tự: tiêu đề (avatar chữ cái, tên, giờ, ba chấm), nội dung, emoji, các trả lời cùng kiểu, ô trả lời. Cancel và Reply MUST chỉ hiện khi ô trả lời được chọn hoặc có chữ.
- **FR-011**: Mọi thay đổi MUST giữ nguyên cách lưu của 010/012/011 (một file `highlights.json` mỗi spec, một commit `[skip ci]` mỗi lần lưu, xác nhận một lần mỗi repo) và áp dụng cả bốn chế độ (constitution III).
- **FR-012**: Giao diện MUST dùng token Modernist và token `--hl-*` có sẵn (không thêm màu); dùng được bằng bàn phím, có `:focus-visible` theo hệ thống, dùng được ở bề rộng điện thoại (constitution IV). Menu dùng bề mặt sáng như hộp "Comment" của 013.
- **FR-013**: Tab Highlights MUST NOT có ô lọc theo màu và nhãn màu bằng chữ; mỗi mục MAY có dải màu nhỏ không chữ cạnh mục theo màu đã lưu. "Before you approve" MUST xếp ghi chú theo thời gian, không theo màu.

### Key Entities *(include if feature involves data)*

- **Nhận xét**: giữ nguyên dữ liệu của 012/011; trường màu của nhận xét mới luôn là Change (`o`). Không thêm trường, không đổi định dạng file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Một nhận xét mới trải qua "chọn chữ → Comment → gõ → gửi" mà người dùng không phải chọn màu nào, và 100% nhận xét mới được lưu với màu Change.
- **SC-002**: Thẻ nhận xét đang chọn có ít nhất 4 nút ít hơn so với trước (bỏ 5 ô màu, Edit, Delete, Copy, Ask khỏi hàng cố định; thay bằng một nút ba chấm ở mỗi mục của mình).
- **SC-003**: Sửa và xoá một trả lời của mình làm được chỉ qua menu ba chấm, bằng chuột và bằng bàn phím.
- **SC-004**: File `highlights.json` tạo bởi các bản trước đọc được 100%; 0 nhận xét bị mất hoặc bị ghi đè khi chỉ mở tài liệu.
- **SC-005**: Ở 390 px, thẻ và menu dùng được, không cuộn ngang, nút ba chấm đạt vùng chạm tối thiểu 44 px ở màn hình cảm ứng.
- **SC-006**: Ảnh chụp thẻ có một nhận xét và một trả lời khớp thứ tự bố cục của ảnh tham chiếu (tiêu đề, nội dung, tiêu đề trả lời, nội dung, ô trả lời, Cancel/Reply).

## Assumptions

- **Dựa trên 010, 012, 013, 011 (đã merge vào `main`).**
- **Chế độ bị ảnh hưởng** (constitution III): cả bốn; thành phần dùng chung.
- **Không đổi định dạng file hay thêm loại ghi:** nhận xét mới dùng giá trị màu `o` đã có; không cần tăng `version`, không cần sửa constitution.
- **"Change"** là tên của màu `o` ở 010 (cam, `--hl-o`); các màu khác vẫn là giá trị hợp lệ khi đọc.
- **Menu chỉ có Edit và Delete** như yêu cầu; các mục khác trong ảnh tham chiếu (xem chi tiết phản ứng, lấy đường liên kết) không thuộc spec này.
- **Nhãn tiếng Anh trong ứng dụng** (Edit, Delete, Reply, Cancel, More actions), theo quyết định của 012; nhãn tiếng Việt trong ảnh là tham chiếu.
- **Nút dấu tick "giải quyết" trong ảnh không thuộc spec này** (đã nằm ngoài phạm vi của 011).

## Non-Goals

- Không thêm "giải quyết và ẩn cuộc thảo luận", xem phản ứng chi tiết, lấy liên kết.
- Không bỏ emoji (011) và không đổi cách lưu.
- Không đổi hộp chọn chữ "Comment" (013) hay rail (012) ngoài thẻ.
- Không đổi màu của 010 trong bảng `--hl-*` hay thêm màu.
- Không đổi quyền: vẫn chỉ người viết sửa/xoá mục của mình.
