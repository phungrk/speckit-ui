# Specification Analysis Report: 002 multi-repo workspace

**Date**: 2026-10-17 | **Artifacts**: spec.md, plan.md, tasks.md (cùng research.md, data-model.md, contracts/, quickstart.md) | **Constitution**: v1.0.0

Báo cáo này chỉ đọc, không sửa spec, plan hay tasks. Theo quy trình của repo, báo cáo được lưu tại đây để speckit-ui hiển thị được.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Constitution | CRITICAL | constitution.md §II; plan.md Constitution Check II; research.md R5; tasks.md T037–T039 | Nguyên tắc II ghi "Bản có server: khoá **chỉ nằm trong biến môi trường** của server". Ở chế độ sign-in, token của từng người lại nằm trong kho phiên trong bộ nhớ. Ý của nguyên tắc (không xuống trình duyệt) vẫn được giữ, nhưng câu chữ MUST bị trái, và plan ghi PASS mà không biện minh | Trước `/speckit-implement`, sửa constitution bằng `/speckit-constitution`: "khoá chỉ nằm phía server (biến môi trường, hoặc phiên trong bộ nhớ của tiến trình), không bao giờ gửi xuống trình duyệt". Đây là bản MINOR 1.1.0. Cập nhật `CLAUDE.md` trong cùng PR |
| U1 | Underspecification | HIGH | tasks.md T010, T011, T021; data-model.md CurrentUser | Ghim và vị trí đang xem dùng namespace `sk.u.<login>`, nhưng không task nào lấy `login` ở bản Pages và chế độ token: Connect chỉ có token, không có `GET /user`. `session()` của `browserBackend` chưa được định nghĩa | Ghi rõ trong T010: `browserBackend.session()` gọi `GET /user`, và `/api/session` ở chế độ token cũng gọi `GET /user` (T018). Thêm trường hợp này vào T014 hoặc T012 |
| G1 | Coverage | MEDIUM | spec.md Edge Cases (quyền đọc nhưng không ghi được issue) | Không task nào xử lý trường hợp "cổng duyệt báo thiếu quyền ở riêng repo đó". Khi GitHub trả 403 lúc ghi issue, GatePanel cần thông báo theo repo | Thêm task [US2] hoặc [US5]: ánh xạ 403 từ `POST /api/gates` và `browserBackend.decide` thành thông báo thiếu quyền Issues trong `src/project/GatePanel.tsx`, kèm test |
| G2 | Coverage | MEDIUM | FR-009; tasks.md T009, T010 | Chưa có test chứng minh phê duyệt ghi vào đúng repo trong body, chứ không ghi vào `GITHUB_REPO` mặc định | Mở rộng T008, hoặc thêm test: gọi `POST /api/gates` với `repo=B` khi `GITHUB_REPO=A` thì ghi vào B |
| G3 | Coverage | MEDIUM | FR-017; tasks.md T042 | Disconnect chỉ xoá storage. Cache trong bộ nhớ của `server/github.ts` và `server/tracking.ts` (đang chạy trong trình duyệt ở bản Pages) vẫn giữ dữ liệu repo cho tới khi tải lại trang | Trong T042, thêm việc xoá cache (`clearCaches()`) và trạng thái `RepoContext` khi Disconnect hoặc Sign out |
| G4 | Coverage | MEDIUM | SC-001, SC-002, SC-005; tasks.md T045 | Các tiêu chí thời gian (≤10 giây, ≤5 giây, ≤10 giây) không có bước đo nào | Trong T045, ghi lại thời gian của kịch bản 1 bước 2, 4 và 6 khi chạy với GitHub thật (chỉ đọc) và đưa vào mô tả PR. Test tự động chỉ kiểm số lần gọi: 200 repo dùng 2 trang (T014) |
| I1 | Inconsistency | MEDIUM | data-model.md LastViewed và OverviewItem (`step: number`); contracts/client-state.md (`step=<constitution\|…>`) | Bước được biểu diễn hai kiểu: số ở dữ liệu, tên ở URL | Chốt một kiểu: lưu số, URL dùng tên. Ghi ánh xạ trong T013 (`urlState`) và kiểm tra trong test |
| I2 | Inconsistency | MEDIUM | research.md R2 ("cache trong phiên"); client-state.md (`sk.speckit.*` trong sessionStorage); tasks.md T016 ("cached in memory"), T042 (xoá `sk.speckit.*`) | Nơi lưu kết quả nhận diện Spec Kit không thống nhất | Chọn sessionStorage như contract, rồi sửa T016 cho khớp. Hoặc chọn bộ nhớ, rồi bỏ `sk.speckit.*` khỏi contract và T042 |
| I3 | Inconsistency | LOW | research.md R2 (ưu tiên: ghim → đang hiện → 30 repo mới nhất); tasks.md T019 ("visible rows first") | Thứ tự ưu tiên khi nhận diện trong task thiếu repo đã ghim và 30 repo mới nhất | Sửa T019 cho khớp R2 |
| I4 | Inconsistency | LOW | spec.md Edge Cases ("bỏ nó khỏi danh sách đang dùng"); data-model.md Pins; tasks.md T030 ("mark as unavailable") | Spec nói bỏ repo mất quyền khỏi danh sách, còn task giữ lại và đánh dấu "unavailable" | Cách của data-model (giữ trong storage, ẩn khỏi danh sách đang dùng, có thông báo) hợp lý. Sửa T030 cho khớp |
| D1 | Constitution | LOW | constitution.md "Ràng buộc kỹ thuật" (chỉ handler HTTP đọc `process.env`); tasks.md T017, T018 | `handleSession` và phần chọn chế độ đọc `process.env`, nhưng T017 đặt `handleSession` trong `server/github.ts`, là module dùng chung với trình duyệt. Code hiện tại đã có `handleProject` ở đó nên không phải vi phạm mới, nhưng sẽ làm phần Node trong module dùng chung lớn thêm | Đặt phần chọn chế độ và `handleSession` trong `server/index.ts` hoặc một `server/routes.ts` mới, để `github.ts` chỉ giữ `listRepos` và `detectSpeckit` |
| D2 | Constitution | LOW | constitution.md §IV (bàn phím, nhãn cho trình đọc màn hình); tasks.md T019, T026, T033 | Chỉ T028 nhắc `aria-pressed`. Bộ chọn repo trên thanh điều hướng, các dòng trong danh sách và các mục tổng quan chưa nêu yêu cầu dùng bằng bàn phím và có nhãn | Thêm một dòng vào T019, T026 và T033: dùng được bằng bàn phím, có `:focus-visible`, có `aria-label` cho nút chỉ có icon |
| A1 | Ambiguity | LOW | spec.md Edge Cases ("danh sách vẫn mở được nhanh") | Chữ "nhanh" không có số đo, dù SC-002 đã cho con số cho trường hợp 200 repo | Dẫn tới SC-002 trong edge case |
| A2 | Ambiguity | LOW | tasks.md T036 (`Secure` cookie); quickstart.md kịch bản 3 (`http://localhost:8787`) | Cookie `Secure` trên http chỉ chạy vì localhost được trình duyệt ngoại lệ. Triển khai sau proxy TLS có thể cần `trust proxy` | Ghi trong T037: luôn đặt `Secure`, và README nêu rằng bản server phải chạy sau HTTPS khi không ở localhost |
| P1 | Ordering | LOW | tasks.md Dependencies (US5 chạy song song đợt A); T021, T025, T034, T041 đều sửa `src/Root.tsx` | US5 được ghi là chạy song song, nhưng đụng cùng file với US1, US2 và US4 | Ghi rõ: T041 làm sau T034, hoặc tách bước định tuyến của Root ra một hàm để giảm xung đột |

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 liệt kê repo | ✅ | T014, T015, T040 | |
| FR-002 đánh dấu, ưu tiên Spec Kit | ✅ | T014, T016, T019 | |
| FR-003 mở repo không đăng nhập lại | ✅ | T019, T021 | |
| FR-004 chuyển repo từ nav | ✅ | T026 | |
| FR-005 nhớ spec và bước | ✅ | T011, T027 | Xem I1 |
| FR-006 tách dữ liệu | ✅ | T006, T007, T008, T023–T025, T027 | |
| FR-007 nhập tay | ✅ | T019, T029 | |
| FR-008 deep link không chứa khoá | ✅ | T013, T025, T041 | |
| FR-009 ghi đúng repo, đúng người | ⚠️ | T009, T010, T039 | Chưa có test, xem G2 |
| FR-010 tìm kiếm | ✅ | T029 | |
| FR-011 ghim | ✅ | T011, T012, T028 | |
| FR-012 repo mất quyền | ✅ | T030 | Xem I4 |
| FR-013 mọi chế độ dùng quyền người dùng | ✅ | T010, T018, T039 | |
| FR-014 bản server bắt đăng nhập | ✅ | T036, T039, T041 | |
| FR-015 token không xuống trình duyệt | ✅ | T036, T037, T039 | Xem C1 |
| FR-016 `.env.local` | ✅ | T001, T003, T018, T021 | `.gitignore` hiện chỉ có `.env` |
| FR-017 đăng xuất, ngắt kết nối | ⚠️ | T038, T041, T042 | Cache trong bộ nhớ, xem G3 |
| FR-018 tổng quan | ✅ | T031–T034 | |
| FR-019 lỗi tổng quan cục bộ | ✅ | T033 | |
| SC-001, SC-002, SC-005 (thời gian) | ⚠️ | T014 (gián tiếp), T045 | Xem G4 |
| SC-003 không lẫn dữ liệu | ✅ | T008, T023 | |
| SC-004 khôi phục vị trí | ✅ | T012, T027 | |
| SC-006 không thấy repo ngoài quyền | ✅ | T008, T036 | Kiểm thêm bằng 2 tài khoản ở T045 |
| SC-007 người mới chọn đúng | — | — | Chỉ số sau triển khai, không cần task |

**Constitution Alignment Issues**: C1 (CRITICAL, câu chữ §II), D1, D2 (LOW). Các nguyên tắc I, III, V, VI, VII không có xung đột:
- Không thêm loại ghi mới.
- Logic liệt kê nằm trong module dùng chung.
- Test dùng GitHub giả lập.
- Copilot nhận ngữ cảnh từ client nên không cần tham số `repo`.
- Phần thêm vào đã có biện minh ở Complexity Tracking.

**Unmapped Tasks**: không có. T001–T003 và T043–T047 là việc hạ tầng, tài liệu và kiểm tra. Chúng phục vụ FR-016 và nguyên tắc II, IV, V.

## Metrics

| Chỉ số | Giá trị |
|---|---|
| Requirements (FR + SC cần làm) | 19 FR + 6 SC = 25 |
| Tasks | 47 |
| Coverage (có ít nhất 1 task) | 25/25 = 100% (3 mục chỉ phủ một phần: FR-009, FR-017, nhóm SC thời gian) |
| Ambiguity | 2 |
| Duplication | 0 |
| Critical | 1 |
| Tổng phát hiện | 15 (1 CRITICAL, 1 HIGH, 6 MEDIUM, 7 LOW) |

## Next Actions

1. **Bắt buộc trước `/speckit-implement`**: xử lý C1 bằng cách sửa constitution lên 1.1.0 qua `/speckit-constitution`, rồi cập nhật dòng II trong Constitution Check của plan.md.
2. **Nên làm**: sửa tasks.md theo U1, G1–G3, I1 và I2. Các mục này đều là chỉnh sửa nhỏ trong task hoặc thêm 1–2 task, không cần chạy lại `/speckit-plan`.
3. **Tuỳ chọn**: các mục LOW có thể sửa ngay trong lúc implement task tương ứng.
4. Sau khi sửa, chạy lại `/speckit-analyze 002` để xác nhận không còn CRITICAL.
