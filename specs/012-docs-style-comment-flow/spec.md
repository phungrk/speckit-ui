# Feature Specification: Luồng nhận xét kiểu Google Docs trên tài liệu spec

**Feature Branch**: `feat/012-docs-style-comment-flow`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "tôi muốn làm rõ gap giữa 010-spec-annotations và quy trình dùng chức năng comment trên 1 trang tài liệu kiểu google docs". Tham chiếu: 4 ảnh chụp luồng nhận xét kiểu Google Docs (Ảnh 1: chọn chữ và nút "Thêm nhận xét"; Ảnh 2: hộp soạn ở thanh bên; Ảnh 3: thẻ nhận xét và nút giải quyết; Ảnh 4: chuỗi trả lời có emoji), và `specs/010-spec-annotations` (nhánh `feat/010-spec-annotations`, chưa merge vào `main`).

## Clarifications

### Session 2026-10-21

- Q: Spec này khác gì `specs/011-annotation-threads`? → A: 011 lo **mô hình dữ liệu của cuộc thảo luận**: trả lời, emoji, giải quyết/mở lại. Spec này lo **luồng thao tác và cách hiển thị** để trải nghiệm giống Google Docs: nhận xét trước, màu sau; thẻ ở thanh bên thẳng hàng với đoạn chữ; trạng thái đang chọn; phản hồi khi lưu. Hai spec cùng dựa trên 010 và không lặp lại nhau.
- Q: Có sửa lại phần đã chốt của 010 không? → A: Không đổi cơ chế lưu của 010 (file `highlights.json`, commit vào nhánh đang xem, `[skip ci]`). Spec này chỉ thay lớp giao diện và thao tác phía trên, cộng thêm hai quyết định còn mở bên dưới.
- Q: Số spec? → A: 012, vì 011 đã dùng cho `011-annotation-threads` trên cùng nhánh này.
- Q1: Người duyệt không có quyền ghi nội dung repo thì sao? → A: Bất kỳ ai đọc được spec đều nhận xét được. Hiểu là: mọi người dùng đã đăng nhập và đọc được repo, không cần quyền ghi nội dung. Người có quyền ghi nội dung vẫn lưu vào file `highlights.json` như 010; người chỉ có quyền đọc lưu thành comment trên issue theo dõi của spec (nhãn `speckit`), kèm đoạn trích và neo. Giao diện hiển thị gộp hai nguồn như một, người dùng không phải biết nhận xét nằm ở đâu (FR-016 đến FR-019).
- Q2: Nhận xét không chọn màu thì được coi là gì? → A: Thêm giá trị thứ năm "không màu": nhận xét thường, tô trung tính, không mặc định Key. Vẫn vào "Before you approve", xếp sau Issue (FR-003).

## Gap giữa 010 và luồng Google Docs

So từng bước của luồng trong 4 ảnh với `specs/010-spec-annotations` (spec.md, `contracts/annotations-ui.md`, `research.md`). Cột "Xử lý" cho biết ai lo khoảng cách đó.

| # | Bước trong Google Docs (ảnh) | 010 hiện có | Gap | Xử lý |
|---|------------------------------|-------------|-----|-------|
| G1 | Chọn chữ thì hiện nút nổi **Thêm nhận xét** cạnh đoạn chọn, chưa tô gì (Ảnh 1). | Chọn chữ thì hiện thanh công cụ có 4 ô màu, Note, Copy, Ask. Chọn màu là tạo highlight ngay; Note là nút phụ. | Nhận xét chưa phải hành động chính. Người muốn góp ý bằng lời phải chọn một màu hoặc tìm nút Note. Không có đường đi "chỉ nhận xét". | **Spec này** (US1) |
| G2 | Nhận xét không bắt buộc phân loại. Một kiểu tô duy nhất. | Mọi chú thích có một trong 4 màu có nghĩa (Key, Issue, Question, Change); ghi chú không chọn màu thì mặc định Key. | Mặc định Key dán nhãn "quan trọng" cho mọi nhận xét, kể cả khi người viết không có ý đó, và Key lại tính vào "Before you approve". Chưa quyết nhận xét có cần màu không. | **Spec này** (US1, câu hỏi Q2) |
| G3 | Hộp soạn hiện **ở thanh bên**, ngang đoạn chữ, có ảnh đại diện và tên người viết, nút Hủy / Nhận xét (Ảnh 2). | Trình sửa ghi chú là hộp nổi cạnh đoạn chọn, không có ảnh và tên người viết; nút Cancel / Save note. | Soạn ở chỗ khác với nơi đọc thảo luận; không thấy mình đang nhận xét dưới tên ai. | **Spec này** (US1) |
| G4 | Thẻ nhận xét nằm ở thanh bên, **thẳng hàng với đoạn chữ**; chọn thẻ thì đoạn chữ sáng hơn và ngược lại (Ảnh 2–4). | Ghim nhỏ ở lề phải; danh sách ở tab Highlights, nhóm theo bước, không thẳng hàng với văn bản. Bấm mục trong danh sách thì cuộn tới đoạn chữ (một chiều); bấm đoạn chữ thì mở trình sửa. | Không có thẻ cạnh đoạn chữ; không có trạng thái "đang chọn" của highlight; liên kết hai chiều chưa đầy đủ. Đọc tài liệu và đọc thảo luận là hai việc ở hai chỗ. | **Spec này** (US2) |
| G5 | Highlight đổi độ đậm khi thẻ được chọn hoặc không (Ảnh 2 so với Ảnh 3 và 4). | Một độ đậm; chỉ có gạch chân 1,6 giây khi nhảy tới. | Không biết nhận xét nào đang xem. | **Spec này** (US2) |
| G6 | Mọi người đáp lại ngay dưới nhận xét; có emoji (Ảnh 4). | Loại trừ trả lời theo chuỗi (Non-goals). | Thiếu trả lời và emoji. | `011` |
| G7 | Dấu tick **giải quyết và ẩn**, mở lại được (Ảnh 3). | Không có khái niệm đã giải quyết. | Thiếu trạng thái giải quyết và mục đã giải quyết. | `011` |
| G8 | Nhận xét hiện **ngay lập tức** với mọi người đang xem tài liệu. | Mỗi lần lưu là một commit; người khác thấy khi làm mới; nhận xét nằm theo nhánh đang xem. | Khác về bản chất, không xoá hết được (không có server thời gian thực). Cần người dùng hiểu rõ và tin vào trạng thái lưu. | **Spec này** (US3) |
| G9 | Người có vai trò **chỉ được nhận xét** vẫn nhận xét được mà không sửa được tài liệu. | Cần quyền ghi nội dung repo (Contents: write). Không có thì chỉ xem. | Người duyệt chỉ có quyền đọc (hoặc chỉ quyền issue) không nhận xét được, trong khi họ là đối tượng chính của "Before you approve". | **Spec này** (US4, đã chốt Q1) |
| G10 | Nhận xét đang soạn (chưa gửi) không biến mất khi bấm sang chỗ khác trong tài liệu. | Có nêu "không mất âm thầm" khi chuyển spec/bước/nhánh. | Gần đủ; chỉ cần nêu rõ hành vi cho nhiều bản nháp trong cùng tài liệu. | **Spec này** (US1, edge case) |
| G11 | @mention, giao việc, thông báo email, chế độ gợi ý sửa. | Loại trừ. | Cố ý không làm. | Non-goals |
| G12 | Nhận xét gắn vào đoạn chữ đã bị xoá thì hiện lẻ hoặc mất. | "Outdated, text changed" kèm nguyên văn cũ. | 010 tốt hơn Google Docs; giữ nguyên. | Không gap |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nhận xét là hành động chính khi chọn chữ (Priority: P1)

Người duyệt bôi chọn một đoạn chữ trong tài liệu. Cạnh đoạn chọn hiện một nút nổi **Thêm nhận xét**. Bấm vào, một hộp soạn mở ở thanh bên, thẳng hàng với đoạn chữ, ghi ảnh và tên người dùng hiện tại, có ô nhập và hai nút **Hủy** / **Nhận xét**. Gửi xong, nhận xét thành thẻ ở thanh bên và đoạn chữ được tô. Màu phân loại (Key, Issue, Question, Change) của 010 vẫn dùng được nhưng là bước tuỳ chọn, không phải điều kiện để góp ý (theo câu trả lời Q2).

**Why this priority**: Khoảng cách G1 đến G3 nằm ở đúng thao tác người duyệt làm nhiều nhất. Nếu phải chọn màu hoặc đi tìm nút Note thì họ ngại góp ý, và "Before you approve" thiếu nội dung.

**Independent Test**: Bôi chọn một câu, bấm Thêm nhận xét, gõ, bấm Nhận xét. Thẻ xuất hiện ở thanh bên ngang câu đó, mang ảnh và tên người dùng; câu được tô. Làm lại và bấm Hủy: không có gì được tạo.

**Acceptance Scenarios**:

1. **Given** người dùng chọn một đoạn chữ hợp lệ (theo quy tắc chọn của 010), **When** thả chuột hoặc nhấc tay, **Then** hiện nút Thêm nhận xét cạnh đoạn chọn, có nhãn cho bàn phím và trình đọc màn hình.
2. **Given** người dùng bấm Thêm nhận xét, **When** hộp soạn mở, **Then** hộp nằm ở thanh bên ngang đoạn chữ, hiện ảnh và tên người dùng, con trỏ nằm sẵn trong ô nhập, đoạn chữ được đánh dấu là đang soạn.
3. **Given** hộp soạn có nội dung, **When** người dùng bấm Nhận xét (hoặc ⌘/Ctrl+Enter), **Then** nhận xét được lưu, hiện thành thẻ có tên, giờ, nội dung, và đoạn chữ được tô.
4. **Given** hộp soạn đang mở, **When** người dùng bấm Hủy hoặc nhấn Escape, **Then** không có nhận xét nào được tạo, đoạn chữ trở lại bình thường; nếu đã gõ chữ thì được hỏi lại trước khi bỏ.
5. **Given** hộp soạn để trống, **When** người dùng bấm Nhận xét, **Then** không gửi gì và ô nhập nhắc cần nhập nội dung.
6. **Given** người dùng đang soạn nhận xét chưa gửi, **When** họ chọn một đoạn chữ khác, **Then** nội dung đang soạn không mất âm thầm: giữ lại hoặc hỏi trước khi bỏ.
7. **Given** nhận xét đã tạo mà không chọn màu, **When** người dùng xem nó, **Then** nó hiện với kiểu mặc định theo Q2 và vẫn gán màu phân loại sau được.

---

### User Story 2 - Thẻ nhận xét thẳng hàng với đoạn chữ, chọn hai chiều (Priority: P1)

Thanh bên cạnh tài liệu hiển thị các thẻ nhận xét **thẳng hàng theo chiều dọc** với đoạn chữ mà chúng gắn vào, cuộn cùng tài liệu. Chọn một thẻ thì đoạn chữ tương ứng sáng hơn; bấm vào một đoạn chữ đang tô thì thẻ tương ứng được chọn và mở rộng. Khi nhiều thẻ chen chỗ nhau, chúng được đẩy xuống mà không đè lên nhau.

**Why this priority**: Khoảng cách G4 và G5. Người đọc phải thấy nhận xét ngay cạnh chỗ nó nói về, thay vì mở tab khác và tìm lại vị trí. Đây là điểm khác lớn nhất giữa đọc tài liệu có nhận xét và đọc danh sách ghi chú.

**Independent Test**: Tài liệu có 3 nhận xét ở 3 chỗ. Cuộn tài liệu: mỗi thẻ đi cùng đoạn chữ của nó. Bấm thẻ thứ hai: đoạn chữ thứ hai sáng hơn, hai đoạn kia dịu. Bấm đoạn chữ thứ ba: thẻ thứ ba được chọn.

**Acceptance Scenarios**:

1. **Given** tài liệu có nhận xét, **When** người dùng cuộn tài liệu, **Then** mỗi thẻ nằm ngang đoạn chữ của nó và cuộn cùng.
2. **Given** hai nhận xét gắn vào hai đoạn rất gần nhau, **When** hiển thị, **Then** thẻ thứ hai được đẩy xuống dưới thẻ thứ nhất, không chồng lên nhau, và vẫn nhận ra được đoạn chữ nào là của thẻ nào.
3. **Given** có thẻ chưa chọn, **When** người dùng chọn thẻ đó, **Then** thẻ mở rộng, đoạn chữ tương ứng đậm hơn các đoạn khác, và trang cuộn tới đoạn chữ nếu nó ngoài tầm nhìn.
4. **Given** người dùng bấm vào đoạn chữ đang tô, **When** vùng chọn rỗng, **Then** thẻ tương ứng được chọn và mở rộng.
5. **Given** chữ gắn nhận xét đã đổi hoặc mất (Outdated của 010), **When** hiển thị, **Then** thẻ vẫn hiện, không thẳng hàng với đoạn chữ nào, nằm ở nhóm riêng "Outdated, text changed" cùng nguyên văn cũ.
6. **Given** màn hình hẹp (điện thoại), **When** hiển thị, **Then** thanh bên không còn thẳng hàng mà chuyển thành ngăn kéo hoặc khối dưới tài liệu; chọn nhận xét vẫn cuộn tới đúng đoạn chữ.
7. **Given** vẫn có ghim ở lề và tab Highlights của 010, **When** người dùng dùng chúng, **Then** chúng chọn cùng thẻ như bấm vào đoạn chữ (một trạng thái chọn duy nhất).

---

### User Story 3 - Biết nhận xét đã lưu, và hiểu khi nào người khác thấy (Priority: P2)

Mỗi nhận xét cho biết trạng thái: đang gửi, đã lưu (kèm liên kết tới commit), hoặc lưu thất bại (kèm lý do và nút thử lại). Người dùng cũng nhìn thấy khi có nhận xét mới của người khác: không cần làm mới cả trang, và ứng dụng cho biết lần cập nhật gần nhất.

**Why this priority**: Khoảng cách G8. Google Docs làm người dùng tin rằng nhận xét đến ngay mọi người. 010 lưu bằng commit nên không thể tức thì, nên người dùng phải được nói thật và có cách kiểm tra. Làm sau US1 và US2 vì chúng cho giá trị trước.

**Independent Test**: Gửi nhận xét khi mạng chậm: thẻ hiện "Đang gửi…", rồi "Đã lưu · commit abc1234". Ngắt mạng và gửi: thẻ hiện lỗi và nút thử lại, nội dung còn nguyên. Từ máy khác thêm nhận xét: máy đầu thấy sau khi làm mới nhẹ hoặc đến chu kỳ cập nhật.

**Acceptance Scenarios**:

1. **Given** người dùng bấm Nhận xét, **When** việc lưu đang chạy, **Then** thẻ hiện ngay với trạng thái đang gửi và không cho gửi lặp.
2. **Given** lưu thành công, **When** hoàn tất, **Then** thẻ hiện đã lưu kèm liên kết tới commit (từ 010 FR-009a).
3. **Given** lưu thất bại, **When** lỗi xảy ra, **Then** thẻ hiện lý do dễ hiểu và nút thử lại; nội dung nhận xét không mất (010 FR-015).
4. **Given** người khác đã lưu nhận xét mới, **When** người dùng bấm làm mới trong thanh bên hoặc ứng dụng tự kiểm tra, **Then** nhận xét mới hiện mà không mất nội dung người dùng đang soạn.
5. **Given** người dùng đang xem spec ở một nhánh, **When** nhận xét của người khác nằm ở nhánh khác của cùng spec, **Then** thanh bên cho biết đang xem nhận xét của nhánh nào và có thể có nhận xét khác ở nhánh còn lại.

---

### User Story 4 - Người chỉ có quyền đọc cũng nhận xét được (Priority: P1)

Người duyệt chỉ có quyền đọc repo bôi chọn chữ và nhận xét như mọi người khác. Họ không thấy khác biệt nào trong thao tác. Nhận xét hiện thành thẻ thẳng hàng với đoạn chữ, lẫn với nhận xét của người có quyền ghi.

**Why this priority**: Q1 chốt "bất kỳ ai cũng comment được". Nếu chỉ người có quyền ghi nội dung nhận xét được thì người duyệt, đối tượng chính của "Before you approve", lại là người bị loại.

**Independent Test**: Đăng nhập bằng tài khoản chỉ có quyền đọc. Chọn một câu, bấm Thêm nhận xét, gõ, bấm Nhận xét. Thẻ hiện ở thanh bên. Trên GitHub, issue theo dõi của spec có thêm một comment mang đoạn trích; không có commit nào mới. Đăng nhập bằng tài khoản có quyền ghi: thấy cùng thẻ đó.

**Acceptance Scenarios**:

1. **Given** người dùng chỉ có quyền đọc, **When** họ gửi nhận xét, **Then** nhận xét lưu thành comment trên issue theo dõi và hiện thành thẻ, không có commit nào.
2. **Given** lần đầu dùng đường này trong repo, **When** người dùng bấm Nhận xét, **Then** hiện xác nhận nêu issue nào, tài khoản nào, ai đọc được (FR-019); huỷ thì không ghi gì và nội dung vẫn còn trong hộp soạn.
3. **Given** một nhận xét trong file highlight và một nhận xét trên issue gắn vào hai đoạn chữ, **When** hiển thị, **Then** cả hai hiện cùng kiểu, thẳng hàng với đoạn chữ của chúng, chọn được như nhau.
4. **Given** spec chưa có issue theo dõi, **When** người chỉ có quyền đọc gửi nhận xét, **Then** ứng dụng nói rõ lý do chưa lưu được bằng đường này (FR-020) và giữ nguyên nội dung.
5. **Given** đoạn chữ của nhận xét trên issue đã bị sửa, **When** hiển thị, **Then** thẻ hiện ở nhóm "Outdated, text changed" cùng nguyên văn cũ.

---

### Edge Cases

- **Nút Thêm nhận xét khi không đọc được spec hoặc phiên hết hạn:** hiện ở trạng thái tắt kèm lý do, không biến mất lặng lẽ.
- **Nhánh bị bảo vệ hoặc đã xoá:** người có quyền ghi không commit được (010 FR-009); khi đó nhận xét lưu bằng đường issue như người chỉ có quyền đọc, kèm thông báo.
- **Người dùng đổi từ quyền đọc sang quyền ghi giữa chừng:** nhận xét cũ trên issue vẫn hiện; nhận xét mới theo quyền hiện tại.
- **Cùng một nhận xét không bao giờ lưu hai lần** (cả file lẫn issue), kể cả khi người dùng thử lại sau lỗi.
- **Chọn chữ rất ngắn hoặc chỉ khoảng trắng, hoặc vượt khỏi cột đọc:** không hiện nút, theo 010.
- **Nhiều nhận xét chồng lên cùng một đoạn chữ:** thẻ xếp theo thứ tự tạo, chọn thẻ nào thì đoạn chữ tương ứng sáng lên; phần chồng nhau không làm mất thẻ nào.
- **Tài liệu dài, nhiều thẻ:** vẫn cuộn mượt; chỉ thẻ gần vùng nhìn thấy cần tính vị trí chi tiết.
- **Đổi cỡ chữ, bề rộng cột hoặc phiên bản tài liệu:** thẻ tính lại vị trí và không lệch khỏi đoạn chữ.
- **Soạn nhận xét rồi đóng thanh bên hoặc chuyển bước:** nội dung được giữ như một bản nháp theo tài liệu và nhắc khi quay lại.
- **Chỉ dùng bàn phím hoặc trình đọc màn hình:** chọn chữ, thêm nhận xét, soạn, gửi, chuyển giữa các thẻ đều làm được; thẻ đang chọn được công bố; mọi nút có nhãn (constitution IV).
- **Nội dung có HTML hoặc script:** hiển thị như chữ thuần (constitution II).
- **Demo và local:** cùng luồng như server; demo không gọi GitHub; local ghi thẳng file, không commit (010 FR-016, FR-018).

## Requirements *(mandatory)*

### Functional Requirements

**Thêm nhận xét (US1, G1–G3, G10)**

- **FR-001**: Khi người dùng chọn một đoạn chữ hợp lệ theo quy tắc của 010, ứng dụng MUST hiện một nút Thêm nhận xét cạnh đoạn chọn. Nút MUST là lựa chọn nổi bật nhất, và MUST có nhãn cho bàn phím và trình đọc màn hình.
- **FR-002**: Bấm Thêm nhận xét MUST mở hộp soạn ở thanh bên, ngang đoạn chữ, hiện ảnh và tên người dùng hiện tại, có ô nhập, nút Hủy và nút Nhận xét; con trỏ MUST nằm sẵn trong ô nhập và đoạn chữ MUST được đánh dấu là đang soạn.
- **FR-003**: Nhận xét MUST tạo được mà không phải chọn màu. Màu phân loại của 010 MUST vẫn gán được khi tạo hoặc sau đó. Nhận xét không chọn màu MUST là giá trị thứ năm "không màu" (nhận xét thường), tô trung tính, không mặc định Key. Nó MUST vẫn vào "Before you approve" của bước đó, xếp sau ghi chú Issue và trước các màu còn lại; việc này mở rộng 010 FR-022.
- **FR-004**: Nhận xét trống MUST không được lưu. Nội dung dài tối đa 2.000 ký tự như 010 (FR-004). Nội dung MUST được hiển thị như chữ thuần.
- **FR-005**: Hủy hoặc Escape MUST bỏ hộp soạn không tạo gì; nếu đã gõ chữ, ứng dụng MUST hỏi trước khi bỏ. Chuyển sang đoạn chữ khác, tài liệu khác hoặc bước khác MUST không làm mất âm thầm nội dung đang soạn.
- **FR-006**: Thanh công cụ của 010 (Copy, Ask, chọn màu) MUST vẫn truy cập được, nhưng không được che mất hành động nhận xét.

**Thẻ ở thanh bên và chọn hai chiều (US2, G4–G5)**

- **FR-007**: Thanh bên cạnh tài liệu MUST hiển thị các thẻ nhận xét thẳng hàng theo chiều dọc với đoạn chữ của chúng và cuộn cùng tài liệu. Thẻ chen chỗ nhau MUST được đẩy xuống mà không đè nhau.
- **FR-008**: Chỉ MUST có một nhận xét "đang chọn" tại một thời điểm, dù chọn bằng thẻ, đoạn chữ, ghim ở lề hay mục ở tab Highlights. Nhận xét đang chọn MUST có thẻ mở rộng và đoạn chữ đậm hơn các đoạn khác.
- **FR-009**: Chọn một thẻ MUST cuộn tài liệu tới đoạn chữ khi nó ngoài tầm nhìn; bấm đoạn chữ MUST chọn và cuộn tới thẻ.
- **FR-010**: Nhận xét Outdated (010 FR-006) MUST vẫn hiện, ở một nhóm riêng, cùng nguyên văn cũ; không thẳng hàng với đoạn chữ nào.
- **FR-011**: Ở màn hình hẹp, thanh bên MUST chuyển thành bố cục dùng được (ngăn kéo hoặc khối dưới tài liệu) mà không cuộn ngang; chọn nhận xét MUST vẫn đưa người dùng tới đúng đoạn chữ.
- **FR-012**: Ghim ở lề và tab Highlights của 010 MUST vẫn hoạt động và dùng chung trạng thái chọn của FR-008; không tồn tại hai nơi chọn không đồng bộ.

**Trạng thái lưu và cập nhật (US3, G8)**

- **FR-013**: Mỗi nhận xét MUST cho biết trạng thái đang gửi, đã lưu hoặc thất bại. Đã lưu MUST kèm liên kết tới commit (server, Pages); thất bại MUST kèm lý do và nút thử lại, giữ nguyên nội dung (010 FR-015).
- **FR-014**: Ứng dụng MUST có cách cập nhật nhận xét mới của người khác mà không mất nội dung đang soạn: nút làm mới trong thanh bên, và MUST cho biết lần cập nhật gần nhất. Cập nhật tức thì không bắt buộc.
- **FR-015**: Thanh bên MUST cho biết nhận xét đang hiển thị thuộc nhánh nào của spec (010 FR-009).

**Quyền và chế độ**

- **FR-016**: Bất kỳ ai đọc được spec MUST nhận xét được (FR-017). Người không đọc được spec, hoặc phiên đã hết hạn, MUST thấy nút Thêm nhận xét ở trạng thái tắt kèm lý do và cách khắc phục, không thấy nút biến mất.

**Nhận xét của người chỉ có quyền đọc (US4, G9)**

- **FR-017**: Người dùng không có quyền ghi nội dung repo MUST lưu được nhận xét. Khi đó nhận xét MUST được ghi thành một comment trên issue theo dõi của spec (nhãn `speckit`, dấu `<!-- speckit-ui:spec=... -->`), chứa đoạn trích, ngữ cảnh quanh nó, tài liệu, và nội dung. Người có quyền ghi nội dung vẫn lưu vào file highlight theo 010. Ứng dụng MUST NOT tạo commit, branch hay PR cho người chỉ có quyền đọc.
- **FR-018**: Giao diện MUST hiển thị nhận xét từ hai nguồn (file highlight và comment trên issue) như một danh sách thống nhất: cùng thẻ, cùng thẳng hàng với đoạn chữ, cùng trạng thái chọn. Nguồn lưu chỉ được nhắc ở chi tiết nhỏ của thẻ. Nhận xét ở issue gắn lại với đoạn chữ theo cùng cách neo của 010 (010 FR-006), kể cả Outdated.
- **FR-019**: Trước lần lưu đầu tiên bằng đường này trong một repo, ứng dụng MUST hiện bước xác nhận nói rõ nhận xét sẽ được đăng thành comment trên issue theo dõi nào, bằng tài khoản nào, ai đọc được issue đó (constitution I: loại ghi mới phải có xác nhận rõ ràng). Quyền token cần thêm (nếu có) MUST được nêu rõ trong spec và README (constitution II). Ứng dụng MUST NOT dò quyền bằng cách thử ghi.
- **FR-020**: Nếu spec chưa có issue theo dõi, ứng dụng MUST cho người dùng biết lý do nhận xét chưa lưu được bằng đường này và MUST không tự tạo issue ngoài quy trình tạo issue hiện có của cổng; cách xử lý còn lại do `/speckit-clarify` quyết (xem Assumptions).
- **FR-017**: Cả ba chế độ MUST có luồng như nhau: server, Pages, local và demo cùng bố cục, thao tác và trạng thái; khác biệt chỉ ở nơi lưu (constitution III).
- **FR-018**: Giao diện MUST dùng token và class Modernist (`src/styles/modernist.css`, `src/styles/reader.css`), không bo góc, không thêm màu. Màn hình demo MUST giữ giống thiết kế khi chưa có nhận xét nào. Mọi thao tác MUST dùng được bằng bàn phím và có nhãn cho trình đọc màn hình (constitution IV).

### Key Entities *(include if feature involves data)*

- **Thẻ nhận xét**: dạng hiển thị của một chú thích (010) cộng, nếu có, chuỗi trả lời và trạng thái (011), kèm vị trí dọc hiện tại và trạng thái lưu (đang gửi, đã lưu, thất bại).
- **Bản nháp nhận xét**: nội dung đang soạn chưa gửi, gắn với tài liệu và đoạn chữ đã chọn; chỉ tồn tại ở trình duyệt, không ghi ra ngoài.
- **Nhận xét đang chọn**: một nhận xét duy nhất tại một thời điểm, quyết định thẻ mở rộng và đoạn chữ đậm hơn.

Spec này thêm vào file highlight của 010 đúng một giá trị màu mới "không màu" (tuỳ chọn, file cũ vẫn đọc được). Nhận xét lưu thành comment trên issue (FR-017) là một dạng lưu thứ hai cho cùng thực thể thẻ nhận xét; định dạng của nó do plan quyết.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người duyệt thêm một nhận xét lên đoạn chữ đã chọn trong không quá 3 thao tác (chọn, bấm Thêm nhận xét, gõ rồi bấm Nhận xét), không phải chọn màu nào.
- **SC-002**: Người dùng mới hoàn thành chuỗi chọn chữ, nhận xét, mở thẻ, quay lại tài liệu ở lần thử đầu tiên mà không cần hướng dẫn, trong dưới 2 phút.
- **SC-003**: Trong tài liệu có 20 nhận xét, mỗi thẻ nằm lệch không quá một dòng chữ so với đoạn chữ của nó khi không có thẻ nào chen chỗ, và không có hai thẻ đè lên nhau trong mọi trường hợp.
- **SC-004**: Chọn một nhận xét bằng bất kỳ cách nào (thẻ, đoạn chữ, ghim, tab Highlights) cho cùng một trạng thái: 100% trường hợp thử cho đúng một thẻ mở rộng và đúng một đoạn chữ đậm.
- **SC-005**: 100% lần lưu hiện đúng trạng thái trong vòng 1 giây sau khi có kết quả; 0 nhận xét đang soạn bị mất khi lưu thất bại hoặc khi chuyển chỗ chọn.
- **SC-006**: Với 200 nhận xét trong một spec, mở tài liệu và cuộn vẫn mượt, thẻ vẫn thẳng hàng đúng sau khi đổi cỡ chữ.
- **SC-007**: Toàn bộ luồng làm được chỉ bằng bàn phím và ở bề rộng 390px không có cuộn ngang.
- **SC-008**: Màn hình demo khi chưa có nhận xét khớp thiết kế gốc từng pixel ở 1440×900 và 924×540 (constitution IV).
- **SC-009**: Người chỉ có quyền đọc nhận xét được trong cùng số thao tác như người có quyền ghi (SC-001), và 0 commit hay branch được tạo bởi tài khoản đó.

## Assumptions

- **Phụ thuộc vào 010 và 011:** thao tác và hiển thị ở đây chỉ build được trên chú thích của 010 (chọn chữ, neo, file highlight, ghi qua commit); trả lời, emoji, giải quyết đến từ 011. Cho tới khi 010 merge vào `main`, spec này viết và lập plan được nhưng chưa implement được.
- **Chế độ bị ảnh hưởng** (constitution III): cả bốn như 010. Đây chủ yếu là thay đổi giao diện và thao tác dùng chung, nên áp đồng nhất.
- **Có một đường ghi thứ hai (hệ quả của Q1):** để người chỉ có quyền đọc nhận xét được, nhận xét được đăng thành comment trên issue theo dõi. Đây vẫn là loại ghi duy nhất constitution I cho phép từ đầu (issue có nhãn `speckit`), nhưng là loại nội dung mới (nhận xét của người dùng, không phải kết quả duyệt cổng), nên cần đủ quy trình Spec Kit và xác nhận trong UI. Constitution 1.4.0 của 010 chưa bàn tới việc này: plan phải ghi vào Constitution Check.
- **Đảo một quyết định của 010:** 010 đã chọn "bỏ publish thành comment trên issue" cho nhận xét của người có quyền ghi. Spec này không đảo điều đó; nó chỉ thêm comment trên issue cho người không có quyền ghi.
- **"Bất kỳ ai" nghĩa là bất kỳ ai đọc được spec:** không có nhận xét ẩn danh. Repo công khai thì người dùng GitHub đã đăng nhập nào cũng đọc được; repo riêng thì chỉ người có quyền đọc. Đây là cách hiểu của câu trả lời Q1; nếu muốn khác thì sửa ở `/speckit-clarify`.
- **Issue theo dõi có thể chưa tồn tại** (nó được tạo ở lần duyệt cổng đầu tiên). Mặc định của spec: FR-020 (báo lý do, không tự tạo). Có thể muốn cho phép tạo issue từ nhận xét; đó là một loại ghi nữa và nên quyết ở `/speckit-clarify`.
- **Ảnh hưởng tới 011:** trả lời, emoji, giải quyết của 011 hiện chỉ nói tới file highlight. Khi nhận xét có thể nằm ở comment trên issue, 011 cần mô tả cách trả lời và giải quyết áp lên cả hai nguồn. Việc cập nhật 011 chưa làm trong spec này.
- **Cập nhật tức thì vẫn không có:** comment trên issue cũng chỉ hiện khi làm mới (FR-014).
- **Ranh giới với 011:** nếu 011 và spec này cùng đụng một chỗ giao diện (thẻ trả lời trong thanh bên), spec này quyết bố cục, 011 quyết nội dung và dữ liệu của thẻ.
- **Giao diện theo ảnh nhưng bằng Modernist:** bố cục thanh bên, thẻ, hộp soạn, tooltip theo 4 ảnh; màu, viền, khoảng cách theo token có sẵn. Nhãn tiếng Việt lấy từ ảnh: Thêm nhận xét, Nhận xét, Hủy, Đánh dấu là đã giải quyết và ẩn cuộc thảo luận.
- **Cập nhật nhận xét của người khác không cần thời gian thực:** làm mới thủ công hoặc theo chu kỳ đủ; không dựng kết nối đẩy tức thì (constitution VII).
- **Ảnh đại diện lấy từ tài khoản GitHub** (server, Pages), chữ cái đầu của tên ở local, người mẫu ở demo.
- **Tài liệu hỗ trợ** là các tài liệu markdown của spec trong cột đọc, như 010.

## Non-Goals

- Không đổi cơ chế lưu của 010 (file, commit, nhánh, `[skip ci]`, xác nhận một lần mỗi repo).
- Không làm trả lời, emoji, giải quyết/ẩn: thuộc `011-annotation-threads`.
- Không @mention, giao việc, thông báo email hay đẩy, chế độ gợi ý sửa (G11).
- Không cập nhật thời gian thực bằng kết nối đẩy.
- Không nhận xét trên constitution, ảnh, sơ đồ, Copilot hay sidebar.
- Không chặn hay tự duyệt cổng dựa trên nhận xét (constitution VI).
- Không database hay dịch vụ lưu trữ riêng (constitution I, VII).
- Không sửa nội dung tài liệu spec từ nhận xét.
