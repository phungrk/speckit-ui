# Feature Specification: Thảo luận trên chú thích (trả lời, emoji, giải quyết)

**Feature Branch**: `feat/011-annotation-threads`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "hãy tham chiếu để xây tính năng comment trong app." Tham chiếu: 4 ảnh chụp luồng nhận xét kiểu Google Docs (chọn chữ → Thêm nhận xét → thẻ ở thanh bên → trả lời và thả emoji → "Đánh dấu là đã giải quyết và ẩn cuộc thảo luận"). Hai câu hỏi lưu trữ và phạm vi được trả lời bằng `specs/010-spec-annotations` (xem Clarifications).

## Clarifications

### Session 2026-10-21

Bản đầu của spec này (đặt tên `007-document-comments`) có hai câu hỏi mở. Cả hai được chốt bằng cách theo `specs/010-spec-annotations` (nhánh `feat/010-spec-annotations`, chưa merge vào `main`), vì spec 010 đã giải đúng bài toán đó.

- Q: Nhận xét lưu ở đâu, ai thấy? → A: Cùng chỗ với chú thích của 010: file `highlights.json` trong thư mục của spec, mỗi lần lưu là một commit chỉ đổi file đó, trên nhánh đang xem, bằng tài khoản người dùng, kèm `[skip ci]`, sau bước xác nhận một lần cho mỗi repo (010 FR-008…FR-010, FR-009a). Ai đọc được spec thì thấy mọi nhận xét. Local ghi thẳng file, không commit (010 FR-016). Demo lưu trong trình duyệt. Không dùng comment trên issue theo dõi, không dùng review comment của PR.
- Q: Áp dụng cho tài liệu nào? → A: Mọi tài liệu markdown của spec mà ứng dụng đã hiển thị trong cột đọc (spec, plan, tasks, analysis…), giống 010. Constitution, ảnh, sơ đồ, Copilot và sidebar nằm ngoài phạm vi.
- Q: Quan hệ với 010? → A: Spec này là phần mở rộng, không thay thế. 010 đã có chọn chữ, thanh công cụ, ghi chú gắn đoạn chữ, ghim ở lề, panel Highlights, neo khi tài liệu đổi, quyền sửa/xoá của tác giả, và ghi chú vào "Before you approve". 010 loại trừ rõ trả lời theo chuỗi; spec này bổ sung đúng phần đó cùng emoji và giải quyết/ẩn.
- Q: Số spec? → A: Đổi từ 007 sang 011 vì các nhánh `feat/007-*` đến `feat/010-*` đã dùng các số 007–010.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trả lời một ghi chú thành cuộc thảo luận (Priority: P1)

Người xem mở một ghi chú (từ ghim ở lề hoặc từ panel Highlights) và gõ trả lời. Các trả lời xếp theo thời gian dưới ghi chú gốc, mỗi trả lời có tên, giờ, nội dung. Ghi chú gốc cùng các trả lời là một **cuộc thảo luận**, hiện thành một thẻ ở thanh bên như ảnh tham chiếu. Lưu là chia sẻ ngay như 010.

**Why this priority**: Đây là phần thiếu lớn nhất so với ảnh tham chiếu: ở 010 người khác chỉ đọc ghi chú, không đáp lại được, nên góp ý dừng ở một chiều.

**Independent Test**: A tạo ghi chú trên một câu. B mở cùng spec, trả lời. Làm mới ở máy A: A thấy trả lời của B dưới ghi chú, đúng tên và giờ. Mỗi bước là một commit chỉ đổi file highlight.

**Acceptance Scenarios**:

1. **Given** một ghi chú do A tạo, **When** B (người không phải tác giả) gõ và gửi một trả lời, **Then** trả lời hiện dưới ghi chú gốc với tên và giờ của B, dù B không sửa hay xoá được ghi chú gốc.
2. **Given** ô trả lời để trống, **When** người dùng gửi, **Then** không có gì được lưu.
3. **Given** một trả lời do chính người dùng viết, **When** họ mở menu thêm, **Then** họ sửa hoặc xoá được trả lời đó; người khác không thấy các lựa chọn này. Ghi chú gốc vẫn theo quy tắc của 010 (chỉ tác giả).
4. **Given** hai người trả lời gần như cùng lúc, **When** cả hai lưu, **Then** cả hai trả lời đều còn (010 FR-012).
5. **Given** ghi chú gốc bị tác giả xoá, **When** có trả lời, **Then** người dùng được cảnh báo trước rằng cả cuộc thảo luận sẽ bị xoá cùng.

---

### User Story 2 - Đánh dấu đã giải quyết và ẩn (Priority: P1)

Khi góp ý đã được xử lý, người dùng bấm nút dấu tick có chú thích **Đánh dấu là đã giải quyết và ẩn cuộc thảo luận**. Cuộc thảo luận ẩn khỏi danh sách đang mở và đoạn chữ hết tô nổi bật. Họ xem lại được các cuộc thảo luận đã giải quyết và mở lại khi cần.

**Why this priority**: Spec đi qua nhiều vòng sửa; nếu không ẩn được góp ý đã xong thì tab Highlights và "Before you approve" ngập trong ghi chú cũ, làm người duyệt bỏ qua cả ghi chú còn hiệu lực.

**Independent Test**: Giải quyết một cuộc thảo luận. Nó rời danh sách đang mở, đoạn chữ hết tô, và còn trong mục đã giải quyết kèm người và giờ giải quyết. Mở lại thì nó trở về danh sách đang mở. Mở trên máy khác thì cùng trạng thái.

**Acceptance Scenarios**:

1. **Given** một cuộc thảo luận đang mở, **When** người dùng bấm dấu tick, **Then** nó ẩn khỏi danh sách đang mở, đoạn chữ không còn nổi bật, và ghim ở lề biến mất.
2. **Given** có cuộc thảo luận đã giải quyết, **When** người dùng chọn xem mục đã giải quyết, **Then** thấy chúng kèm người giải quyết, giờ giải quyết, và mở lại được.
3. **Given** cổng đang chờ duyệt, **When** mở tab Gate, **Then** "Before you approve" chỉ liệt kê ghi chú của các cuộc thảo luận **đang mở** (mở rộng 010 FR-022), kèm số đã giải quyết được thu gọn. Việc này không chặn hay tự duyệt cổng.
4. **Given** một cuộc thảo luận đã giải quyết, **When** có người trả lời mới, **Then** nó tự mở lại.

---

### User Story 3 - Thả emoji (Priority: P2)

Dưới mỗi ghi chú hoặc trả lời, người dùng thả một emoji; emoji hiện kèm số người đã thả. Bấm lại đúng emoji thì gỡ.

**Why this priority**: Cho phản hồi nhanh ("đồng ý", "đã thấy") mà không cần viết trả lời. Nhẹ hơn US1 và US2 và không chặn chúng.

**Independent Test**: Thả hai emoji khác nhau lên hai trả lời. Mỗi emoji hiện số 1. Người thứ hai thả cùng emoji thì số thành 2. Gỡ thì số giảm.

**Acceptance Scenarios**:

1. **Given** một ghi chú hoặc trả lời, **When** người dùng chọn một emoji trong bộ có sẵn, **Then** emoji hiện kèm số người đã thả.
2. **Given** người dùng đã thả một emoji, **When** họ bấm lại emoji đó, **Then** emoji của họ bị gỡ và số giảm.
3. **Given** người khác thả emoji lên ghi chú của tôi, **When** tôi xem ghi chú, **Then** tôi không sửa hay xoá được emoji của họ.
4. **Given** hai người thả emoji gần như cùng lúc, **When** cả hai lưu, **Then** cả hai đều được tính.

---

### Edge Cases

- **Thảo luận trên đoạn chữ đã đổi hoặc không còn (Outdated, 010 FR-006):** vẫn trả lời, thả emoji và giải quyết được; hiện trong panel với nhãn "Outdated, text changed".
- **Ghi chú gốc không có nội dung (010 cho phép highlight chỉ có màu):** vẫn trả lời được; thảo luận bắt đầu từ trả lời đầu tiên.
- **Trả lời, emoji hoặc giải quyết khi nhánh bị bảo vệ, đã xoá, hoặc chỉ có quyền đọc:** xem được, không ghi được; các nút bị tắt kèm lý do (010 FR-009).
- **Lưu thất bại (mất mạng, bị từ chối):** nội dung trả lời đang soạn vẫn còn để thử lại, không có trả lời nửa vời (010 FR-015).
- **File highlight hỏng hoặc quá lớn:** không ghi đè (010 FR-014); khi vượt ngưỡng kích thước thì từ chối lưu thêm và báo rõ (010 FR-013). Trả lời và emoji cũng tính vào kích thước.
- **Nội dung trả lời có HTML, markdown, mã:** hiển thị là chữ thuần, không thực thi (constitution II).
- **Spec có nhiều thảo luận dài:** tab Highlights và thẻ ở thanh bên vẫn mượt (SC-005).
- **Màn hình hẹp:** trả lời, emoji, giải quyết dùng được ở 390px, không cuộn ngang (constitution IV).
- **Chỉ dùng bàn phím và trình đọc màn hình:** mọi thao tác làm được, mọi nút có nhãn.
- **Local:** tác giả trả lời là tên đã nhập ở 010 FR-017; quy tắc chỉ tác giả sửa trả lời của mình áp theo tên đó.
- **Demo:** đủ chức năng trên dữ liệu mẫu trong trình duyệt, không gọi GitHub.
- **File do bản chưa có spec này ghi (010 thuần):** đọc được bình thường, mỗi highlight coi như không có trả lời, không emoji, đang mở.

## Requirements *(mandatory)*

### Functional Requirements

**Trả lời**

- **FR-001**: Người dùng MUST trả lời được một ghi chú đang có (mở hoặc đã giải quyết), không phân biệt có phải tác giả ghi chú gốc hay không. Trả lời MUST không được lưu khi nội dung trống.
- **FR-002**: Trả lời MUST xếp theo thời gian dưới ghi chú gốc và hiện tên người viết, giờ viết, nội dung. Mỗi trả lời MUST có thể đã sửa và nêu rõ khi đã sửa.
- **FR-003**: Chỉ người viết MUST sửa và xoá được trả lời của chính mình. Quy tắc này theo cách xác định tác giả của 010 (tài khoản GitHub; tên tự nhập ở local). Ghi chú gốc vẫn theo 010 FR-011.
- **FR-004**: Xoá ghi chú gốc khi đã có trả lời MUST có bước xác nhận nói rõ cả cuộc thảo luận bị xoá.
- **FR-005**: Nội dung trả lời tối đa 2.000 ký tự, giống ghi chú gốc; vượt thì báo trước khi lưu. Mọi nội dung MUST được hiển thị như chữ thuần (010 FR-007).

**Giải quyết và ẩn**

- **FR-006**: Người dùng MUST đánh dấu được một cuộc thảo luận là đã giải quyết bằng nút dấu tick có chú thích "Đánh dấu là đã giải quyết và ẩn cuộc thảo luận", và MUST mở lại được. Mỗi lần giải quyết hoặc mở lại MUST ghi người làm và giờ.
- **FR-007**: Cuộc thảo luận đã giải quyết MUST không tô đoạn chữ, không có ghim ở lề và không nằm trong danh sách đang mở, nhưng MUST xem lại được trong panel Highlights ở mục đã giải quyết.
- **FR-008**: Có trả lời mới trên cuộc thảo luận đã giải quyết MUST tự mở lại nó.
- **FR-009**: Bất kỳ ai có thể lưu chú thích trong spec đó MUST giải quyết và mở lại được, không riêng tác giả ghi chú gốc. (Giả định, xem Assumptions.)
- **FR-010**: "Before you approve" MUST chỉ gồm ghi chú của các cuộc thảo luận đang mở (mở rộng 010 FR-022), và MUST cho biết số cuộc thảo luận đã giải quyết. Highlight và thảo luận MUST không chặn và không tự duyệt cổng nào (constitution VI).

**Emoji**

- **FR-011**: Người dùng MUST thả và gỡ được một emoji trên ghi chú hoặc trả lời; mỗi emoji MUST hiện số người đã thả, và mỗi người chỉ thả mỗi emoji một lần trên một mục.
- **FR-012**: Emoji lấy từ một bộ hữu hạn, không có bộ chọn emoji đầy đủ. Người dùng MUST chỉ gỡ được emoji của chính mình.

**Lưu, chế độ, chất lượng**

- **FR-013**: Mọi thay đổi ở spec này (trả lời, sửa/xoá trả lời, emoji, giải quyết/mở lại) MUST lưu theo đúng cơ chế của 010: một file highlight của spec, commit chỉ đổi file đó, nhánh đang xem, bước xác nhận một lần mỗi repo, `[skip ci]` (010 FR-008…FR-010, FR-009a). Ứng dụng MUST NOT ghi file nào khác.
- **FR-014**: Mỗi lần lưu MUST đọc lại bản mới nhất, gộp thay đổi theo mã của từng ghi chú, trả lời và emoji, rồi chỉ ghi khi file chưa đổi (010 FR-012). Không trả lời hay emoji nào bị mất khi hai người lưu gần như cùng lúc.
- **FR-015**: Cả ba chế độ MUST có đủ chức năng, cùng ngữ nghĩa: server và Pages commit qua GitHub, local ghi thẳng file không commit, demo lưu trong trình duyệt và không gọi GitHub (constitution III).
- **FR-016**: File highlight cũ (chưa có trả lời, emoji, trạng thái giải quyết) MUST đọc được và MUST giữ nguyên nghĩa; thêm trường mới MUST là tuỳ chọn có giá trị mặc định (constitution I).
- **FR-017**: Giao diện MUST theo Modernist và `src/styles/reader.css` (không bo góc, không thêm màu mới), dùng được bằng bàn phím, có nhãn cho trình đọc màn hình, và dùng được ở bề rộng điện thoại (constitution IV). Bản demo MUST giữ giống thiết kế khi chưa có thảo luận nào.
- **FR-018**: Không cần quyền token mới ngoài quyền ghi nội dung repo mà 010 đã yêu cầu (Contents: write). Người không có quyền này xem được mọi thảo luận và không ghi được (010 FR-009).

### Key Entities *(include if feature involves data)*

- **Cuộc thảo luận**: một highlight của 010 (đoạn chữ, neo, màu, ghi chú gốc, tác giả) cộng danh sách trả lời và trạng thái đang mở / đã giải quyết (kèm người và giờ giải quyết gần nhất).
- **Trả lời**: người viết, giờ viết, giờ sửa (nếu có), nội dung, danh sách emoji.
- **Emoji**: loại emoji và danh sách người đã thả, trên một ghi chú hoặc một trả lời.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người B trả lời ghi chú của A trong không quá 3 thao tác (mở ghi chú, gõ, gửi); trả lời hiện cho A ở lần làm mới kế tiếp.
- **SC-002**: Với hai người trả lời, thả emoji hoặc giải quyết gần như cùng lúc trên cùng spec, 0 trả lời, emoji hay thay đổi trạng thái bị mất.
- **SC-003**: Mỗi lần lưu thành công tạo đúng một commit chỉ đổi file highlight của spec đó, và 0 lần chạy GitHub Actions do commit đó gây ra (khớp 010 SC-003).
- **SC-004**: Sau khi giải quyết một cuộc thảo luận, 100% ghi chú của nó biến khỏi "Before you approve" và danh sách đang mở, và 100% vẫn xem lại được trong mục đã giải quyết.
- **SC-005**: Với 200 cuộc thảo luận trong một spec (trung bình 3 trả lời), mở một tài liệu và chuyển bước vẫn hiện thảo luận trong dưới 1 giây (khớp 010 SC-006).
- **SC-006**: Ở bề rộng 390px, người dùng trả lời, thả emoji và giải quyết được mà không phải kéo ngang trang; toàn bộ luồng làm được chỉ bằng bàn phím.
- **SC-007**: File highlight tạo bởi bản 010 thuần đọc được 100% sau khi có spec này; 0 highlight bị mất hoặc đổi nghĩa.

## Assumptions

- **Phụ thuộc vào 010:** spec này chỉ implement được sau khi `specs/010-spec-annotations` (chọn chữ, thanh công cụ, file highlight, panel Highlights, ghi qua commit) đã merge vào `main`. Cho tới lúc đó, spec và plan viết được nhưng chưa có gì để mở rộng.
- **Chế độ bị ảnh hưởng** (constitution III): cả bốn như 010. Server và Pages commit; local ghi thẳng file; demo trong trình duyệt.
- **Không thêm loại ghi mới ngoài 010:** vẫn chỉ ghi file `highlights.json` của spec đang xem, nên không cần sửa constitution thêm. Constitution 1.4.0 (trên nhánh 010) đã cho phép việc ghi này; PR của spec này dựa trên bản đó.
- **Mở rộng định dạng file** của 010 (trường trả lời, emoji, trạng thái) là tuỳ chọn có giá trị mặc định, nên file cũ vẫn đọc được (FR-016). Plan quyết định có nâng `version` của file hay không.
- **Ai được giải quyết:** bất kỳ ai ghi được chú thích trong spec đó, như Google Docs. Đây là mặc định hợp lý; muốn chặt hơn (chỉ tác giả hoặc người duyệt) thì sửa trong `/speckit-clarify`.
- **Bộ emoji:** một tập nhỏ cố định (như 👍 ❤️ 😍 🎉 😄 😕). Plan chốt danh sách.
- **Giao diện:** theo bố cục các ảnh tham chiếu (thẻ ở thanh bên, hộp soạn có Hủy / Nhận xét, tooltip) nhưng dùng token Modernist. Nhãn tiếng Việt lấy từ ảnh: Thêm nhận xét, Nhận xét, Hủy, Đánh dấu là đã giải quyết và ẩn cuộc thảo luận.
- **Không cần thời gian thực:** thảo luận của người khác hiện khi làm mới, không cần đẩy tức thì.
- **Người dùng đã có quyền như 010:** tên và ảnh đại diện lấy từ tài khoản GitHub (server, Pages), tên tự nhập (local), người mẫu (demo).

## Non-Goals

- Không thay thế hay lặp lại phần của 010: chọn chữ, thanh công cụ, tạo ghi chú, neo, panel Highlights.
- Không dùng comment của issue theo dõi hay review comment của PR để lưu thảo luận.
- Không @mention, không thông báo email hay đẩy, không giao việc cho ai.
- Không đính kèm ảnh hay tệp; chỉ chữ thuần.
- Không có thảo luận trên constitution, ảnh, sơ đồ, Copilot hay sidebar.
- Không chặn hay tự duyệt cổng dựa trên số thảo luận còn mở (constitution VI).
- Không có database hay dịch vụ lưu trữ riêng (constitution I, VII).
- Không sửa nội dung tài liệu spec từ thảo luận; không đồng bộ sang Google Docs hay công cụ khác.
