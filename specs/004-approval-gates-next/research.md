# Research: Phải duyệt xong mới sang bước tiếp theo

## R1. Một quy tắc khoá, dùng chung ở mọi nơi

- **Decision**:
  - Viết `blockingGates(status, issue, mode)` trong `src/project/gates.ts`. Bước `i` bị chặn bởi cổng **đầu tiên chưa duyệt** trong các bước `1 … i-1` có trạng thái `done`. Bước `skipped` không chặn; Constitution không có cổng.
  - `phaseStatus` và `allTasks` chuyển sang module mới `src/project/status.ts`, chỉ import `./types.ts`. `phases.ts` export lại hai hàm này.
  - Nhờ vậy `server/tracking.ts` (server và Pages) và bước kiểm tra trong Claude Code (R2) dùng đúng một code. Hiện `phases.ts` import `../data`, nên Node không nạp được.
- **Rationale**:
  - FR-007 đòi quy tắc trong Claude Code giống hệt trong speckit-ui. Cách chắc chắn nhất là cùng một hàm.
  - Lấy cổng *đầu tiên* chưa duyệt, không chỉ cổng của bước liền trước. Khi duyệt theo thứ tự, hai cách cho cùng kết quả (FR-001). Khi ai đó tick lệch thứ tự trên GitHub, cách này vẫn không để lọt bước nào (US3-AS3).
- **Alternatives considered**:
  - Viết lại quy tắc trong script riêng cho Claude Code: hai bản sẽ lệch nhau. Đã loại.
  - Thêm trạng thái mới vào `LiveStatus`: nhiều chỗ đang dùng `LiveStatus` theo nghĩa "file có hay chưa", ví dụ Copilot và `nextStep`. Giữ nó nguyên, khoá là một lớp tính riêng.

## R2. Chặn lệnh trong Claude Code bằng hook của dự án

- **Decision**:
  - Bước kiểm tra là một hook Claude Code khai báo trong `.claude/settings.json` của repo dự án, gồm hai điểm móc:
    - `UserPromptSubmit`: người dùng gõ `/speckit-plan …`. Hook nhận đúng dòng đã gõ, và chặn thì lệnh không chạy.
    - `PreToolUse` với matcher `Skill`: Claude tự gọi skill `speckit-plan`. Chặn bằng `permissionDecision: "deny"`.
  - Lệnh hook:
    ```sh
    command -v node >/dev/null || { echo "speckit gate: node not found" >&2; exit 2; }; node "$CLAUDE_PROJECT_DIR/.claude/hooks/speckit-gate.mjs"
    ```
  - Chặn bằng `exit 2` kèm lời nhắn trên stderr. Mọi lỗi bất ngờ trong script cũng thoát bằng mã 2.
  - Đặt `timeout: 30`.
- **Rationale**:
  - Theo tài liệu hooks, `UserPromptSubmit` nhận dòng lệnh như người dùng gõ, không phải nội dung skill đã mở ra. Chặn ở đây thì lệnh không chạy, nên chưa có file nào bị sửa (SC-003).
  - Gõ `/skill` không đi qua `PreToolUse`. Ngược lại, khi Claude tự gọi skill thì không có `UserPromptSubmit`. Vì vậy cần cả hai điểm.
  - Mã thoát khác 2 *không* chặn. Nếu script hỏng mà thoát mã 1, lệnh vẫn chạy. Do đó mọi lỗi đều phải quy về mã 2 (FR-008).
  - Hook trong `.claude/settings.json` được commit cùng repo, nên áp dụng cho mọi người làm chung repo. Session Claude Code trên web đọc file này với session một repo.
- **Alternatives considered**:
  - Dùng `hooks.before_plan` trong `.specify/extensions.yml` của Spec Kit: model tự đọc và tự làm theo, không có gì thực thi. Đã loại.
  - Dùng `UserPromptExpansion`: hợp với lệnh gõ tay, nhưng mới hơn. `UserPromptSubmit` đã đủ và có tài liệu rõ. Có thể chuyển sau.
  - Dùng `disable-model-invocation` trong SKILL.md: phải sửa file của Spec Kit, và không chặn lệnh gõ tay. Đã loại.
- **Cần kiểm chứng khi cài đặt**:
  - Tài liệu không nêu tên trường của `tool_input` cho `Skill`. Script đọc lần lượt `skill`, `name`, `command`.
  - Phải có một test ghi lại input thật của Claude Code (quickstart, kịch bản 3).

## R3. Lệnh nào bị kiểm tra

- **Decision**:
  - Kiểm tra `speckit-clarify`, `-plan`, `-tasks`, `-analyze`, `-implement`, ứng với bước 2–6.
  - Không kiểm tra:
    - `constitution`, `specify`: đầu quy trình, không có cổng trước. `specify` cũng có thể tạo spec mới.
    - `checklist`, `taskstoissues`, `converge`: không phải một bước có cổng.
  - Lệnh có tiền tố khác (đọc `commandPrefix` từ `.specify/integration.json`, ví dụ `/speckit.plan`) được nhận dạng như nhau.
- **Rationale**: Khớp với các bước có cổng trong speckit-ui. Spec yêu cầu SC-003 từ `/speckit-clarify` tới `/speckit-implement`.
- **Alternatives considered**: Coi `converge` là Implement. Việc này có thể thêm sau, vì `converge` chỉ thêm task vào tasks.md.

## R4. Spec nào đang được chạy

- **Decision**: Lấy theo thứ tự sau, dừng ở cái đầu tiên tìm thấy:
  1. đối số đầu của lệnh nếu là `NNN` hoặc `NNN-slug` khớp một thư mục trong `specs/`;
  2. `SPECIFY_FEATURE`;
  3. `feature_directory` trong `.specify/feature.json`;
  4. tên nhánh git, nếu có chứa `NNN-slug`.

  Nếu không xác định được, hook cho lệnh chạy. Nếu xác định được mà không có thư mục spec, hook cũng cho chạy, vì chưa có gì để chặn.
- **Rationale**: Đây là cách chính các script của Spec Kit chọn spec (`common.sh`). Đối số `NNN` khớp cách người dùng gõ, ví dụ `/speckit-plan 004`.
- **Alternatives considered**: Bắt buộc có đối số: đổi thói quen dùng Spec Kit. Đã loại.

## R5. Đọc phê duyệt từ Claude Code

- **Decision**:
  - Repo lấy từ `git remote get-url origin`.
  - Issue theo dõi đọc như speckit-ui đang làm: `GET /repos/{o}/{r}/issues?state=all&labels=speckit&per_page=100`, tìm dấu `speckit-ui:spec=<slug>`, rồi phân tích bằng `parseIssueBody`.
  - Gọi qua `gh api` nếu có `gh`. Nếu không, dùng `fetch` với `GH_TOKEN` hoặc `GITHUB_TOKEN`.
  - Trạng thái file đọc từ thư mục làm việc bằng parser của speckit-ui (`server/parse.ts`).
- **Rationale**:
  - Trong session Claude Code trên web, `gh` có sẵn và được proxy cấp quyền. `GH_TOKEN` ở đó chỉ là chỗ giữ, nên `fetch` trực tiếp sẽ bị 401 (đã thấy trong session này).
  - Trên máy, người dùng thường đã đăng nhập `gh`. Cả hai cách đều dùng quyền GitHub người dùng đang có, đúng SC-005 và constitution II.
  - Không cần đọc file từ GitHub: thư mục làm việc chính là thứ lệnh sắp sửa.
- **Alternatives considered**: Hỏi server speckit-ui: cần server đang chạy và một đường truyền khoá mới. Đã loại.
- **Không kiểm tra được** (FR-008):
  - Các trường hợp: không có `gh` và không có token, mạng lỗi, 401/403/404, hoặc không đọc được remote.
  - Khi đó hook chặn và nói rõ lý do. Cách bỏ qua có chủ đích: chạy lại với biến môi trường `SPECKIT_GATE_BYPASS="<lý do>"`.
  - Khi bỏ qua, hook cho chạy và ghi lý do vào ngữ cảnh của session (stdout của `UserPromptSubmit`), nên lý do nằm lại trong transcript.

## R6. Bật/tắt theo repo

- **Decision**:
  - Thêm `"approvalGates": "block" | "off"` vào `.specify/speckit-ui.json`. Mặc định là `"block"`.
  - `parseUiConfig` đọc trường này. Hook đọc cùng file đó trong thư mục làm việc, bằng cùng hàm `parseUiConfig`.
- **Rationale**: FR-011. Constitution I yêu cầu quy ước thêm phải tuỳ chọn và có mặc định. Dùng chuỗi thay vì boolean để sau này thêm được chế độ, ví dụ `"warn"`, mà không đổi kiểu.

## R7. speckit-ui biết repo đã cài bước kiểm tra chưa

- **Decision**:
  - Coi là `installed` khi cây git có `.claude/hooks/speckit-gate.mjs`, và `.claude/settings.json` có chứa `speckit-gate.mjs`.
  - `.claude/settings.json` được thêm vào danh sách file nhỏ đọc lúc nạp dự án, nên không tốn thêm lần gọi nào khi file không có.
  - Khi khoá đang bật mà chưa cài:
    - thanh lệnh hiện một dòng "Commands aren't blocked in Claude Code for this repo" kèm liên kết tới hướng dẫn (FR-012, US2-AS4);
    - phần Gate hiện cùng nội dung.
- **Rationale**: Đọc từ cây git không tốn thêm lần gọi. Không cần kiểm tra phiên bản script ở bước này (xem Complexity Tracking).

## R8. Phát hành bước kiểm tra

- **Decision**:
  - Script `speckit-gate.mjs` được build từ `hook/speckit-gate.ts`. Nó gói `status.ts`, `gates.ts` và `server/parse.ts` thành một file ES module, chạy với Node ≥ 18 và không có dependency.
  - Build bằng Vite (Rolldown), cấu hình riêng `vite.hook.config.ts`. Lệnh `npm run build` chạy thêm bước này và ghi ra `dist/speckit-gate.mjs`, nên bản Pages phục vụ nó ở `/speckit-ui/speckit-gate.mjs` và bản server ở `/speckit-gate.mjs`.
  - Cài trong ≤ 5 phút (SC-005):
    ```sh
    mkdir -p .claude/hooks
    curl -fsSL https://phungrk.github.io/speckit-ui/speckit-gate.mjs -o .claude/hooks/speckit-gate.mjs
    node .claude/hooks/speckit-gate.mjs install   # thêm hai hook vào .claude/settings.json, giữ nội dung cũ
    git add .claude && git commit -m "chore: speckit approval gate check"
    ```
    `install` do người dùng tự chạy trên máy họ. speckit-ui không ghi gì vào repo (constitution I).
  - Script ghi commit build ở dòng đầu (`// speckit-gate <commit>`).
- **Rationale**: Một file, không cần `npm install` trong repo dự án. Cùng code với ứng dụng (R1).
- **Alternatives considered**:
  - Gói npm: cần publish và quản lý phiên bản.
  - Script bash: phải viết lại parser, và JSON trong bash khó.

## R9. Giao diện khi khoá

- **Decision**:
  - **Thanh bước:** bước bị chặn hiện `locked` kèm khoá, nhãn "Locked". Bước đã chạy mà bị chặn hiện `review`, nhãn "Ran early". Trong thanh tiến độ ở danh sách Specs, ô bị chặn dùng class `locked`.
  - **Màn hình bước bị chặn** (`NotStarted`): "Waiting for Specify approval", nút "Go to Specify" chuyển sang bước đó. Không có lệnh để sao chép.
  - **Bước "Ran early":** nội dung vẫn hiển thị, thêm một dòng `sk-warn`: "Ran before Specify was approved" (FR-006).
  - **Thanh lệnh** khi bước đang chọn bị chặn:
    - ô lệnh trống và chỉ đọc, nút Copy bị tắt;
    - một dòng thay thế: "Approve Specify first", bấm vào thì mở cổng đó (FR-003).
  - **Next up và Overview:** việc duyệt cổng đang chờ đã đứng trước. Khi không đọc được phê duyệt, không gợi ý lệnh nào và hiện ghi chú sẵn có (SC-001).
  - **Cổng:** nút Approve bị tắt, kèm lý do "Approve Specify first."
  - **Copilot:** ngữ cảnh gửi đi ghi bước nào đang bị chặn. Câu trả lời offline không gợi ý lệnh của bước bị chặn.
- **Rationale**: Chỉ dùng class có sẵn: `locked`, `review`, `sk-warn`, `btn`. Không thêm màu (constitution IV). Demo không dùng các component live, nên không đổi.

## R10. Mở khoá ngay sau khi duyệt (SC-002)

- **Decision**: Không cần cơ chế mới. `decideGate` đã trả về `tracking` mới (spec 001), và giao diện tính lại `blockingGates` từ đó trong cùng một lần render. Reopen cũng vậy (FR-009).
- **Rationale**: Spec 001 đã đo được cập nhật dưới 1 giây.
