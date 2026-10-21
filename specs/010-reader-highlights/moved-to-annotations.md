# Phần chuyển sang 010-spec-annotations

Ngày 2026-10-20, spec 010-reader-highlights được tách phạm vi (xem Clarifications của `spec.md`).
Phần highlight và ghi chú (mục D–E của mô tả gốc) chuyển sang spec
`specs/010-spec-annotations` (nhánh `feat/010-spec-annotations`, issue #26). File này giữ nguyên văn
phần đã viết và các quyết định đã chốt, để `/speckit-clarify` của spec annotations dùng làm đầu vào.
File này không phải yêu cầu của 010-reader-highlights.

**CSS đã có sẵn (2026-10-20):** toàn bộ CSS highlight của bản thiết kế đã nằm trong `src/styles/reader.css` (thanh công cụ `.sk-tb*`, panel `.sk-hlp*`, `::highlight(sk-*)`, `.hl-*`, tab ba cột `.sk-rtabs.is-3`). Màu là token `--hl-*` (constitution 1.3.0). Ghim ghi chú đổi tên từ `.sk-pin` của bản thiết kế thành `.sk-hl-pin`, vì `.sk-pin` đã là nút ghim repo (specs/003).

## Quyết định đã chốt (Session 2026-10-20)

- Q: Highlight dùng chung lưu ở đâu, ai xem và ai sửa được? → A: Highlight đi kèm spec, lưu thành **một file JSON riêng** trong thư mục của spec. Ai đọc được spec thì xem được mọi highlight. Chỉ người tạo (owner) sửa hoặc xoá được highlight của mình, giống ghi chú của Google Docs. (Thay cho phương án "khối JSON trong thân issue" chọn trước đó.)
- Q: Khi lưu highlight, file được commit vào nhánh nào? → A: Nhánh mà người dùng đang xem spec: `feat/NNN` khi spec chưa merge, `main` khi đã merge. Nhánh bị bảo vệ hoặc đã xoá thì highlight chỉ xem được, kèm thông báo.
- Q: Ở local, người dùng có được tạo, sửa, xoá highlight bằng cách ghi thẳng vào file highlight không? → A: Có, chỉ đúng file highlight; ứng dụng không commit, không push. Tác giả là tên người dùng tự nhập một lần. Spec 007 được sửa để cho phép đúng ngoại lệ này.
- Áp dụng cho cả bốn chế độ; demo theo thiết kế mới (FR-029 bên dưới).

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

## Edge cases

- **Đoạn chọn vượt ra ngoài cột đọc** (sang sidebar hay header): không hiện thanh công cụ.
- **Khoảng trắng ở đầu và cuối đoạn chọn:** bị bỏ trước khi lưu.
- **Trình duyệt không hỗ trợ tô màu mà không sửa trang:** highlight vẫn hiện trong panel, và đoạn văn được tô bằng cách dự phòng, hoặc không tô, kèm thông báo.
- **Thiết bị cảm ứng:** thanh công cụ hiện sau khi tay cầm chọn văn bản dừng lại. Vùng bấm tối thiểu 44px.
- **Cuộn cột đọc khi thanh công cụ đang mở:** thanh công cụ đóng.
- **Ghim ở lề:** không bao giờ gây cuộn ngang. Cột đọc chừa khoảng 28px bên phải cho ghim.
- **Spec trên nhánh chưa merge** (spec 003): highlight gắn với bản đang xem của nhánh đó.
- **Trình duyệt không cho ghi vào thư mục đã chọn, hoặc người dùng từ chối quyền ghi:** ở local, highlight chỉ xem được, kèm lý do.
- **Người dùng local chưa nhập tên:** ứng dụng hỏi tên ở lần highlight đầu tiên.
- **Hai người lưu highlight cùng lúc:** không ai mất highlight (FR-026).
- **File highlight quá lớn:** không lưu thêm được, kèm thông báo; highlight cũ không bị mất (FR-027).
- **Spec chưa có file highlight:** highlight đầu tiên tạo file (FR-025).
- **Nhánh đang xem bị bảo vệ hoặc đã bị xoá sau khi merge:** highlight chỉ xem được, kèm lý do (FR-015a).
- **Spec đang xem ở nhánh `feat/` được merge vào main:** highlight đi theo file vào main qua PR, như các file khác của spec.
- **Người chỉ có quyền đọc repo:** xem được mọi highlight, không tạo được; thanh công cụ chỉ còn Copy và Ask.
- **File highlight bị sửa tay làm hỏng:** ứng dụng không ghi đè; panel báo lỗi và chỉ cho đọc highlight cho tới khi file được sửa.

## Requirements

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

**Lưu trữ (theo Clarifications)**

- **FR-025**: Nếu spec chưa có file highlight, highlight đầu tiên MUST tạo file. Xoá highlight cuối cùng để lại file rỗng, không xoá file.
- **FR-026**: Mỗi lần lưu MUST đọc lại bản mới nhất của file, gộp thay đổi theo mã highlight, rồi mới ghi, và chỉ ghi khi file chưa bị đổi kể từ lúc đọc. Hai người lưu gần như cùng lúc thì không highlight nào bị mất. Nếu vẫn xung đột, ứng dụng thử lại, rồi báo lỗi; không âm thầm ghi đè.
- **FR-027**: Khi file highlight vượt một ngưỡng kích thước, ứng dụng MUST từ chối lưu thêm và báo rõ; highlight đã có không bị mất. Plan chọn ngưỡng.
- **FR-028**: Ở local, ứng dụng MUST đọc file highlight trong thư mục đã chọn và hiện highlight, ghim, panel và brief như server và Pages. Tạo, sửa và xoá highlight MUST ghi thẳng vào file highlight đó, và chỉ file đó. Ứng dụng MUST NOT commit, push, sửa file nào khác của repo, hay gửi đoạn trích ra mạng; người dùng tự commit bằng git. Đây là ngoại lệ duy nhất với quy tắc chỉ đọc của spec 007 (FR-006), và spec 007 MUST được cập nhật cho khớp.
- **FR-028a**: Ở local, tác giả là tên người dùng tự nhập ở lần highlight đầu tiên, lưu trong trình duyệt. Quy tắc chỉ tác giả được sửa hoặc xoá (FR-016) áp theo tên đó.
- **FR-029**: Demo MUST có đủ chức năng như trên với dữ liệu mẫu, lưu trong trình duyệt, và MUST NOT gọi GitHub.

## Key Entities

- **Highlight**:
  - vị trí: spec, bước, phiên bản artifact lúc tạo;
  - đoạn văn, cộng phần trước và sau, cộng vị trí gợi ý;
  - màu (Key, Question, Issue, Change), ghi chú;
  - người tạo, lúc tạo, lúc sửa;
  - trạng thái: hiện, hoặc Outdated.
- **Hoạt động**: ai, ghi chú bước nào, trích đoạn đầu, lúc nào.

## Success Criteria

- **SC-004**: Từ lúc bôi đen tới lúc highlight hiện trên văn bản cần không quá 2 thao tác.
- **SC-005**: Highlight do người A tạo hiện cho người B ở lần làm mới kế tiếp, và gắn đúng đoạn văn, kể cả khi đoạn đó lặp lại trong artifact.
- **SC-006**: Khi đoạn văn đã tô bị sửa mất, 100% highlight của nó vẫn còn trong panel với nhãn "Outdated". Không cái nào biến mất.
- **SC-007**: Người duyệt thấy mọi ghi chú của bước đang duyệt ngay trong tab Gate, không phải mở tab khác.

## Assumptions liên quan

- **Người dùng ở local:** không có login GitHub, nên tác giả là tên tự nhập (FR-028a), và cài đặt đọc lưu chung cho trình duyệt đó. Tên tự nhập không được xác thực; ở local, quy tắc chỉ tác giả được sửa chỉ để tránh sửa nhầm.
- **Vai trò:** ứng dụng thật không có vai trò Director, Designer, Engineer, QA như bản demo. "Người duyệt" là bất kỳ ai có quyền duyệt cổng (spec 001, 004).
- **Hoạt động** (FR-017): ứng dụng thật chưa có bảng hoạt động. Lịch sử commit của file highlight là dấu vết.
- **Nguyên tắc I (constitution):** hiện chỉ cho ứng dụng ghi vào issue theo dõi. Ghi file highlight là một kiểu ghi mới vào repo, nên constitution MUST được sửa (bản MINOR, 1.2.0) để cho phép ghi đúng file highlight trong thư mục spec, trước khi implement. Plan ghi việc này vào Constitution Check.
- **Khoá duyệt khi còn ghi chú Issue chưa xử lý:** đây là mục tuỳ chọn của mô tả gốc, nằm ngoài phạm vi spec này.

## Non-Goals liên quan

- Không khoá nút Approve khi còn ghi chú Issue.
- Không trả lời ghi chú thành chuỗi thảo luận.
- Không highlight trong Copilot hay trong sidebar; chỉ trong cột đọc.
