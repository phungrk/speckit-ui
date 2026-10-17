# Specification Analysis Report: 002 multi-repo workspace

**Date**: 2026-10-17 (lần chạy thứ 2, sau khi sửa và implement) | **Artifacts**: spec.md, plan.md, tasks.md (cùng research.md, data-model.md, contracts/, quickstart.md) | **Constitution**: v1.1.0

Báo cáo này chỉ đọc. Theo quy trình của repo, nó thay bản lần 1 để speckit-ui hiển thị được.

## So với lần chạy trước

Đã giải quyết 13/15 phát hiện. Hai mục LOW vẫn còn, ở dạng I3 và A1 trong bảng dưới.

- **C1 (CRITICAL):** constitution v1.1.0 cho phép giữ khoá trong phiên phía server; plan.md ghi rõ điều này.
- **U1:** `browserBackend.session()` và `/api/session` lấy login bằng `GET /user` (T010, T018).
- **G1:** lỗi 403 khi ghi issue báo thiếu quyền riêng cho repo đó (T030).
- **G2:** có test ghi vào repo trong body, không ghi vào `GITHUB_REPO` (T008).
- **G3:** Disconnect và Sign out xoá cache trong bộ nhớ (T042).
- **I1:** bước là số 0–6 trong dữ liệu, tên trên URL (T013).
- **I2:** kết quả nhận diện Spec Kit chỉ nằm trong bộ nhớ.
- **I4:** repo mất quyền bị ẩn khỏi danh sách đang dùng, ghim vẫn giữ (T030).
- **D1:** handler HTTP chuyển sang `server/routes.ts`.
- **D2:** phần tử mới dùng `button` và `select` gốc, có `aria-pressed` và `aria-label`, cùng `:focus-visible`.
- **A2:** README nêu yêu cầu HTTPS cho cookie `Secure`.
- **P1:** không còn ý nghĩa vì các task đã làm xong theo thứ tự.
- **G4:** mới giải quyết một phần. Các số đo với GitHub thật vẫn chờ, nên mục này còn trong bảng.

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| G4 | Coverage | MEDIUM | SC-001, SC-002, SC-005; tasks.md T045 | Thời gian chỉ mới đo với GitHub giả lập, độ trễ 120 ms mỗi lần gọi: danh sách 0,5 giây, chuyển repo 0,9 giây. T045 còn mở vì chưa đo với GitHub thật | Chạy kịch bản 1 với token thật (chỉ đọc), ghi số đo vào mô tả PR, rồi tích T045 |
| G5 | Coverage | MEDIUM | research.md R6; tasks.md T018; `vite.config.ts` | R6 chỉ ràng buộc địa chỉ lắng nghe cho `npm start`. Với `npm run dev -- --host`, chế độ token vẫn mở ra mạng, và ai vào được cũng hành động bằng token của người chạy | Thêm cùng kiểm tra vào `configureServer` trong `vite.config.ts`: chế độ token mà `server.host` không phải localhost thì từ chối, trừ khi `ALLOW_REMOTE_TOKEN_MODE=1`. Thêm 1 task cho việc này |
| I5 | Inconsistency | MEDIUM | spec.md Assumptions; README "GitHub mode" | Bản server không còn đọc repo public khi không có token: chạy local bây giờ bắt buộc có `GITHUB_TOKEN`. README đã ghi, nhưng spec chưa ghi thay đổi hành vi này | Thêm vào Assumptions của spec.md: "Chạy local bắt buộc có token; đọc repo public không cần token không còn được hỗ trợ" |
| I6 | Inconsistency | LOW | plan.md Project Structure (dòng `index.ts`) | Plan ghi route nằm trong `server/index.ts` và không liệt kê `server/routes.ts`, `src/project/SessionNav.tsx`, `repoLoader.ts`, `urlState.ts`, `overview.ts` hay `tests/fakeGitHub.ts`. Implementation notes trong tasks.md đã giải thích | Cập nhật cây thư mục trong plan.md cho khớp code |
| I7 | Inconsistency | LOW | contracts/server-api.md `/api/session`; `src/project/types.ts` `SessionResponse` | Kiểu dùng chung có thêm `mode: 'pages'`, giá trị do backend trình duyệt trả về, nhưng contract chỉ liệt kê `signin`, `token`, `demo` | Ghi trong contract rằng `pages` chỉ có ở bản Pages, không đến từ server |
| I3 | Inconsistency | LOW | tasks.md T019; research.md R2 | Câu chữ T019 chỉ nói "visible rows first". Code đã làm theo R2: repo đã ghim, rồi 30 repo push gần nhất, rồi các dòng đang hiện | Sửa câu chữ T019 |
| A1 | Ambiguity | LOW | spec.md Edge Cases ("danh sách vẫn mở được nhanh") | Chữ "nhanh" không có số đo | Dẫn tới SC-002 |
| T1 | Style | LOW | tasks.md T046, T047 | Hai task không ghi đường dẫn file, nên cổng Tasks hiện cảnh báo (không chặn) | Ghi đường dẫn, ví dụ `package.json` cho T047 |

## Coverage Summary

| Requirement | Has Task? | Task IDs | Notes |
|---|---|---|---|
| FR-001 | ✅ | T014, T015, T040 | |
| FR-002 | ✅ | T014, T016, T019 | |
| FR-003 | ✅ | T019, T021 | |
| FR-004 | ✅ | T026 | |
| FR-005 | ✅ | T011, T013, T027 | |
| FR-006 | ✅ | T006–T008, T023–T025, T027 | |
| FR-007 | ✅ | T019, T029 | |
| FR-008 | ✅ | T013, T025, T041 | |
| FR-009 | ✅ | T008, T009, T010, T039 | |
| FR-010 | ✅ | T029 | |
| FR-011 | ✅ | T011, T012, T028 | |
| FR-012 | ✅ | T030 | |
| FR-013 | ✅ | T010, T018, T039 | |
| FR-014 | ✅ | T036, T039, T041 | Xem G5 (dev server) |
| FR-015 | ✅ | T036, T037, T039 | |
| FR-016 | ✅ | T001, T003, T018, T021 | |
| FR-017 | ✅ | T038, T041, T042 | |
| FR-018 | ✅ | T031–T034 | |
| FR-019 | ✅ | T033 | |
| SC-001, SC-002, SC-005 | ⚠️ | T014, T045 | Xem G4 |
| SC-003 | ✅ | T008, T023 | |
| SC-004 | ✅ | T012, T027 | |
| SC-006 | ✅ | T008, T036 | Kiểm thêm bằng hai tài khoản giả lập ở T045 |
| SC-007 | — | — | Chỉ số sau triển khai, không cần task |

**Constitution Alignment Issues**: không có. Đã kiểm với v1.1.0:

- **I:** không thêm loại ghi mới ra GitHub.
- **II:** token chỉ ở phía server, cookie `HttpOnly`. CSP bản Pages không đổi. README mục Security nêu điểm đến mới `github.com/login/oauth/access_token`.
- **III:** chế độ bị ảnh hưởng đã nêu rõ, và logic dùng chung không dùng API riêng của Node.
- **IV:** ảnh demo giống `main` từng byte ở 1440×900 và 924×540.
- **V:** đủ 4 lệnh kiểm tra; test dùng GitHub giả lập.
- **VI:** Copilot không đổi.
- **VII:** không thêm dependency, có Complexity Tracking.

G5 không vi phạm câu chữ của constitution, nhưng đi ngược tinh thần của R6, nên được xếp MEDIUM.

**Unmapped Tasks**: không có.

## Metrics

| Chỉ số | Giá trị |
|---|---|
| Requirements (FR + SC cần làm) | 19 FR + 6 SC = 25 |
| Tasks | 47 (46 đã xong, T045 còn mở) |
| Coverage (có ít nhất 1 task) | 25/25 = 100% (nhóm SC thời gian mới phủ một phần) |
| Ambiguity | 1 |
| Duplication | 0 |
| Critical | 0 |
| Tổng phát hiện | 8 (0 CRITICAL, 0 HIGH, 3 MEDIUM, 5 LOW) |

## Next Actions

1. Không còn CRITICAL nên cổng Analyze duyệt được.
2. Trước khi merge nên xử lý **G5** (thêm kiểm tra địa chỉ lắng nghe cho dev server) và **G4** (đo với GitHub thật rồi tích T045).
3. **I5**: thêm một dòng vào Assumptions của spec.md.
4. Các mục LOW (I6, I7, I3, A1, T1) là sửa câu chữ trong plan, contract và tasks. Có thể gộp vào cùng PR.
