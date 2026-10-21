# Specification Analysis Report: 010 Chú thích (highlight và ghi chú)

Ngày 2026-10-21. Đọc `spec.md` (FR-001…FR-023, FR-009a; SC-001…SC-008), `plan.md`, `tasks.md`
(43 task), `research.md`, `data-model.md`, hai contract, `quickstart.md` và constitution 1.4.0 (đã sửa
trên nhánh này).

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| I1 | Inconsistency | HIGH | spec.md FR-016, FR-019, FR-022; tasks.md T036 | FR-016 nói local hiện "panel và brief như server và Pages", FR-019 bắt sidebar phải có ba tab Gate · Highlights · Copilot. Local không có cổng duyệt hay Copilot (spec 007/008), và T036 chỉ làm hai tab (Local mode · Highlights), không có brief. Spec và tasks mâu thuẫn ở chế độ local. | Sửa FR-016 và FR-019: ở local, sidebar phải có hai tab "Local mode · Highlights {n}" và không có "Before you approve" (không có cổng). T036 giữ nguyên. |
| U1 | Underspecification | MEDIUM | data-model.md `docSha`; tasks.md T002, T010, T030 | Bản ghi cần `docSha` (sha blob của tài liệu lúc tạo) nhưng không task nào nói lấy giá trị này ở đâu. Live có sha blob trong tree của spec, local và demo thì không. | Ghi rõ trong T010: lấy sha blob từ tree entry vào `SpecFeature` theo từng file; local và demo dùng hash nội dung (hoặc để `docSha` tuỳ chọn). Cập nhật data-model. |
| G1 | Coverage | MEDIUM | spec.md FR-007; constitution II | FR-007 (đoạn trích và ghi chú luôn là văn bản thuần) chưa có test. Đây là yêu cầu an toàn của constitution II. | Thêm vào T014 và T032: ghi chú chứa `<img onerror>` và markdown được render đúng chữ, không thành thẻ. |
| G2 | Coverage | MEDIUM | spec.md FR-001 ("màu tô đọc được trên cả bốn nền") | Không task nào kiểm màu tô trên bốn nền đọc, nhất là Dark. | Thêm vào T040 (hoặc test thuần): tương phản chữ trên nền đã trộn màu tô cho từng nền, ít nhất 4.5:1. |
| G3 | Coverage | MEDIUM | spec.md Edge Cases (chuyển spec, bước, nhánh khi đang soạn) | Không task nào làm việc giữ hoặc huỷ có báo ghi chú đang soạn khi đổi spec, bước hay nhánh. | Thêm vào T018: đổi spec, bước hoặc nhánh khi đang soạn thì hỏi "Discard this note?" hoặc giữ thanh công cụ gắn với spec cũ; không lưu nhầm sang spec khác. Kèm test. |
| G4 | Coverage | LOW | spec.md FR-013 (xoá highlight cuối giữ file rỗng); Edge Cases (chọn qua nhiều đoạn) | Hai hành vi có trong spec nhưng không có test riêng. | T004: thêm case xoá highlight cuối → `{version:1, highlights:[]}`. T018: chọn vượt cột đọc hoặc không liên tục → báo lý do. |
| G5 | Coverage | LOW | spec.md FR-022 (highlight không chặn, không tự duyệt cổng) | Không có test. | T032: brief có ghi chú Issue, nút Approve vẫn bật; không có lời gọi `/api/gates` nào từ code highlight. |
| I2 | Inconsistency | LOW | spec.md FR-019 ("Gate"); tasks.md T035 ("Gate & PRs") | Live giữ nhãn "Gate & PRs" vì tab đó có danh sách PR; spec ghi "Gate". | Ghi trong FR-019 rằng live giữ nhãn hiện có "Gate & PRs". |

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 bốn màu có nghĩa | Có | T002, T014, T016 | G2 (đọc được trên bốn nền) |
| FR-002 vẽ không sửa DOM | Có | T015 | |
| FR-003 thanh công cụ | Có | T014, T016 | |
| FR-004 trình sửa ghi chú, 2.000 ký tự | Có | T004, T014, T016 | |
| FR-005 ghim | Có | T017 | |
| FR-006 neo, Outdated | Có | T003, T007, T037, T038 | |
| FR-007 văn bản thuần | Một phần | T016, T033 | G1 |
| FR-008 lưu là chia sẻ, một file | Có | T008, T012 | |
| FR-009 commit vào nhánh đang xem | Có | T006, T008, T021 | |
| FR-009a xác nhận một lần, toast | Có | T023, T024, T025 | |
| FR-010 thông điệp, `[skip ci]` | Có | T004, T008 | |
| FR-011 chỉ tác giả sửa | Có | T004, T014, T026 | |
| FR-012 ghi đồng thời | Có | T005, T006, T008 | |
| FR-013 tạo file, giới hạn | Có | T004, T006 | G4 |
| FR-014 file hỏng không bị ghi đè | Có | T004, T006, T010 | |
| FR-015 lưu thất bại giữ nháp | Có | T018 | |
| FR-016 local ghi file | Có | T029, T030, T031 | I1 |
| FR-017 tác giả local | Có | T013, T031 | |
| FR-018 demo | Có | T019, T020, T034 | |
| FR-019 ba tab | Có | T034, T035, T036 | I1, I2 |
| FR-020 tab Highlights | Có | T032, T033 | |
| FR-021 nhảy tới đoạn | Có | T015, T033 | |
| FR-022 brief có ghi chú | Có | T032–T035 | G5 |
| FR-023 bàn phím, điện thoại, nhãn | Có | T014, T040 | |
| SC-001 ≤ 2 thao tác | Có | T042 | Kiểm tay |
| SC-002 người khác thấy sau làm mới | Có | T010, T042 | |
| SC-003 một commit, một file, không CI | Có | T004, T006 | |
| SC-004 ghi đồng thời không mất | Có | T006 | |
| SC-005 Outdated không mất | Có | T037, T038 | |
| SC-006 200 highlight < 1 giây | Có | T039 | |
| SC-007 ghi chú trong tab Gate | Có | T032, T035 | |
| SC-008 390px | Có | T040 | |

## Constitution Alignment Issues

Không có vi phạm với constitution 1.4.0 (đã sửa trên nhánh này):
- I: chỉ ghi `specs/*/highlights.json` qua commit `[skip ci]` sau xác nhận một lần cho mỗi repo;
  local ghi thẳng file, không commit.
- II: quyền Contents: Read and write được nêu ở spec và README (T027); route ghi chặn khác origin
  (T011); FR-007 cần test (G1).
- III, IV, V, VI, VII: đáp ứng.

## Unmapped Tasks

Không có. T001 (baseline), T041–T043 (so ảnh, quickstart, cổng kiểm tra và PR) là task chung.

## Metrics

- Total Requirements: 32 (24 FR, 8 SC)
- Total Tasks: 43
- Coverage: 32/32 có ít nhất một task (100%); FR-007 chỉ một phần (G1)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions

- Không có CRITICAL. Nên sửa I1 (HIGH) trước `/speckit-implement`, vì nó quyết định giao diện local.
- Các mục MEDIUM (U1, G1, G2, G3) là sửa nhỏ trong `tasks.md` và `data-model.md`.
- Các mục LOW làm được trong lúc implement.
