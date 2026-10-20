# Specification Analysis Report: 010 Chế độ đọc kiểu Kindle

Ngày 2026-10-20. Đọc `spec.md`, `plan.md`, `tasks.md` (33 task), `research.md`, `data-model.md`,
`contracts/reader-ui.md` và constitution 1.1.0. Không sửa file nào khác.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Constitution | CRITICAL | spec.md FR-005, FR-005a, FR-006; plan.md Complexity Tracking; constitution IV | Nguyên tắc IV ghi MUST "Không thêm màu mới". Bốn nền, nền mặc định `#FFFFFF` và năm màu ghi đè của Dark là màu mới. Complexity Tracking không miễn được một nguyên tắc MUST; plan chỉ "đề xuất" sửa constitution. | Sửa constitution trước khi implement: `/speckit-constitution` cho phép bảng nền của chế độ đọc, khai báo một lần và áp qua token. Đây là đổi ngữ nghĩa một nguyên tắc nên là MINOR (1.2.0), không phải PATCH như plan ghi. Sau đó plan dẫn tới bản mới. |
| C2 | Constitution | HIGH | spec.md FR-012; plan.md Complexity Tracking hàng 3; tasks.md T031; constitution IV | IV đòi demo giống `Speckit Workspace.html` từng pixel. Bản thiết kế mới có tab Highlights, thanh công cụ và ghim, mà spec này không làm. Demo sẽ lệch bản thiết kế cho tới khi `010-spec-annotations` xong. | Gộp vào lần sửa constitution ở C1: mốc so ảnh của demo là bản thiết kế trừ các phần đã ghi rõ là thuộc spec khác. Hoặc giữ mốc cũ cho tới khi annotations xong. |
| U1 | Underspecification | MEDIUM | tasks.md T017; plan.md Source Code | `LiveWorkspace` không biết `PrefsStorage`: `storage` chỉ nằm trong `Root.tsx` (dòng 106, 136, 143). T017 bảo "tìm cách shell lấy Prefs" nhưng shell không có `Prefs`. `Root.tsx` không có trong cây file của plan. | Thêm `src/Root.tsx` vào plan. Sửa T017: truyền `storage` (hoặc `prefs`) từ `Root` xuống `LiveWorkspace` như một prop mới. |
| I1 | Inconsistency | MEDIUM | plan.md Complexity Tracking hàng 4; tasks.md T005, T008; specs/006 FR-008 | Spec 006 (đã merge) bắt mọi cỡ chữ đi qua `--fs-N`. Plan cho ngoại lệ `--rd-size*` và thêm `--fs-22`. Tasks chỉ sửa data-model của 006, không sửa câu FR-008 của 006. Hai spec đã duyệt sẽ nói khác nhau. | Thêm vào Assumptions của 010 một dòng nêu ngoại lệ với 006 FR-008. Trong T008, thêm một ghi chú ở 006 data-model dẫn tới 010. |
| I2 | Inconsistency | MEDIUM | spec.md FR-004; data-model.md "Nơi lưu"; research R2 | FR-004 nói lưu "theo cùng cách ứng dụng đang lưu tuỳ chọn khác". Bản thiết bị `sk.reader` luôn ở `localStorage`, kể cả Pages không bật Remember, nơi mọi tuỳ chọn khác ở `sessionStorage`. Trên máy dùng chung, người sau thấy nền của người trước cho tới khi đăng nhập. | Ghi ngoại lệ này vào FR-004 hoặc Assumptions (cài đặt hiển thị không nhạy cảm; cần để tránh nháy). Hoặc đổi R2 sang lưu bản thiết bị cùng kho với prefs. |
| G1 | Coverage | MEDIUM | spec.md FR-011; tasks.md | FR-011 (đổi font hoặc cỡ chỉ làm cột đọc dàn lại, phần khác không xê dịch) không có task hay bước kiểm nào. Quickstart không nhắc. | Thêm vào quickstart §1 và T032: đo vị trí header, rail và sidebar trước và sau khi đổi cỡ; không được đổi. |
| G2 | Coverage | LOW | spec.md FR-001, FR-005; tasks.md T016–T018 | Nút Aa chỉ có trong ba shell. Overview, chọn repo, đăng nhập và Connect có header riêng (`sk-page`) nhưng không có Aa. Nền vẫn áp ở đó (R1), nên chỉ thiếu cách đổi. | Nêu rõ trong FR-001: "header của workspace". Hoặc thêm Aa vào header `sk-page` trong một task. |
| G3 | Coverage | LOW | spec.md FR-013; tasks.md | FR-013 (không ghi, không gọi mạng ngoài font) không có kiểm tra tự động, chỉ có kiểm tay. | Có thể thêm vào T021 một kiểm tra rằng `src/reader/` không import `fetch`, `backend`, `trackingApi` hay `server/`. |
| A1 | Ambiguity | LOW | tasks.md T021 | Mẫu `#000` cũng khớp `#0000ff`, `#000000aa`; mẫu `white` khớp `white-space`. Test có thể báo sai. | Dùng ranh giới: `#(?:fff|ffffff|000|000000)\b` và `\b(?:white|black)\b` trong giá trị màu (sau `:`), không khớp tên thuộc tính. |
| I3 | Inconsistency | LOW | spec.md FR-007; contracts §4 | Tooltip "Gate, highlights & Copilot" nhắc highlight, nhưng sidebar phải chưa có tab Highlights cho tới khi annotations xong. | Giữ đúng bản thiết kế, hoặc dùng "Gate & Copilot" cho tới khi annotations xong. Ghi lựa chọn vào contracts. |
| I4 | Inconsistency | LOW | spec.md tiêu đề; tên thư mục và nhánh | Slug `010-reader-highlights` không còn highlight. Đã giữ để không mất liên kết với issue #27. | Không cần làm gì; nhắc trong mô tả PR. |

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 nút Aa và popover | Có | T011, T014, T015, T016, T017, T018 | Chỉ trong workspace (G2) |
| FR-002 phạm vi font đọc | Có | T012, T013 | |
| FR-003 font có tiếng Việt | Có | T002 | Kiểm tay |
| FR-004 nhớ theo người dùng, áp trước lần vẽ đầu | Có | T004, T007, T009, T010 | I2 |
| FR-005 nền phủ toàn khung | Có | T006, T022, T023, T024 | |
| FR-005a bảng màu theo prototype | Có | T006, T020 | C1 |
| FR-006 tương phản ≥ 4.5 | Có | T020, T023 | |
| FR-007 hai nút sidebar | Có | T026, T027, T029 | I3 |
| FR-008 sidebar ẩn không nhận focus, phím tắt | Có | T025, T026, T028, T029 | |
| FR-009 bàn phím, hộp thoại có tên | Có | T011, T014, T026 | |
| FR-010 vùng bấm, giảm chuyển động | Có | T009, T015 | |
| FR-011 không xê dịch layout | **Không** | — | G1 |
| FR-012 bốn chế độ, demo theo thiết kế | Có | T016, T017, T018, T029, T031 | C2 |
| FR-013 không ghi, không gọi mạng | Một phần | T018, T032 | G3 |
| SC-001 | Có | T012, T013, T032 | |
| SC-002 | Có | T020, T024 | |
| SC-003 không nháy | Có | T009, T032 | Kiểm tay |
| SC-004 chỉ bàn phím | Có | T011, T032 | |
| SC-005 0 phần tử ẩn nhận focus | Có | T026, T029 | |

## Constitution Alignment Issues

- **IV (C1, CRITICAL)**: màu mới. Phải sửa constitution trước implement.
- **IV (C2, HIGH)**: demo lệch bản thiết kế ở phần highlight.
- I, II, III, V, VI, VII: không vi phạm. CSP không đổi; không ghi mới; không dependency mới.

## Unmapped Tasks

Không có. T001 (baseline), T030 (README), T033 (cổng kiểm tra) là task chung.

## Metrics

- Total Requirements: 19 (14 FR, 5 SC)
- Total Tasks: 33
- Coverage: 18/19 có ít nhất một task (94.7%); FR-013 chỉ được kiểm tay
- Ambiguity Count: 1
- Duplication Count: 0
- Critical Issues Count: 1

## Next Actions

1. **Trước `/speckit-implement`**: giải quyết C1 bằng `/speckit-constitution` (sửa nguyên tắc IV, bản 1.2.0), gộp luôn C2.
2. Sửa tay `tasks.md` và `plan.md` cho U1 (`Root.tsx` truyền `storage`), G1 (đo layout shift), A1 (regex).
3. Ghi I1 và I2 vào Assumptions của spec. Spec đã duyệt Clarify, nên đây là sửa câu chữ nhỏ.
4. Các mục LOW (G2, G3, I3, I4) làm được trong lúc implement hoặc bỏ qua.
