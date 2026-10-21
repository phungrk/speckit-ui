# Specification Analysis Report: 010 Chú thích (highlight và ghi chú)

Ngày 2026-10-21. Đọc `spec.md` (FR-001…FR-023, FR-009a; SC-001…SC-008), `plan.md`, `tasks.md`
(43 task), `research.md`, `data-model.md`, hai contract, `quickstart.md` và constitution 1.4.0 (đã sửa
trên nhánh này).

## Findings

Lần chạy thứ hai, sau khi sửa theo lần chạy đầu (commit `2e9e178`).

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| P1 | Process | LOW | `.specify/memory/constitution.md` 1.4.0; tasks.md T043 | Constitution 1.4.0 (nơi ghi mới) và quyền token Contents: write sẽ vào `main` cùng PR implement. Người review cần thấy rõ đây là thay đổi luật và quyền. | Tách mục "Constitution 1.4.0" và "New permission" riêng trong mô tả PR (T043 đã nêu). |

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 bốn màu có nghĩa | Có | T002, T014, T016, T040 | |
| FR-002 vẽ không sửa DOM | Có | T015 | |
| FR-003 thanh công cụ | Có | T014, T016 | |
| FR-004 trình sửa ghi chú, 2.000 ký tự | Có | T004, T014, T016 | |
| FR-005 ghim | Có | T017 | |
| FR-006 neo, Outdated | Có | T003, T007, T037, T038 | |
| FR-007 văn bản thuần | Có | T014, T016, T032, T033 | |
| FR-008 lưu là chia sẻ, một file | Có | T008, T012 | |
| FR-009 commit vào nhánh đang xem | Có | T006, T008, T021 | |
| FR-009a xác nhận một lần, toast | Có | T023, T024, T025 | |
| FR-010 thông điệp, `[skip ci]` | Có | T004, T008 | |
| FR-011 chỉ tác giả sửa | Có | T004, T014, T026 | |
| FR-012 ghi đồng thời | Có | T005, T006, T008 | |
| FR-013 tạo file, giới hạn | Có | T004, T006 | |
| FR-014 file hỏng không bị ghi đè | Có | T004, T006, T010 | |
| FR-015 lưu thất bại giữ nháp | Có | T018 | |
| FR-016 local ghi file | Có | T029, T030, T031, T036 | |
| FR-017 tác giả local | Có | T013, T031 | |
| FR-018 demo | Có | T019, T020, T034 | |
| FR-019 ba tab (local hai tab) | Có | T034, T035, T036 | |
| FR-020 tab Highlights | Có | T032, T033 | |
| FR-021 nhảy tới đoạn | Có | T015, T033 | |
| FR-022 brief có ghi chú | Có | T032–T035 | |
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
  (T011); FR-007 có test (T014, T032).
- III, IV, V, VI, VII: đáp ứng.

## Unmapped Tasks

Không có. T001 (baseline), T041–T043 (so ảnh, quickstart, cổng kiểm tra và PR) là task chung.

## Metrics

- Total Requirements: 32 (24 FR, 8 SC)
- Total Tasks: 43
- Coverage: 32/32 có ít nhất một task (100%)
- Ambiguity Count: 0
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions

- Không còn CRITICAL hay HIGH. Có thể duyệt Analyze và chạy `/speckit-implement 010-spec-annotations`.

## Lần chạy đầu và cách đã xử lý

Lần chạy đầu (commit `2e9e178`): 1 HIGH, 4 MEDIUM, 3 LOW. Đã sửa:

- I1 (HIGH, local mâu thuẫn ba tab và brief): FR-016, FR-019, FR-022 nói rõ local có hai tab Local mode · Highlights và không có "Before you approve"; T036 ghi theo.
- U1: data-model định nghĩa `docSha` (sha blob ở server và Pages; FNV-1a ở local và demo; có thể null); T010 thêm nguồn sha.
- G1: T014, T032 kiểm văn bản thuần với `<img onerror>`, `<script>`, markdown.
- G2: T040 kiểm tương phản chữ trên màu tô trộn với bốn nền.
- G3: T018 hỏi "Discard this note?" khi đổi spec, bước, nhánh; lưu luôn nhắm đích lúc mở thanh công cụ.
- G4: T004 xoá highlight cuối giữ file rỗng; T018 báo khi chọn vượt cột đọc.
- G5: T032 kiểm brief không chặn Approve và code highlight không gọi `/api/gates`.
- I2: FR-019 ghi live giữ nhãn "Gate & PRs".
