# Feature Specification: Liên kết PR với issue và đóng issue khi PR được merge

**Feature Branch**: `feat/005-link-pr-issue`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "khi tạo PR để giải quyết issue, hãy tạo link giữa PR và issue, đồng thời khi PR được merged thì issue cũng được đóng"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - PR được liên kết với issue ngay khi tạo (Priority: P1)

Người dùng hoàn thành phần việc của một spec và tạo PR. Thường thì Claude Code tạo PR theo lệnh của người dùng. PR mang sẵn liên kết tới issue theo dõi của spec. Trên GitHub:
- trang PR hiện issue đó trong mục liên kết;
- trang issue hiện PR đó.

Người dùng không phải nhớ số issue hay tự gõ liên kết.

Hiện nay, speckit-ui chỉ nhận PR thuộc spec nào nhờ tên nhánh hoặc mô tả có `specs/NNN-…`. Trên GitHub, PR và issue không hề liên kết với nhau.

**Why this priority**: Đây là nửa đầu của yêu cầu. Nó là điều kiện để GitHub tự đóng issue khi merge (US2).

**Independent Test**: Tạo PR cho một spec đã có issue theo dõi. Trang PR trên GitHub hiện issue trong mục liên kết, trang issue hiện PR, và không có bước nhập tay nào.

**Acceptance Scenarios**:

1. **Given** spec `004-x` có issue theo dõi #12, **When** PR của spec được tạo theo cách mà tính năng này hỗ trợ, **Then** PR liên kết với #12 trên GitHub.
2. **Given** spec chưa có issue theo dõi (chưa duyệt cổng nào), **When** PR được tạo, **Then** người tạo được nhắc rằng chưa có issue để liên kết, và PR vẫn tạo được.
3. **Given** một PR đã tạo mà thiếu liên kết, **When** người dùng xem spec trong speckit-ui, **Then** ứng dụng chỉ ra PR đó thiếu liên kết, kèm cách thêm.

---

### User Story 2 - Merge PR thì issue được đóng (Priority: P1)

PR của spec được merge vào nhánh chính. Issue theo dõi của spec được đóng theo quy tắc ở FR-004, không cần ai đóng tay. Trong speckit-ui, spec hiện issue đã đóng.

**Why this priority**: Đây là nửa sau của yêu cầu. Không có nó thì issue theo dõi bị bỏ mở sau khi việc đã xong.

**Independent Test**: Merge PR cuối cùng của một spec đã liên kết với issue. Issue chuyển sang đóng trên GitHub. Làm mới speckit-ui thì thấy issue đã đóng.

**Acceptance Scenarios**:

1. **Given** PR liên kết với issue #12 theo FR-004, **When** PR được merge vào nhánh chính, **Then** #12 được đóng.
2. **Given** PR được đóng mà không merge, **When** việc đóng được ghi nhận, **Then** issue vẫn mở.
3. **Given** issue đã đóng do merge, **When** người dùng mở lại một cổng trong speckit-ui, **Then** issue được mở lại như hiện nay (spec 001, 004).

---

### Edge Cases

- **Một spec có nhiều PR** (PR tài liệu spec, PR code, PR ở repo submodule, PR nâng con trỏ submodule): chỉ PR cuối cùng mới được đóng issue (FR-004).
- **PR ở repo submodule:** issue theo dõi nằm ở repo gốc. PR ở repo khác vẫn liên kết được bằng tên đầy đủ `owner/repo#N`. Merge PR đó thì không đóng issue, vì PR nâng con trỏ ở repo gốc mới là PR cuối.
- **PR merge vào nhánh không phải nhánh chính:** GitHub chỉ tự đóng issue khi merge vào nhánh mặc định. Merge vào nhánh khác không đóng issue.
- **Một PR giải quyết nhiều spec:** PR đóng mọi issue mà nó liên kết.
- **Issue đã đóng trước khi merge** (ví dụ cổng Implement đã duyệt, việc này đã đóng issue): merge không làm gì thêm.
- **Mở lại issue sau khi merge:** dùng Reopen gate như hiện nay.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Khi một PR của spec được tạo theo luồng mà tính năng này hỗ trợ, mô tả PR MUST chứa liên kết tới issue theo dõi của spec, ở dạng GitHub nhận ra là liên kết giữa PR và issue.
- **FR-002**: Nếu spec chưa có issue theo dõi, việc tạo PR MUST không bị chặn. Người tạo MUST được nhắc là chưa có issue để liên kết.
- **FR-003**: speckit-ui MUST cho biết, với mỗi PR của spec, PR đó có liên kết với issue theo dõi hay không, và cách thêm liên kết nếu thiếu.
- **FR-004**: Khi PR liên kết được merge vào nhánh mặc định, issue theo dõi MUST được đóng [NEEDS CLARIFICATION: Q2 — một spec có nhiều PR thì PR nào đóng issue? Đề xuất: PR của repo gốc], theo quy tắc sau:
  - mọi PR của spec đều liên kết với issue, để trang issue thấy đủ PR;
  - nhưng chỉ PR của repo gốc được đóng issue khi merge;
  - PR ở repo submodule chỉ liên kết, không đóng.
- **FR-005**: PR bị đóng mà không merge MUST không đóng issue.
- **FR-006**: Đóng issue khi merge MUST không coi là đã duyệt cổng Implement:
  - cổng Implement vẫn chưa tick cho tới khi người dùng duyệt;
  - speckit-ui hiện issue đã đóng cùng trạng thái cổng thật;
  - duyệt Implement sau đó vẫn ghi vào issue như hiện nay, không mở lại issue.
- **FR-007**: Liên kết MUST đúng cả với spec trên nhánh chưa merge (spec 003) và trong repo có submodule (liên kết chéo repo bằng `owner/repo#N`).
- **FR-008**: Cơ chế liên kết MUST áp dụng cho cả PR do Claude Code tạo và PR do người dùng tạo bằng tay theo hướng dẫn.
  - speckit-ui MUST cung cấp đúng dòng liên kết cho từng spec để sao chép vào mô tả PR.
  - Bước kiểm tra trong Claude Code của spec 004 MUST chặn [NEEDS CLARIFICATION: Q3 — chặn hay chỉ nhắc? Đề xuất: chặn] việc Claude Code tạo PR cho một spec có issue theo dõi mà mô tả PR thiếu dòng liên kết. Thông báo chặn MUST nêu dòng cần thêm.

### Key Entities

- **Issue theo dõi**: issue có nhãn `speckit` của một spec, ở repo gốc (không đổi định dạng).
- **PR của spec**: PR có tên nhánh chứa slug hoặc mô tả có `specs/<slug>`, ở repo gốc hoặc repo submodule (như hiện nay).
- **Dòng liên kết**: câu trong mô tả PR mà GitHub hiểu là liên kết PR với issue. Có hai loại: liên kết có đóng khi merge, và chỉ liên kết.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% PR do Claude Code tạo cho một spec đã có issue theo dõi đều hiện liên kết với issue đó trên GitHub, không cần sửa tay.
- **SC-002**: Sau khi PR đóng issue (FR-004) được merge vào nhánh chính, issue chuyển sang đóng trong vòng 1 phút, không cần thao tác tay.
- **SC-003**: Không issue nào bị đóng bởi một PR bị đóng mà không merge, hay bởi PR merge vào nhánh khác nhánh mặc định.
- **SC-004**: Người dùng thấy trong speckit-ui PR nào của spec thiếu liên kết sau một lần làm mới, và sao chép được dòng liên kết trong 1 thao tác.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): bản server và bản Pages (hiển thị và sao chép dòng liên kết, trạng thái liên kết của PR). Chế độ demo không đổi. Ngoài ứng dụng: bước kiểm tra trong Claude Code của spec 004.
- **speckit-ui không tạo PR:** PR do Claude Code hoặc người dùng tạo. speckit-ui không ghi vào PR. Liên kết nằm trong mô tả PR do người tạo PR viết, nên không có loại ghi mới (constitution I).
- **Việc đóng issue khi merge do GitHub làm,** dựa trên dòng liên kết có đóng trong mô tả PR. speckit-ui không cần chạy khi merge.
- **Quyền:** không cần quyền mới. Đọc mô tả PR dùng quyền đọc Pull requests đã có. Tạo PR có liên kết dùng quyền của người tạo PR.
- **Trong repo này, mỗi spec thường có một PR** chứa cả tài liệu spec lẫn code (ví dụ PR #11, #14). Trong repo có submodule (tohong), PR cuối là PR nâng con trỏ submodule ở repo gốc.

## Non-Goals

- speckit-ui không tạo PR và không sửa mô tả PR.
- Không liên kết hay đóng các issue khác ngoài issue theo dõi có nhãn `speckit`, ví dụ issue báo lỗi do người dùng tạo [NEEDS CLARIFICATION: Q1 — "issue" là issue theo dõi của spec, hay cả issue thường? Đề xuất: chỉ issue theo dõi].
- Không tự duyệt cổng Implement khi merge.
- Không đổi định dạng issue theo dõi.
