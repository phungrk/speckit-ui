# Feature Specification: Chế độ đọc kiểu Kindle và highlight

**Feature Branch**: `feat/010-reader-highlights`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Implement Kindle-style Reader Mode + Highlights for the Speckit web app". Mô tả đầy đủ (mục A–H, tham chiếu prototype `Speckit Workspace.html`, `speckit/reader.jsx`, `speckit/app.jsx` trong dự án claude.ai/design 89b4bbc2-…) được dán trong lệnh `/speckit-specify` ngày 2026-10-20. Các giá trị cụ thể (màu, cỡ chữ, kích thước) của mô tả đó là nguồn cho plan, và được chép vào `contracts/` ở bước plan.

## Clarifications

### Session 2026-10-20

- Q: Highlight dùng chung lưu ở đâu, ai xem và ai sửa được? → A: Highlight đi kèm spec, lưu thành **một file JSON riêng** trong thư mục của spec. Ai đọc được spec thì xem được mọi highlight. Chỉ người tạo (owner) sửa hoặc xoá được highlight của mình, giống ghi chú của Google Docs. (Thay cho phương án "khối JSON trong thân issue" chọn trước đó.)
- Q: Khi lưu highlight, file được commit vào nhánh nào? → A: Nhánh mà người dùng đang xem spec: `feat/NNN` khi spec chưa merge, `main` khi đã merge. Nhánh bị bảo vệ hoặc đã xoá thì highlight chỉ xem được, kèm thông báo.
- Q: Áp dụng cho chế độ nào, demo có đổi theo thiết kế mới không? → A: Server, Pages và local đều có đủ chức năng như nhau (cài đặt đọc, theme, sidebar, highlight, ghi chú, panel, brief). Demo cập nhật theo thiết kế mới, lấy lại mốc so ảnh pixel.

## Bối cảnh

Việc chính của trang là **đọc và duyệt spec**. Tính năng này làm việc đọc giống đọc sách giấy (kiểu Kindle). Nó cũng cho người review **tô sáng và ghi chú** lên đoạn văn, để ghi chú trở thành đầu vào cho người duyệt cổng.

Thứ tự giao, mỗi bước dùng được ngay:

| Bước | Nội dung | Story |
|---|---|---|
| A | Cài đặt đọc ("Aa") | US1 |
| B | Theme cho toàn bộ khung | US2 |
| C | Ẩn/hiện sidebar | US3 |
| D | Highlight | US4 |
| E | Panel highlight và tích hợp cổng | US5 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chỉnh cách đọc (Priority: P1)

Người đọc bấm nút **Aa** ở header và chọn:
- font đọc (Literata, Source Serif 4, Atkinson Hyperlegible, Archivo);
- cỡ chữ (15–22px, 6 nấc);
- giãn dòng (3 mức);
- độ rộng cột (600, 700, 820px);
- nền trang (White, Sepia, Green, Dark).

Chỉ phần văn xuôi trong cột đọc đổi theo. Tiêu đề, mã artifact (`FR-001`, `US1`, `T009`…), đường dẫn file, nhãn và nút vẫn dùng font giao diện. Lựa chọn được nhớ cho người dùng đó và được áp dụng ngay từ lần hiển thị đầu, không bị nháy theme mặc định.

**Why this priority**: Việc chính là đọc. Đây là thay đổi nhỏ nhất mà mọi người đều thấy được ngay.

**Independent Test**: Mở một spec, đổi font sang Atkinson và cỡ 22px. Đoạn văn đổi font, còn `FR-001` và tiêu đề vẫn là font giao diện. Tải lại trang: lựa chọn vẫn còn, và trang không nháy theme mặc định.

**Acceptance Scenarios**:

1. **Given** đang đọc một spec, **When** chọn font, cỡ, giãn dòng hoặc độ rộng, **Then** chỉ văn xuôi trong cột đọc đổi. Tiêu đề, mã artifact, nhãn và nút giữ font giao diện.
2. **Given** popover Aa đang mở, **When** bấm ra ngoài, nhấn Escape hoặc bấm lại Aa, **Then** popover đóng, và mọi điều khiển trong đó dùng được bằng bàn phím.
3. **Given** đã chỉnh cài đặt, **When** tải lại trang, **Then** cài đặt vẫn còn và không có nháy theme mặc định.
4. **Given** bấm "Reset to default", **When** popover cập nhật, **Then** mọi giá trị về mặc định (Literata, 18px, 1.7, 700px, White).

---

### User Story 2 - Theme cho toàn bộ khung (Priority: P1)

Chọn nền Sepia, Green hoặc Dark thì cả header, hai sidebar, cột giữa, hộp thoại và popover đều đổi màu theo, không chỉ cột đọc. Chữ thường đạt độ tương phản tối thiểu 4.5:1 ở cả bốn nền.

**Why this priority**: Đọc lâu với nền trắng ở viền và nền sepia ở giữa thì khó chịu hơn không đổi gì.

**Independent Test**: Chọn Dark. Không còn vùng nào có nền trắng cứng. Đo tương phản chữ thường trên cả bốn nền.

**Acceptance Scenarios**:

1. **Given** chọn một nền, **When** trang cập nhật, **Then** header, sidebar, cột giữa, hộp thoại và popover Aa đều dùng màu của nền đó.
2. **Given** bất kỳ nền nào, **When** đo tương phản chữ thường, **Then** đạt từ 4.5:1 trở lên.
3. **Given** người dùng bật "giảm chuyển động", **When** đổi nền, **Then** không có hiệu ứng chuyển màu.

---

### User Story 3 - Ẩn/hiện sidebar (Priority: P2)

Hai nút ở hai đầu header ẩn hoặc hiện sidebar trái (hàng chờ và danh sách spec) và sidebar phải (cổng, highlight, Copilot). Ẩn cả hai thì còn một cột đọc ở giữa. Trạng thái ẩn/hiện được nhớ cho người dùng.

**Why this priority**: Giúp tập trung đọc, nhưng không bắt buộc để đọc được.

**Independent Test**: Ẩn cả hai sidebar, rồi bấm Tab qua trang: không có phần tử nào bị ẩn nhận được focus. Tải lại trang: vẫn ẩn.

**Acceptance Scenarios**:

1. **Given** ẩn sidebar trái hoặc phải, **When** trang cập nhật, **Then** cột đọc giãn ra lấp chỗ trống, và nội dung của sidebar bị ẩn không nhận focus.
2. **Given** màn hình hẹp (từ 1180px trở xuống, rồi 760px trở xuống), **When** bấm nút ẩn/hiện, **Then** nút vẫn hoạt động với bố cục xếp chồng.
3. **Given** đã ẩn hoặc hiện, **When** tải lại trang, **Then** trạng thái vẫn giữ.

---

### User Story 4 - Highlight và ghi chú trên đoạn văn (Priority: P1)

Người review bôi đen một đoạn trong artifact, và một thanh công cụ hiện ra. Họ có thể:
- chọn một trong bốn màu, mỗi màu có nghĩa cố định: **Key**, **Question**, **Issue**, **Change**;
- thêm ghi chú, sao chép đoạn văn, hoặc hỏi Copilot về đoạn đó.

Highlight hiện ngay trên đoạn văn. Đoạn có ghi chú có thêm một ghim ở lề phải. Highlight được **chia sẻ cho cả nhóm**: người khác mở cùng spec cũng thấy.

**Why this priority**: Đây là phần giá trị chính: biến việc đọc thành đầu vào cho người duyệt.

**Independent Test**: Bôi đen một câu trong spec.md và chọn "Issue". Câu được tô màu. Tải lại trang: vẫn còn. Người khác mở cùng spec cũng thấy.

**Acceptance Scenarios**:

1. **Given** bôi đen ít nhất 2 ký tự không phải khoảng trắng, nằm trọn trong cột đọc, **When** thả chuột hoặc nhấc tay, **Then** thanh công cụ hiện ngay trên đoạn chọn, lật xuống dưới nếu không đủ chỗ, và không tràn khỏi màn hình.
2. **Given** chọn một màu, **When** highlight được tạo, **Then** đoạn văn được tô màu, nội dung artifact không bị sửa, và highlight còn sau khi tải lại.
3. **Given** bấm Note, **When** nhập ghi chú và lưu (bằng nút hoặc ⌘/Ctrl+Enter), **Then** có ghim ở lề phải ngang dòng đầu của highlight. Ghi chú không chọn màu thì dùng màu Key.
4. **Given** bấm vào một highlight có sẵn hoặc vào ghim, **When** thanh công cụ mở ở chế độ sửa, **Then** người tạo được đổi màu, sửa ghi chú hoặc xoá. Người khác chỉ xem, không có nút sửa hay xoá.
5. **Given** bấm Ask, **When** sidebar phải mở tab Copilot, **Then** Copilot nhận câu hỏi "Explain this passage from {Phase} and flag any risk or gap: "{đoạn văn}"".
6. **Given** artifact bị sửa và đoạn đã tô không còn nữa, **When** mở spec, **Then** highlight không hiện trên văn bản. Nó vẫn có trong panel, kèm nhãn "Outdated, text changed".
7. **Given** cùng một đoạn văn xuất hiện nhiều lần, **When** highlight được hiển thị lại, **Then** nó gắn đúng lần xuất hiện đã chọn, nhờ phần văn bản ngay trước và sau.

---

### User Story 5 - Panel highlight và "Before you approve" (Priority: P2)

Sidebar phải có ba tab: **Gate**, **Highlights {số lượng}**, **Copilot**. Tab Highlights:
- lọc được theo màu;
- nhóm theo bước (`02 · Specify`…);
- bấm một mục thì chuyển sang bước đó, cuộn tới đoạn văn và gạch chân nó trong chốc lát.

Ở tab Gate, phần "Before you approve" của bước đang chờ duyệt liệt kê các kiểm tra tự động **cộng với mọi ghi chú của bước đó**. Ghi chú màu Issue được xếp lên đầu.

**Why this priority**: Đưa ghi chú tới đúng người duyệt. Phần này cần US4 có trước.

**Independent Test**: Có hai ghi chú trên Plan, một Issue và một Key. Mở tab Gate của Plan: hai ghi chú hiện, Issue đứng trước. Bấm ghi chú trong tab Highlights: trang chuyển sang Plan và gạch chân đoạn văn.

**Acceptance Scenarios**:

1. **Given** spec có highlight, **When** mở tab Highlights, **Then** thấy số lượng theo từng màu, các mục nhóm theo bước, mỗi mục có đoạn trích, ghi chú, người viết và thời gian.
2. **Given** bấm một mục, **When** trang chuyển bước, **Then** đoạn văn nằm khoảng 120px từ đầu cột đọc và được gạch chân khoảng 1.6 giây.
3. **Given** bước đang chờ duyệt có ghi chú, **When** mở tab Gate, **Then** "Before you approve" có các ghi chú ở dạng "{Người viết}: {ghi chú}", ghi chú Issue lên đầu. Phần này ẩn khi không có gì để hiện.
4. **Given** chưa có highlight nào, **When** mở tab Highlights, **Then** thấy dòng "Select text in any artifact to highlight it or leave a note for the team."

---

### Edge Cases

- **Đoạn chọn vượt ra ngoài cột đọc** (sang sidebar hay header): không hiện thanh công cụ.
- **Khoảng trắng ở đầu và cuối đoạn chọn:** bị bỏ trước khi lưu.
- **Trình duyệt không hỗ trợ tô màu mà không sửa trang:** highlight vẫn hiện trong panel, và đoạn văn được tô bằng cách dự phòng, hoặc không tô, kèm thông báo.
- **Thiết bị cảm ứng:** thanh công cụ hiện sau khi tay cầm chọn văn bản dừng lại. Vùng bấm tối thiểu 44px.
- **Cuộn cột đọc khi thanh công cụ đang mở:** thanh công cụ đóng.
- **Ghim ở lề:** không bao giờ gây cuộn ngang. Cột đọc chừa khoảng 28px bên phải cho ghim.
- **Spec trên nhánh chưa merge** (spec 003): highlight gắn với bản đang xem của nhánh đó.
- **Chế độ local:** đọc file highlight trong thư mục đã chọn, nên thấy highlight của cả nhóm (FR-028).
- **Hai người lưu highlight cùng lúc:** không ai mất highlight (FR-026).
- **File highlight quá lớn:** không lưu thêm được, kèm thông báo; highlight cũ không bị mất (FR-027).
- **Spec chưa có file highlight:** highlight đầu tiên tạo file (FR-025).
- **Nhánh đang xem bị bảo vệ hoặc đã bị xoá sau khi merge:** highlight chỉ xem được, kèm lý do (FR-015a).
- **Spec đang xem ở nhánh `feat/` được merge vào main:** highlight đi theo file vào main qua PR, như các file khác của spec.
- **Người chỉ có quyền đọc repo:** xem được mọi highlight, không tạo được; thanh công cụ chỉ còn Copy và Ask.
- **File highlight bị sửa tay làm hỏng:** ứng dụng không ghi đè; panel báo lỗi và chỉ cho đọc highlight cho tới khi file được sửa.

## Requirements *(mandatory)*

### Functional Requirements

**Cài đặt đọc (A)**

- **FR-001**: Header MUST có nút **Aa** mở popover cài đặt đọc gồm: Font (4 lựa chọn), Size (15, 16, 17, 18, 20, 22px), Spacing (giãn dòng 1.5, 1.7, 1.9), Width (600, 700, 820px), Page (White, Sepia, Green, Dark) và "Reset to default". Mặc định là Literata, 18px, 1.7, 700px, White.
- **FR-002**: Font đọc, cỡ, giãn dòng và độ rộng MUST chỉ áp cho văn xuôi trong cột đọc. Bảng, danh sách tiêu chí và checklist nhỏ hơn 2px. Giá trị ngắn (ô khoá–giá trị, lựa chọn clarify) nhỏ hơn 3px. Tiêu đề, mã artifact, đường dẫn file, dòng meta, nhãn, nút và dấu `[NEEDS CLARIFICATION]` MUST giữ font giao diện; mã artifact giữ cỡ 12px.
- **FR-003**: Font đọc MUST có đủ dấu tiếng Việt. Không dùng font của Amazon.
- **FR-004**: Cài đặt đọc và trạng thái sidebar MUST được nhớ cho từng người dùng đã đăng nhập (không theo vai trò), theo cùng cách ứng dụng đang lưu tuỳ chọn khác. Cài đặt MUST được áp dụng trước lần hiển thị đầu tiên.

**Theme (B)**

- **FR-005**: Nền đã chọn MUST đổi màu toàn bộ khung: header, hai sidebar, cột giữa, hộp thoại, popover. Không vùng nào được giữ màu nền cứng. Ngoại lệ: thanh công cụ highlight (luôn tối) và màu highlight.
- **FR-006**: Chữ thường MUST đạt tương phản từ 4.5:1 ở cả bốn nền. Nền Dark MUST đổi cả các màu nhấn nhạt để các khung chú thích vẫn đọc được.

**Sidebar (C)**

- **FR-007**: Header MUST có hai nút ẩn/hiện sidebar trái và phải. Mỗi nút cho biết đang ẩn hay hiện cho trình đọc màn hình, và có tooltip ("Queue & features", "Gate, highlights & Copilot").
- **FR-008**: Sidebar bị ẩn MUST không nhận focus và không được đọc ra. Ẩn cả hai thì còn một cột đọc ở giữa. Phím tắt `[` và `]` MAY có, và bị bỏ qua khi đang gõ chữ.

**Highlight (D)**

- **FR-009**: Bốn màu highlight có nghĩa cố định: Key, Question, Issue, Change. Nghĩa MUST hiện ở tooltip và ở bộ lọc trong panel. Màu tô MUST đọc được trên cả bốn nền.
- **FR-010**: Highlight MUST được hiển thị mà không sửa nội dung của artifact, và được vẽ lại sau mỗi lần artifact hiển thị lại hoặc đổi kích thước.
- **FR-011**: Thanh công cụ MUST có: 4 màu · Note · Copy · Ask, và thêm Remove khi sửa highlight của chính mình. Nó MUST luôn có nền tối ở mọi theme, giữ được đoạn chọn khi bấm nút, và đóng khi bấm ra ngoài, cuộn cột đọc hoặc nhấn Escape.
- **FR-012**: Trình sửa ghi chú MUST có: đoạn trích (tối đa 90 ký tự), ô nhập ("Add a note for the team…"), dòng "Visible to approvers", và hai nút thật Cancel (phụ) và Save note (chính). ⌘/Ctrl+Enter lưu, Escape huỷ.
- **FR-013**: Mỗi highlight có ghi chú MUST có ghim ở lề phải, ngang dòng đầu tiên của nó. Bấm ghim thì mở trình sửa ghi chú.
- **FR-014**: Highlight MUST được gắn bằng chính đoạn văn, cộng khoảng 32 ký tự trước và sau, cộng vị trí lúc tạo để chọn đúng lần xuất hiện khi đoạn văn lặp lại. Không tìm thấy đoạn văn thì highlight là **"Outdated, text changed"**: vẫn hiện trong panel, không tô trên văn bản.
- **FR-015**: Highlight của một spec MUST được lưu trong **một file JSON riêng nằm trong thư mục của spec** đó, đi kèm spec trong git. File chứa highlight của mọi bước (artifact) của spec. Ứng dụng MUST NOT sửa file nào khác của repo khi lưu highlight.
- **FR-015a**: Mỗi lần lưu MUST commit file highlight vào đúng nhánh mà người dùng đang xem spec: nhánh `feat/` khi spec chưa merge (spec 003), `main` khi đã merge. Nếu không commit được vào nhánh đó (nhánh bị bảo vệ, đã xoá, hoặc người dùng không có quyền push), highlight MUST vẫn xem được và ứng dụng MUST báo rõ lý do không lưu được.
- **FR-016**: Ai đọc được spec MUST xem được mọi highlight của spec. Ai có quyền ghi vào repo thì tạo được highlight. Như ghi chú của Google Docs, chỉ người tạo (owner) sửa màu, sửa ghi chú hoặc xoá được highlight của mình; người khác chỉ xem, Copy và Ask. Ứng dụng là nơi thực thi quy tắc này: người có quyền push vẫn sửa tay được file, và lịch sử git là nơi đối chiếu.
- **FR-017**: Tạo hoặc sửa ghi chú MUST để lại dấu vết hoạt động: "{tên} noted on {Phase}: "{60 ký tự đầu}"". Dấu vết là thông điệp commit của lần lưu file highlight, nên đọc được trong lịch sử git của file.

**Panel và cổng (E)**

- **FR-018**: Sidebar phải MUST có ba tab rộng bằng nhau: Gate · Highlights {số lượng của spec} · Copilot.
- **FR-019**: Tab Highlights MUST có:
  - bộ lọc theo màu, kèm số lượng;
  - nhóm theo bước, theo thứ tự các bước;
  - mỗi mục gồm thanh màu, đoạn trích, ghi chú (nếu có), người viết, nghĩa của màu và thời gian tương đối;
  - một dòng giới thiệu khi chưa có highlight nào.
- **FR-020**: Bấm một mục MUST chuyển sang bước của nó, cuộn đoạn văn tới khoảng 120px từ đầu cột và gạch chân khoảng 1.6 giây.
- **FR-021**: "Before you approve" ở tab Gate MUST thêm mọi ghi chú của bước đó vào sau các kiểm tra tự động, ở dạng "{Người viết}: {ghi chú}", ghi chú Issue lên đầu. Phần này ẩn khi không có gì.

**Chất lượng (F)**

- **FR-022**: Mọi điều khiển MUST dùng được bằng bàn phím và có viền focus rõ. Popover Aa và thanh công cụ MUST được trình đọc màn hình nhận là hộp thoại có tên.
- **FR-023**: Vùng bấm MUST từ 36px trở lên trên máy tính và 44px trên cảm ứng. Khi người dùng bật "giảm chuyển động", không có chuyển màu theme hay hiệu ứng gạch chân.
- **FR-024**: Đổi font hoặc cỡ chữ MUST chỉ làm cột đọc dàn lại, không làm phần khác của trang xê dịch.

**Lưu trữ (theo Clarifications)**

- **FR-025**: Nếu spec chưa có file highlight, highlight đầu tiên MUST tạo file. Xoá highlight cuối cùng để lại file rỗng, không xoá file.
- **FR-026**: Mỗi lần lưu MUST đọc lại bản mới nhất của file, gộp thay đổi theo mã highlight, rồi mới ghi, và chỉ ghi khi file chưa bị đổi kể từ lúc đọc. Hai người lưu gần như cùng lúc thì không highlight nào bị mất. Nếu vẫn xung đột, ứng dụng thử lại, rồi báo lỗi; không âm thầm ghi đè.
- **FR-027**: Khi file highlight vượt một ngưỡng kích thước, ứng dụng MUST từ chối lưu thêm và báo rõ; highlight đã có không bị mất. Plan chọn ngưỡng.
- **FR-028**: Ở local, ứng dụng MUST đọc file highlight trong thư mục đã chọn và hiện highlight, ghim, panel và brief như server và Pages. Local MUST NOT gửi đoạn trích ra mạng.
- **FR-029**: Demo MUST có đủ chức năng như trên với dữ liệu mẫu, lưu trong trình duyệt, và MUST NOT gọi GitHub.

### Key Entities

- **Cài đặt đọc**: font, cỡ, giãn dòng, độ rộng, nền; thuộc về một người dùng.
- **Trạng thái sidebar**: trái hiện/ẩn, phải hiện/ẩn; thuộc về một người dùng.
- **Highlight**:
  - vị trí: spec, bước, phiên bản artifact lúc tạo;
  - đoạn văn, cộng phần trước và sau, cộng vị trí gợi ý;
  - màu (Key, Question, Issue, Change), ghi chú;
  - người tạo, lúc tạo, lúc sửa;
  - trạng thái: hiện, hoặc Outdated.
- **Hoạt động**: ai, ghi chú bước nào, trích đoạn đầu, lúc nào.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Đổi font, cỡ, giãn dòng hoặc độ rộng chỉ đổi văn xuôi trong cột đọc. 100% mã artifact, tiêu đề và nút giữ font giao diện.
- **SC-002**: Ở cả bốn nền, mọi vùng của trang đổi màu theo, và chữ thường đạt tương phản từ 4.5:1.
- **SC-003**: Cài đặt đọc và trạng thái sidebar còn nguyên sau khi tải lại, và không có lần nháy theme mặc định nào.
- **SC-004**: Từ lúc bôi đen tới lúc highlight hiện trên văn bản cần không quá 2 thao tác.
- **SC-005**: Highlight do người A tạo hiện cho người B ở lần làm mới kế tiếp, và gắn đúng đoạn văn, kể cả khi đoạn đó lặp lại trong artifact.
- **SC-006**: Khi đoạn văn đã tô bị sửa mất, 100% highlight của nó vẫn còn trong panel với nhãn "Outdated". Không cái nào biến mất.
- **SC-007**: Người duyệt thấy mọi ghi chú của bước đang duyệt ngay trong tab Gate, không phải mở tab khác.
- **SC-008**: Toàn bộ luồng dùng được chỉ bằng bàn phím: mở Aa, đổi cài đặt, tạo highlight, viết ghi chú, nhảy tới highlight từ panel.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): cả bốn.
  - Server và Pages: đủ chức năng; highlight lưu trong file highlight của spec (FR-015).
  - Local: đọc file highlight (FR-028).
  - Demo: đổi theo bản thiết kế mới; mốc so ảnh pixel được lấy lại ở bước implement, sau khi so với prototype.
- **Người dùng ở local:** không có login GitHub, nên tác giả là "You" và cài đặt đọc lưu chung cho trình duyệt đó.
- **"Theo người dùng":** là tài khoản GitHub đang đăng nhập.
  - Ứng dụng đang lưu tuỳ chọn theo login GitHub trong trình duyệt (`localStorage` khi bật Remember, `sessionStorage` trên Pages nếu không). Cài đặt đọc dùng cùng cơ chế đó.
  - Đồng bộ sang thiết bị khác cần một nơi lưu hồ sơ phía server mà ứng dụng chưa có. Việc đó nằm ngoài phạm vi.
- **Vai trò:** ứng dụng thật không có vai trò Director, Designer, Engineer, QA như bản demo. "Người duyệt" là bất kỳ ai có quyền duyệt cổng (spec 001, 004).
- **Hoạt động** (FR-017): ứng dụng thật chưa có bảng hoạt động. Lịch sử commit của file highlight là dấu vết.
- **Nguyên tắc I (constitution):** hiện chỉ cho ứng dụng ghi vào issue theo dõi. Ghi file highlight là một kiểu ghi mới vào repo, nên constitution MUST được sửa (bản MINOR, 1.2.0) để cho phép ghi đúng file highlight trong thư mục spec, trước khi implement. Plan ghi việc này vào Constitution Check.
- **Thiết kế:**
  - Bản thiết kế tham chiếu là dự án claude.ai/design "Speckit Workspace" (`Speckit Workspace.html`, `speckit/reader.jsx`, `speckit/app.jsx`).
  - Session này không truy cập được dự án đó, vì không có MCP `claude_design`. Bước plan cần đọc được prototype để so khớp.
  - Bốn nền màu và bốn màu highlight là ngoại lệ có chủ ý so với constitution IV ("không thêm màu mới"). Bước plan phải ghi vào Complexity Tracking, hoặc đề xuất sửa constitution.
- **Font:** tải từ Google Fonts. Bản Pages hiện chỉ cho tải stylesheet từ `fonts.googleapis.com` và font từ `fonts.gstatic.com`. Bước plan cần kiểm tra CSP (constitution II).
- **Khoá duyệt khi còn ghi chú Issue chưa xử lý:** đây là mục tuỳ chọn của mô tả gốc, nằm ngoài phạm vi spec này.

## Non-Goals

- Không đồng bộ cài đặt đọc giữa các thiết bị (chưa có nơi lưu hồ sơ phía server).
- Không khoá nút Approve khi còn ghi chú Issue.
- Không trả lời ghi chú thành chuỗi thảo luận.
- Không highlight trong Copilot hay trong sidebar; chỉ trong cột đọc.
- Không dùng font của Amazon (Bookerly…).
