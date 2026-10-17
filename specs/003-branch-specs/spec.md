# Feature Specification: Liệt kê spec trên nhiều nhánh

**Feature Branch**: `feat/003-branch-specs`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "trong 1 repo, anh muốn speckit-ui có thể liệt kê tất cả spec có trong nhiều nhánh feat khác nhau"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Thấy cả spec chưa merge (Priority: P1)

Người dùng mở một repo và thấy mọi spec đang có trong repo đó: cả spec đã nằm trên nhánh chính, lẫn spec mới chỉ có trên các nhánh làm việc chưa merge. Mỗi spec cho biết nó đang nằm ở nhánh nào.

Hiện nay ứng dụng chỉ đọc nhánh chính. Spec vừa viết bằng `/speckit-specify` trên một nhánh riêng không hiện ra cho tới khi được merge, dù đó chính là lúc cần duyệt nó.

**Why this priority**: Đây là toàn bộ yêu cầu. Quy trình Spec Kit viết spec, plan và tasks trên nhánh riêng; nếu không thấy được những spec này thì không duyệt cổng được trước khi merge.

**Independent Test**: Trong một repo có spec A trên nhánh chính và spec B chỉ có trên một nhánh làm việc, mở repo: thấy cả A và B, và B được đánh dấu là đang ở nhánh làm việc đó.

**Acceptance Scenarios**:

1. **Given** một repo có spec trên nhánh chính và spec khác chỉ có trên các nhánh làm việc, **When** người dùng mở repo, **Then** danh sách spec có đủ cả hai loại.
2. **Given** một spec chỉ có trên một nhánh làm việc, **When** người dùng nhìn spec đó trong danh sách, **Then** spec hiện tên nhánh và cho biết chưa merge vào nhánh chính.
3. **Given** một spec đã có trên nhánh chính, **When** người dùng nhìn danh sách, **Then** spec đó không bị đánh dấu là chưa merge.
4. **Given** repo không có nhánh làm việc nào, **When** người dùng mở repo, **Then** ứng dụng hoạt động như hiện nay.

---

### User Story 2 - Làm việc với spec trên nhánh như spec trên nhánh chính (Priority: P1)

Người dùng chọn một spec đang ở nhánh làm việc và xem từng bước (spec, plan, tasks, analysis), xem kiểm tra của cổng, và duyệt cổng như với spec trên nhánh chính. Mọi thứ hiển thị là nội dung của nhánh đó.

**Why this priority**: Thấy spec mà không duyệt được thì chưa giải quyết được vấn đề. Duyệt trước khi merge là mục đích của các cổng.

**Independent Test**: Chọn một spec chỉ có trên nhánh làm việc và đã có plan: bước Plan hiện plan của nhánh đó. Bấm duyệt cổng Plan, rồi duyệt được ghi nhận như với spec trên nhánh chính.

**Acceptance Scenarios**:

1. **Given** một spec chỉ có trên nhánh làm việc, **When** người dùng chọn spec đó, **Then** mọi bước và mọi file hiển thị theo nội dung của nhánh đó, và liên kết tới file trỏ đúng nhánh.
2. **Given** một spec trên nhánh làm việc đủ điều kiện duyệt một cổng, **When** người dùng duyệt, **Then** việc duyệt được ghi nhận giống hệt như với spec trên nhánh chính.
3. **Given** một spec trên nhánh làm việc, **When** người dùng xem lệnh cần chạy, **Then** ứng dụng nhắc rằng lệnh phải chạy trên đúng nhánh đó.
4. **Given** người dùng đang xem một spec trên nhánh làm việc, **When** chia sẻ địa chỉ trang, **Then** người mở địa chỉ thấy đúng spec đó trên đúng nhánh đó.

---

### User Story 3 - Một spec có mặt ở nhiều nhánh (Priority: P2)

Một spec có thể có mặt ở nhiều nơi: nhánh chính giữ bản cũ còn nhánh làm việc có bản mới hơn (ví dụ đã thêm plan), hoặc hai nhánh cùng sửa một spec. Ứng dụng hiện mỗi spec một lần, chọn bản phù hợp, và cho người dùng biết spec còn ở những nhánh nào.

**Why this priority**: Đây là tình huống thường gặp khi một spec đi qua nhiều PR. Nếu không xử lý, danh sách sẽ có các mục trùng lặp gây khó hiểu.

**Independent Test**: Spec A có spec.md trên nhánh chính, và có thêm plan.md trên nhánh `feat/a`: danh sách hiện A đúng một lần, kèm cho biết A có mặt ở cả hai nhánh.

**Acceptance Scenarios**:

1. **Given** một spec có mặt trên nhánh chính và trên một nhánh làm việc, **When** người dùng mở repo, **Then** spec chỉ xuất hiện một lần, với bản được chọn theo FR-006, và có cách biết spec đang có mặt ở những nhánh nào.
2. **Given** một spec có mặt trên hai nhánh làm việc, **When** người dùng chọn spec, **Then** người dùng chuyển được sang xem bản của nhánh còn lại.
3. **Given** hai nhánh khác nhau tạo hai spec khác nhau nhưng trùng số thứ tự (ví dụ cả hai đều là `003-…` với tên khác), **When** người dùng mở repo, **Then** cả hai đều hiện, và ứng dụng cảnh báo trùng số.

---

### Edge Cases

- **Nhánh đã merge nhưng chưa xoá:** spec trên nhánh đó giống nhánh chính, nên không được đánh dấu là chưa merge.
- **Nhánh bị xoá hoặc force-push trong lúc đang xem:** lần làm mới kế tiếp phản ánh thay đổi, và không làm hỏng các spec khác.
- **Repo có rất nhiều nhánh:** danh sách vẫn mở được trong thời gian ở SC-002. Nếu phải giới hạn số nhánh được đọc, ứng dụng nói rõ đã bỏ qua bao nhiêu nhánh.
- **Một nhánh không đọc được** (thiếu quyền, lỗi mạng): các nhánh khác vẫn hiện bình thường, và có cảnh báo cho nhánh lỗi.
- **Nhánh không có thư mục specs:** bỏ qua, không cảnh báo.
- **Repo có submodule:** danh sách PR liên kết và thứ tự merge vẫn hoạt động như hiện nay cho spec trên nhánh làm việc.
- **Người dùng chỉ định một nhánh cụ thể** (ví dụ mục Branch trong Advanced, hoặc `GITHUB_REF`): ứng dụng vẫn hoạt động như hiện nay, và chỉ đọc thêm các nhánh làm việc khi người dùng không cố định nhánh.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ứng dụng MUST liệt kê spec từ nhánh chính và từ các nhánh làm việc của repo đang mở. Các nhánh này được chọn theo FR-002.
- **FR-002**: Nhánh làm việc được đọc MUST gồm mọi nhánh có tên bắt đầu bằng `feat/`, `fix/` hoặc `chore/`, cùng mọi nhánh có pull request đang mở vào nhánh chính, kể cả nhánh từ fork. Danh sách tiền tố MUST thay đổi được cho từng repo (FR-012).
- **FR-003**: Mỗi spec MUST cho biết nó đang ở nhánh nào, và có chưa được merge vào nhánh chính hay không.
- **FR-004**: Khi xem một spec trên nhánh làm việc, mọi nội dung (các bước, file, kiểm tra cổng, PR liên kết) MUST lấy từ nhánh đó, và liên kết tới file MUST trỏ đúng nhánh đó.
- **FR-005**: Duyệt cổng cho spec trên nhánh làm việc MUST được ghi nhận giống như spec trên nhánh chính, vào cùng nơi lưu phê duyệt của repo.
- **FR-006**: Một spec có mặt ở nhiều nhánh MUST chỉ xuất hiện một lần trong danh sách. Bản mặc định là bản đi xa nhất trong quy trình (nhiều bước đã làm nhất). Nếu bằng nhau thì chọn bản có commit mới nhất. Người dùng MUST thấy spec có mặt ở những nhánh nào và chuyển được sang bản của nhánh khác.
- **FR-007**: Hai spec khác nhau trùng số thứ tự MUST cùng hiện ra, kèm cảnh báo trùng số.
- **FR-008**: Lỗi đọc một nhánh MUST chỉ ảnh hưởng spec của nhánh đó và MUST có cảnh báo.
- **FR-009**: Địa chỉ trang khi xem một spec trên nhánh làm việc MUST xác định được cả spec lẫn nhánh, để người mở lại thấy đúng spec trên đúng nhánh đó. Địa chỉ không được chứa khoá.
- **FR-010**: Khi người dùng đã cố định một nhánh (mục Branch trong Advanced, hoặc cấu hình nhánh của server), ứng dụng MUST chỉ đọc nhánh đó, như hiện nay.
- **FR-011**: Lệnh gợi ý chạy cho một spec trên nhánh làm việc MUST kèm lời nhắc chạy trên nhánh đó.
- **FR-012**: Mỗi repo MAY đổi danh sách tiền tố nhánh làm việc trong file cấu hình speckit-ui có sẵn của repo. Không có cấu hình thì dùng mặc định ở FR-002.
- **FR-013**: Tính năng MUST hoạt động giống nhau ở bản server và bản Pages, và dùng quyền GitHub của chính người dùng như hiện nay. Chế độ demo không đổi.

### Key Entities

- **Nhánh làm việc**: một nhánh của repo, khác nhánh chính, được đọc theo FR-002. Thuộc tính: tên, commit mới nhất, đã merge hay chưa, có PR đang mở hay không.
- **Bản spec**: nội dung của một spec (thư mục `specs/NNN-slug/`) trên một nhánh cụ thể.
- **Spec**: một mục trong danh sách, xác định bởi slug. Gồm một hay nhiều bản spec trên các nhánh, trong đó có một bản đang được hiển thị.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Spec vừa đẩy lên một nhánh làm việc hiện trong danh sách ở lần làm mới đầu tiên sau khi đẩy, không cần merge.
- **SC-002**: Với repo có tối đa 20 nhánh làm việc, danh sách spec đầy đủ hiện ra trong vòng 10 giây khi mở lần đầu, và trong vòng 3 giây khi làm mới mà không có nhánh nào thay đổi.
- **SC-003**: Trong 100% trường hợp, mỗi spec chỉ xuất hiện một lần dù có mặt ở nhiều nhánh, trừ hai spec khác nhau trùng số thứ tự theo FR-007.
- **SC-004**: Người duyệt duyệt được một cổng của spec chưa merge mà không cần đổi cấu hình nhánh hay nhập lại gì.
- **SC-005**: Một nhánh lỗi không làm mất spec nào trên các nhánh khác.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): bản server và bản Pages. Chế độ demo không đổi.
- **Quy trình**: theo constitution, thay đổi này ảnh hưởng hai chế độ nên đi đủ quy trình Spec Kit. Tính năng chỉ đọc thêm từ GitHub, không thêm loại ghi mới và không cần thêm quyền ngoài Contents và Pull requests ở mức đọc.
- **Nơi lưu phê duyệt không đổi:** mỗi spec vẫn có đúng một issue theo dõi trong repo, xác định theo slug, không phụ thuộc nhánh.
- **Nhánh chính** là nhánh mặc định của repo trên GitHub.
- **Tiền tố mặc định** `feat/`, `fix/`, `chore/` theo quy ước tạo nhánh trong CLAUDE.md và constitution.
- **Cấu hình theo repo** dùng file `.specify/speckit-ui.json` sẵn có (nơi đang khai báo `mergeOrder`). Trường mới là tuỳ chọn và có giá trị mặc định (nguyên tắc I).
- **Spec "chưa merge"** nghĩa là thư mục spec trên nhánh làm việc khác với trên nhánh chính, hoặc nhánh chính chưa có thư mục đó.

## Non-Goals

- Không hiện spec từ các repo khác. Nhiều repo đã có ở spec 002.
- Không so sánh nội dung giữa các nhánh (diff).
- Không merge, tạo hay xoá nhánh từ ứng dụng.
- Không đọc các nhánh ngoài FR-002 và FR-012.
- Không đổi định dạng issue theo dõi.
