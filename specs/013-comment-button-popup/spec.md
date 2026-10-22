# Feature Specification: Hộp chọn chữ chỉ còn một nút "Comment"

**Feature Branch**: `feat/013-comment-button-popup`

**Created**: 2026-10-22

**Status**: Clarified

**Input**: User description: "đổi UI highlight dialog UI theo kiểu google docs. Chỉ cần 1 button có label \"Comment\"" (kèm ảnh chụp màn hình điện thoại 390 px của bản Pages: thanh công cụ tối có nút "Add comment" bị xuống hai dòng, khoảng trống ở chỗ các ô màu, Copy, Ask).

## Bối cảnh

Spec 012 đã đưa vào luồng nhận xét kiểu Google Docs, nhưng hộp hiện ra khi chọn chữ vẫn là thanh công cụ của spec 010: nền tối, nút "Add comment", bốn ô màu, Copy, Ask. Ảnh chụp trên điện thoại cho thấy hai vấn đề: nhãn "Add comment" xuống hai dòng, và hộp trông nặng hơn nhiều so với Google Docs, nơi chọn chữ chỉ hiện **một** nút nhận xét nhỏ cạnh đoạn chọn.

## Clarifications

### Session 2026-10-22

- Q1: Chỉ còn "Comment" thì bốn ô màu, Copy và Ask đi đâu? → A: Phương án A. Bỏ khỏi hộp chọn chữ và chuyển sang nơi người dùng đã ở khi xem nhận xét: **thẻ nhận xét** đang chọn (đổi màu, Copy, Ask, sửa, xoá) và **mục trong tab Highlights** (cùng các hành động cho highlight chỉ có màu, vốn không có thẻ). Không mất tính năng nào; chỉ đổi chỗ (FR-008).
- Q2: Bấm vào highlight chỉ có màu, của chính mình, trong văn bản thì sao? → A: Phương án B. Hộp nhỏ chỉ hiện nút "Comment" (thêm lời vào highlight đó, nó trở thành nhận xét có thẻ). Đổi màu và xoá highlight chỉ có màu làm ở tab Highlights (FR-008, FR-009). Highlight của người khác: không hiện hộp.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chọn chữ, thấy đúng một nút "Comment" (Priority: P1)

Người xem chọn một đoạn chữ trong tài liệu spec. Cạnh đoạn chọn hiện một hộp nhỏ, sáng, chỉ có một nút mang nhãn **Comment**. Bấm nút thì mở hộp soạn nhận xét như spec 012 (rail ở bố cục rộng, sheet ở bố cục hẹp).

**Why this priority**: Đây là yêu cầu của người dùng và là bước đầu của mọi nhận xét; hộp đang gây lỗi hiển thị trên điện thoại.

**Independent Test**: Chọn một câu ở 1440 px và ở 390 px; hộp chỉ có một nút "Comment" trên một dòng, bấm vào thì mở hộp soạn.

**Acceptance Scenarios**:

1. **Given** người có quyền ghi chọn một đoạn chữ, **When** hộp hiện ra, **Then** trong hộp có đúng một nút nhãn "Comment" (không phải "Add comment"), không có ô màu, không có Copy, không có Ask.
2. **Given** màn hình rộng 390 px, **When** hộp hiện ra, **Then** nhãn nằm trên một dòng, hộp không rộng hơn nội dung của nó quá một khoảng đệm và nằm gọn trong màn hình.
3. **Given** hộp đang hiện, **When** bấm "Comment", **Then** hộp biến mất và hộp soạn nhận xét mở như spec 012 (có đoạn chữ đã chọn, nút Cancel / Comment).
4. **Given** hộp đang hiện, **When** bấm ra ngoài, nhấn Escape hoặc đổi vùng chọn, **Then** hộp đóng như hiện tại, không lưu gì.
5. **Given** người chỉ có quyền đọc hoặc nhánh bị bảo vệ, **When** chọn chữ, **Then** nút "Comment" bị tắt và hiện lý do như spec 012 FR-016.
6. **Given** dùng bàn phím, **When** có vùng chọn, **Then** có thể tới nút bằng phím Tab và kích hoạt bằng Enter; phím tắt mở hộp soạn của spec 012 vẫn hoạt động.

---

### User Story 2 - Hộp trông như của Google Docs (Priority: P2)

Hộp là một bề mặt sáng nhỏ có bóng nhẹ, nút có biểu tượng bong bóng chat kèm nhãn "Comment", đặt cạnh đoạn chọn, không phải thanh tối chạy ngang như hiện nay. Màu, viền, khoảng cách lấy từ token Modernist.

**Why this priority**: Làm hộp giống Google Docs; không ảnh hưởng chức năng nên đứng sau US1.

**Independent Test**: So ảnh chụp với 4 ảnh tham chiếu của spec 012 ở các giao diện trang (sáng, giấy, tối): hộp đọc được trên cả ba.

**Acceptance Scenarios**:

1. **Given** từng giao diện trang của chế độ đọc (spec 010), **When** hộp hiện ra, **Then** chữ và biểu tượng có độ tương phản đủ đọc (tối thiểu 4,5:1) và hộp tách khỏi nền trang.
2. **Given** vùng chọn nằm sát mép trên hoặc dưới màn hình, **When** hộp hiện ra, **Then** hộp vẫn nằm trong màn hình (đặt dưới vùng chọn khi không còn chỗ phía trên).

---

### User Story 3 - Màu, Copy, Ask vẫn dùng được ở chỗ mới (Priority: P2)

Người dùng chọn một thẻ nhận xét (hoặc một mục trong tab Highlights) và thấy các hành động cũ: đổi màu, Copy, Ask, xoá; thẻ còn có Sửa.

**Why this priority**: Bỏ chúng khỏi hộp chọn chữ không được làm mất tính năng.

**Independent Test**: Với một nhận xét và một highlight chỉ có màu, thực hiện từng hành động từ thẻ/tab và kiểm tra kết quả.

**Acceptance Scenarios**:

1. **Given** một nhận xét của mình đang chọn, **When** đổi màu, **Then** màu đổi và được lưu như spec 012.
2. **Given** một highlight chỉ có màu của mình trong tab Highlights, **When** chọn mục đó, **Then** có đổi màu, Copy, Ask, xoá; xoá hỏi xác nhận như hiện nay.
3. **Given** nhận xét của người khác, **When** chọn, **Then** chỉ có Copy và Ask.
4. **Given** quyền đọc hoặc nhánh bảo vệ, **When** chọn, **Then** hành động ghi bị tắt kèm lý do; Copy và Ask vẫn dùng được.

---

### Edge Cases

- Vùng chọn trải nhiều đoạn hoặc rất dài: hộp vẫn chỉ có một nút, đặt cạnh cuối vùng chọn.
- Đổi cỡ cửa sổ hoặc xoay điện thoại khi hộp đang hiện: hộp được đặt lại hoặc đóng, không để lọt ra ngoài màn hình.
- Chọn chữ trong tài liệu chỉ đọc (ghim vào commit): hộp hiện nút bị tắt kèm lý do, không ẩn hộp (giữ như hiện tại).
- Chế độ demo: hộp hiện như các chế độ khác, nhận xét lưu cục bộ.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Khi chọn chữ trong tài liệu, hộp chọn chữ MUST chỉ có một nút, nhãn hiển thị là "Comment".
- **FR-002**: Nhãn của nút MUST nằm trên một dòng ở mọi chiều rộng màn hình từ 320 px trở lên; hộp MUST nằm gọn trong màn hình.
- **FR-003**: Bấm nút MUST mở hộp soạn nhận xét theo spec 012 (FR-001, FR-002), không thay đổi cách lưu.
- **FR-004**: Khi không lưu được (quyền đọc, nhánh bảo vệ, thư mục chỉ đọc), nút MUST bị tắt và hiển thị lý do, đúng như spec 012 FR-016.
- **FR-005**: Hộp MUST có kiểu sáng gọn kiểu Google Docs (bề mặt sáng, bóng nhẹ, biểu tượng bong bóng chat cạnh nhãn), dùng token Modernist và token `--hl-*` hiện có; không thêm màu mới.
- **FR-006**: Tên truy cập (accessible name) của nút MUST là "Comment"; nút MUST dùng được bằng bàn phím.
- **FR-007**: Các nhãn "Add comment" còn lại trong giao diện và tài liệu (README, spec 012 contracts) MUST được đổi thành "Comment" ở chỗ nói về nút này.
- **FR-008**: Đổi màu, Copy, Ask (hỏi AI về đoạn chữ), sửa và xoá MUST dùng được từ thẻ nhận xét đang chọn; cùng các hành động (trừ sửa lời, vì chưa có lời) MUST dùng được từ mục đang chọn trong tab Highlights, để highlight chỉ có màu không mất cách đổi màu, xoá, Copy, Ask. Không còn ô màu, Copy, Ask trong hộp chọn chữ.
- **FR-009**: Bấm vào highlight chỉ có màu của chính mình trong văn bản MUST hiện hộp chỉ có "Comment"; bấm "Comment" mở hộp soạn gắn vào highlight đó (giữ màu hiện có). Highlight của người khác MUST không hiện hộp (chọn thẻ của nó nếu có).
- **FR-010**: Tạo highlight chỉ có màu mới từ vùng chọn không còn là thao tác riêng: mọi highlight mới đều là nhận xét; người dùng đặt màu sau, trên thẻ (FR-008).
- **FR-011**: Thay đổi áp dụng cho cả bốn chế độ (demo, server, static, local) vì dùng chung một thành phần; không đổi định dạng `highlights.json` hay cách ghi.

### Key Entities

- **Hộp chọn chữ**: bề mặt nổi tạm thời hiện khi có vùng chọn; chứa nút "Comment"; không lưu dữ liệu.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% lần chọn chữ ở 390 px và 1440 px cho thấy hộp có đúng một nút, nhãn "Comment" trên một dòng.
- **SC-002**: Người dùng thêm được một nhận xét chỉ với hai thao tác sau khi chọn chữ (bấm Comment, gõ và gửi).
- **SC-003**: Hộp không tràn màn hình và không gây cuộn ngang ở 320 px đến 1920 px.
- **SC-004**: Chữ trong hộp đạt tương phản ít nhất 4,5:1 trên cả ba giao diện trang.
- **SC-005**: Không có thay đổi nào ở dữ liệu lưu: các test hiện có về lưu, đọc, commit vẫn qua.

## Assumptions

- Nhãn trong ứng dụng tiếng Anh ("Comment"), theo quyết định của spec 012 về nhãn.
- Spec này chỉ đổi hộp chọn chữ. Rail, thẻ, hộp soạn, luồng chọn của spec 012 giữ nguyên.
- Demo mode: vì hộp là phần thêm của spec 010/012 và không có trong bản thiết kế `Speckit Workspace.html`, sự khác biệt so với thiết kế được liệt kê trong PR như spec 012 đã làm.
- Phụ thuộc: spec 012 đã merge vào `main`; spec này dựng trên đó.
