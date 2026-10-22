# Feature Specification: Lưu nhận xét theo hai cách (ngay lập tức, hoặc giữ trong trình duyệt cho tới khi bấm Save)

**Feature Branch**: `feat/016-deferred-save`

**Created**: 2026-10-22

**Status**: Clarified

**Input**: User description: "về feature lưu comment: 1. đối với server (or local): có thể lưu nhanh vì không thông qua commit. 2. đối với github page, vì thông qua commit, nên mỗi lần lưu lại sẽ tốn thời gian không cần thiết, cho nên, hãy lưu trên browser cho đến khi user muốn save lại."

## Bối cảnh

Từ 010 đến 015, mỗi thao tác trên nhận xét (viết, trả lời, thả/gỡ emoji, sửa, xoá) được ghi ngay. Ứng dụng chạy ở ba môi trường. Ở **local** (thư mục đã chọn) thao tác ghi thẳng vào `specs/NNN/highlights.json`, không có commit, nên nhanh. Ở **GitHub Pages** và ở **server (VPS)** mỗi thao tác là **một commit** lên nhánh đang xem (server không có bản checkout repo, nó ghi qua GitHub bằng token hoặc phiên đăng nhập của người dùng): mỗi lần bấm phải chờ GitHub trả lời, và một buổi đọc spec có thể sinh hàng chục commit nhỏ. Đây là thời gian chờ không cần thiết và làm lịch sử nhiễu.

Spec này tách hai cách lưu theo chế độ: nơi lưu không qua commit giữ nguyên tốc độ tức thì; nơi lưu qua commit thì giữ thay đổi trong trình duyệt và chỉ ghi lên GitHub khi người dùng chủ động bấm Save.

## Clarifications

### Session 2026-10-22

- Q1: Server (VPS) cũng ghi bằng commit lên GitHub như Pages (không có checkout cục bộ). Server nên theo cách nào? → A: Phương án A. Server dùng "giữ trong trình duyệt tới khi Save" giống Pages. Chỉ local (và demo) giữ lưu tức thì. Không thêm loại ghi phía server.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Thao tác nhận xét tức thì, không chờ commit (Priority: P1)

Ở chế độ lưu qua commit, khi người dùng viết nhận xét, trả lời, thả/gỡ emoji, sửa hoặc xoá, thay đổi hiện ngay trên màn hình và được giữ trong trình duyệt; không có lệnh gọi GitHub và không có thời gian chờ. Thay đổi được đánh dấu "Chưa lưu" cho tới khi người dùng lưu.

**Why this priority**: Đây là lý do của yêu cầu: bỏ thời gian chờ mỗi thao tác.

**Independent Test**: Ở Pages, viết một nhận xét và thả một emoji: cả hai hiện ngay (dưới 0,3 giây), đánh dấu chưa lưu, và không có commit nào được tạo.

**Acceptance Scenarios**:

1. **Given** chế độ lưu qua commit và người dùng có quyền lưu, **When** viết nhận xét rồi bấm Comment, **Then** thẻ hiện ngay ở đúng chỗ cạnh đoạn chữ với dấu "Chưa lưu", không có trạng thái "Sending", và không có yêu cầu nào gửi tới GitHub.
2. **Given** thẻ có thay đổi chưa lưu, **When** trả lời, thả/gỡ emoji, sửa hoặc xoá, **Then** mỗi thao tác hiện ngay và cộng vào danh sách thay đổi chưa lưu.
3. **Given** có thay đổi chưa lưu, **When** tải lại trang hoặc đóng rồi mở lại cùng spec trên cùng trình duyệt và cùng tài khoản, **Then** các thay đổi vẫn còn, vẫn đánh dấu chưa lưu.
4. **Given** có thay đổi chưa lưu, **When** người khác lưu nhận xét mới lên GitHub và trang làm mới, **Then** nhận xét của người khác hiện cùng các thay đổi chưa lưu của mình, không bên nào mất.

---

### User Story 2 - Bấm Save một lần để ghi tất cả (Priority: P1)

Khi có thay đổi chưa lưu, một thanh nhỏ cho biết số thay đổi ("3 thay đổi chưa lưu") cùng nút **Save**. Bấm Save ghi **tất cả** thay đổi chưa lưu của spec đó lên GitHub trong **một commit** `[skip ci]`. Lần lưu đầu tiên ở mỗi repo vẫn hỏi xác nhận một lần như 010.

**Why this priority**: Là nửa còn lại của yêu cầu: "cho tới khi user muốn save lại".

**Independent Test**: Viết hai nhận xét và thả ba emoji rồi bấm Save: đúng một commit được tạo, chứa cả năm thay đổi; thanh chưa lưu biến mất.

**Acceptance Scenarios**:

1. **Given** có N thay đổi chưa lưu trên một spec, **When** nhìn rail, **Then** có thanh "N thay đổi chưa lưu" với nút Save (và nút bỏ thay đổi, xem US3), nhìn thấy được mà không che nhận xét.
2. **Given** thanh đó, **When** bấm Save, **Then** nút báo "Saving…", một commit `[skip ci]` ghi mọi thay đổi, sau đó các dấu "Chưa lưu" mất và thanh biến mất.
3. **Given** lần lưu đầu tiên ở repo này, **When** bấm Save, **Then** hộp xác nhận commit hiện một lần (như 010); từ chối thì mọi thay đổi vẫn còn nguyên, chưa lưu.
4. **Given** lưu thất bại (mất mạng, hết quyền, nhánh bảo vệ, người khác sửa cùng lúc), **When** xem kết quả, **Then** thấy lý do, các thay đổi vẫn còn nguyên trong trình duyệt và Save thử lại được; không mất nội dung nào.
5. **Given** người khác đã sửa cùng file trong lúc mình chưa lưu, **When** bấm Save, **Then** thay đổi của hai bên được hợp lại (như 011/012), không ghi đè.
6. **Given** nhiều thay đổi trên nhiều spec, **When** bấm Save, **Then** mỗi spec đang xem được lưu riêng bằng một commit; spec khác vẫn giữ thay đổi chưa lưu của nó.

---

### User Story 3 - Bỏ thay đổi chưa lưu và không mất dữ liệu bất ngờ (Priority: P2)

Người dùng bỏ được các thay đổi chưa lưu của spec (có xác nhận). Khi đóng tab hoặc rời trang mà còn thay đổi chưa lưu, trình duyệt nhắc một lần. Thay đổi chưa lưu vẫn nằm trong trình duyệt (không lên GitHub, không hiện với người khác) cho tới khi lưu hoặc bỏ.

**Why this priority**: Giữ dữ liệu trong trình duyệt cần lối thoát và cảnh báo, nhưng không chặn US1, US2.

**Independent Test**: Có 2 thay đổi chưa lưu, bấm bỏ và xác nhận: nhận xét và emoji vừa thêm biến mất, thanh biến mất, GitHub không bị ghi gì.

**Acceptance Scenarios**:

1. **Given** có thay đổi chưa lưu, **When** bấm bỏ rồi xác nhận, **Then** spec trở về đúng trạng thái đã lưu và không có yêu cầu ghi nào.
2. **Given** có thay đổi chưa lưu, **When** đóng tab hoặc rời trang, **Then** trình duyệt nhắc có thay đổi chưa lưu; khi không còn gì chưa lưu thì không nhắc.
3. **Given** có thay đổi chưa lưu, **When** người dùng chuyển sang spec khác rồi quay lại, **Then** thay đổi vẫn còn.
4. **Given** thay đổi chưa lưu nhắm vào nhận xét đã bị người khác xoá hoặc đoạn chữ đã đổi, **When** làm mới, **Then** thay đổi đó được bỏ qua êm hoặc hiện ở nhóm Outdated như 012, không gây lỗi và không chặn Save các thay đổi còn lại.

---

### User Story 4 - Chế độ không qua commit giữ nguyên lưu tức thì (Priority: P1)

Ở **local** (ghi vào thư mục đã chọn) và **demo** (trình duyệt), mỗi thao tác vẫn được lưu ngay như hiện nay; không có thanh chưa lưu và không có nút Save.

**Why this priority**: Yêu cầu nói rõ chỗ không qua commit đã nhanh nên không đổi; cần chắc chắn không bị ảnh hưởng.

**Independent Test**: Ở local, viết một nhận xét: file `highlights.json` đổi ngay; không có thanh chưa lưu. Ở demo, hành vi y hệt trước.

**Acceptance Scenarios**:

1. **Given** chế độ local, **When** viết, trả lời, thả emoji, sửa, xoá, **Then** mỗi thao tác ghi ngay vào `highlights.json` và không có thanh chưa lưu.
2. **Given** chế độ demo, **When** thao tác nhận xét, **Then** hành vi và hình ảnh giống hệt trước spec này.

---

### Edge Cases

- **Hết quyền ghi hoặc nhánh bảo vệ:** như hiện nay, không cho tạo thay đổi mới (nút tắt kèm lý do); thay đổi đã có sẵn vẫn thấy và Save chỉ thử khi có quyền.
- **Chuyển nhánh hoặc ghim commit:** thay đổi chưa lưu gắn với nhánh đang xem; đổi nhánh không áp thay đổi vào nhánh khác.
- **Hai tab cùng spec:** mỗi tab thấy thay đổi chưa lưu của tab kia sau khi làm mới; Save ở tab nào ghi toàn bộ, không nhân đôi.
- **Trình duyệt chặn lưu cục bộ (chế độ riêng tư):** thay đổi vẫn giữ trong tab đang mở; thanh báo rằng chúng sẽ mất nếu đóng tab.
- **Đăng xuất hoặc đổi tài khoản:** thay đổi chưa lưu thuộc về tài khoản đã viết; không hiện, không lưu hộ cho tài khoản khác.
- **Quá giới hạn kích thước file:** Save báo lỗi như hiện nay, thay đổi còn nguyên.
- **Sửa/xoá liên tiếp trên cùng một mục chưa lưu:** gộp lại sao cho Save ghi kết quả cuối, không sinh bước thừa (xoá nhận xét chưa từng lưu thì không ghi gì).
- **Trả lời hoặc emoji lên nhận xét chưa lưu:** chấp nhận, và Save ghi theo đúng thứ tự.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ở chế độ lưu qua commit (GitHub Pages và server/VPS, Clarifications Q1), mọi thao tác nhận xét (viết, trả lời, thả/gỡ emoji, sửa, xoá, đổi màu) MUST hiện ngay và MUST NOT gọi GitHub; thay đổi MUST được giữ trong trình duyệt và đánh dấu "Chưa lưu".
- **FR-002**: Thay đổi chưa lưu MUST còn sau khi tải lại trang hoặc đóng rồi mở lại, trên cùng trình duyệt và cùng tài khoản, gắn với repo, spec và nhánh đã viết.
- **FR-003**: Khi có thay đổi chưa lưu, giao diện MUST hiện số thay đổi và nút Save ở nơi nhìn thấy được trên rail và trong tab Highlights (cả màn hình hẹp).
- **FR-004**: Bấm Save MUST ghi mọi thay đổi chưa lưu của spec đang xem trong **một** commit `[skip ci]` lên nhánh đang xem; thành công thì các dấu "Chưa lưu" và thanh MUST biến mất.
- **FR-005**: Lần lưu đầu tiên ở mỗi repo MUST hiện hộp xác nhận commit một lần (010); từ chối MUST giữ nguyên mọi thay đổi chưa lưu.
- **FR-006**: Lưu thất bại MUST giữ nguyên mọi thay đổi chưa lưu, nêu lý do và cho thử lại; MUST NOT mất hay nhân đôi nội dung.
- **FR-007**: Thay đổi chưa lưu MUST được áp lên dữ liệu mới nhất đọc từ GitHub khi làm mới và khi Save, theo cùng quy tắc hợp nhất của 011/012; nhận xét của người khác MUST NOT bị mất hay ghi đè.
- **FR-008**: Người dùng MUST bỏ được toàn bộ thay đổi chưa lưu của spec sau một bước xác nhận; việc bỏ MUST NOT ghi gì lên GitHub.
- **FR-009**: Rời trang hay đóng tab khi còn thay đổi chưa lưu MUST hiện lời nhắc của trình duyệt; không còn thay đổi thì MUST NOT nhắc.
- **FR-010**: Thay đổi chưa lưu MUST NOT hiện với người khác và MUST NOT thuộc về tài khoản khác; khi đổi tài khoản MUST NOT áp thay đổi của tài khoản trước.
- **FR-011**: Thay đổi chưa lưu nhắm vào mục không còn tồn tại hoặc không định vị được MUST được xử lý êm (bỏ qua hoặc nhóm Outdated), không gây lỗi và không chặn Save phần còn lại.
- **FR-012**: Chế độ local và demo MUST giữ nguyên lưu tức thì: không thanh chưa lưu, không nút Save (constitution III: nêu rõ chế độ khác biệt).
- **FR-013**: Quyền và điều kiện ghi MUST giữ như hiện nay (chỉ đọc, nhánh bảo vệ, ghim commit → không tạo được thay đổi mới, kèm lý do); thay đổi chưa lưu chỉ MUST được gửi khi người dùng bấm Save.
- **FR-014**: Cách ghi lên GitHub MUST giữ nguyên khuôn dạng `highlights.json`, quyền token và đích mạng đã có (constitution I, II); không ghi gì ngoài `specs/*/highlights.json` của spec đang xem; không lưu khoá hay token trong bộ nhớ trình duyệt của tính năng này.
- **FR-015**: Gộp các thay đổi liên tiếp trên cùng một mục trước khi ghi MUST cho cùng kết quả như áp từng thao tác theo thứ tự; xoá một mục chưa từng được lưu MUST không để lại gì trong commit.

### Key Entities *(include if feature involves data)*

- **Thay đổi chưa lưu (Pending change)**: một thao tác nhận xét đã làm mà chưa ghi lên GitHub, gồm loại thao tác (viết, trả lời, emoji, sửa, xoá, đổi màu), mục nhắm tới, người viết, thời điểm, và nhánh, spec, repo của nó. Dùng chung dạng thay đổi đã có ở 010–014; không thêm trường vào `highlights.json`.
- **Danh sách chưa lưu theo spec**: thay đổi chưa lưu của một tài khoản trên một spec và nhánh, theo thứ tự thao tác; được giữ trong trình duyệt, ghi ra GitHub bằng Save hoặc bỏ đi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ở chế độ lưu qua commit, mỗi thao tác nhận xét hiện trong dưới 0,3 giây và gửi 0 yêu cầu ghi tới GitHub cho tới khi bấm Save.
- **SC-002**: Một phiên viết 5 nhận xét và 10 emoji tạo đúng 1 commit khi bấm Save (thay vì 15).
- **SC-003**: 100% thay đổi chưa lưu còn nguyên sau khi tải lại trang; 0 nội dung bị mất khi Save thất bại.
- **SC-004**: Khi người khác lưu cùng lúc, 0 nhận xét của hai bên bị mất hay nhân đôi sau Save.
- **SC-005**: Ở local và demo, hành vi và hình ảnh giống hệt trước spec này (ảnh demo so từng byte; test lưu của local vẫn qua).
- **SC-006**: Người dùng thấy ngay có thay đổi chưa lưu và biết cách lưu hay bỏ: thanh hiện trong mọi lúc còn thay đổi chưa lưu, trên cả màn hình 390 px, không cuộn ngang.
- **SC-007**: Hành vi lưu, quyền, khuôn dạng file và hộp xác nhận lần đầu không đổi: các test cũ về lưu, hợp nhất và commit vẫn qua.

## Assumptions

- **Dựa trên 010–015 (đã merge vào `main`).**
- **Chế độ bị ảnh hưởng** (constitution III): GitHub Pages và server (VPS) đổi (cùng một thành phần giao diện); local và demo không đổi.
- **Một commit mỗi lần Save cho mỗi spec** vì mỗi spec có một `highlights.json`.
- **Thay đổi chưa lưu giữ trong trình duyệt** (bộ nhớ cục bộ của trang), tách theo tài khoản, repo, spec và nhánh; không đồng bộ giữa các thiết bị.
- **Không lưu tự động theo thời gian**: chỉ lưu khi người dùng bấm Save (theo yêu cầu). Tự lưu nền không thuộc spec này.
- **Nhãn tiếng Anh trong ứng dụng** ("Not saved", "Save", "Discard"), theo quyết định của 012; spec viết bằng tiếng Việt.
- **Hợp nhất** dùng lại hàm áp thay đổi đã dùng chung cho mọi chế độ; xung đột được xử lý như 011/012.

## Non-Goals

- Không tự động lưu nền, không hàng đợi ngoại tuyến cho các ghi khác (tracking issue, phê duyệt gate).
- Không đồng bộ thay đổi chưa lưu giữa thiết bị hay người dùng.
- Không đổi khuôn dạng `highlights.json`, quyền token, đích mạng hay hộp xác nhận lần đầu.
- Không đổi giao diện thẻ, rail, hover (012–015) ngoài dấu "Chưa lưu" và thanh lưu.
- Không đổi cách lưu của local và demo.
- Không giữ bản nháp phía server (Clarifications Q1): server không có loại ghi mới.
