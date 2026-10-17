# Research: Làm việc với nhiều repo trong một phiên

Mỗi mục ghi quyết định, lý do và các phương án đã cân nhắc. Không còn mục nào ở trạng thái NEEDS CLARIFICATION.

## R1. Liệt kê repo người dùng có quyền

- **Decision**: Gọi `GET /user/repos` (100 repo mỗi trang, sắp theo `pushed` mới nhất), tối đa 10 trang (1.000 repo). Bản server đăng nhập bằng GitHub App thì lấy theo từng installation: `GET /user/installations`, rồi `GET /user/installations/{id}/repositories`.
- **Rationale**:
  - Với fine-grained token, `/user/repos` chỉ trả về đúng các repo được chọn trong token, nên khớp FR-001.
  - Với 200 repo chỉ cần 2 lần gọi, nên đạt SC-002 (≤ 5 giây).
  - Với token của GitHub App, chỉ endpoint theo installation mới phản ánh đúng phạm vi "app được cài ∩ người dùng có quyền".
- **Alternatives considered**:
  - GraphQL `viewer.repositories`: GraphQL không nằm trong CSP hiện tại. Đã loại.
  - Không giới hạn số trang: tài khoản trong tổ chức lớn có thể tốn hàng chục lần gọi. Thay vào đó, khi chạm trần 1.000 repo thì hiện thông báo và khuyên dùng ô tìm kiếm hoặc nhập tay (FR-007).

## R2. Nhận diện repo là dự án Spec Kit

- **Decision**: Kiểm tra lười. Gọi `GET /repos/{owner}/{repo}/contents/.specify`: 200 là Spec Kit, 404 là không phải. Chỉ kiểm tra theo thứ tự ưu tiên: repo đã ghim → repo đang hiện trên màn hình → 30 repo pushed gần nhất. Chạy tối đa 6 request song song. Kết quả cache trong phiên theo khoá `owner/repo@pushed_at`.
- **Rationale**:
  - Mỗi repo tốn 1 lần gọi, và người dùng vẫn chọn được repo khi chưa kiểm tra xong, đúng edge case "không được chặn người dùng chọn repo".
  - Khoá có `pushed_at` nên cache tự hết hiệu lực khi repo có commit mới.
- **Alternatives considered**:
  - Code search (`path:.specify`): giới hạn khoảng 10 request/phút, bỏ qua fork, và chỉ mục có độ trễ. Đã loại.
  - Kiểm tra mọi repo ngay khi mở: với 500 repo sẽ mất 500 lần gọi. Đã loại.

## R3. Tách dữ liệu theo repo và theo người dùng

- **Decision**:
  - Thay cache một ô trong `server/github.ts` và `server/tracking.ts` bằng `Map` giới hạn 8 mục, bỏ mục cũ nhất khi đầy (LRU).
  - Khoá cache: `identity|owner/repo@ref`, trong đó `identity` là login ở bản server, hoặc dấu vân tay token (8 ký tự đầu SHA-256) ở bản Pages và bản local.
  - Biến `inflight` cũng tách theo khoá.
  - Lịch sử Copilot và "spec, bước đang xem" khoá theo `owner/repo` cộng slug.
- **Rationale**:
  - Cache một ô cộng `inflight` dùng chung có thể trả nhầm dự án khi chuyển repo trong lúc đang tải, vi phạm FR-006 và SC-003.
  - Ở bản server có nhiều người dùng, khoá phải có danh tính người dùng, nếu không người có ít quyền có thể nhận dữ liệu đã cache của người có nhiều quyền (FR-014, SC-006).
- **Alternatives considered**:
  - Bỏ hẳn cache: mỗi lần chuyển qua lại tốn khoảng 15–20 lần gọi, khó đạt SC-001. Đã loại.
  - Cache vô hạn: tốn bộ nhớ server khi có nhiều người dùng. Đã loại.

## R4. Đăng nhập ở bản server

- **Decision**: Dùng **GitHub App** với user access token (web flow). Quyền tối thiểu của App: Contents đọc, Pull requests đọc, Issues đọc và ghi, Metadata đọc. Token hết hạn sau 8 giờ, và server tự làm mới bằng refresh token.
- **Rationale**:
  - Đúng nguyên tắc II, quyền tối thiểu: OAuth App chỉ có scope thô, `repo` tức là toàn quyền ghi mọi repo private.
  - Token tự hết hạn.
  - Tổ chức dùng GitHub Enterprise Cloud với SSO qua Okta duyệt cài App một lần cho cả tổ chức. Bước SSO nằm sẵn trong luồng đăng nhập của GitHub.
- **Alternatives considered**:
  - OAuth App: scope quá rộng. Đã loại.
  - Device flow: hợp với ứng dụng không có server; bản server có thể giữ secret, nên web flow gọn hơn cho người dùng. Device flow để dành cho spec chạy local không cần token.

## R5. Phiên đăng nhập ở bản server

- **Decision**:
  - Kho phiên **trong bộ nhớ** của tiến trình Node. Mã phiên ngẫu nhiên 32 byte (`node:crypto`) đặt trong cookie `sk_session` với các thuộc tính `HttpOnly; Secure; SameSite=Lax; Path=/`.
  - Server giữ token GitHub cùng refresh token; trình duyệt chỉ có mã phiên.
  - Bước đăng nhập dùng tham số `state` ngẫu nhiên (lưu trong cookie tạm, có hạn 10 phút) để chống CSRF.
  - Phiên hết hạn khi token không làm mới được, hoặc sau 7 ngày.
- **Rationale**:
  - FR-015: token không bao giờ xuống trình duyệt.
  - Không thêm dependency hay database (nguyên tắc VII).
  - Khởi động lại server thì mọi người phải đăng nhập lại; với công cụ nội bộ, điều này chấp nhận được.
- **Alternatives considered**:
  - Cookie mã hoá chứa token: token vẫn rời server, dù đã mã hoá. Đã loại.
  - Redis hoặc database: thêm hạ tầng. Đã loại, có ghi trong Complexity Tracking nếu sau này cần chạy nhiều tiến trình.

## R6. Chế độ chạy của server và bảo vệ token chung

- **Decision**: Server tự xác định chế độ khi khởi động:
  - **sign-in**: có `GITHUB_APP_CLIENT_ID` và `GITHUB_APP_CLIENT_SECRET`, nên bắt đăng nhập (FR-014).
  - **token**: không có thông tin App nhưng có `GITHUB_TOKEN`. Đây là chế độ chạy local. Server **chỉ lắng nghe trên `127.0.0.1`** trừ khi đặt `ALLOW_REMOTE_TOKEN_MODE=1`, và in cảnh báo.
  - **demo**: không có cả hai.
  - `GITHUB_REPO` trở thành repo mở mặc định, không còn là giới hạn.
- **Rationale**: Ngăn việc vô tình triển khai lên mạng một server dùng token chung, đúng tinh thần FR-014. Chạy local vẫn đơn giản.
- **Alternatives considered**:
  - Luôn bắt đăng nhập, kể cả local: phải đăng ký App chỉ để chạy trên máy mình. Đã loại.
  - Không ràng buộc địa chỉ lắng nghe: rủi ro lộ dữ liệu. Đã loại.

## R7. Token khi chạy local

- **Decision**: Đọc `GITHUB_TOKEN` từ `.env.local`, ưu tiên hơn `.env`. `npm run dev` đã đọc file này qua `loadEnv` của Vite. `npm start` thêm cờ `--env-file-if-exists=.env.local`. Bổ sung `.env.local` và `.env.*.local` vào `.gitignore`. Thiếu hoặc sai token thì hiện màn hình hướng dẫn: tên file, quyền cần cấp, liên kết tạo token.
- **Rationale**: FR-016. `.env.local` là quy ước quen thuộc cho file cấu hình cục bộ không commit.
- **Alternatives considered**: Đọc token từ `gh auth token`: tiện, nhưng thêm phụ thuộc vào công cụ ngoài. Để dành cho spec chạy local sau.

## R8. Địa chỉ riêng cho từng repo (deep link)

- **Decision**: Dùng query string: `?repo=owner/name&spec=NNN-slug&step=plan`, và `?view=overview` cho màn hình tổng quan. Cập nhật bằng `history.replaceState` khi người dùng chuyển repo, spec hay bước. Ở bản server, nếu chưa đăng nhập thì query được giữ qua bước đăng nhập (lưu trong `state`).
- **Rationale**: FR-008: không chứa token. Chạy được trên GitHub Pages vì mọi đường dẫn đều trả cùng `index.html` ở base path.
- **Alternatives considered**:
  - Đường dẫn dạng `/owner/repo`: GitHub Pages trả 404 cho đường dẫn không có file. Đã loại.
  - Hash `#`: được, nhưng query dễ đọc và dễ chia sẻ hơn.

## R9. Lưu ghim và vị trí đang xem

- **Decision**: Lưu trong `localStorage`, có namespace theo login: `sk.u.<login>.pins` và `sk.u.<login>.last`. Ở bản Pages, nếu người dùng không tick "Remember" thì dùng `sessionStorage`. Mọi lần đọc và ghi đều bọc `try/catch`.
- **Rationale**: FR-011 và FR-005. Đây chỉ là tuỳ chọn hiển thị, không phải dữ liệu dự án (nguyên tắc I). Namespace theo login để hai người dùng chung máy không thấy ghim của nhau. Ở bản Pages không tick "Remember", tên các repo private cũng không còn trên máy sau khi đóng tab.
- **Alternatives considered**: Lưu ghim vào GitHub (gist hay issue): thêm một loại ghi mới ra ngoài, trái nguyên tắc I. Đã loại.

## R10. Màn hình tổng quan các repo đã ghim

- **Decision**: Tải các repo đã ghim song song, tối đa 3 repo cùng lúc, dùng lại `getProject` và `getTracking` cùng cache ở R3. Dùng `Promise.allSettled` để lỗi ở một repo không ảnh hưởng repo khác (FR-019). Mỗi mục dùng lại `nextStep` và `unapprovedGates`. Chỉ tải khi người dùng mở màn hình tổng quan.
- **Rationale**: Không thêm logic mới để suy ra việc cần làm, nên tổng quan khớp với "Next up" của từng repo. Với 5 repo, mỗi repo khoảng 20 lần gọi, có cache thì đạt SC-005 (≤ 10 giây).
- **Alternatives considered**: Một endpoint tổng hợp riêng phía server: bản Pages không có server, nên phải viết logic hai lần. Đã loại theo nguyên tắc III.

## R11. Bảo mật và CSP

- **Decision**:
  - **Bản Pages:** CSP giữ nguyên, vì vẫn chỉ gọi `api.github.com` và `api.anthropic.com`.
  - **Bản server:** thêm điểm đến phía server là `github.com/login/oauth/access_token` (đổi mã lấy token và làm mới token). Chuyển hướng đăng nhập là điều hướng toàn trang, không phải `fetch`.
  - README mục Security cập nhật trong cùng PR (nguyên tắc II).
  - Endpoint ghi (`POST /api/gates`, `POST /auth/logout`) giữ kiểm tra cùng origin.
- **Rationale**: Nguyên tắc II yêu cầu nêu rõ mọi điểm đến mạng mới.
