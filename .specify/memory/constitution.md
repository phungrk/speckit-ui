<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0 (MINOR: thêm một ngoại lệ màu vào nguyên tắc IV)
- Modified principles: IV. Trung thành với thiết kế. Ngoài bảng nền của chế độ đọc, bảng màu
  highlight (4 màu tô, 4 màu đặc, màu thanh công cụ luôn tối) được phép: khai báo một lần thành token
  `--hl-*` trong `src/styles/reader.css`, chỉ dùng qua `var()`, có test kiểm.
- Added sections: none
- Removed sections: none
- Lý do: người dùng chọn đưa CSS highlight của bản thiết kế vào trước cho specs/010-spec-annotations
  (PR fix/010-reader-design-parity, 2026-10-20). Bản trước: 1.2.0 (specs/010, bảng nền đọc).
- Templates: không cần sửa ✅
- Follow-up: CLAUDE.md ghi version 1.3.0 ✅
-->

# speckit-ui Constitution

speckit-ui (Speckit Workspace) là giao diện web để quản lý một dự án làm theo Spec Kit: đọc
constitution và `specs/NNN-*/` từ GitHub, hiển thị từng bước, ghi kết quả duyệt cổng vào GitHub
issue, và có Copilot dùng Claude. Ứng dụng chạy ở ba chế độ: demo (dữ liệu mẫu), có server
(`npm run dev` / `npm start`) và tĩnh trên GitHub Pages (không server, khoá do người xem nhập).
Tài liệu này là luật phát triển cho repo `speckit-ui`.

## Core Principles

### I. Git là nguồn sự thật

- Mọi trạng thái của dự án được quản lý (bước nào xong, task nào đã tích, spec nào đang làm)
  PHẢI được suy ra từ file trong repo đó. speckit-ui KHÔNG có database hay kho dữ liệu riêng.
- Nơi ghi duy nhất là issue theo dõi cổng: có nhãn `speckit` và dấu
  `<!-- speckit-ui:spec=... -->`. Ứng dụng KHÔNG tạo commit, branch hay file trong repo người dùng.
- Thêm bất kỳ loại ghi mới nào ra GitHub (hoặc dịch vụ khác) PHẢI đi đủ quy trình Spec Kit và có
  bước xác nhận rõ ràng trong UI trước khi thực hiện.
- Định dạng file của Spec Kit được đọc nguyên trạng. Parser thích nghi với Spec Kit, không đòi dự
  án đổi định dạng; quy ước thêm (như `analysis.md`, `**Track**: light`,
  `.specify/speckit-ui.json`) PHẢI là tuỳ chọn và có giá trị mặc định hợp lý.

**Lý do**: Người dùng đã quản lý dự án bằng git và PR. Một nguồn sự thật thứ hai sẽ lệch khỏi repo,
và ghi vào repo sẽ xung đột với quy trình PR của chính họ.

### II. Khoá thuộc về người dùng (NON-NEGOTIABLE)

- Token GitHub và API key Anthropic KHÔNG BAO GIỜ nằm trong repo, bản build, log, URL hay
  thông báo lỗi.
- Bản tĩnh: khoá chỉ lưu trong `sessionStorage` (mặc định) hoặc `localStorage` (khi người dùng chọn
  Remember), và chỉ được gửi tới `api.github.com` và `api.anthropic.com`. CSP trong
  `vite.config.ts` PHẢI thực thi điều này; thêm điểm đến mới PHẢI cập nhật CSP và mục Security
  trong README trong cùng PR.
- Bản có server: khoá chỉ nằm phía server, trong biến môi trường hoặc trong phiên đăng nhập lưu ở
  bộ nhớ của tiến trình server, và KHÔNG BAO GIỜ gửi xuống trình duyệt. Trình duyệt chỉ giữ mã phiên
  ngẫu nhiên trong cookie `HttpOnly`. Phiên PHẢI có hạn, và đăng xuất PHẢI xoá phiên ở server.
  Endpoint ghi PHẢI chặn request khác origin.
- Nội dung đọc từ repo (markdown, tên spec, comment) KHÔNG được render thành HTML thô hay script.
- Quyền token được tài liệu hoá theo nguyên tắc tối thiểu (README → GitHub mode); tính năng cần
  thêm quyền PHẢI nêu rõ quyền đó trong spec.

**Lý do**: Token có quyền đọc repo private và ghi issue với danh nghĩa người dùng. Một lần lộ token
nghiêm trọng hơn mọi lỗi giao diện.

### III. Ba chế độ, một hành vi

- Mỗi thay đổi PHẢI nêu trong spec/plan (hoặc mô tả PR) là nó ảnh hưởng chế độ nào: demo, server,
  tĩnh.
- Logic dùng chung (parser, loader GitHub, tracking, kiểm tra cổng, gọi Claude) nằm ở các module
  không dùng API riêng của Node (`server/parse.ts`, `server/github.ts`, `server/tracking.ts`,
  `server/claude.ts`, `src/project/gates.ts`) để server và trình duyệt chạy cùng một code.
- Hai chế độ thật (server và tĩnh) PHẢI có cùng ngữ nghĩa: cùng checklist cổng, cùng định dạng
  issue, cùng cách suy ra trạng thái. Kiểm tra cổng PHẢI chạy lại ngay trước khi ghi.
- Khi thiếu dịch vụ ngoài (không có key Anthropic, không đọc được một repo submodule), ứng dụng
  PHẢI suy giảm mềm: hiện cảnh báo và chạy tiếp, không trắng trang.

**Lý do**: Ba chế độ dễ lệch nhau theo thời gian. Một quy tắc chỉ đúng ở một chế độ là lỗi
khó thấy nhất vì người viết thường chỉ thử một chế độ.

### IV. Trung thành với thiết kế

- UI dùng design system Modernist: lấy màu, khoảng cách, viền từ token và class trong
  `src/styles/modernist.css`. Không thêm màu mới, không bo góc, không dùng component ngoài hệ thống.
- Hai ngoại lệ về màu, mỗi bảng khai báo đúng một nơi và chỉ dùng qua token:
  - bảng nền của chế độ đọc (White, Sepia, Green, Dark; specs/010), trong `src/reader/settings.ts`,
    áp bằng cách ghi đè token ở `:root`. Thêm nền hoặc màu vào bảng PHẢI qua spec và PHẢI đạt tương
    phản chữ thường từ 4.5:1 trên nền và bề mặt của nền đó, có test kiểm;
  - bảng màu highlight (màu tô, màu đặc, thanh công cụ luôn tối; specs/010-spec-annotations), là
    token `--hl-*` trong một khối `:root` của `src/styles/reader.css`, giữ nguyên ở mọi nền.
  Component vẫn chỉ đọc token, không viết màu cứng; test chặn màu viết cứng ngoài các bảng này.
- Chế độ demo PHẢI giữ giống bản thiết kế `Speckit Workspace.html` từng pixel, trừ những phần mà
  spec đang làm ghi rõ là thuộc một spec khác chưa xong; PR PHẢI liệt kê các phần chênh đó.
  PR đụng UI demo hoặc CSS dùng chung PHẢI so ảnh chụp ở 1440×900 và 924×540 (màn hình chính và
  hộp thoại New spec).
- Mọi phần tử tương tác dùng được bằng bàn phím, có `:focus-visible` theo hệ thống, và có nhãn
  cho trình đọc màn hình khi không có chữ hiển thị.
- Bố cục PHẢI dùng được ở bề rộng điện thoại.

**Lý do**: Bản thiết kế là hợp đồng với người duyệt thiết kế. Lệch dần từng chút sẽ không ai
nhận ra cho tới khi phải làm lại cả màn hình.

### V. Test trước khi merge

- Mỗi PR PHẢI qua `npm test`, `npm run typecheck`, `npm run build` và `npm run build:pages`.
  Workflow Pages chạy test trước khi deploy; merge vào `main` là deploy.
- Parser, suy ra trạng thái, kiểm tra cổng và luồng ghi issue PHẢI có unit test.
- Gọi GitHub và Anthropic trong test PHẢI được giả lập. Test KHÔNG BAO GIỜ ghi vào GitHub thật.
- Fixture PHẢI là dữ liệu tự tạo. Repo này công khai: KHÔNG chép nội dung từ repo private của
  người dùng vào test, ảnh chụp hay tài liệu.

**Lý do**: `main` được deploy tự động lên trang công khai. Test là hàng rào duy nhất giữa một
commit và người dùng.

### VI. AI chỉ đề xuất

- Copilot chỉ trả lời từ ngữ cảnh được cung cấp, ghi rõ câu trả lời do AI tạo, và KHÔNG được tự
  duyệt cổng, tự ghi issue hay tự sửa file. Mọi quyết định ghi do người bấm.
- Lời gọi Claude đi qua `server/claude.ts` (model mặc định `claude-opus-5-5`, bật refusal
  fallback). Ngữ cảnh gửi đi có giới hạn kích thước cho mỗi file.
- Copilot PHẢI chạy được ở chế độ offline (không có key) với các câu hỏi gợi ý.
- Phần "Before you approve" và checklist cổng được tính từ dữ liệu, không gọi model.

**Lý do**: Duyệt cổng là trách nhiệm của người. AI giúp nhìn nhanh hơn, không thay quyết định.

### VII. Đơn giản trước

- Chọn phương án đơn giản nhất đạt mục tiêu của spec. Thêm dependency runtime, dịch vụ, nơi lưu
  trữ hay hosting mới PHẢI được biện minh trong mục Complexity Tracking của plan.
- Ưu tiên lưu trữ có sẵn của GitHub (issue, file trong repo) hơn database riêng.
- Spec PHẢI có mục Non-goals rõ ràng.

**Lý do**: Dự án do một người vận hành và chạy miễn phí trên GitHub Pages. Mỗi thứ thêm vào là một
thứ phải bảo trì và bảo mật.

## Ràng buộc kỹ thuật

- **Stack**: React 18 + Vite + TypeScript (`strict`). Server chạy TypeScript trực tiếp bằng Node
  ≥ 22.18, nên code dưới `server/` chỉ dùng cú pháp xoá được (`erasableSyntaxOnly`: không enum, không
  parameter property) và import có đuôi `.ts`.
- **Module dùng chung** không import API riêng của Node ngoài kiểu (`import type`); chỉ handler
  HTTP mới đọc `process.env`.
- **Triển khai**: GitHub Pages qua `.github/workflows/pages.yml` khi push lên `main`. Bản tĩnh build
  với `VITE_STATIC=1` và base path là tên repo.
- **Spec Kit được hỗ trợ**: định dạng của Spec Kit 0.15.x (repo này và dự án được quản lý đều dùng
  0.15.1). Nâng phiên bản Spec Kit PHẢI kiểm tra lại parser với template mới.
- **Quality gates**: `npm test`, `npm run typecheck`, `npm run build`, `npm run build:pages`.

## Quy trình phát triển

- **Khi nào dùng Spec Kit**:
  - Đủ quy trình (specify → clarify → plan → tasks → analyze → implement) khi thay đổi đụng
    nguyên tắc II (khoá, quyền token, điểm đến mạng mới), thêm một loại ghi ra ngoài, ảnh hưởng từ
    2 chế độ trở lên, thêm định dạng file mới cần parse, hoặc ước tính > 2 ngày.
  - Chỉ `/speckit-specify` + `/speckit-plan` cho tính năng cỡ vừa trong một chế độ.
  - Sửa lỗi nhỏ, chỉnh UI hay chữ: PR thẳng, không cần spec.
- **Vị trí spec**: `specs/NNN-ten-feature/`. Lưu báo cáo `/speckit-analyze` thành
  `specs/NNN-…/analysis.md` để chính speckit-ui hiển thị được.
- **Git & PR**: không push thẳng lên `main`. Tự tạo branch `feat/…`, `fix/…`, `chore/…` (Spec Kit
  không tự tạo branch) và đặt slug spec trong tên branch hoặc `specs/NNN-…` trong mô tả PR để
  speckit-ui liên kết PR với spec.
- **Tự dùng sản phẩm**: speckit-ui quản lý chính repo này. Cổng được duyệt trong ứng dụng, kết quả
  nằm trong issue có nhãn `speckit`.

## Governance

- Constitution này ưu tiên hơn các thói quen phát triển khác trong repo. `CLAUDE.md` tóm tắt lại
  cho agent và PHẢI khớp với tài liệu này.
- Sửa đổi qua PR, dùng `/speckit-constitution` để cập nhật nội dung, bump version và ghi Sync
  Impact Report.
- Version theo SemVer: MAJOR khi bỏ hoặc định nghĩa lại một nguyên tắc; MINOR khi thêm nguyên
  tắc/mục hoặc mở rộng đáng kể; PATCH khi sửa câu chữ.
- Gate "Constitution Check" trong `/speckit-plan` PHẢI pass. Vi phạm có chủ đích phải ghi vào
  Complexity Tracking kèm lý do; `/speckit-analyze` coi vi phạm không được biện minh là CRITICAL.

**Version**: 1.3.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-10-20
