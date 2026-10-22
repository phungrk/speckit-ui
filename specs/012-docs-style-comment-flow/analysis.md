# Specification Analysis Report: 012-docs-style-comment-flow

**Ngày**: 2026-10-21 | **Đối chiếu**: `spec.md`, `plan.md`, `tasks.md`, constitution v1.4.0, và code thật trên `main` (`src/project/LiveWorkspace.tsx:143` cho `hlReadOnly`, `src/App.tsx:37` cho feature mặc định của demo, `server/github.ts` cho `gh()` và `loadMain`).

**Lần chạy 1**: 0 CRITICAL, 3 HIGH, 10 MEDIUM, 6 LOW (19 phát hiện), đã xử lý hết. **Lần chạy 2** (chạy lại sau khi sửa): thêm 7 phát hiện (0 HIGH, 4 MEDIUM, 3 LOW), cũng đã xử lý hết (mục "Lần chạy 2" ở cuối). Phần bảng của lần chạy 1 giữ nguyên số task lúc đó; bảng ánh xạ ID ở cuối cho biết số hiện tại.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation | Trạng thái |
|----|----------|----------|-------------|---------|----------------|------------|
| C1 | Coverage | **HIGH** | spec FR-016, SC-009; T019, T022, T024 | Spec đòi nút Add comment tắt kèm lý do cho người chỉ có quyền đọc trong 100% trường hợp, và "không dò quyền bằng cách thử ghi". Nhưng `store.readOnly` chỉ khác null khi app đang ghim, file hỏng, hoặc sau khi một lần ghi đã bị từ chối (`refused`, `LiveWorkspace.tsx:143`). Không task nào kiểm tra quyền trước. | Thêm task xác định quyền ghi khi tải project; nới SC-009 cho token fine-grained; sửa FR-016. | ✅ FR-016 chia (a) GitHub báo → tắt ngay, (b) không báo → tắt sau lần bị từ chối đầu; SC-009 hai vế; research R16; tasks mới T022 (test), T023 (`loadMain` đọc `permissions.push` → `Project.canWrite`) |
| I1 | Inconsistency | **HIGH** | T022 vs T033 | T022 (US1) bỏ nút Note và trình sửa ghi chú nổi, còn sửa/xoá trong thẻ chỉ có ở T033 (US2). Làm riêng US1 thì mất khả năng sửa ghi chú, bấm ghim không mở gì; T022 còn làm Toolbar/Annotator không biên dịch cho tới T024. | Giữ luồng Note của 010 tới khi thẻ có Edit/Delete; gộp T022 và T024. | ✅ T024 (cũ T022) giữ trình sửa ghi chú cho highlight có sẵn và bố cục hẹp, làm cùng commit với T026; task mới T038 bỏ trình sửa nổi sau khi thẻ có Edit/Delete (T035) |
| A1 | Ambiguity | **HIGH** | spec SC-008, T054; `src/App.tsx:37`, `demoSeed.ts` | SC-008 đòi demo "khi chưa có nhận xét" khớp thiết kế, nhưng demo mở sẵn feature `003` có ghi chú mẫu nên màn hình chính luôn có rail. Không kiểm được ở màn hình constitution IV bắt so. | Viết lại SC-008 và T054. | ✅ SC-008: khớp bản thiết kế cập nhật có rail (nhận xét mẫu của 003); xoá dữ liệu mẫu thì khớp thiết kế gốc. T057 và quickstart cập nhật |
| C2 | Coverage | MEDIUM | spec FR-004, edge "HTML hoặc script"; constitution II | Không task nào kiểm thử ghi chú chứa HTML hoặc script hiển thị như chữ thuần trong thẻ, Composer, rail. | Thêm ca test. | ✅ Thêm vào T015 và T020 |
| C3 | Coverage | MEDIUM | spec edge "nhắc khi quay lại"; research R5 | Spec và R5 nêu nhắc khi quay lại và chấm "Draft"; không task nào làm. | Thêm vào task Annotator và test nháp. | ✅ Thêm vào T021 (test) và T026 (cài đặt) |
| I2 | Inconsistency | MEDIUM | FR-012, T017, contract | FR-012: ghim "MUST vẫn hoạt động". T017 và plan: ghim ẩn khi rail hiện. Contract: ghim "chuyển vào trong rail". | Chọn một cách. | ✅ Ghim ẩn ở bố cục rộng (thẻ thay vai trò), chỉ hiện ở bố cục hẹp; sửa FR-012, contract |
| I3 | Inconsistency | MEDIUM | FR-008, data-model, T011, T032 | FR-008: nhận xét đang chọn "MUST có thẻ mở rộng"; thẻ chỉ có cho highlight có ghi chú; T032 cho chọn mọi highlight. | Quyết nhận xét so với highlight. | ✅ Nhận xét = highlight có ghi chú; highlight chỉ có màu giữ hành vi của 010 (mở thanh công cụ), không có thẻ. Sửa FR-008, data-model, T034 (cũ T032), thuật ngữ |
| I4 | Inconsistency | MEDIUM | FR-014, FR-017, plan R8, T050 | FR-014 đòi tự kiểm tra định kỳ cho mọi chế độ; plan và tasks: demo không kiểm tra, local khi cửa sổ được focus. | Thêm điều khoản từng chế độ. | ✅ FR-014 nêu rõ server/Pages, local, demo |
| I5 | Inconsistency | MEDIUM | T006/T011, T019/T020, T018, T045 | Task cùng file đều gắn `[P]`; T018 và T045 phụ thuộc task trước. | Bỏ `[P]`, ghi phụ thuộc. | ✅ Bỏ `[P]` ở T011, T018, T020, T045 (cũ); mục Parallel Opportunities cập nhật |
| A2 | Ambiguity | MEDIUM | FR-007, FR-014, FR-015 | "Thanh bên" vừa là rail nhận xét vừa là sidebar phải. | Thêm thuật ngữ. | ✅ Dùng "rail nhận xét" và "sidebar phải"; thêm bullet Thuật ngữ vào Assumptions |
| A3 | Ambiguity | MEDIUM | SC-006, edge "mượt" | "Mượt" không có số. | Đặt chỉ tiêu. | ✅ SC-006: dưới 1 giây (khớp 010 SC-006); plan Performance Goals; T039 (cũ T036) |
| U1 | Underspec | MEDIUM | T001, T057 | T001 nói tách `feat/012-…` từ `main`, session bắt buộc `claude/bold-hawking-k3ffwk`, nhánh đang mang spec 005, 011, 012. | Quyết chiến lược nhánh. | ✅ T001: làm trên nhánh session; T060 (cũ T057): cherry-pick commit của 012 sang `feat/012-docs-style-comment-flow` từ `main` khi mở PR |
| U2 | Underspec | MEDIUM | T054, T055; plan IV | Điều kiện merge là bản `Speckit Workspace.html` có rail, ngoài repo, chưa có chủ và hạn. | Ghi rõ blocked. | ✅ T057 và T058 gắn **[BLOCKED bởi bản thiết kế]**; ghi trong Dependencies. **Việc còn lại cho bạn**: cung cấp file thiết kế |
| C4 | Coverage | LOW | SC-002 | Không có task đo "dưới 2 phút". | Thêm bước thử. | ✅ Quickstart kịch bản 17; T059 (cũ T056) |
| I6 | Inconsistency | LOW | specs/011 | 011 còn viết "010 chưa merge" và "constitution 1.4.0 trên nhánh 010". | Cập nhật. | ✅ Đã sửa trong `specs/011-annotation-threads/spec.md` |
| I7 | Inconsistency | LOW | spec SC-009, SC-010 | SC-010 nằm giữa SC-005 và SC-006. | Sắp lại. | ✅ |
| A4 | Ambiguity | LOW | FR-015 | Nhãn nhánh khi local và demo không có nhánh. | Nêu rõ. | ✅ FR-015 và T015 |
| U3 | Underspec | LOW | T043 | Route GET mới không nói dùng lại kiểm tra `access`/`sourceFor`. | Thêm một câu. | ✅ T046 (cũ T043) |
| U4 | Underspec | LOW | T002 | Việc đồng bộ plan/research đã làm xong. | Đánh dấu xong. | ✅ T002 đánh dấu `[x]` |

## Coverage Summary (lần chạy đầu)

| Requirement | Task? | Task IDs (cũ) | Ghi chú |
|-------------|-------|---------------|---------|
| FR-001 | ✅ | T019, T022, T024 | |
| FR-002 | ✅ | T020, T023, T024 | |
| FR-003 | ✅ | T003–T008, T022, T024, T026 | |
| FR-004 | ⚠️→✅ | T020, T023 | C2 đã thêm ca HTML |
| FR-005 | ⚠️→✅ | T021, T024 | C3 đã thêm nhắc khi quay lại |
| FR-006 | ✅ | T022 | |
| FR-007 | ✅ | T009, T010, T016 | |
| FR-008 | ⚠️→✅ | T028, T031, T032, T034 | I3 đã định nghĩa nhận xét |
| FR-009 | ✅ | T032, T033 | |
| FR-010 | ✅ | T011, T012, T033 | |
| FR-011 | ✅ | T035 | |
| FR-012 | ⚠️→✅ | T017, T031, T034 | I2 đã chốt ghim |
| FR-013 | ✅ | T037, T048 | |
| FR-014 | ⚠️→✅ | T038–T050 | I4 đã nêu từng chế độ |
| FR-015 | ✅ | T015, T016 | |
| FR-016 | ❌→✅ | T019, T022, T024 + mới T022, T023 | C1 |
| FR-017 | ✅ | T027, T050, T056 | |
| FR-018 | ✅ | T008, T035, T054 | |
| SC-003 | ✅ | T009 | |
| SC-004 | ✅ | T028, T031, T032 | |
| SC-005 | ✅ | T037, T048 | |
| SC-006 | ⚠️→✅ | T009, T036 | A3 |
| SC-007 | ✅ | T035, T036, T056 | |
| SC-008 | ⚠️→✅ | T054 | A1 (vẫn chờ file thiết kế để nghiệm thu) |
| SC-009 | ❌→✅ | T019, T024 + mới T022, T023 | C1 |
| SC-010 | ✅ | T038, T047, T049 | |

SC-001 và SC-002 là kết quả trải nghiệm (kiểm tay ở T027, T056 cũ).

## Constitution Alignment

Không có vi phạm MUST.
- **IV**: đạt có điều kiện: bản thiết kế `Speckit Workspace.html` có rail do người dùng cung cấp. Ngoại lệ "thuộc spec khác chưa xong" của `CLAUDE.md` không áp cho rail. T057 và T058 bị chặn tới khi có file.
- **II**: route `GET /api/highlights` không thêm điểm đến mạng hay quyền; dùng lại kiểm tra `access` (U3). Đọc `permissions.push` dùng lời gọi repo có sẵn, không thêm lời gọi mạng.

## Metrics

| | Lần chạy đầu | Sau khi sửa |
|---|---|---|
| Total Requirements | 26 (18 FR + 8 SC) | 26 |
| Total Tasks | 57 | **60** (thêm T022, T023, T038) |
| Coverage (≥ 1 task) | 26/26, 2 chưa đủ ý (FR-016, SC-009) | 26/26, đủ ý |
| Ambiguity Count | 4 | 0 |
| Duplication Count | 0 | 0 |
| Critical Issues Count | 0 (HIGH 3, MEDIUM 10, LOW 6) | 0 (mở: 0) |

## Ánh xạ số task (cũ → mới)

Task T001–T021 giữ số; T022–T033 thành T024–T035 (+2); T034–T057 thành T037–T060 (+3). Ba task mới: **T022** (test `Project.canWrite`), **T023** (`loadMain` đọc `permissions.push`, `hlReadOnly`), **T038** (bỏ trình sửa ghi chú nổi sau khi thẻ có Edit/Delete và sheet). Lần chạy 2 đổi thứ tự trong US2: T036 = `HighlightsPanel` (trước là T037), T037 = bố cục hẹp và sheet (trước là T038), T038 = bỏ trình sửa nổi (trước là T036).

## Lần chạy 2 (2026-10-22)

Chạy lại sau khi sửa lần 1: cây sạch, `main` không đổi, không có `[NEEDS CLARIFICATION]`. Kiểm thêm code thật: `projectKey` và `getProject` trong `server/github.ts`, `onRefused` trong `src/annotations/Annotator.tsx`. 0 CRITICAL, 0 HIGH, 4 MEDIUM, 3 LOW.

| ID | Category | Severity | Summary | Trạng thái |
|----|----------|----------|---------|------------|
| N1 | Coverage | MEDIUM | `Project.canWrite` nằm trong `Project` được cache; `getProject` dùng lại `hit.main` khi commit không đổi và không gọi lại `loadMain`, nên người được cấp quyền ghi giữa chừng vẫn bị tắt nút. (Cache khoá theo `identity` nên không rò giữa người dùng.) | ✅ `canWrite` nằm trong map riêng theo `projectKey`, đọc lại khi tải lần đầu và khi `refresh === true`, gắn vào bản `getProject` trả về. Research R16, data-model, plan, T022 (test: đổi quyền khi commit không đổi), T023 |
| N2 | Coverage | MEDIUM | Spec liệt kê "phiên hết hạn" là lý do tắt nút nhưng 010 chỉ đặt `refused` cho lỗi `cannot commit to`, `no longer exists`, `read-only`; 401 khi lưu không tắt nút. | ✅ Quyết (bạn đồng ý đề xuất): bỏ "phiên hết hạn" khỏi FR-016 và US1 AC8; thêm edge case (lỗi lưu giữ nội dung, đăng nhập lại theo màn hình có sẵn); Clarifications; T019, T026 |
| I1 | Inconsistency | MEDIUM | T019 khẳng định không còn `.sk-tb-note` nhưng T024 giữ nó cho chế độ sửa tới khi bỏ. | ✅ T019 chỉ áp cho vùng chọn mới |
| U1 | Underspec | MEDIUM | Ở bố cục hẹp sau US1 và trước sheet, Composer không có chỗ hiện. | ✅ T026: dùng trình sửa ghi chú nổi của 010 làm hộp soạn tạm tới T037 |
| C3 | Coverage | LOW | Constitution IV đòi `:focus-visible`; không task hay contract nhắc. | ✅ T008 và contract comment-rail-ui.md |
| I2 | Inconsistency | LOW | Task bỏ trình sửa nổi cần sheet nhưng đứng trước task dựng sheet. | ✅ Đổi thứ tự: bỏ trình sửa nổi thành T038, sau sheet T037 |
| D1 | Duplication | LOW | T033 và `HighlightsPanel` cùng nói "mục tab Highlights gọi `onSelect`". | ✅ Chỉ còn ở T036 |

**Metrics sau lần chạy 2**: 26 yêu cầu, 60 task, coverage 26/26 đủ ý (FR-016 và SC-009 nay có đường cho cả hai vế và cho đổi quyền giữa chừng), Ambiguity 0, Duplication 0, Critical 0, phát hiện mở 0.

## Việc còn lại

1. **Bạn cung cấp bản `Speckit Workspace.html` có rail** để mở khoá T057 và T058 (điều kiện merge, không chặn việc bắt đầu code).
2. Chạy `/speckit-analyze` lại nếu muốn xác nhận 0 phát hiện sau sửa, rồi `/speckit-implement`.
