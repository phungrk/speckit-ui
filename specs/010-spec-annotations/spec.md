# Feature Specification: Chú thích (highlight và ghi chú) trên tài liệu của spec

**Feature Branch**: `feat/010-spec-annotations`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "thêm chức năng annotation, 1. highlight: user có thể highligh và commentt cho đoạn đó. 2. data annotation, được lưu cùng user - spec - content được highlight." Phạm vi được mở rộng ngày 2026-10-20 bằng mục D–E của mô tả "Kindle-style Reader Mode + Highlights" (chuyển từ `specs/010-reader-highlights`, xem `specs/010-reader-highlights/moved-to-annotations.md`). Giao diện theo bản thiết kế `Speckit Workspace.html` (`speckit/reader.jsx`); CSS đã có sẵn trong `src/styles/reader.css`.

## Clarifications

### Session 2026-10-20

Các quyết định này được chốt khi làm `specs/010-reader-highlights` và chuyển sang spec này.

- Q: Highlight dùng chung lưu ở đâu, ai xem và ai sửa được? → A: Highlight đi kèm spec, lưu thành một file JSON riêng trong thư mục của spec. Ai đọc được spec thì xem được mọi highlight. Chỉ người tạo sửa hoặc xoá được highlight của mình, giống ghi chú của Google Docs.
- Q: Khi lưu highlight, file được commit vào nhánh nào? → A: Nhánh mà người dùng đang xem spec: `feat/NNN` khi spec chưa merge, `main` khi đã merge. Nhánh bị bảo vệ hoặc đã xoá thì highlight chỉ xem được, kèm thông báo.
- Q: Ở chế độ local, người dùng có được tạo, sửa, xoá highlight bằng cách ghi thẳng vào file highlight không? → A: Có, chỉ đúng file highlight; ứng dụng không commit, không push. Tác giả là tên người dùng tự nhập một lần. Spec 007 được sửa để cho phép đúng ngoại lệ này.
- Q: Áp dụng cho chế độ nào? → A: Cả bốn chế độ có đủ chức năng; demo theo bản thiết kế mới.

### Session 2026-10-21

- Q: Khi người dùng lưu một highlight, nó được chia sẻ ngay cho cả nhóm, hay vẫn là bản nháp riêng cho tới khi bấm publish? → A: Lưu là chia sẻ ngay: mỗi lần lưu commit vào file JSON trong thư mục spec, trên nhánh đang xem. Bỏ bản nháp và bỏ publish thành comment trên issue (thay cho mô hình "bản nháp ở local, publish thành comment" của Session 2026-10-18).
- Q: Người dùng phải xác nhận việc commit lúc nào? → A: Một lần cho mỗi repo, ở lần lưu đầu tiên ("Highlights are committed to `<branch>` as you"). Trình duyệt nhớ lựa chọn, có thể bật lại trong Settings. Mỗi lần lưu hiện thông báo "Saved · commit abc1234" kèm liên kết.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Highlight và ghi chú trên đoạn văn (Priority: P1)

Người review bôi đen một đoạn trong tài liệu của spec (spec, plan, tasks, analysis…), và một thanh công cụ hiện ra. Họ có thể:
- chọn một trong bốn màu, mỗi màu có nghĩa cố định: **Key**, **Question**, **Issue**, **Change**;
- thêm ghi chú, sao chép đoạn văn, hoặc hỏi Copilot về đoạn đó.

Highlight hiện ngay trên đoạn văn. Đoạn có ghi chú có thêm một ghim ở lề phải. Lưu là chia sẻ: highlight được commit vào file highlight của spec, và người khác mở cùng spec cũng thấy.

**Why this priority**: Đây là phần giá trị chính: biến việc đọc thành đầu vào cho người duyệt.

**Independent Test**: Bôi đen một câu trong spec.md và chọn "Issue". Câu được tô màu, file highlight của spec có một commit mới trên nhánh đang xem. Tải lại trang: vẫn còn. Người khác mở cùng spec cũng thấy.

**Acceptance Scenarios**:

1. **Given** bôi đen ít nhất 2 ký tự không phải khoảng trắng, nằm trọn trong cột đọc, **When** thả chuột hoặc nhấc tay, **Then** thanh công cụ hiện ngay trên đoạn chọn, lật xuống dưới nếu không đủ chỗ, và không tràn khỏi màn hình.
2. **Given** chọn một màu, **When** highlight được lưu, **Then** đoạn văn được tô màu, nội dung tài liệu không bị sửa, file highlight của spec có thêm highlight đó, và highlight còn sau khi tải lại.
3. **Given** bấm Note, **When** nhập ghi chú và lưu (bằng nút hoặc ⌘/Ctrl+Enter), **Then** có ghim ở lề phải ngang dòng đầu của highlight. Ghi chú không chọn màu thì dùng màu Key.
4. **Given** bấm vào một highlight có sẵn hoặc vào ghim, **When** thanh công cụ mở ở chế độ sửa, **Then** người tạo được đổi màu, sửa ghi chú hoặc xoá. Người khác chỉ xem, Copy và Ask; không có nút sửa hay xoá.
5. **Given** bấm Ask, **When** sidebar phải mở tab Copilot, **Then** Copilot nhận câu hỏi "Explain this passage from {Phase} and flag any risk or gap: "{đoạn văn}"".
6. **Given** cùng một đoạn văn xuất hiện nhiều lần, **When** highlight được hiển thị lại, **Then** nó gắn đúng lần xuất hiện đã chọn, nhờ phần văn bản ngay trước và sau.
7. **Given** người dùng dùng điện thoại hoặc chỉ dùng bàn phím, **When** họ muốn highlight, **Then** họ chọn đoạn chữ bằng thao tác chạm hoặc bàn phím và vẫn làm được.

---

### User Story 2 - Highlight được lưu cùng spec, người tạo và đoạn văn (Priority: P1)

Mỗi highlight là một bản ghi trong file highlight của spec, gắn với **người tạo**, **spec và bước** (tài liệu), và **đoạn văn** (nguyên văn cùng ngữ cảnh quanh nó). File đi cùng spec trong git, nên lịch sử git của file cho biết ai thêm, sửa hay xoá ghi chú nào, khi nào.

**Why this priority**: Không có bản ghi đủ ba thứ đó thì không tra cứu được theo người hay theo spec, và không dựng lại được highlight khi tài liệu đổi.

**Independent Test**: Hai tài khoản highlight hai spec khác nhau. File highlight của mỗi spec chỉ chứa highlight của spec đó, mỗi bản ghi nêu đúng tài khoản, bước, nguyên văn và ghi chú. Lịch sử git của file có mỗi lần lưu là một commit với thông điệp mô tả việc đó.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập tạo highlight, **When** xem bản ghi, **Then** nó nêu đúng người tạo (tài khoản GitHub), spec, bước, nguyên văn đoạn được highlight cùng ngữ cảnh, màu, ghi chú, thời điểm tạo và thời điểm sửa gần nhất.
2. **Given** hai spec cùng có một câu giống hệt nhau, **When** người dùng highlight câu đó ở spec A, **Then** spec B không hiện highlight đó.
3. **Given** người dùng ở chế độ local, **When** tạo highlight, **Then** bản ghi mang tên tác giả họ đã tự nhập, và file highlight trong thư mục đã chọn được ghi thẳng, không có commit hay push.
4. **Given** spec đang xem ở nhánh `feat/` và nhánh đó được merge, **When** người dùng mở spec trên `main`, **Then** highlight đi theo file vào `main` như các file khác của spec.

---

### User Story 3 - Panel Highlights và "Before you approve" (Priority: P2)

Sidebar phải có ba tab: **Gate**, **Highlights {số lượng}**, **Copilot**. Tab Highlights:
- lọc được theo màu;
- nhóm theo bước (`02 · Specify`…);
- bấm một mục thì chuyển sang bước đó, cuộn tới đoạn văn và gạch chân nó trong chốc lát.

Ở tab Gate, phần "Before you approve" của bước đang chờ duyệt liệt kê các kiểm tra tự động **cộng với mọi ghi chú của bước đó**. Ghi chú màu Issue được xếp lên đầu.

**Why this priority**: Đưa ghi chú tới đúng người duyệt. Phần này cần US1 có trước.

**Independent Test**: Có hai ghi chú trên Plan, một Issue và một Key. Mở tab Gate của Plan: hai ghi chú hiện, Issue đứng trước. Bấm ghi chú trong tab Highlights: trang chuyển sang Plan và gạch chân đoạn văn.

**Acceptance Scenarios**:

1. **Given** spec có highlight, **When** mở tab Highlights, **Then** thấy số lượng theo từng màu, các mục nhóm theo bước, mỗi mục có đoạn trích, ghi chú, người viết, nghĩa của màu và thời gian.
2. **Given** bấm một mục, **When** trang chuyển bước, **Then** đoạn văn nằm khoảng 120px từ đầu cột đọc và được gạch chân khoảng 1.6 giây.
3. **Given** bước đang chờ duyệt có ghi chú, **When** mở tab Gate, **Then** "Before you approve" có các ghi chú ở dạng "{Người viết}: {ghi chú}", ghi chú Issue lên đầu. Phần này ẩn khi không có gì để hiện.
4. **Given** chưa có highlight nào, **When** mở tab Highlights, **Then** thấy dòng "Select text in any artifact to highlight it or leave a note for the team."

---

### User Story 4 - Highlight còn đúng khi tài liệu đổi (Priority: P3)

Tài liệu của spec đổi sau khi đã có highlight (ví dụ spec được sửa sau clarify). Highlight không được biến mất hay trỏ sai chỗ: nếu đoạn chữ vẫn còn thì vẫn gắn vào đó; nếu đoạn đã đổi hoặc không còn thì highlight hiện trong panel là **"Outdated, text changed"** cùng nguyên văn cũ và ghi chú.

**Why this priority**: Spec thay đổi liên tục qua các bước, nhưng phần này làm được sau khi tạo, lưu và xem đã chạy.

**Independent Test**: Highlight một câu, rồi đổi câu đó trong tài liệu. Highlight hiện "Outdated, text changed" với nguyên văn cũ. Đưa câu về như cũ thì highlight gắn lại đúng chỗ.

**Acceptance Scenarios**:

1. **Given** đoạn được highlight vẫn còn nguyên trong tài liệu sau khi tài liệu đổi chỗ khác, **When** người dùng mở lại, **Then** highlight vẫn gắn vào đúng đoạn đó.
2. **Given** đoạn được highlight đã bị sửa hoặc xoá, **When** người dùng mở lại, **Then** highlight không hiện trên văn bản, nhưng vẫn có trong panel với nhãn "Outdated, text changed", nguyên văn cũ và ghi chú.

---

### Edge Cases

- **Đoạn chọn vượt ra ngoài cột đọc** (sang sidebar hay header): không hiện thanh công cụ.
- **Đoạn chọn trải qua nhiều đoạn văn, tiêu đề, danh sách hoặc bảng:** tạo được nếu là văn bản liên tục trong cột đọc; nếu không, người dùng được báo lý do.
- **Chọn quá ngắn (dưới 2 ký tự) hoặc chỉ khoảng trắng:** không hiện thanh công cụ. Khoảng trắng ở đầu và cuối đoạn chọn bị bỏ trước khi lưu.
- **Hai highlight chồng hoặc lồng nhau:** cả hai vẫn chọn và xem được.
- **Ghi chú dài hoặc chứa ký tự đặc biệt, markdown, mã:** lưu và hiện đúng như người dùng gõ, không bị hiểu thành định dạng hay HTML.
- **Trình duyệt không hỗ trợ tô màu mà không sửa trang:** highlight vẫn hiện trong panel; đoạn văn được tô bằng cách dự phòng, hoặc không tô, kèm thông báo.
- **Thiết bị cảm ứng:** thanh công cụ hiện sau khi tay cầm chọn văn bản dừng lại. Vùng bấm tối thiểu 44px.
- **Cuộn cột đọc khi thanh công cụ đang mở:** thanh công cụ đóng.
- **Ghim ở lề:** không bao giờ gây cuộn ngang. Cột đọc đã chừa 28px bên phải cho ghim.
- **Spec chưa có file highlight:** highlight đầu tiên tạo file.
- **Hai người lưu highlight cùng lúc:** không ai mất highlight (FR-012).
- **File highlight quá lớn:** không lưu thêm được, kèm thông báo; highlight cũ không bị mất.
- **File highlight bị sửa tay làm hỏng:** ứng dụng không ghi đè; panel báo lỗi và chỉ cho đọc highlight cho tới khi file được sửa.
- **Nhánh đang xem bị bảo vệ, đã bị xoá, hoặc người dùng chỉ có quyền đọc repo:** xem được mọi highlight, không tạo được; thanh công cụ chỉ còn Copy và Ask, kèm lý do.
- **Người dùng huỷ bước xác nhận lần đầu:** không có commit nào; highlight đang soạn còn nguyên, lần lưu sau hỏi lại.
- **Lưu thất bại (mất mạng, bị từ chối):** highlight và ghi chú đang soạn vẫn còn để thử lại, không có highlight nửa vời.
- **Ở local, trình duyệt không cho ghi vào thư mục đã chọn, hoặc người dùng từ chối quyền ghi:** highlight chỉ xem được, kèm lý do.
- **Người dùng local chưa nhập tên:** ứng dụng hỏi tên ở lần highlight đầu tiên.
- **Người dùng chuyển spec, bước hoặc nhánh khi đang soạn ghi chú chưa lưu:** không mất âm thầm và không lưu nhầm sang spec khác.
- **Spec có hàng trăm highlight:** tô và panel vẫn mượt (SC-006).

## Requirements *(mandatory)*

### Functional Requirements

**Tạo và hiển thị**

- **FR-001**: Người dùng MUST chọn được một đoạn chữ trong cột đọc và tạo highlight với một trong bốn màu có nghĩa cố định: Key, Question, Issue, Change. Nghĩa MUST hiện ở tooltip và ở bộ lọc trong panel. Màu tô MUST đọc được trên cả bốn nền của chế độ đọc.
- **FR-002**: Highlight MUST được hiển thị mà không sửa nội dung của tài liệu, và được vẽ lại sau mỗi lần tài liệu hiển thị lại hoặc đổi kích thước.
- **FR-003**: Thanh công cụ MUST có: 4 màu · Note · Copy · Ask, và thêm Remove khi sửa highlight của chính mình. Nó MUST luôn có nền tối ở mọi nền, giữ được đoạn chọn khi bấm nút, và đóng khi bấm ra ngoài, cuộn cột đọc hoặc nhấn Escape.
- **FR-004**: Trình sửa ghi chú MUST có: đoạn trích (tối đa 90 ký tự), ô nhập ("Add a note for the team…"), dòng "Visible to approvers", và hai nút thật Cancel (phụ) và Save note (chính). ⌘/Ctrl+Enter lưu, Escape huỷ. Ghi chú tối đa 2.000 ký tự; vượt thì người dùng được báo trước khi lưu.
- **FR-005**: Mỗi highlight có ghi chú MUST có ghim ở lề phải, ngang dòng đầu tiên của nó. Bấm ghim thì mở trình sửa ghi chú.
- **FR-006**: Highlight MUST được gắn bằng chính đoạn văn, cộng khoảng 32 ký tự trước và sau, cộng vị trí lúc tạo để chọn đúng lần xuất hiện khi đoạn văn lặp lại. Không tìm thấy đoạn văn thì highlight là **"Outdated, text changed"**: vẫn hiện trong panel, không tô trên văn bản.
- **FR-007**: Đoạn trích và ghi chú MUST được hiển thị như văn bản thuần, không bao giờ được hiểu thành HTML hay mã (constitution II).

**Lưu và quyền**

- **FR-008**: Lưu (tạo, đổi màu, sửa ghi chú, xoá) MUST là chia sẻ ngay: không có bản nháp và không có bước publish riêng. Highlight của một spec MUST nằm trong **một file JSON riêng trong thư mục của spec**, chứa highlight của mọi bước. Ứng dụng MUST NOT sửa file nào khác của repo khi lưu highlight.
- **FR-009**: Ở server và Pages, mỗi lần lưu MUST là một commit vào đúng nhánh mà người dùng đang xem spec: nhánh `feat/` khi spec chưa merge (spec 003), `main` khi đã merge, bằng chính tài khoản GitHub của người đó. Nếu không commit được (nhánh bị bảo vệ, đã xoá, hoặc không có quyền ghi nội dung repo), highlight MUST vẫn xem được và ứng dụng MUST báo rõ lý do không lưu được.
- **FR-009a**: Ở server và Pages, lần lưu đầu tiên trong mỗi repo MUST hiện bước xác nhận nêu rõ highlight sẽ được commit vào nhánh nào, bằng tài khoản nào ("Highlights are committed to `<branch>` as you"). Huỷ thì không ghi gì và highlight đang soạn còn nguyên. Sau khi đồng ý, trình duyệt nhớ lựa chọn cho repo đó; người dùng bật lại được bước xác nhận trong Settings. Mỗi lần lưu thành công MUST hiện thông báo ngắn "Saved · commit {mã ngắn}" kèm liên kết tới commit. Local và demo không có bước này (không commit).
- **FR-010**: Thông điệp commit MUST mô tả việc vừa làm, ví dụ "{tên} noted on {Phase}: "{60 ký tự đầu}"", để lịch sử git của file là dấu vết hoạt động.
- **FR-011**: Ai đọc được spec MUST xem được mọi highlight của spec. Như ghi chú của Google Docs, chỉ người tạo đổi màu, sửa ghi chú hoặc xoá được highlight của mình; người khác chỉ xem, Copy và Ask. Ứng dụng là nơi thực thi quy tắc này; người có quyền push vẫn sửa tay được file, và lịch sử git là nơi đối chiếu.
- **FR-012**: Mỗi lần lưu MUST đọc lại bản mới nhất của file, gộp thay đổi theo mã highlight, rồi mới ghi, và chỉ ghi khi file chưa bị đổi kể từ lúc đọc. Hai người lưu gần như cùng lúc thì không highlight nào bị mất. Nếu vẫn xung đột, ứng dụng thử lại, rồi báo lỗi; không âm thầm ghi đè.
- **FR-013**: Nếu spec chưa có file highlight, highlight đầu tiên MUST tạo file. Xoá highlight cuối cùng để lại file rỗng, không xoá file. Khi file vượt một ngưỡng kích thước, ứng dụng MUST từ chối lưu thêm và báo rõ; highlight đã có không bị mất. Plan chọn ngưỡng.
- **FR-014**: File highlight bị hỏng (không đọc được) MUST không bị ghi đè; panel báo lỗi và chỉ cho đọc phần đọc được.
- **FR-015**: Lưu thất bại MUST giữ nguyên highlight và ghi chú đang soạn để thử lại, báo rõ lý do, và MUST không để lại highlight nửa vời.

**Chế độ**

- **FR-016**: Ở local, ứng dụng MUST đọc file highlight trong thư mục đã chọn và hiện highlight, ghim, panel và brief như server và Pages. Tạo, sửa và xoá MUST ghi thẳng vào file highlight đó, và chỉ file đó. Ứng dụng MUST NOT commit, push, sửa file nào khác của repo, hay gửi đoạn trích ra mạng; người dùng tự commit bằng git. Đây là ngoại lệ duy nhất với quy tắc chỉ đọc của spec 007 (FR-006), và spec 007 MUST được cập nhật cho khớp.
- **FR-017**: Ở local, tác giả là tên người dùng tự nhập ở lần highlight đầu tiên, lưu trong trình duyệt. Quy tắc chỉ tác giả được sửa hoặc xoá (FR-011) áp theo tên đó.
- **FR-018**: Demo MUST có đủ chức năng như trên, theo bản thiết kế, với dữ liệu mẫu lưu trong trình duyệt, và MUST NOT gọi GitHub.

**Panel và cổng**

- **FR-019**: Sidebar phải MUST có ba tab rộng bằng nhau: Gate · Highlights {số lượng của spec} · Copilot.
- **FR-020**: Tab Highlights MUST có:
  - bộ lọc theo màu, kèm số lượng;
  - nhóm theo bước, theo thứ tự các bước;
  - mỗi mục gồm thanh màu, đoạn trích, ghi chú (nếu có), người viết, nghĩa của màu và thời gian tương đối;
  - nhãn "Outdated, text changed" cho highlight không còn gắn được;
  - một dòng giới thiệu khi chưa có highlight nào.
- **FR-021**: Bấm một mục MUST chuyển sang bước của nó, cuộn đoạn văn tới khoảng 120px từ đầu cột và gạch chân khoảng 1.6 giây.
- **FR-022**: "Before you approve" ở tab Gate MUST thêm mọi ghi chú của bước đó vào sau các kiểm tra tự động, ở dạng "{Người viết}: {ghi chú}", ghi chú Issue lên đầu. Phần này ẩn khi không có gì. Highlight MUST không chặn và không tự duyệt cổng nào.

**Chất lượng**

- **FR-023**: Tạo, xem, sửa và xoá highlight MUST dùng được ở bề rộng điện thoại và bằng bàn phím; thanh công cụ MUST được trình đọc màn hình nhận là hộp thoại có tên, và mọi nút có nhãn (constitution IV).

### Key Entities *(include if feature involves data)*

- **File highlight**: một file JSON trong thư mục của spec, chứa mọi highlight của spec đó; đi theo spec trong git, qua nhánh và PR.
- **Highlight**: mã nhận diện; spec và bước (tài liệu); neo (nguyên văn, khoảng 32 ký tự trước và sau, vị trí gợi ý, phiên bản tài liệu lúc tạo); màu (Key, Question, Issue, Change); ghi chú (có thể rỗng); người tạo; thời điểm tạo và sửa; trạng thái gắn (hiện, hoặc Outdated, tính khi hiển thị, không lưu).
- **Người tạo**: tài khoản GitHub đang đăng nhập (server, Pages), tên tự nhập (local), hoặc người mẫu (demo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Từ lúc bôi đen tới lúc highlight hiện trên văn bản cần không quá 2 thao tác, ở cả máy tính và điện thoại.
- **SC-002**: Highlight do người A lưu hiện cho người B ở lần làm mới kế tiếp, và gắn đúng đoạn văn, kể cả khi đoạn đó lặp lại trong tài liệu.
- **SC-003**: Mỗi lần lưu thành công tạo đúng một commit, chỉ đổi file highlight của spec đó; 0 file khác của repo bị đổi.
- **SC-004**: Hai người lưu highlight gần như cùng lúc trên cùng spec: 0 highlight bị mất.
- **SC-005**: Khi đoạn văn đã tô bị sửa mất, 100% highlight của nó vẫn còn trong panel với nhãn "Outdated, text changed".
- **SC-006**: Với 200 highlight trong một spec, mở một tài liệu và chuyển bước vẫn hiện highlight trong dưới 1 giây.
- **SC-007**: Người duyệt thấy mọi ghi chú của bước đang duyệt ngay trong tab Gate, không phải mở tab khác.
- **SC-008**: Ở bề rộng 390px, người dùng tạo, xem, sửa và xoá được một highlight mà không phải kéo ngang trang.

## Assumptions

- **Chế độ bị ảnh hưởng** (constitution III): cả bốn. Server và Pages commit qua GitHub; local ghi thẳng file; demo lưu trong trình duyệt.
- **Loại ghi mới:** commit file highlight vào repo là một loại ghi mới. Constitution 1.3.0, nguyên tắc I, chỉ cho ứng dụng ghi vào issue theo dõi và cấm tạo commit hay file trong repo, nên constitution MUST được sửa trước khi implement để cho phép ghi đúng file highlight trong thư mục spec, có bước xác nhận rõ ràng trong giao diện (FR-009a: một lần cho mỗi repo). Plan ghi việc này vào Constitution Check.
- **Quyền token:** commit cần quyền ghi nội dung repo (Contents: write), rộng hơn quyền Issues mà duyệt cổng đang dùng. Spec MUST nêu quyền này (constitution II) và README cập nhật mục quyền token. Người không có quyền này vẫn xem được highlight (FR-009).
- **Tài liệu hỗ trợ:** mọi tài liệu markdown của spec mà speckit-ui đã hiển thị trong cột đọc. Ảnh, sơ đồ, Copilot và sidebar nằm ngoài phạm vi.
- **Vai trò:** ứng dụng thật không có vai trò Director, Designer, Engineer, QA như bản demo. "Người duyệt" là bất kỳ ai có quyền duyệt cổng (spec 001, 004).
- **Người dùng ở local:** tên tự nhập không được xác thực; quy tắc chỉ tác giả được sửa ở local chỉ để tránh sửa nhầm.
- **Giao diện:** theo bản thiết kế. CSS (thanh công cụ `.sk-tb*`, panel `.sk-hlp*`, `::highlight(sk-*)`, ghim `.sk-hl-pin`, ba tab `.sk-rtabs.is-3`, màu `--hl-*`) đã có trong `src/styles/reader.css` (constitution IV 1.3.0).
- **Khoá duyệt khi còn ghi chú Issue chưa xử lý:** mục tuỳ chọn của mô tả gốc, nằm ngoài phạm vi.

## Non-Goals

- Không có bản nháp riêng và không publish thành comment trên issue (Clarifications 2026-10-21).
- Không trả lời ghi chú thành chuỗi thảo luận, không @mention, không thông báo email hay đẩy.
- Không khoá nút Approve khi còn ghi chú Issue.
- Không highlight trong Copilot, sidebar, ảnh hay sơ đồ; chỉ trong cột đọc.
- Không sửa nội dung tài liệu của spec từ highlight.
- Không đồng bộ highlight với công cụ ngoài (Slack, Jira…).
