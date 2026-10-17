# Feature Specification: Phải duyệt xong mới sang bước tiếp theo

**Feature Branch**: `feat/004-approval-gates-next`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "hiện tại mặc dù spec chưa được approve nhưng tôi vẫn có thể chạy các lệnh sau đó cho đến khi hoàn thành. Mong muốn: phải có Approve thì bước tiếp theo mới có thể thực hiện được."

## Clarifications

### Session 2026-10-17

- Q: Chặn ở đâu: chỉ trong speckit-ui, hay cả khi chạy lệnh trong Claude Code? → A: Cả hai. speckit-ui khoá gợi ý lệnh và khoá việc duyệt vượt cổng. Lệnh `/speckit-*` trong Claude Code cũng bị chặn bằng một bước kiểm tra cài vào repo dự án. Chặn merge PR vẫn nằm ngoài phạm vi.
- Q: Với repo hiện có, khoá theo cổng mặc định bật hay tắt? → A: Bật cho mọi repo. Spec cũ hiện "chạy trước khi duyệt" và phải duyệt bù theo thứ tự. Repo nào cần thì tự tắt.

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

**Independent Test**: Trong một repo đã cài bước kiểm tra, chạy `/speckit-plan` khi cổng Specify chưa duyệt: lệnh dừng kèm thông báo. Duyệt cổng, chạy lại: lệnh chạy.

**Acceptance Scenarios**:

1. **Given** cổng Specify của spec hiện tại chưa được duyệt, **When** người dùng chạy `/speckit-plan` trong Claude Code, **Then** lệnh dừng trước khi làm gì, và nêu cổng đang chờ duyệt cùng liên kết tới issue theo dõi.
2. **Given** cổng Specify đã được duyệt, **When** người dùng chạy `/speckit-plan`, **Then** lệnh chạy như bình thường.
3. **Given** không đọc được trạng thái duyệt (mất mạng, thiếu quyền), **When** người dùng chạy lệnh, **Then** lệnh dừng và nói rõ không kiểm tra được, kèm cách bỏ qua có chủ đích (FR-008).
4. **Given** một repo chưa cài bước kiểm tra, **When** người dùng chạy lệnh, **Then** lệnh chạy như hiện nay, và speckit-ui hiện thông báo repo chưa cài bước kiểm tra, kèm hướng dẫn cài (FR-012).
5. **Given** một repo đã tắt khoá theo cổng (FR-011), **When** người dùng chạy lệnh, **Then** bước kiểm tra cho lệnh chạy, và speckit-ui hoạt động như trước tính năng này.

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
- **FR-007**: Khi chạy một lệnh `/speckit-*` trong Claude Code ở repo đã cài bước kiểm tra, mà cổng trước chưa được duyệt, lệnh MUST dừng trước khi thay đổi file nào. Thông báo MUST nêu cổng đang chờ duyệt, kèm liên kết tới issue theo dõi. Quy tắc khoá MUST giống hệt quy tắc trong speckit-ui (FR-001).
- **FR-008**: Khi không kiểm tra được trạng thái duyệt, lệnh MUST dừng và nói rõ lý do, kèm một cách bỏ qua có chủ đích được ghi lại.
- **FR-009**: Mở lại một cổng MUST khoá lại các bước sau nó ngay khi việc mở lại được ghi nhận, giống cách duyệt mở khoá ngay (spec 001).
- **FR-010**: Quy tắc khoá MUST giống nhau ở bản server và bản Pages, và áp dụng cho spec trên nhánh chưa merge (spec 003). Chế độ demo không đổi.
- **FR-011**: Khoá theo cổng MUST bật mặc định cho mọi repo, kể cả repo hiện có. Mỗi repo MAY tắt nó bằng cấu hình speckit-ui có sẵn của repo. speckit-ui và bước kiểm tra trong Claude Code MUST đọc cùng cấu hình đó.
- **FR-012**: speckit-ui MUST cung cấp bước kiểm tra để cài vào repo dự án, kèm hướng dẫn cài từng bước. Khi khoá theo cổng đang bật mà repo chưa cài bước kiểm tra, speckit-ui MUST hiện thông báo kèm hướng dẫn đó. Việc cài do người dùng làm: speckit-ui không ghi file vào repo (constitution I).

### Key Entities

- **Cổng**: phê duyệt của một bước (Specify đến Implement) trong issue theo dõi của spec. Không đổi định dạng.
- **Trạng thái bước**: đã xong, tiếp theo, khoá (chờ duyệt), chạy trước khi duyệt, chưa chạy (Not run).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Với spec có cổng trước chưa duyệt, ứng dụng không gợi ý lệnh của bước sau trong 100% lần thử, ở mọi nơi có gợi ý lệnh (thanh lệnh, Next up, màn hình tổng quan).
- **SC-002**: Duyệt một cổng mở khoá bước sau trong vòng 1 giây sau khi việc duyệt được ghi nhận, không cần tải lại trang.
- **SC-003**: Trong repo đã cài bước kiểm tra, chạy lệnh của bước bị khoá luôn dừng trước khi tạo hay sửa file nào. Kiểm tra với mọi lệnh từ `/speckit-clarify` tới `/speckit-implement`.
- **SC-005**: Cài bước kiểm tra vào một repo theo hướng dẫn mất không quá 5 phút, và không cần thêm khoá hay quyền nào ngoài quyền GitHub người dùng đang có trong Claude Code.
- **SC-004**: Mọi spec hiện có vẫn hiện đủ nội dung sau khi bật tính năng, không spec nào bị ẩn.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): bản server và bản Pages. Chế độ demo không đổi.
- **Thay đổi so với spec 001:** spec 001 ghi Non-Goal "Không khoá bước sau cho tới khi cổng trước được duyệt". Spec này thay thế điều đó theo yêu cầu mới.
- **speckit-ui không chạy lệnh:** lệnh `/speckit-*` chạy trong Claude Code, trên máy hay trong session của người dùng. speckit-ui chỉ gợi ý lệnh. Vì vậy:
  - trong speckit-ui, "không thể thực hiện" nghĩa là không gợi ý, không cho sao chép lệnh và không cho duyệt vượt cổng;
  - chặn thật sự khi chạy lệnh cần một bước kiểm tra nằm trong repo dự án (FR-007, FR-012).
- **Bước kiểm tra trong Claude Code** đọc issue theo dõi bằng quyền GitHub mà người dùng đã có trong Claude Code. Nó không dùng khoá của speckit-ui và không gửi dữ liệu tới nơi nào khác (constitution II). Đây là file của repo dự án, được commit như mọi file cấu hình khác.
- **Bật mặc định:** các spec đã đi trước phần duyệt, ví dụ spec 001 và 002 của speckit-ui, sẽ hiện "chạy trước khi duyệt" cho tới khi các cổng được duyệt bù theo thứ tự.
- **Nơi lưu phê duyệt** vẫn là issue theo dõi có nhãn `speckit`; không thêm nơi lưu mới.
- **Thứ tự bước** như hiện nay: Constitution → Specify → Clarify → Plan → Tasks → Analyze → Implement.

## Non-Goals

- Không chặn việc sửa file thủ công hay commit trực tiếp; chỉ chặn lệnh `/speckit-*` và gợi ý trong ứng dụng.
- Không chặn merge pull request. Có thể làm sau, bằng một spec riêng cho kiểm tra trên GitHub.
- speckit-ui không tự cài bước kiểm tra vào repo dự án.
- Không thêm người duyệt theo vai trò hay nhiều người duyệt cho một cổng.
- Không đổi định dạng issue theo dõi.
