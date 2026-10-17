# Feature Specification: Phải duyệt xong mới sang bước tiếp theo

**Feature Branch**: `feat/004-approval-gates-next`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "hiện tại mặc dù spec chưa được approve nhưng tôi vẫn có thể chạy các lệnh sau đó cho đến khi hoàn thành. Mong muốn: phải có Approve thì bước tiếp theo mới có thể thực hiện được."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bước sau bị khoá cho tới khi cổng trước được duyệt (Priority: P1)

Một spec đã chạy xong Specify nhưng cổng Specify chưa được duyệt. Người dùng mở spec trong speckit-ui:
- bước Plan hiện là đang khoá, kèm lý do "Chờ duyệt Specify";
- thanh lệnh không gợi ý `/speckit-plan` mà nhắc duyệt Specify trước;
- Next up chỉ hiện "Approve Specify".

Khi cổng Specify được duyệt, bước Plan mở ra ngay và lệnh `/speckit-plan` được gợi ý.

Hiện nay ứng dụng vẫn gợi ý lệnh của bước sau dù cổng trước chưa duyệt, nên người dùng có thể đi hết quy trình mà không ai duyệt gì.

**Why this priority**: Đây là toàn bộ yêu cầu. Cổng duyệt chỉ có ý nghĩa khi việc chưa duyệt chặn được bước sau.

**Independent Test**: Mở một spec có spec.md nhưng cổng Specify chưa duyệt. Bước Plan bị khoá, và không có cách nào sao chép lệnh `/speckit-plan` từ ứng dụng. Duyệt Specify thì bước Plan mở ra mà không cần tải lại trang.

**Acceptance Scenarios**:

1. **Given** cổng Specify chưa được duyệt, **When** người dùng xem spec, **Then** bước Plan và mọi bước sau hiện khoá, kèm lý do nêu cổng đang chờ duyệt.
2. **Given** bước Plan đang khoá, **When** người dùng xem thanh lệnh, **Then** ứng dụng không gợi ý lệnh của bước Plan, mà nhắc duyệt cổng đang chờ.
3. **Given** cổng Specify vừa được duyệt, **When** việc duyệt được ghi nhận, **Then** bước Plan mở ngay, và Next up cùng thanh lệnh gợi ý `/speckit-plan`.
4. **Given** một cổng đã duyệt bị mở lại (Reopen gate), **When** việc mở lại được ghi nhận, **Then** các bước sau cổng đó lại bị khoá.

---

### User Story 2 - Chặn cả khi chạy lệnh ngoài speckit-ui (Priority: P1)

Người dùng gõ thẳng `/speckit-plan` trong Claude Code khi cổng Specify chưa được duyệt. Lệnh bị từ chối và nêu cổng nào đang chờ duyệt. Sau khi cổng được duyệt trong speckit-ui, lệnh chạy bình thường.

**Why this priority**: Người dùng báo rằng *chạy được các lệnh*. Các lệnh `/speckit-*` chạy trong Claude Code, không chạy trong speckit-ui. Nếu chỉ khoá trong giao diện thì vẫn chạy lệnh được như hiện nay.

**Independent Test**: Trong một repo đã bật cơ chế chặn, chạy `/speckit-plan` khi cổng Specify chưa duyệt: lệnh dừng kèm thông báo. Duyệt cổng, chạy lại: lệnh chạy.

**Acceptance Scenarios**:

1. **Given** cổng Specify của spec hiện tại chưa được duyệt, **When** người dùng chạy `/speckit-plan` trong Claude Code, **Then** lệnh dừng trước khi làm gì, và nêu cổng đang chờ duyệt cùng liên kết tới issue theo dõi.
2. **Given** cổng Specify đã được duyệt, **When** người dùng chạy `/speckit-plan`, **Then** lệnh chạy như bình thường.
3. **Given** không đọc được trạng thái duyệt (mất mạng, thiếu quyền), **When** người dùng chạy lệnh, **Then** lệnh dừng và nói rõ không kiểm tra được, kèm cách bỏ qua có chủ đích (FR-008).
4. **Given** một repo chưa bật cơ chế chặn, **When** người dùng chạy lệnh, **Then** hành vi giống hệt hiện nay.

---

### User Story 3 - Việc đã làm trước khi duyệt (Priority: P2)

Một spec đã chạy Plan và Tasks dù Specify chưa được duyệt (tình trạng của các spec hiện có). Ứng dụng vẫn hiện nội dung các bước đó, nhưng đánh dấu "chạy trước khi duyệt". Cổng của các bước sau không duyệt được cho tới khi các cổng trước được duyệt theo thứ tự.

**Why this priority**: Các dự án đang dùng (ví dụ tohong) đã có nhiều spec đi trước phần duyệt. Chúng phải hiển thị rõ ràng, không bị mất hay ẩn đi.

**Independent Test**: Mở một spec đã có tasks.md nhưng cổng Specify chưa duyệt. Plan và Tasks vẫn xem được, có nhãn "chạy trước khi duyệt". Nút Approve của Plan bị khoá kèm lý do "Duyệt Specify trước".

**Acceptance Scenarios**:

1. **Given** spec đã có plan.md nhưng cổng Specify chưa duyệt, **When** người dùng xem bước Plan, **Then** nội dung plan vẫn hiển thị, kèm nhãn "chạy trước khi duyệt".
2. **Given** cổng Specify chưa duyệt, **When** người dùng mở cổng Plan, **Then** nút Approve bị khoá, kèm lý do "Duyệt Specify trước".
3. **Given** các cổng được duyệt lần lượt theo thứ tự, **When** cổng trước được duyệt, **Then** cổng kế tiếp duyệt được nếu kiểm tra của nó đạt.

---

### Edge Cases

- **Bước Not run** (Clarify khi spec không có câu hỏi; Tasks, Analyze, Implement với spec `**Track**: light`): không chặn bước sau. Cổng tiếp theo cần duyệt là cổng của bước đã làm gần nhất trước nó.
- **Constitution** không có cổng riêng cho từng spec, nên không chặn Specify.
- **Cổng được tick trực tiếp trên GitHub:** được tính là đã duyệt, như hiện nay.
- **Hai người cùng làm:** người A duyệt Specify thì người B thấy Plan mở ở lần làm mới kế tiếp.
- **Duyệt bằng tay trên issue rồi mở lại:** các bước sau lại bị khoá; nội dung đã làm vẫn hiển thị với nhãn "chạy trước khi duyệt".
- **Spec trên nhánh chưa merge** (spec 003): áp dụng cùng quy tắc.
- **Chế độ demo** đã có trạng thái Locked theo bản thiết kế, và không thay đổi.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Một bước MUST bị coi là khoá khi cổng của bước đã làm gần nhất trước nó chưa được duyệt. Bước Not run không tính.
- **FR-002**: Bước bị khoá MUST hiện trạng thái khoá trên thanh bước và trong thanh tiến độ, kèm lý do nêu tên cổng đang chờ duyệt.
- **FR-003**: Ứng dụng MUST không gợi ý và không cho sao chép lệnh của một bước đang khoá. Thanh lệnh MUST nhắc duyệt cổng đang chờ.
- **FR-004**: Next up MUST chỉ hiện việc duyệt cổng đang chờ cho tới khi cổng đó được duyệt, không hiện lệnh của bước sau.
- **FR-005**: Cổng của một bước MUST không duyệt được khi cổng trước nó chưa được duyệt. Nút Approve MUST nêu lý do. Kiểm tra này MUST chạy lại ngay trước khi ghi (constitution III).
- **FR-006**: Nội dung của bước đã chạy trước khi cổng trước được duyệt MUST vẫn hiển thị, kèm nhãn "chạy trước khi duyệt".
- **FR-007**: Khi chạy một lệnh `/speckit-*` trong Claude Code mà cổng trước chưa được duyệt, lệnh MUST dừng trước khi thay đổi file nào, và nêu cổng đang chờ duyệt cùng liên kết tới issue theo dõi. [NEEDS CLARIFICATION: Có cần chặn lệnh ngay trong Claude Code không, hay chỉ cần khoá trong speckit-ui? Chặn trong Claude Code nghĩa là thêm một hook kiểm tra vào chính repo dự án, ví dụ tohong.]
- **FR-008**: Khi không kiểm tra được trạng thái duyệt, lệnh MUST dừng và nói rõ lý do, kèm một cách bỏ qua có chủ đích được ghi lại.
- **FR-009**: Mở lại một cổng MUST khoá lại các bước sau nó ngay khi việc mở lại được ghi nhận, giống cách duyệt mở khoá ngay (spec 001).
- **FR-010**: Quy tắc khoá MUST giống nhau ở bản server và bản Pages, và áp dụng cho spec trên nhánh chưa merge (spec 003). Chế độ demo không đổi.
- **FR-011**: Mỗi repo MUST bật hoặc tắt được việc khoá theo cổng. [NEEDS CLARIFICATION: Mặc định bật hay tắt cho repo hiện có? Bật sẵn thì mọi spec đã đi trước phần duyệt (ví dụ của tohong) sẽ hiện "chạy trước khi duyệt" và cần duyệt bù theo thứ tự.]

### Key Entities

- **Cổng**: phê duyệt của một bước (Specify đến Implement) trong issue theo dõi của spec. Không đổi định dạng.
- **Trạng thái bước**: đã xong, tiếp theo, khoá (chờ duyệt), chạy trước khi duyệt, chưa chạy (Not run).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Với spec có cổng trước chưa duyệt, ứng dụng không gợi ý lệnh của bước sau trong 100% lần thử, ở mọi nơi có gợi ý lệnh (thanh lệnh, Next up, màn hình tổng quan).
- **SC-002**: Duyệt một cổng mở khoá bước sau trong vòng 1 giây sau khi việc duyệt được ghi nhận, không cần tải lại trang.
- **SC-003**: Khi đã bật chặn trong Claude Code, chạy lệnh của bước bị khoá luôn dừng trước khi tạo hay sửa file nào (kiểm tra với mọi lệnh từ `/speckit-clarify` tới `/speckit-implement`).
- **SC-004**: Mọi spec hiện có vẫn hiện đủ nội dung sau khi bật tính năng, không spec nào bị ẩn.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): bản server và bản Pages. Chế độ demo không đổi.
- **Thay đổi so với spec 001:** spec 001 ghi Non-Goal "Không khoá bước sau cho tới khi cổng trước được duyệt". Spec này thay thế điều đó theo yêu cầu mới.
- **speckit-ui không chạy lệnh:** lệnh `/speckit-*` chạy trong Claude Code, trên máy hay trong session của người dùng. speckit-ui chỉ gợi ý lệnh. Vì vậy:
  - trong speckit-ui, "không thể thực hiện" nghĩa là không gợi ý, không cho sao chép lệnh và không cho duyệt vượt cổng;
  - chặn thật sự khi chạy lệnh cần một cơ chế nằm trong repo dự án (FR-007).
- **Nơi lưu phê duyệt** vẫn là issue theo dõi có nhãn `speckit`; không thêm nơi lưu mới.
- **Thứ tự bước** như hiện nay: Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement.

## Non-Goals

- Không chặn việc sửa file thủ công hay commit trực tiếp; chỉ chặn lệnh `/speckit-*` và gợi ý trong ứng dụng.
- Không chặn merge pull request. Có thể làm sau, bằng một spec riêng cho kiểm tra trên GitHub.
- Không thêm người duyệt theo vai trò hay nhiều người duyệt cho một cổng.
- Không đổi định dạng issue theo dõi.
