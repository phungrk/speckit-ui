# Implementation Plan: Làm việc với nhiều repo trong một phiên

**Branch**: `feat/002-multi-repo-workspace` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-multi-repo-workspace/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Cho phép người dùng làm việc với mọi repo mà quyền GitHub của họ cho phép, ở cả ba chế độ thật:
- **Danh sách repo:** liệt kê repo người dùng được đọc và nhận diện repo Spec Kit theo kiểu lười (R1, R2).
- **Chuyển repo:** đổi repo ngay trên thanh điều hướng mà không lẫn dữ liệu. Đổi cache một ô thành cache có khoá `người dùng|repo` (R3).
- **Ghim, tìm repo và màn hình tổng quan** cho các repo đã ghim, dùng lại logic "Next up" sẵn có (R9, R10).
- **Địa chỉ riêng cho từng repo** qua query, không chứa token (R8).
- **Quyền của chính người dùng ở mọi chế độ:**
  - bản Pages: token người dùng nhập;
  - bản server: đăng nhập bằng GitHub App, token chỉ ở phía server trong phiên lưu bộ nhớ (R4, R5);
  - chạy local: token trong `.env.local`, và server ở chế độ token chỉ lắng nghe trên `127.0.0.1` (R6, R7).

**Giao theo hai đợt** để có kết quả sớm:
- **Đợt A (US1–US4):** danh sách, chuyển, ghim, tổng quan; chạy được ở bản Pages và chạy local bằng token.
- **Đợt B (US5):** đăng nhập GitHub App ở bản server.

## Technical Context

**Language/Version**: TypeScript (strict, `erasableSyntaxOnly`), React 18.3; Node ≥ 22.18 chạy TypeScript trực tiếp cho server

**Primary Dependencies**: React, Vite, react-markdown/remark-gfm, @anthropic-ai/sdk (đã có). Không thêm dependency runtime; phiên và mã ngẫu nhiên dùng `node:crypto`

**Storage**: Không có database. Trình duyệt lưu ghim và vị trí đang xem (localStorage hoặc sessionStorage, R9). Server lưu phiên trong bộ nhớ (R5). Phê duyệt vẫn ở issue theo dõi

**Testing**: Vitest với GitHub giả lập và fixture tự tạo; Playwright cho luồng đầu-cuối; so ảnh chế độ demo

**Target Platform**: Trình duyệt hiện đại (bản Pages, bản server); Node 22 (server, chạy local); GitHub Pages; GitHub.com và GitHub Enterprise Cloud

**Project Type**: Ứng dụng web: SPA React cộng server Node nhỏ, kèm bản build tĩnh

**Performance Goals**: Danh sách 200 repo ≤ 5 giây (SC-002); chuyển repo ≤ 10 giây (SC-001); tổng quan 5 repo ≤ 10 giây (SC-005)

**Constraints**: Giới hạn GitHub API 5.000 lần gọi mỗi giờ cho mỗi người; CSP bản Pages chỉ cho `api.github.com` và `api.anthropic.com`; module dùng chung không dùng API riêng của Node; token không bao giờ nằm trong URL, log hay trình duyệt ở bản server

**Scale/Scope**: Tối đa 1.000 repo mỗi người khi liệt kê; tối đa 20 repo ghim; bản server cho một nhóm vài chục người, một tiến trình

**Modes affected**: Bản Pages, bản server, chạy local. Chế độ demo không đổi

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Kết quả: **PASS** cả trước Phase 0 lẫn sau khi thiết kế Phase 1.

- [x] **I. Git là nguồn sự thật**: dữ liệu dự án vẫn chỉ đọc từ repo, và phê duyệt vẫn chỉ ghi vào issue theo dõi. Ghim và vị trí đang xem là tuỳ chọn hiển thị trên thiết bị, không phải trạng thái dự án (R9). Phiên ở server là trạng thái xác thực tạm thời, không phải dữ liệu dự án. Không thêm loại ghi mới ra GitHub.
- [x] **II. Khoá thuộc về người dùng**:
  - Bản server bỏ token chung; token của từng người chỉ ở server, trình duyệt chỉ có cookie `HttpOnly` (R5, FR-015).
  - GitHub App xin quyền tối thiểu (R4).
  - `.env.local` được thêm vào `.gitignore` (R7).
  - Chế độ token chỉ lắng nghe trên `127.0.0.1` (R6).
  - Deep link không chứa khoá (R8).
  - Điểm đến mới phía server (`github.com/login/oauth/*`) được ghi vào mục Security của README trong cùng PR (R11).
  - CSP bản Pages không đổi.
- [x] **III. Ba chế độ, một hành vi**:
  - Cả ba chế độ thật có cùng danh sách repo, nhận diện, ghim, tổng quan và phê duyệt theo repo.
  - Logic liệt kê và nhận diện repo nằm ở `server/github.ts`, là module không dùng API riêng của Node, nên trình duyệt và server chạy cùng code.
  - Khác biệt duy nhất là cách xác định người dùng, và đó chính là yêu cầu của FR-013.
  - Thiếu quyền ở một repo thì báo cục bộ, không trắng trang (FR-012, FR-019).
- [x] **IV. Trung thành với thiết kế**:
  - Màn hình danh sách repo, bộ chọn repo và tổng quan dùng class và token Modernist (`sk-list`, `sk-qitem`, `sk-feat`, `sk-chip`, `btn`).
  - Không thêm màu hay bo góc; bố cục dùng được ở bề rộng điện thoại.
  - Chế độ demo không đổi; PR phải so ảnh demo ở 1440×900 và 924×540.
- [x] **V. Test trước khi merge**:
  - Có test cho liệt kê repo (phân trang, trần 1.000), nhận diện, cache theo khoá (không lẫn người dùng hay repo, không trả nhầm `inflight`), luồng đăng nhập (state sai, hết hạn, làm mới token) và lưu ghim.
  - Gọi GitHub luôn được giả lập; fixture tự tạo.
  - Đủ 4 lệnh kiểm tra.
- [x] **VI. AI chỉ đề xuất**: Copilot không đổi hành vi; lịch sử hỏi đáp khoá theo repo để không lẫn ngữ cảnh (FR-006).
- [x] **VII. Đơn giản trước**: Không thêm dependency, database hay dịch vụ mới. Kho phiên trong bộ nhớ và GitHub App là phần thêm vào; lý do ghi ở Complexity Tracking. Spec đã có Non-Goals.

## Project Structure

### Documentation (this feature)

```text
specs/002-multi-repo-workspace/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0: R1–R11
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1: kịch bản kiểm chứng
├── contracts/
│   ├── server-api.md    # Endpoint của bản server
│   └── client-state.md  # Địa chỉ, lưu trữ thiết bị, luồng màn hình
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, chưa tạo)
```

### Source Code (repository root)

```text
server/
├── github.ts        # SỬA: listRepos(), detectSpeckit(); cache Map theo identity|repo@ref; inflight theo khoá
├── tracking.ts      # SỬA: cache theo khoá; decideGate nhận repo
├── session.ts       # MỚI (đợt B): kho phiên trong bộ nhớ, GitHub App web flow, làm mới token
├── index.ts         # SỬA: route /auth/*, /api/session, /api/repos*; chọn chế độ; ràng buộc 127.0.0.1
└── copilot.ts       # Không đổi

src/
├── backend.ts       # SỬA: Backend có session(), repos(), detect(); mọi lời gọi nhận repo
├── Root.tsx         # SỬA: xác định người dùng → danh sách repo / workspace / tổng quan; đồng bộ query
├── Connect.tsx      # SỬA: repo thành tuỳ chọn (mục Advanced)
├── project/
│   ├── prefs.ts         # MỚI: ghim, lastViewed, lastRepo theo login (try/catch)
│   ├── RepoPicker.tsx   # MỚI: danh sách, tìm kiếm, ghim, nhãn Spec Kit, nhập tay
│   ├── Overview.tsx     # MỚI: tổng quan repo đã ghim (allSettled)
│   ├── SignIn.tsx       # MỚI (đợt B): màn hình đăng nhập bản server
│   └── LiveWorkspace.tsx # SỬA: bộ chọn repo trên nav; Copilot thread theo repo
└── styles/live.css  # SỬA: kiểu cho các màn hình mới (token Modernist)

tests/
├── repos.test.ts    # MỚI: liệt kê, phân trang, nhận diện, sắp xếp, cache theo khoá
├── prefs.test.ts    # MỚI: ghim, lastViewed, storage bị chặn
└── session.test.ts  # MỚI (đợt B): login/callback/state/logout/làm mới, không lộ token

.gitignore           # SỬA: .env.local, .env.*.local
.env.example         # SỬA: GITHUB_APP_CLIENT_ID/SECRET, ALLOW_REMOTE_TOKEN_MODE; GITHUB_REPO là mặc định
README.md            # SỬA: nhiều repo, ba cách xác định người dùng, Security
```

**Structure Decision**: Giữ cấu trúc hiện tại: một SPA trong `src/` và một server Node nhỏ trong `server/`, chung logic GitHub. Thêm 1 module server (`session.ts`) và 4–5 module giao diện. Không tách package mới.

## Complexity Tracking

Không có vi phạm constitution. Bảng dưới ghi những phần thêm vào cần biện minh theo nguyên tắc VII.

| Phần thêm | Vì sao cần | Phương án đơn giản hơn bị loại vì |
|-----------|------------|-------------------------------------|
| Kho phiên trong bộ nhớ ở server | Giữ token của từng người ở phía server (FR-015) | Cookie chứa token mã hoá: token vẫn rời server. Token chung: trái FR-014 |
| Đăng ký GitHub App (cấu hình một lần, không phải dịch vụ) | Quyền tối thiểu, token tự hết hạn, hợp SSO doanh nghiệp | OAuth App: scope `repo` cho toàn quyền ghi mọi repo private |
| Cache có khoá (LRU 8 mục) thay cho cache một ô | Không lẫn dữ liệu giữa repo và giữa người dùng (FR-006, SC-006) | Bỏ cache: chuyển repo chậm, trái SC-001 |

**Giới hạn đã biết**: kho phiên trong bộ nhớ chỉ đúng khi server chạy **một tiến trình**. Nếu sau này cần nhiều tiến trình, phải có spec riêng cho kho phiên dùng chung.
