# Feature Specification: Chú thích (annotation) trên tài liệu của spec

**Feature Branch**: `feat/009-spec-annotations`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "thêm chức năng annotation, 1. highlight: user có thể highligh và commentt cho đoạn đó. 2. data annotation, được lưu cùng user - spec - content được highlight."

## Clarifications

### Session 2026-10-18

- Q: Chú thích được lưu ở đâu và ai xem được? → A: Vừa lưu local, vừa có thể publish. Khi tạo thì chỉ tạo tạm ở local: bản có server lưu vào một file cục bộ, file này git bỏ qua và không bao giờ commit hay push; bản GitHub Pages lưu ở `localStorage`. Chỉ khi chú thích được publish thì nó mới thành comment (trên GitHub).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Highlight một đoạn và thêm comment, lưu thành bản nháp ở local (Priority: P1)

Người dùng đang đọc tài liệu của một spec trong speckit-ui (spec, plan, tasks, analysis và các tài liệu khác của spec). Họ bôi đen một đoạn chữ và chọn thêm chú thích. Đoạn đó được tô nổi bật, và họ viết comment cho đoạn đó, ví dụ "chỗ này mơ hồ, cần nêu rõ giới hạn". Chú thích mới là **bản nháp**: chỉ nằm ở máy của họ, không ai khác thấy và chưa có gì được ghi lên GitHub. Đoạn highlight vẫn còn khi họ cuộn, chuyển bước, tải lại trang hoặc mở lại spec lần sau.

**Why this priority**: Đây là yêu cầu cốt lõi, và việc tạo tạm ở local giúp ghi chú nhanh, không lo gửi nhầm cho cả nhóm.

**Independent Test**: Mở một spec, bôi đen một câu, thêm comment và lưu. Đoạn được tô nổi bật và đánh dấu "Bản nháp", chọn vào thì thấy comment, tải lại trang vẫn còn, và không có gì xuất hiện trên GitHub hay trong `git status` của bất kỳ repo nào.

**Acceptance Scenarios**:

1. **Given** người dùng đang xem một tài liệu của spec, **When** họ chọn một đoạn chữ, **Then** có một thao tác rõ ràng để thêm chú thích cho đoạn đó.
2. **Given** họ viết comment và lưu, **When** việc lưu hoàn tất, **Then** đoạn được tô nổi bật, đánh dấu là bản nháp, và chọn vào đoạn thì hiện comment, người tạo và thời điểm.
3. **Given** họ lưu mà không viết comment, **When** việc lưu hoàn tất, **Then** đoạn vẫn được highlight (chú thích không có comment).
4. **Given** bản nháp đã lưu, **When** người dùng tải lại trang hoặc mở lại spec lần sau, **Then** bản nháp vẫn nằm đúng đoạn cũ.
5. **Given** người dùng khác mở cùng spec trên máy khác hoặc bằng tài khoản khác, **When** họ xem tài liệu, **Then** họ không thấy bản nháp của người dùng này.
6. **Given** người dùng dùng điện thoại hoặc chỉ dùng bàn phím, **When** họ muốn thêm chú thích, **Then** họ chọn đoạn chữ bằng thao tác chạm hoặc bàn phím và vẫn thêm được.

---

### User Story 2 - Chú thích được lưu cùng người tạo, spec và nội dung được highlight (Priority: P1)

Mỗi chú thích là một bản ghi gắn chặt với ba thứ: **người tạo**, **spec** và **nội dung đoạn được highlight**. Từ bản ghi biết được ai ghi nhận xét này, cho spec nào, tài liệu nào, về đoạn chữ nào (nguyên văn), comment là gì, khi nào, và nó đang là bản nháp hay đã publish. Bản nháp được giữ cục bộ ở nơi phù hợp với từng chế độ (một file cục bộ do app giữ ở bản có server, `localStorage` ở bản Pages), và tách riêng theo từng người dùng.

**Why this priority**: Nếu bản ghi không mang theo cả người, spec và đoạn chữ thì không thể tra cứu theo người hay theo spec, không đối chiếu được khi tài liệu thay đổi và không dựng lại được khi publish.

**Independent Test**: Tạo hai bản nháp bằng hai tài khoản trên hai spec khác nhau. Mỗi bản ghi nêu đúng tài khoản, đúng spec, đúng đoạn chữ nguyên văn và đúng comment, không lẫn sang bản ghi hay người dùng kia.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập tạo chú thích, **When** xem lại bản ghi, **Then** nó nêu đúng người tạo (tài khoản GitHub), spec, tài liệu, nguyên văn đoạn được highlight, comment, trạng thái, thời điểm tạo và thời điểm sửa gần nhất.
2. **Given** hai spec cùng có một câu giống hệt nhau, **When** người dùng chú thích câu đó ở spec A, **Then** spec B không hiện highlight đó.
3. **Given** hai tài khoản dùng chung một server hoặc một trình duyệt, **When** mỗi người tạo bản nháp, **Then** mỗi người chỉ thấy bản nháp của mình.
4. **Given** người dùng ở chế độ cục bộ (không có tài khoản GitHub), **When** tạo chú thích, **Then** bản ghi nêu rõ đó là chú thích cục bộ, không gắn với tài khoản GitHub nào.
5. **Given** bản có server, **When** người dùng tạo bản nháp, **Then** file lưu bản nháp nằm ngoài mọi repo được quản lý hoặc được git bỏ qua, nên không thể bị commit hay push nhầm.

---

### User Story 3 - Publish một bản nháp thành comment trên GitHub (Priority: P1)

Khi người dùng muốn cả nhóm thấy một chú thích, họ publish nó. Trước khi ghi, speckit-ui hiện đúng nội dung sẽ đăng và nơi sẽ đăng (issue theo dõi của spec) và yêu cầu xác nhận. Sau khi xác nhận, chú thích trở thành **một comment** trên issue theo dõi của spec, do chính tài khoản GitHub của người đó đăng, mang đủ thông tin (đoạn chữ, tài liệu, ngữ cảnh) để mọi người dựng lại đúng highlight. Từ đó, những người đọc spec trong speckit-ui thấy highlight và comment đó là chú thích đã publish.

**Why this priority**: Đây là nửa còn lại của yêu cầu: chú thích chỉ thành comment khi được publish. Nó biến ghi chú cá nhân thành nhận xét của nhóm.

**Independent Test**: Tạo một bản nháp, publish và xác nhận. Trên GitHub có đúng một comment mới ở issue theo dõi, do đúng tài khoản đăng. Một người khác mở spec trong speckit-ui và thấy highlight cùng comment đó, được đánh dấu "Đã publish". Bản nháp trong máy của người tạo trở thành chú thích đã publish, không bị nhân đôi.

**Acceptance Scenarios**:

1. **Given** một bản nháp của spec đã có issue theo dõi, **When** người dùng chọn publish, **Then** hiện bước xác nhận nêu rõ nội dung sẽ đăng và rằng nó sẽ hiện cho mọi người có quyền đọc repo.
2. **Given** họ xác nhận, **When** việc ghi hoàn tất, **Then** có đúng một comment mới trên issue theo dõi do tài khoản của họ đăng, chú thích chuyển sang "Đã publish" kèm liên kết tới comment.
3. **Given** họ không xác nhận hoặc đóng hộp xác nhận, **When** quay lại, **Then** không có gì được ghi lên GitHub và bản nháp còn nguyên.
4. **Given** người dùng bấm publish hai lần liên tiếp, hoặc thử lại sau khi mạng chập chờn, **When** việc ghi hoàn tất, **Then** vẫn chỉ có một comment cho chú thích đó.
5. **Given** spec chưa có issue theo dõi (chưa duyệt cổng nào), **When** người dùng muốn publish, **Then** họ được báo rõ chưa thể publish vì chưa có issue và cách có issue (duyệt cổng đầu tiên); bản nháp vẫn dùng bình thường.
6. **Given** người dùng ở chế độ cục bộ hoặc demo (không có tài khoản GitHub), **When** họ xem chú thích, **Then** không có thao tác publish và có giải thích ngắn tại sao.
7. **Given** việc ghi lên GitHub thất bại (mất mạng, bị từ chối quyền), **When** người dùng được báo lỗi, **Then** bản nháp còn nguyên để thử lại và không có chú thích nửa vời.
8. **Given** chú thích của người khác đã publish, **When** người dùng xem spec, **Then** thấy highlight và comment đó cùng tên người tạo, và không có thao tác sửa hay xoá nó.

---

### User Story 4 - Xem danh sách, sửa và xoá chú thích (Priority: P2)

Người dùng cần một nơi xem mọi chú thích của spec đang mở (bản nháp của mình và các chú thích đã publish), chọn một mục để nhảy tới đúng đoạn, và sửa hoặc xoá chú thích do chính mình tạo. Bản nháp sửa và xoá tự do; chú thích đã publish do mình tạo sửa hoặc xoá sẽ sửa hoặc xoá chính comment trên GitHub, nên cần xác nhận. Chú thích của người khác chỉ xem được.

**Why this priority**: Nhiều chú thích sẽ khó dùng nếu thiếu danh sách, và người dùng phải sửa được nhầm lẫn. Việc này không cản việc tạo, lưu và publish ở P1.

**Independent Test**: Tạo ba chú thích ở các tài liệu khác nhau của một spec, publish một cái. Danh sách liệt kê đủ ba mục với đúng trạng thái, chọn từng mục thì tới đúng đoạn, sửa comment của bản nháp thì thấy bản mới ngay, xoá bản nháp thì highlight biến mất, sửa comment đã publish thì comment trên GitHub đổi theo.

**Acceptance Scenarios**:

1. **Given** spec có nhiều chú thích, **When** người dùng mở danh sách, **Then** thấy mọi chú thích mình được phép thấy, nhóm theo tài liệu, kèm trạng thái "Bản nháp" hoặc "Đã publish" và người tạo; lọc được theo người tạo, trạng thái và tài liệu.
2. **Given** một mục trong danh sách, **When** người dùng chọn nó, **Then** màn hình mở đúng tài liệu và cuộn tới đoạn được highlight.
3. **Given** một bản nháp của mình, **When** họ sửa comment hoặc xoá (có xác nhận), **Then** thay đổi áp dụng ngay và chỉ ở local.
4. **Given** một chú thích đã publish do mình tạo, **When** họ sửa comment hoặc xoá, **Then** có bước xác nhận nêu rõ sẽ sửa hoặc xoá comment trên GitHub, và sau khi xác nhận thì comment trên GitHub đổi hoặc mất theo.
5. **Given** chú thích đã publish do người khác tạo, **When** người dùng xem, **Then** không có thao tác sửa hay xoá.

---

### User Story 5 - Chú thích còn đúng khi tài liệu đổi (Priority: P3)

Tài liệu của spec đổi sau khi đã có chú thích (ví dụ spec được sửa sau clarify). Chú thích không được biến mất hay trỏ sai chỗ: nếu đoạn chữ vẫn còn thì chú thích vẫn gắn vào đó, nếu đoạn đã đổi hoặc không còn thì chú thích hiện là "đoạn đã đổi" cùng nguyên văn cũ và comment, để người dùng vẫn đọc được nhận xét. Điều này đúng cho cả bản nháp lẫn chú thích đã publish.

**Why this priority**: Spec thay đổi liên tục qua các bước, nên điều này quan trọng, nhưng có thể làm sau khi tạo, lưu và publish đã chạy.

**Independent Test**: Chú thích một câu, rồi đổi câu đó trong tài liệu. Chú thích hiện "đoạn đã đổi" với nguyên văn cũ. Đưa câu về như cũ thì chú thích gắn lại đúng chỗ.

**Acceptance Scenarios**:

1. **Given** đoạn được highlight vẫn còn nguyên trong tài liệu sau khi tài liệu đổi chỗ khác, **When** người dùng mở lại, **Then** chú thích vẫn gắn vào đúng đoạn đó.
2. **Given** đoạn được highlight đã bị sửa hoặc xoá, **When** người dùng mở lại, **Then** chú thích không hiện trên văn bản, nhưng vẫn có trong danh sách với nhãn "đoạn đã đổi", nguyên văn cũ và comment.
3. **Given** đoạn chữ xuất hiện nhiều lần trong một tài liệu, **When** người dùng chú thích một lần xuất hiện, **Then** highlight gắn vào đúng lần xuất hiện đó, không gắn sang các lần khác.

---

### Edge Cases

- Người dùng chọn đoạn chữ trải qua nhiều đoạn văn, tiêu đề, danh sách hoặc bảng: chú thích vẫn tạo được nếu nội dung chọn là văn bản liên tục, hoặc người dùng được báo lý do không tạo được và cách chọn lại.
- Chọn đoạn quá ngắn (một ký tự) hoặc chỉ là khoảng trắng: không tạo chú thích.
- Hai chú thích chồng lên nhau hoặc lồng nhau trên cùng một đoạn: cả hai vẫn chọn và xem được.
- Comment dài hoặc chứa ký tự đặc biệt, đoạn chữ có dấu nhắc mã hoặc ký hiệu markdown: lưu và hiện đúng như người dùng gõ, không bị hiểu thành định dạng hay mã HTML, kể cả khi đã publish thành comment trên GitHub.
- Tài liệu chưa có chú thích nào: danh sách nói rõ "Chưa có chú thích".
- Người dùng chuyển spec hoặc nhánh khi đang soạn comment chưa lưu: nháp đang soạn không bị mất âm thầm và không bị lưu nhầm sang spec khác.
- Không lưu được bản nháp (hết dung lượng, trình duyệt chặn lưu trữ, không ghi được file): người dùng được báo rõ, comment đang soạn vẫn còn để thử lại, không có chú thích nửa vời.
- Trình duyệt chặn `localStorage` (cửa sổ riêng tư, đã xoá dữ liệu): app vẫn dùng được, nhưng báo rằng bản nháp sẽ không giữ được.
- Dữ liệu trình duyệt bị xoá hoặc đổi máy: bản nháp ở trình duyệt mất (đã nêu trước cho người dùng); chú thích đã publish vẫn còn trên GitHub.
- Comment đã đăng lên GitHub nhưng app chưa kịp ghi nhận (đóng tab, mất mạng giữa chừng): lần mở sau app nhận ra comment đã tồn tại và đánh dấu chú thích là đã publish, không đăng lần hai.
- Comment đã publish bị xoá hoặc sửa trực tiếp trên GitHub: lần làm mới sau, chú thích phản ánh trạng thái thật trên GitHub (mất khỏi danh sách đã publish, hoặc hiện nội dung mới); không mất bản gốc nếu người tạo vẫn còn bản ghi cục bộ.
- Issue theo dõi bị đóng (cổng Implement đã duyệt): vẫn publish và xem chú thích được.
- Bình luận khác trên issue (kết quả duyệt cổng, bình luận của người): không bị coi là chú thích và không bị sửa hay xoá.
- Hai người cùng publish chú thích trong lúc đồng bộ chậm: mỗi người một comment riêng; không comment nào bị ghi đè.
- Spec có hàng trăm chú thích: danh sách và highlight vẫn dùng mượt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Người dùng MUST chọn được một đoạn chữ trong tài liệu hiển thị của một spec và tạo chú thích gồm highlight và comment; comment là tuỳ chọn. Chú thích mới MUST được lưu thành **bản nháp** ở local và MUST không ghi gì lên GitHub.
- **FR-002**: Đoạn có chú thích MUST được tô nổi bật nhất quán, phân biệt được bản nháp với chú thích đã publish, và người dùng MUST xem được comment, người tạo, trạng thái và thời điểm bằng cách chọn đoạn đó (chuột, chạm hoặc bàn phím).
- **FR-003**: Mỗi chú thích MUST được lưu thành một bản ghi gồm: người tạo, spec, tài liệu chứa đoạn, nguyên văn đoạn được highlight cùng đủ ngữ cảnh quanh nó để tìm lại, comment, trạng thái (bản nháp hoặc đã publish), liên kết tới comment khi đã publish, thời điểm tạo và thời điểm sửa gần nhất.
- **FR-004**: Bản nháp MUST được lưu cục bộ theo từng chế độ và theo từng người dùng:
  - bản có server: một file cục bộ do app giữ, nằm ngoài mọi repo được quản lý hoặc được git bỏ qua, MUST không bao giờ bị commit hay push;
  - bản GitHub Pages: `localStorage` của trình duyệt;
  - chế độ cục bộ: lưu trong trình duyệt, không ghi vào thư mục repo của người dùng.
  Bản nháp MUST còn sau khi tải lại trang, và với bản có server, còn sau khi server khởi động lại.
- **FR-005**: Bản nháp của một người MUST chỉ hiện với chính người đó; MUST không lẫn sang người dùng, spec hoặc repo khác, kể cả khi đoạn chữ giống hệt.
- **FR-006**: Người dùng MUST publish được một bản nháp. Publish MUST là thao tác tường minh, có bước xác nhận nêu rõ nội dung sẽ đăng và nơi đăng (issue theo dõi của spec). Chỉ sau khi xác nhận mới được ghi lên GitHub.
- **FR-007**: Khi publish, chú thích MUST trở thành đúng một comment trên issue theo dõi của spec, do tài khoản GitHub của chính người đó đăng. Comment MUST chứa đủ thông tin (đoạn chữ nguyên văn, tài liệu, ngữ cảnh) để người khác dựng lại đúng highlight trong speckit-ui, và đọc được như một nhận xét bình thường trên GitHub.
- **FR-008**: Publish MUST không tạo trùng: bấm nhiều lần, thử lại hoặc mở app trên nhiều tab vẫn chỉ cho một comment cho mỗi chú thích. Nếu comment đã có mà app chưa ghi nhận, lần mở sau MUST đánh dấu là đã publish thay vì đăng lại.
- **FR-009**: Publish thất bại MUST giữ nguyên bản nháp, báo rõ lý do và MUST không tạo chú thích nửa vời.
- **FR-010**: Khi spec chưa có issue theo dõi, hệ thống MUST không tự tạo issue chỉ để publish; MUST báo rõ chưa thể publish và cách có issue. Ở chế độ cục bộ và demo (không có GitHub), thao tác publish MUST không có, kèm giải thích.
- **FR-011**: Chú thích đã publish MUST hiện cho mọi người đọc được issue theo dõi khi họ mở spec trong speckit-ui, kèm tên người tạo, và MUST không sửa hoặc xoá được bởi người khác.
- **FR-012**: Người dùng MUST xem được danh sách chú thích của spec đang mở (bản nháp của mình và chú thích đã publish), lọc được theo người tạo, trạng thái và tài liệu, và chọn một mục thì MUST tới đúng đoạn.
- **FR-013**: Người tạo MUST sửa được comment và xoá được chú thích của mình. Với bản nháp: chỉ thay đổi ở local, xoá có xác nhận. Với chú thích đã publish: sửa hoặc xoá MUST có bước xác nhận nêu rõ sẽ đổi hoặc xoá comment trên GitHub, và chỉ động tới comment của chú thích đó.
- **FR-014**: Khi tài liệu đổi, chú thích MUST gắn lại vào đoạn nếu tìm thấy; nếu không, chú thích MUST được giữ cùng nguyên văn cũ và comment, và đánh dấu "đoạn đã đổi" trong danh sách, không bị xoá hay gắn sai.
- **FR-015**: Nguyên văn đoạn chữ và comment MUST được hiển thị như văn bản thuần, không bao giờ được hiểu thành HTML, mã hay định dạng, và comment đăng lên GitHub MUST được trình bày an toàn (nguyên tắc II của constitution).
- **FR-016**: Chú thích MUST không ảnh hưởng tới cổng duyệt: chú thích còn mở, nháp hay đã publish, không chặn và không tự duyệt cổng nào. Các bình luận khác trên issue (kết quả duyệt cổng, bình luận của người) MUST không bị coi là chú thích và không bị đổi.
- **FR-017**: Tạo, xem, sửa, xoá và publish chú thích MUST dùng được ở bề rộng điện thoại và bằng bàn phím, và mọi nút MUST có nhãn cho trình đọc màn hình (nguyên tắc IV).
- **FR-018**: Khi không lưu được bản nháp, hệ thống MUST báo rõ, giữ comment đang soạn và MUST không tạo chú thích không đầy đủ.
- **FR-019**: Comment MUST có giới hạn độ dài hợp lý (2.000 ký tự); vượt giới hạn thì người dùng được báo trước khi lưu hoặc publish.
- **FR-020**: Chế độ demo MUST không đổi so với bản thiết kế (giống từng pixel ở bề rộng máy tính, nguyên tắc IV). Chú thích có ở bản có server, bản Pages và chế độ cục bộ; riêng publish chỉ có ở bản có server và bản Pages.
- **FR-021**: Việc lưu bản nháp MUST không đưa dữ liệu ra ngoài máy của người dùng ngoài lần publish đã xác nhận, không đưa khoá hay token vào bản ghi, và MUST không ghi gì vào repo được quản lý (nguyên tắc I và II).

### Key Entities *(include if feature involves data)*

- **Chú thích (annotation)**: một bản ghi có mã nhận diện, người tạo, spec, tài liệu, đoạn được highlight (neo), comment tuỳ chọn, thời điểm tạo và sửa, trạng thái (bản nháp hoặc đã publish), trạng thái gắn (còn gắn hay "đoạn đã đổi") và liên kết tới comment khi đã publish.
- **Neo (anchor)**: nguyên văn đoạn được highlight, ngữ cảnh ngay trước và sau nó, và phiên bản của tài liệu lúc tạo; dùng để tìm lại đoạn khi tài liệu đổi và phân biệt các lần xuất hiện của cùng một câu.
- **Comment đã publish**: bình luận trên issue theo dõi của spec do chính người tạo đăng, mang đủ thông tin của chú thích để dựng lại highlight.
- **Kho bản nháp**: nơi cục bộ giữ bản nháp của một người dùng: một file cục bộ bị git bỏ qua (bản có server) hoặc `localStorage` (bản Pages, chế độ cục bộ).
- **Người tạo**: tài khoản GitHub đang đăng nhập, hoặc "cục bộ" khi không có tài khoản.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng tạo được một bản nháp (chọn đoạn, viết comment, lưu) trong tối đa 3 thao tác và dưới 15 giây, ở cả máy tính và điện thoại.
- **SC-002**: 100% bản nháp đã lưu hiện lại đúng đoạn cũ sau khi tải lại trang, và với bản có server, sau khi server khởi động lại.
- **SC-003**: Sau khi tạo 50 bản nháp, không repo nào (repo của speckit-ui hay repo được quản lý) có thay đổi cần commit, và không có yêu cầu ghi nào gửi lên GitHub.
- **SC-004**: 0 bản nháp của người này hiện với người khác, và 0 chú thích hiện ở spec không phải spec của nó.
- **SC-005**: Mỗi lần publish đã xác nhận cho đúng một comment trên GitHub: 0 comment trùng khi bấm đúp hoặc thử lại, 0 comment khi chưa xác nhận.
- **SC-006**: Người khác mở spec trong speckit-ui thấy chú thích đã publish sau tối đa một lần làm mới.
- **SC-007**: Khi tài liệu đổi, 0 chú thích bị mất: mỗi chú thích hoặc gắn lại đúng đoạn, hoặc hiện là "đoạn đã đổi" kèm nguyên văn cũ và comment.
- **SC-008**: Với 200 chú thích trong một spec, mở một tài liệu và chuyển bước vẫn hiện highlight trong dưới 1 giây.
- **SC-009**: Ở bề rộng 390px, người dùng tạo, xem, sửa, xoá và publish được một chú thích mà không phải kéo ngang trang.

## Assumptions

- **Tài liệu hỗ trợ:** mọi tài liệu markdown của spec mà speckit-ui đã hiển thị (spec, plan, research, data-model, quickstart, tasks, analysis, checklist và constitution của dự án). Ảnh và sơ đồ nằm ngoài phạm vi.
- **Danh tính:** "user" là tài khoản GitHub đang đăng nhập (bản server và bản Pages), lấy từ phiên hiện có. Chế độ cục bộ không có tài khoản, nên người tạo ghi là "cục bộ" và chỉ có bản nháp.
- **Chế độ bị ảnh hưởng** (nguyên tắc III): bản server, bản Pages và chế độ cục bộ. Chế độ demo không đổi (FR-020).
- **Loại ghi mới:** publish thêm một loại ghi mới của app (đăng, sửa và xoá một comment trên issue theo dõi). Vì vậy tính năng phải đi đủ quy trình Spec Kit và có bước xác nhận rõ ràng trong giao diện (nguyên tắc I). Nơi ghi vẫn là issue theo dõi có nhãn `speckit`, không thêm nơi ghi nào khác trên GitHub.
- **Quyền:** publish dùng quyền ghi Issues mà việc duyệt cổng đã cần; không thêm quyền token mới. Người chỉ có quyền đọc vẫn tạo và xem được bản nháp, nhưng không publish được và được báo lý do (nguyên tắc II).
- **Bản nháp là của riêng từng người:** bản nháp không đồng bộ giữa các máy hay trình duyệt. Người dùng được báo trước rằng xoá dữ liệu trình duyệt sẽ mất bản nháp chưa publish.
- **File bản nháp ở bản server:** nằm trên máy chạy server, tách theo từng người dùng, và git bỏ qua; vị trí cụ thể quyết định ở bước plan, nhưng không nằm trong repo được quản lý.
- **Neo bằng nội dung:** chú thích tìm lại đoạn bằng nguyên văn và ngữ cảnh quanh nó, không bằng số dòng, để chịu được việc tài liệu đổi.
- **Comment tuỳ chọn:** một highlight không có comment là hợp lệ; khi publish, đoạn trích vẫn được đăng.
- **Không tự tạo issue:** publish không tạo issue theo dõi nếu chưa có; issue chỉ được tạo như hiện nay khi duyệt cổng đầu tiên.

## Non-Goals

- Không có luồng trả lời (thread), không nhắc tên (@mention), không thông báo qua email hay đẩy.
- Chú thích không chặn, không tự duyệt và không thay thế cổng duyệt hay "Request changes".
- Không đồng bộ bản nháp giữa các máy hay trình duyệt, và không sao lưu bản nháp lên GitHub trước khi publish.
- Không chú thích trên ảnh, sơ đồ hoặc code đang xem ngoài các tài liệu markdown của spec.
- Không sửa nội dung tài liệu của spec từ chú thích.
- Không ghi chú thích vào file trong repo của dự án (không commit, không PR).
- Không đồng bộ chú thích với công cụ ngoài (Slack, Jira, ...).
