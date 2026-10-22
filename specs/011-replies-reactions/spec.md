# Feature Specification: Trả lời và thả emoji trên nhận xét

**Feature Branch**: `feat/011-replies-reactions`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "mọi người trả lời và thả emoji". Tham chiếu: 4 ảnh chụp luồng nhận xét kiểu Google Docs (Ảnh 4: chuỗi trả lời có emoji); `specs/012-docs-style-comment-flow` (rail và thẻ nhận xét, đã merge); `specs/013-comment-button-popup` (hộp một nút "Comment", đã merge). Bản nháp cũ `011-annotation-threads` (trả lời, emoji, giải quyết) nằm trên nhánh chưa merge `claude/bold-hawking-k3ffwk`; spec này lấy lại phần trả lời và emoji của nó.

## Bối cảnh

Hiện mỗi nhận xét là một thẻ một chiều: người khác đọc được nhưng không đáp lại được. Người duyệt muốn góp ý qua lại ngay dưới nhận xét, và phản hồi nhanh ("đồng ý", "đã thấy") mà không phải viết cả câu, như trong Google Docs. Thẻ ở rail của 012 đã chừa sẵn chỗ cho phần này.

## Clarifications

### Session 2026-10-22

- Q: "Mọi người" gồm những ai? → A: Mọi người **có quyền lưu chú thích** trong spec đó, không riêng tác giả nhận xét gốc. Trả lời và emoji được lưu trong `highlights.json` như nhận xét, nên cần cùng quyền ghi nội dung repo mà 012 đã chọn (012 Q1, phương án C). Người chỉ có quyền đọc xem được mọi trả lời và emoji nhưng không thêm được; nút bị tắt kèm lý do. Không có đường lưu thứ hai.
- Q: Spec này quan hệ thế nào với 010, 012, 013? → A: Dựng trên cả ba, không đổi cơ chế lưu của 010 (một file `highlights.json` mỗi spec, commit vào nhánh đang xem, `[skip ci]`, xác nhận một lần mỗi repo). Phần trả lời và emoji hiện trong khe `.sk-cm-thread` của thẻ (012). Nút trong hộp chọn chữ vẫn chỉ là "Comment" (013).
- Q: Có "giải quyết và ẩn" không? → A: [NEEDS CLARIFICATION: Bản nháp cũ có thêm nút dấu tick "Đánh dấu là đã giải quyết và ẩn cuộc thảo luận" (Ảnh 3–4). Mô tả lần này chỉ nêu trả lời và emoji. (A) chỉ trả lời và emoji; giải quyết/ẩn để spec riêng sau; (B) làm luôn trong spec này.]

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trả lời một nhận xét (Priority: P1)

Người xem chọn một thẻ nhận xét và gõ trả lời ở cuối thẻ. Các trả lời xếp theo thời gian dưới nhận xét gốc, mỗi cái có ảnh đại diện chữ cái, tên, giờ và nội dung. Nhận xét gốc cùng các trả lời là một **cuộc thảo luận** trong một thẻ.

**Why this priority**: Đây là phần thiếu lớn nhất so với ảnh tham chiếu: người khác chỉ đọc được, góp ý dừng ở một chiều.

**Independent Test**: A tạo nhận xét trên một câu. B mở cùng spec, chọn thẻ, trả lời. A làm mới và thấy trả lời của B dưới nhận xét, đúng tên và giờ; mỗi bước là một commit chỉ đổi file `highlights.json`.

**Acceptance Scenarios**:

1. **Given** một nhận xét do A viết, **When** B (không phải tác giả, có quyền ghi) gõ và gửi trả lời, **Then** trả lời hiện dưới nhận xét gốc với tên và giờ của B, dù B không sửa hay xoá được nhận xét gốc.
2. **Given** ô trả lời để trống hoặc chỉ có khoảng trắng, **When** người dùng gửi, **Then** không có gì được lưu và có lời nhắc viết trước.
3. **Given** một trả lời do chính người dùng viết, **When** họ chọn Sửa hoặc Xoá, **Then** làm được và trả lời đã sửa ghi "edited"; người khác không thấy các lựa chọn này trên trả lời đó.
4. **Given** hai người trả lời gần như cùng lúc, **When** cả hai lưu, **Then** cả hai trả lời đều còn.
5. **Given** nhận xét gốc đã có trả lời, **When** tác giả xoá nhận xét gốc, **Then** có bước xác nhận nói rõ cả cuộc thảo luận (cả trả lời và emoji) bị xoá.
6. **Given** người chỉ có quyền đọc (hoặc nhánh bị bảo vệ, ghim vào commit), **When** xem thẻ, **Then** thấy mọi trả lời nhưng ô trả lời và các nút ghi bị tắt kèm lý do (cùng lý do của 012).
7. **Given** màn hình hẹp, **When** chọn nhận xét, **Then** thẻ trong sheet (012) có đủ phần trả lời và ô trả lời, không cuộn ngang.

---

### User Story 2 - Thả emoji (Priority: P2)

Dưới nhận xét và dưới mỗi trả lời, người dùng thả một emoji từ một bộ nhỏ; emoji hiện kèm số người đã thả. Bấm lại đúng emoji của mình thì gỡ.

**Why this priority**: Cho phản hồi nhanh mà không phải viết trả lời. Nhẹ hơn US1 và không chặn nó.

**Independent Test**: Thả hai emoji khác nhau lên hai mục; mỗi emoji hiện số 1. Người thứ hai thả cùng emoji thì số thành 2. Gỡ thì số giảm.

**Acceptance Scenarios**:

1. **Given** một nhận xét hoặc trả lời, **When** người dùng chọn một emoji trong bộ có sẵn, **Then** emoji hiện kèm số người đã thả, và người đã thả được tô để nhận ra.
2. **Given** người dùng đã thả một emoji, **When** bấm lại emoji đó, **Then** emoji của họ bị gỡ và số giảm; không gỡ được emoji của người khác.
3. **Given** emoji do nhiều người thả, **When** người dùng đưa trỏ tới (hoặc mở chi tiết bằng bàn phím), **Then** thấy tên những người đã thả.
4. **Given** hai người thả emoji gần như cùng lúc, **When** cả hai lưu, **Then** cả hai đều được tính.
5. **Given** quyền ghi bị tắt, **When** xem thẻ, **Then** thấy emoji và số, không thả được, lý do hiện ra.

---

### Edge Cases

- **Nhận xét trên đoạn chữ đã đổi hoặc không còn (Outdated):** vẫn trả lời và thả emoji được; hiện trong nhóm Outdated của rail như hiện nay.
- **Highlight chỉ có màu (không ghi chú):** không có thẻ nên chưa có chỗ trả lời; khi người dùng thêm ghi chú (013) nó thành nhận xét và nhận trả lời.
- **Lưu thất bại (mất mạng, bị từ chối):** nội dung trả lời đang soạn còn nguyên để thử lại ("Retry" như 012); không có trả lời nửa vời.
- **File highlight hỏng hoặc quá lớn:** không ghi đè; khi vượt ngưỡng kích thước (010) thì từ chối lưu thêm và báo rõ. Trả lời và emoji cũng tính vào kích thước.
- **Nội dung có HTML, markdown, mã:** hiển thị là chữ thuần, không thực thi (constitution II).
- **Nhiều trả lời dài:** thẻ mở rộng theo nội dung, rail vẫn mượt khi có 200 thảo luận (SC-004).
- **Chỉ dùng bàn phím và trình đọc màn hình:** mọi thao tác làm được, mọi nút có nhãn, thay đổi được thông báo.
- **File cũ (chưa có trả lời, emoji):** đọc được bình thường; mỗi nhận xét coi như chưa có trả lời và emoji.
- **Local:** tên người trả lời là tên đã nhập (010); quy tắc "chỉ người viết sửa trả lời của mình" áp theo tên đó. Demo: đủ chức năng trên dữ liệu mẫu, lưu trong trình duyệt.

## Requirements *(mandatory)*

### Functional Requirements

**Trả lời**

- **FR-001**: Người dùng có quyền lưu chú thích MUST trả lời được một nhận xét đang hiển thị, không phân biệt có phải tác giả nhận xét gốc hay không. Trả lời trống MUST không được lưu.
- **FR-002**: Trả lời MUST xếp theo thời gian dưới nhận xét gốc, hiện ảnh đại diện chữ cái, tên, giờ và nội dung; đã sửa MUST nêu rõ.
- **FR-003**: Chỉ người viết MUST sửa và xoá được trả lời của mình (cách xác định tác giả theo 010: tài khoản GitHub; tên tự nhập ở local). Nhận xét gốc vẫn theo 010 FR-011.
- **FR-004**: Xoá nhận xét gốc đã có trả lời MUST có bước xác nhận nói rõ cả cuộc thảo luận bị xoá.
- **FR-005**: Nội dung trả lời tối đa 2.000 ký tự như nhận xét gốc; vượt thì báo trước khi lưu. Mọi nội dung MUST hiển thị như chữ thuần.

**Emoji**

- **FR-006**: Người dùng MUST thả và gỡ được một emoji trên nhận xét hoặc trả lời; mỗi emoji MUST hiện số người đã thả, và mỗi người chỉ thả mỗi emoji một lần trên một mục.
- **FR-007**: Emoji lấy từ một bộ hữu hạn, không có bộ chọn emoji đầy đủ. Người dùng MUST chỉ gỡ được emoji của chính mình, và MUST xem được ai đã thả.

**Lưu, chế độ, chất lượng**

- **FR-008**: Mọi thay đổi ở spec này (trả lời, sửa/xoá trả lời, thả/gỡ emoji) MUST lưu theo cơ chế của 010 và 012: một file `highlights.json` của spec, commit chỉ đổi file đó, nhánh đang xem, `[skip ci]`, xác nhận một lần mỗi repo, trạng thái Sending/Saved/Failed với Retry. Ứng dụng MUST NOT ghi file nào khác.
- **FR-009**: Mỗi lần lưu MUST đọc lại bản mới nhất, gộp thay đổi theo mã của từng nhận xét, trả lời và emoji, rồi chỉ ghi khi file chưa đổi (010 FR-012). Không trả lời hay emoji nào bị mất khi hai người lưu gần như cùng lúc.
- **FR-010**: Người không có quyền lưu MUST xem được mọi trả lời và emoji; các điều khiển ghi MUST bị tắt kèm lý do (012 FR-016). Không có đường lưu thứ hai.
- **FR-011**: Trả lời và emoji MUST hiện trong khe của thẻ nhận xét (rail ở bố cục rộng, sheet ở bố cục hẹp); thẻ mở rộng khi chọn, thẻ đóng cho biết có bao nhiêu trả lời. Rail MUST vẫn thẳng hàng với đoạn chữ khi thẻ đổi chiều cao.
- **FR-012**: Cả bốn chế độ MUST có đủ chức năng, cùng ngữ nghĩa: server và Pages commit qua GitHub, local ghi thẳng file không commit, demo lưu trong trình duyệt và không gọi GitHub (constitution III).
- **FR-013**: File `highlights.json` cũ MUST đọc được và giữ nguyên nghĩa; trường mới (trả lời, emoji) MUST là tuỳ chọn có giá trị mặc định (constitution I). Danh sách emoji MUST được kiểm tra khi đọc: giá trị ngoài bộ cho phép bị bỏ qua, không làm hỏng file.
- **FR-014**: Giao diện MUST theo Modernist và token có sẵn (không bo góc, không thêm màu), dùng được bằng bàn phím, có nhãn cho trình đọc màn hình, thông báo thay đổi (aria-live) và dùng được ở bề rộng điện thoại (constitution IV). Demo MUST giữ giống thiết kế khi chưa có thảo luận.
- **FR-015**: Không cần quyền token mới ngoài quyền ghi nội dung repo mà 010 đã yêu cầu.

### Key Entities *(include if feature involves data)*

- **Cuộc thảo luận**: một nhận xét của 012 (đoạn chữ, neo, màu, ghi chú gốc, tác giả) cộng danh sách trả lời và emoji của nhận xét gốc.
- **Trả lời**: mã, người viết, giờ viết, giờ sửa (nếu có), nội dung, danh sách emoji.
- **Emoji (phản ứng)**: loại emoji và danh sách người đã thả, gắn với một nhận xét hoặc một trả lời.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: B trả lời nhận xét của A trong không quá 3 thao tác (chọn thẻ, gõ, gửi); trả lời hiện cho A ở lần kiểm tra mới kế tiếp (012 FR-014).
- **SC-002**: Với hai người trả lời hoặc thả emoji gần như cùng lúc trên cùng spec, 0 trả lời hoặc emoji bị mất.
- **SC-003**: Mỗi lần lưu thành công tạo đúng một commit chỉ đổi file `highlights.json` của spec đó, và 0 lần chạy GitHub Actions do commit đó gây ra.
- **SC-004**: Với 200 nhận xét trong một spec (trung bình 3 trả lời), mở một tài liệu và chuyển bước hiện đủ thẻ trong dưới 1 giây, rail không chồng thẻ.
- **SC-005**: Ở bề rộng 390px, người dùng trả lời và thả emoji được mà không kéo ngang; toàn bộ luồng làm được chỉ bằng bàn phím.
- **SC-006**: File tạo bởi bản trước spec này đọc được 100% sau khi có spec này; 0 nhận xét bị mất hoặc đổi nghĩa.

## Assumptions

- **Dựa trên 010, 012, 013 (đã merge vào `main`):** chọn chữ, hộp "Comment", rail, thẻ, hộp soạn, lưu lạc quan và file `highlights.json`.
- **Chế độ bị ảnh hưởng** (constitution III): cả bốn, như 012.
- **Không thêm loại ghi mới ngoài 010:** vẫn chỉ ghi file `highlights.json`; không cần sửa constitution (1.4.1).
- **Mở rộng định dạng file** (trường trả lời, emoji) là tuỳ chọn có mặc định; plan quyết định có nâng `version` của file hay không.
- **Bộ emoji:** một tập nhỏ cố định (như 👍 ❤️ 😄 🎉 😕 👀). Plan chốt danh sách.
- **Không cần thời gian thực:** trả lời và emoji của người khác hiện khi bấm "New comments" (012 FR-014).
- **Người dùng:** tên và ảnh đại diện chữ cái như 012 (tài khoản GitHub; tên tự nhập ở local; người mẫu ở demo).
- **Nhãn tiếng Anh trong ứng dụng** (Reply, Edit, Delete), theo quyết định của 012; nhãn tiếng Việt trong ảnh là tham chiếu.

## Non-Goals

- Không "giải quyết/ẩn cuộc thảo luận" (tick) trong spec này, trừ khi câu hỏi trong Clarifications chọn (B).
- Không @mention, thông báo email hay đẩy, giao việc.
- Không đính kèm ảnh hay tệp; chỉ chữ thuần. Không bộ chọn emoji đầy đủ.
- Không lưu thảo luận bằng comment trên issue theo dõi hay review comment của PR; không database hay dịch vụ riêng.
- Không đổi hộp chọn chữ (013), rail hay cách chọn (012).
- Không chặn hay tự duyệt cổng dựa trên số thảo luận (constitution VI).
