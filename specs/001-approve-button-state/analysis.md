# Specification Analysis Report: 001 approve button state

**Date**: 2026-10-17 | **Artifacts**: spec.md, plan.md, tasks.md (cùng research.md, data-model.md, contracts/gates.md, quickstart.md) | **Constitution**: v1.1.0

Báo cáo chỉ đọc, lưu tại đây để speckit-ui hiển thị được.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| U1 | Underspecification | MEDIUM | research.md R4; data-model.md RecentWrite (khoá có `identity`); tasks.md T014; spec.md Edge Cases (hai người cùng mở cổng) | Bản ghi gần đây khoá theo người dùng. Trên bản server, A duyệt lần đầu và tạo issue. Trong vài giây danh sách của GitHub chưa có issue đó, nên khi B duyệt, lệnh của B không thấy issue và **tạo issue thứ hai**. R4 chỉ nêu rủi ro thừa một comment, không nêu rủi ro thừa một issue. | Thêm vào `server/tracking.ts` một bảng `owner/repo\|slug → số issue` dùng chung trong tiến trình, chỉ để tránh tạo trùng. Lệnh `GET /issues/{n}` bằng token của chính người dùng vẫn kiểm quyền. Bổ sung vào T014 và một ca test vào T012. |
| I1 | Inconsistency | MEDIUM | contracts/gates.md "Đảm bảo 1"; tasks.md T008, T016; spec.md FR-006 | Khi PATCH đã ghi nhưng comment lỗi: contract nói chỉ báo thành công khi cả hai xong, nên giao diện báo lỗi và cổng vẫn hiện chưa duyệt. Thực tế issue đã ghi duyệt, và lần làm mới sau sẽ hiện đã duyệt. Trường hợp này chưa được ghi rõ ở contract và FR-006. | Ghi trường hợp "ghi được một phần" vào contracts/gates.md: báo lỗi; lần làm mới hoặc lần bấm sau hiện đã duyệt và không ghi thêm (khớp edge case "phản hồi bị mất"). |
| C1 | Coverage | LOW | constitution III ("kiểm tra cổng chạy lại ngay trước khi ghi"); `server/tracking.ts` `decideGate` (kiểm tra trước, đọc issue sau); tasks.md T014 | Nếu cổng đã được người khác duyệt nhưng file vừa đổi khiến kiểm tra không đạt, lệnh Approve trả 409 thay vì "Already approved" như US2-AS3. | Trong T014, đọc issue và trả `unchanged` trước khi chạy kiểm tra cổng. Kiểm tra vẫn chạy trước mọi lệnh ghi, nên vẫn đúng nguyên tắc III. |
| A1 | Ambiguity | LOW | data-model.md RecentWrite (hết hạn sau 2 phút); spec.md SC-003 (2 phút) | Thời gian giữ bản ghi gần đây bằng đúng khoảng thời gian SC-003 đo, nên không có dư. | Giữ 5 phút. Dữ liệu của GitHub mới hơn vẫn thắng nhờ so `updatedAt`. |
| G1 | Coverage | LOW | spec.md Edge Cases (duyệt Implement đóng issue); tasks.md T007 | Chưa có test cho việc `applyIssue` giữ `state: 'closed'`, để khu vực cổng hiện "(closed)" ngay sau khi duyệt Implement. | Thêm một assertion vào T007. |

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | ✅ | T008–T011 | |
| FR-002 | ✅ | T015, T019 | |
| FR-003 | ✅ | T012, T013, T015 | |
| FR-004 | ✅ | T003, T005–T007 | |
| FR-005 | ✅ | T011 | |
| FR-006 | ✅ | T016, T017 | Xem I1 |
| FR-007 | ✅ | T012, T014, T015 | Xem U1, C1 |
| FR-008 | ✅ | T018, T019 | |
| FR-009 | ✅ | T007, T010, T020 | |
| FR-010 | ✅ | T021 | |
| SC-001 | ✅ | T020 | |
| SC-002 | ✅ | T012, T020 | |
| SC-003 | ✅ | T006, T007, T020 | Xem A1 |
| SC-004 | ✅ | T016 | |

**Constitution Alignment Issues**: không có. Đã kiểm với v1.1.0:
- **I:** không thêm loại ghi, và bớt được các lần ghi thừa.
- **II:** không đổi khoá hay điểm đến mạng.
- **III:** logic nằm trong module dùng chung; kiểm tra cổng vẫn chạy trước khi ghi.
- **IV:** chỉ dùng class sẵn có.
- **V:** có test cho luồng ghi, và T023 chạy đủ 4 lệnh kiểm tra.
- **VII:** không thêm dependency.

**Unmapped Tasks**: không có. T001 là hạ tầng cho test, T022 là tài liệu.

## Metrics

| Chỉ số | Giá trị |
|---|---|
| Requirements (FR + SC) | 10 FR + 4 SC = 14 |
| Tasks | 23 |
| Coverage | 14/14 = 100% |
| Ambiguity | 1 |
| Duplication | 0 |
| Critical | 0 |
| Tổng phát hiện | 5 (0 CRITICAL, 0 HIGH, 2 MEDIUM, 3 LOW) |

## Next Actions

1. Không có CRITICAL, nên có thể chạy `/speckit-implement`.
2. Nên sửa **U1** trước khi implement, bằng cách thêm vào T012 và T014; đây là rủi ro tạo issue theo dõi trùng ở bản server có nhiều người dùng. **I1** chỉ cần thêm một đoạn vào contract.
3. **C1**, **A1** và **G1** có thể gộp vào T014, T005 và T007 khi implement.
