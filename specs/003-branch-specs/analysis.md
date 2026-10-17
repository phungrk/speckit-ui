# Specification Analysis Report: 003 branch specs

**Date**: 2026-10-17 | **Artifacts**: spec.md, plan.md, tasks.md (cùng research.md, data-model.md, contracts/branches.md, quickstart.md) | **Constitution**: v1.1.0

Báo cáo chỉ đọc, lưu tại đây để speckit-ui hiển thị được.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Inconsistency | MEDIUM | spec.md FR-004 ("mọi nội dung … kiểm tra cổng … lấy từ nhánh đó"); research.md R6; tasks.md T008, T016 | Kiểm tra cổng Implement so con trỏ submodule của **nhánh chính** (`project.submodules`). Với spec trên nhánh `feat/…`, đó không phải nội dung của nhánh, nên kết luận "đã bump con trỏ submodule" có thể sai. | Trong T008, lưu các mục kiểu `commit` (con trỏ submodule) từ cây gốc của nhánh, vốn đã được đọc ở R2. Trong T016, khi kiểm tra cổng cho một bản trên nhánh thì dùng các con trỏ đó. Thêm một ca vào T013. |
| G1 | Coverage | LOW | spec.md Edge Cases ("nhánh bị xoá hoặc force-push"); tasks.md T007 | T007 có ca "đẩy thêm commit", nhưng chưa có ca nhánh bị xoá hoặc bị force-push. | Thêm hai ca vào T007: nhánh bị xoá thì spec của nó biến mất ở lần làm mới sau; nhánh bị force-push về SHA cũ thì nội dung cũ hiện lại. |
| U1 | Underspecification | LOW | contracts/branches.md `GET /api/spec` | Contract chưa nói khi `branch` bị bỏ trống hoặc là nhánh chính thì trả về gì. | Ghi rõ: thiếu `branch` hoặc `branch` = nhánh chính thì trả bản trên nhánh chính. Chỉ trả 400 khi nhánh khác nhánh chính và không khớp `branchPrefixes`. |
| D1 | Constitution | LOW | constitution IV (nhãn cho trình đọc màn hình); tasks.md T021 | Bộ chọn bản chưa nêu `aria-label`, và nhãn nhánh chưa có chữ thay thế khi bị rút gọn. | Trong T021, đặt `aria-label="Version of NNN-slug"`. Trong T011, nhãn có `title` chứa tên nhánh đầy đủ. |
| U2 | Underspecification | LOW | research.md R6 (link spec trong issue mới trỏ tới nhánh) | Sau khi nhánh merge và bị xoá, link trong issue theo dõi trỏ tới một nhánh không còn tồn tại. | Chấp nhận, vì issue vẫn giữ lịch sử. Ghi chú vào R6: link trỏ nhánh tại thời điểm tạo issue. Có thể sửa sau bằng spec riêng. |

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | ✅ | T007–T011 | |
| FR-002 | ✅ | T002, T005, T007, T008 | |
| FR-003 | ✅ | T009, T011, T012 | |
| FR-004 | ✅ | T013–T016 | Xem C1 |
| FR-005 | ✅ | T013, T016 | |
| FR-006 | ✅ | T009, T019–T021 | |
| FR-007 | ✅ | T019, T020 | |
| FR-008 | ✅ | T007, T008 | |
| FR-009 | ✅ | T017, T021 | |
| FR-010 | ✅ | T007, T009 | |
| FR-011 | ✅ | T018 | |
| FR-012 | ✅ | T002, T006 | |
| FR-013 | ✅ | T013, T015, T023 | |
| SC-001 | ✅ | T007, T010, T023 | |
| SC-002 | ✅ | T023 | |
| SC-003 | ✅ | T019 | |
| SC-004 | ✅ | T013, T016 | |
| SC-005 | ✅ | T007 | |

**Constitution Alignment Issues**: chỉ có D1 (LOW, nhãn trợ năng). Các nguyên tắc còn lại đều khớp:
- **I:** tính năng chỉ đọc; `branchPrefixes` là tuỳ chọn và có mặc định.
- **II:** không thêm điểm đến mạng hay quyền mới.
- **III:** logic nằm trong `server/github.ts` dùng chung, kiểm tra cổng chạy trên đúng bản.
- **V:** có test với GitHub giả lập; T025 chạy đủ 4 lệnh kiểm tra.
- **VII:** không thêm dependency.

**Unmapped Tasks**: không có. T001 là hạ tầng test; T022 và T024 thuộc phần tài liệu và so ảnh.

## Metrics

| Chỉ số | Giá trị |
|---|---|
| Requirements (FR + SC) | 13 FR + 5 SC = 18 |
| Tasks | 25 |
| Coverage | 18/18 = 100% |
| Ambiguity | 0 |
| Duplication | 0 |
| Critical | 0 |
| Tổng phát hiện | 5 (0 CRITICAL, 0 HIGH, 1 MEDIUM, 4 LOW) |

## Next Actions

1. Không có CRITICAL, nên có thể chạy `/speckit-implement`.
2. Nên sửa **C1** trước: thêm vào T008, T013 và T016. Nếu không, cổng Implement của spec trên nhánh có thể kết luận sai về submodule.
3. **G1**, **U1**, **D1** và **U2** có thể gộp vào các task tương ứng khi implement.
