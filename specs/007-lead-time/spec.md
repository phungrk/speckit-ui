# Feature Specification: Đo lead time cho từng công đoạn

**Feature Branch**: `feat/007-lead-time`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Sau này, tôi muốn tính leadtime cho từng công đoạn" → "Cả hai": xem theo từng spec, và tổng hợp nhiều spec theo khoảng thời gian.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lead time của một spec, theo từng bước (Priority: P1)

Người dùng mở một spec trong speckit-ui và xem tab Lead time của spec đó. Với mỗi bước từ Specify tới Implement, ứng dụng hiện:
- **thời gian làm**: từ lúc bước trước được duyệt tới lúc có kết quả của bước này;
- **thời gian chờ duyệt**: từ lúc có kết quả tới lúc cổng được duyệt;
- **tổng**: từ lúc spec bắt đầu tới lúc PR được merge.

Mỗi con số có ghi chú khi nó chỉ là ước lượng, ví dụ khi bước chạy trước khi bước trước được duyệt.

Ví dụ với spec 006 của repo này: chờ duyệt Tasks mất 48 phút, chờ review PR mất 72 phút, tổng là 3 giờ 45 phút.

**Why this priority**: Đây là câu hỏi gốc ("leadtime cho từng công đoạn"). Nó cho thấy ngay điểm nghẽn của một spec.

**Independent Test**: Mở spec 006. Bảng lead time khớp với các mốc trong git, các comment duyệt trên issue #17 và PR #18, sai số không quá 1 phút.

**Acceptance Scenarios**:

1. **Given** một spec đã qua các bước và có comment duyệt, **When** người dùng mở tab Lead time, **Then** mỗi bước hiện thời gian làm và thời gian chờ duyệt, kèm các mốc dùng để tính.
2. **Given** một bước chạy trước khi bước trước được duyệt ("Ran early"), **When** xem lead time, **Then** thời gian làm của bước đó được đánh dấu là ước lượng, kèm lý do.
3. **Given** một cổng được tick thẳng trên GitHub (không có comment), **When** xem lead time, **Then** mốc duyệt được lấy theo ngày, và con số được đánh dấu là không đủ chính xác tới giờ.
4. **Given** một bước chưa xong hoặc chưa duyệt, **When** xem lead time, **Then** ứng dụng hiện thời gian đã trôi tới hiện tại, ghi là "đang chạy", và không tính vào tổng.

---

### User Story 2 - Tổng hợp nhiều spec theo tuần hoặc tháng (Priority: P2)

Người dùng xem lead time của mọi spec trong một repo, hoặc trong các repo đã ghim, gom theo tuần hoặc tháng. Với mỗi bước, ứng dụng hiện:
- trung vị;
- giá trị ở mức 85%;
- số spec được tính.

Người dùng thấy bước nào thường chờ lâu nhất, và xu hướng qua các tuần.

**Why this priority**: Phần tổng hợp chỉ có ý nghĩa khi đã có số liệu đúng cho từng spec (US1).

**Independent Test**: Với một repo giả lập có 6 spec xong trong 3 tuần, bảng tuần hiện đúng trung vị và mức 85% của từng bước, tính tay để so.

**Acceptance Scenarios**:

1. **Given** nhiều spec đã merge, **When** người dùng chọn "theo tuần", **Then** mỗi tuần có trung vị, mức 85% và số spec cho từng bước và cho tổng. Tuần được tính theo ngày PR merge.
2. **Given** một spec có con số ước lượng, **When** tổng hợp, **Then** người dùng chọn được "bỏ qua số ước lượng". Mặc định là có tính, và số spec bị ước lượng được ghi rõ.
3. **Given** các repo đã ghim, **When** xem tổng hợp ở Overview, **Then** có một bảng cho mỗi repo và một bảng chung.

---

### User Story 3 - Ghi giờ bắt đầu thật của mỗi bước (Priority: P3)

Khi một lệnh `/speckit-*` bắt đầu chạy trong Claude Code ở repo đã cài bước kiểm tra (spec 004), giờ bắt đầu được ghi lại. Thời gian làm khi đó tính từ giờ bắt đầu thật, không còn giả định "bắt đầu ngay khi bước trước được duyệt".

**Why this priority**: Làm số liệu chính xác hơn, nhưng cần một loại ghi mới (constitution I), nên làm sau.

**Independent Test**: Chạy `/speckit-plan` lúc 10:00 trong khi cổng trước đã duyệt từ 9:00. Thời gian làm của Plan tính từ 10:00, không phải 9:00.

**Acceptance Scenarios**:

1. **Given** bước kiểm tra cho một lệnh chạy, **When** lệnh bắt đầu, **Then** giờ bắt đầu được ghi ở nơi lưu đã chọn (FR-010).
2. **Given** có giờ bắt đầu thật, **When** xem lead time, **Then** thời gian làm dùng giờ đó và không còn ghi là ước lượng.
3. **Given** không ghi được giờ bắt đầu (mất mạng), **When** lệnh chạy, **Then** lệnh vẫn chạy bình thường, và lead time dùng cách ước lượng như US1.

---

### Edge Cases

- **Chạy lại một bước** (ví dụ `/speckit-plan` hai lần): thời gian làm tính tới lần có kết quả *đầu tiên*. Các lần sau được ghi là "làm lại", kèm số lần.
- **Mở lại cổng (Reopen) rồi duyệt lại:** thời gian chờ duyệt tính tới lần duyệt *cuối cùng*. Số lần mở lại được hiện kèm.
- **Bước Not run** (Clarify không có câu hỏi, Track light): không có dòng thời gian và không tính vào tổng hợp của bước đó.
- **Spec có nhiều PR** (submodule): thời gian PR tính từ PR mở sớm nhất tới PR của repo gốc được merge.
- **Lịch sử bị viết lại** (rebase, force-push, squash): dùng mốc đọc được, và ghi rõ là mốc có thể sai.
- **Nhánh đã xoá sau khi merge:** dùng lịch sử trên nhánh chính. Nếu PR được squash, các mốc giữa các bước có thể mất. Khi đó chỉ hiện tổng, kèm ghi chú.
- **Spec trên nhánh chưa merge** (spec 003): có lead time của các bước đã qua; không có tổng.
- **Múi giờ:** mọi mốc lưu theo UTC và hiện theo giờ của trình duyệt.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Ứng dụng MUST tính, cho mỗi spec và mỗi bước từ Specify tới Implement:
  - **xong bước**: lúc kết quả của bước xuất hiện lần đầu trong lịch sử repo;
  - **duyệt**: lúc cổng được duyệt;
  - **bắt đầu**: lúc ghi bắt đầu thật (US3), nếu không có thì lúc duyệt của bước liền trước đã làm.
- **FR-002**: Thời gian làm = bắt đầu → xong bước. Thời gian chờ duyệt = xong bước → duyệt.
- **FR-003**: Ứng dụng MUST tính thêm:
  - thời gian PR: PR đầu tiên mở → PR của repo gốc merge;
  - tổng lead time: xong Specify (hoặc bắt đầu thật, nếu có) → merge.
- **FR-004**: Mỗi con số MUST đi kèm các mốc dùng để tính, mỗi mốc có liên kết tới commit, comment hoặc PR tương ứng.
- **FR-005**: Một con số MUST được đánh dấu "ước lượng" khi có một trong các lý do sau, và lý do MUST hiện ra:
  - bước chạy trước khi bước trước được duyệt;
  - không có giờ bắt đầu thật;
  - mốc duyệt chỉ có ngày;
  - lịch sử bị viết lại.
- **FR-006**: Bước chưa xong MUST hiện thời gian đã trôi tới hiện tại, ghi "đang chạy", và không tính vào tổng hợp.
- **FR-007**: Ứng dụng MUST tổng hợp theo tuần và theo tháng, tính theo ngày merge: trung vị, mức 85% và số spec, cho từng bước và cho tổng. Có lựa chọn bỏ qua các số ước lượng.
- **FR-008**: Tổng hợp MUST có cho một repo và cho các repo đã ghim (Overview).
- **FR-009**: Phần đọc (US1, US2) MUST chỉ đọc dữ liệu đã có: lịch sử repo, issue theo dõi và comment, PR. Không có lần ghi mới.
- **FR-010**: Giờ bắt đầu thật (US3) MUST được ghi ở [NEEDS CLARIFICATION: Q1 — ghi ở đâu? (a) một comment "▶ /speckit-plan started" trên issue theo dõi; (b) một file trong repo, commit cùng kết quả; (c) chưa làm US3 trong spec này]. Lệnh MUST không bị chặn hay chậm đáng kể khi không ghi được.
- **FR-011**: Ứng dụng MUST cho tải bảng lead time (từng spec và tổng hợp) dưới dạng CSV.
- **FR-012**: Lead time MUST giống nhau ở bản server và bản Pages. Chế độ demo có một bảng mẫu tĩnh, theo bản thiết kế.

### Key Entities

- **Mốc**: thời điểm (UTC), loại (bắt đầu, xong bước, duyệt, PR mở, PR merge), nguồn (commit, comment, PR, ghi bắt đầu) kèm liên kết, độ chính xác (giờ hoặc ngày).
- **Khoảng của bước**: bước, thời gian làm, thời gian chờ duyệt, số lần làm lại, số lần mở lại, cờ ước lượng kèm lý do.
- **Lead time của spec**: các khoảng của bước, thời gian PR, tổng, trạng thái (xong, đang chạy).
- **Tổng hợp**: khoảng thời gian (tuần hoặc tháng), repo hoặc tất cả, và với mỗi bước: trung vị, mức 85%, số spec, số spec ước lượng.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Với spec 006 của repo này, lead time từng bước khớp với mốc tính tay từ git, issue #17 và PR #18, sai số không quá 1 phút.
- **SC-002**: Người dùng biết được bước chờ lâu nhất của một spec trong 1 lần mở tab, không phải tự tra GitHub.
- **SC-003**: Bảng tổng hợp của một repo có tới 100 spec hiện ra trong vòng 5 giây.
- **SC-004**: 100% con số dựa trên mốc thiếu hoặc không chắc chắn đều có nhãn "ước lượng" kèm lý do.
- **SC-005**: Khi có giờ bắt đầu thật (US3), thời gian làm khớp giờ thật, sai số không quá 1 phút.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): bản server và bản Pages. Demo có bảng mẫu tĩnh.
- **Nguồn dữ liệu:**
  - lịch sử commit của các file Spec Kit (`spec.md`, `plan.md`, `tasks.md`, `analysis.md`, phần code của Implement);
  - comment duyệt mà speckit-ui ghi vào issue theo dõi;
  - giờ mở và giờ merge của PR (spec 005 sẽ liên kết PR với issue).
- **Định nghĩa "xong" của từng bước:**

  | Bước | "Xong" khi |
  |---|---|
  | Specify | lần đầu có `spec.md` |
  | Clarify | lần đầu có câu trả lời trong spec |
  | Plan | lần đầu có `plan.md` |
  | Tasks | lần đầu có `tasks.md` |
  | Analyze | lần đầu có `analysis.md` |
  | Implement | mọi task đã tick, hoặc PR của repo gốc được merge, tuỳ cái nào trước |

- **Thời gian tính theo đồng hồ, không trừ giờ nghỉ hay cuối tuần.** Có thể thêm "giờ làm việc" sau.
- **Thói quen giúp số liệu chính xác** (ghi trong README):
  - merge PR bằng merge commit, không squash;
  - duyệt trong speckit-ui thay vì tick thẳng;
  - commit tick task theo từng phase.
- **Giới hạn GitHub API:** 5.000 lần gọi mỗi giờ. Lịch sử commit lấy theo đường dẫn `specs/NNN-…/`, và có cache theo SHA.

## Non-Goals

- Không đo thời gian của từng task trong Implement.
- Không đặt mục tiêu (SLA) hay cảnh báo khi vượt ngưỡng.
- Không đo năng suất cá nhân hay so sánh người với người.
- Không lấy dữ liệu từ Jira hay Confluence.
