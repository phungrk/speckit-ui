# Research: Liên kết PR với issue và đóng issue khi PR được merge

## R1. Dòng liên kết

- **Decision**: Dòng liên kết là một dòng trong mô tả PR. Có hai dạng:
  - **PR ở repo gốc** (repo có issue theo dõi): `Closes #N` cho PR cuối của spec, `Part of #N` cho các PR trước (Q4: chỉ PR cuối đóng). Với `Closes #N`, GitHub liên kết PR với issue (mục *Development* ở cả hai trang) và tự đóng issue khi PR được merge vào nhánh mặc định.
  - **PR ở repo submodule**: `Part of <owner>/<root>#N`. Đây là một tham chiếu chéo repo. Trang issue hiện "mentioned this pull request", và PR có link tới issue. Dòng này không có từ khoá đóng, nên merge không đóng issue (Q2: A).

  Khi nhận dạng, chấp nhận mọi từ khoá đóng của GitHub (`close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`), không phân biệt hoa thường. Chấp nhận cả `#N` lẫn `<owner>/<root>#N`.
- **Rationale**:
  - Việc đóng issue do GitHub làm, nên speckit-ui không cần chạy lúc merge và không ghi gì thêm (spec Assumptions).
  - GitHub chỉ đóng issue khi merge vào nhánh mặc định, đúng SC-003.
  - PR đóng mà không merge không đóng issue (FR-005).
- **Alternatives considered**:
  - Liên kết bằng API "linked issues" của GitHub: cần GraphQL và quyền ghi vào PR. Đó là loại ghi mới (constitution I), và CSP bản Pages không cho GraphQL. Đã loại.
  - Để speckit-ui tự đóng issue khi thấy PR merge: cần app chạy, và là một lần ghi mới. Đã loại (Q2).

## R2. speckit-ui nhận biết PR đã liên kết chưa

- **Decision**:
  - `SpecPR` thêm `link: 'closes' | 'mentions' | 'none' | null`. Nó được tính trong `loadTracking` từ mô tả PR (đã tải sẵn) và số issue theo dõi của spec:
    - `closes`: có từ khoá đóng trỏ tới issue;
    - `mentions`: chỉ có tham chiếu `#N` hoặc `<owner>/<root>#N`;
    - `none`: không có gì trỏ tới issue;
    - `null`: spec chưa có issue theo dõi.
  - "Đúng" nghĩa là: PR ở repo gốc cần `closes` (PR cuối) hoặc `mentions` (PR trước); PR ở repo submodule cần `mentions`. Nếu PR submodule dùng `closes` thì vẫn tính là liên kết, nhưng kèm cảnh báo rằng nó sẽ đóng issue sớm.
  - PR ở repo gốc chỉ có `mentions` là đúng (PR trước, không đóng issue) và hiện "Linked to #N". speckit-ui không biết PR nào là cuối, nên chỉ cảnh báo ở cổng Implement khi không PR nào ở repo gốc có `closes`.
  - Hàm nhận dạng `linkKind(body, issueNumber, rootRepo)` (kết quả `closes`/`mentions`/`none`) nằm trong `src/project/gates.ts`, còn việc PR ở repo nào đúng hay sai do `linkStatus(link, prRepo, rootRepo, issueNumber)` quyết, để app và hook (R4) dùng chung.
- **Rationale**: Không tốn thêm lần gọi API nào, vì mô tả PR đã có trong danh sách PR (`GET /pulls`).

## R3. Hiển thị và sao chép trong speckit-ui (FR-003, SC-004)

- **Decision**:
  - Mục **Pull requests · merge order** của khung Gate:
    - **Dòng liên kết của spec:** khi spec có issue, hiện "Add to the PR description:", kèm hai dòng cho repo gốc, mỗi dòng có nút Copy: `Closes #N` ("last PR") và `Part of #N` ("earlier PRs").
    - **Repo có submodule:** thêm dòng `Part of <owner>/<root>#N` cho PR ở repo submodule, kèm nút Copy riêng.
    - **Spec chưa có issue:** hiện "No tracking issue yet. Approve Specify to create it, then link PRs to it." (FR-002).
    - **Mỗi PR** có một nhãn:
      - "Closes #N" cho PR ở repo gốc có từ khoá đóng;
      - "Linked to #N" cho PR ở repo gốc có `Part of #N` và cho PR submodule;
      - "Not linked to #N" (`sk-warn`) kèm nút Copy dòng cần thêm;
      - "Closes #N early" cho PR submodule dùng từ khoá đóng.
  - Cổng Implement thêm một kiểm tra **cảnh báo** (không chặn): hai thứ: "Every PR links to #N" và "A PR in this repo closes #N" (đạt khi có ít nhất một PR ở repo gốc có `closes`; bỏ qua khi không có PR nào ở repo gốc).
- **Rationale**: Mục PR là nơi người dùng đang xem PR của spec. Dùng class có sẵn (`tag`, `sk-warn`, `btn`). Copy trong 1 thao tác.

## R4. Chặn tạo PR thiếu liên kết trong Claude Code (FR-008, Q3: A)

- **Decision**: Mở rộng `speckit-gate.mjs` (spec 004) với một điểm móc mới: `PreToolUse`, matcher `Bash|mcp__.*__create_pull_request`. Hook nhận ra lệnh tạo PR ở ba dạng:
  1. **Bash `gh pr create …`:** body lấy từ `--body`/`-b`, `--body-file`/`-F` (đọc file), hoặc `--fill`/không có body (coi là body rỗng). Repo lấy từ `--repo`/`-R`; head lấy từ `--head`/`-H`, nếu không có thì là nhánh hiện tại.
  2. **Bash `gh api … repos/<o>/<r>/pulls`**, có `-f`/`-F` hoặc `--method POST`: body lấy từ `-f body=…`/`-F body=@file`, head từ `head=…`, repo từ đường dẫn.
  3. **Công cụ MCP tạo PR** (`mcp__*__create_pull_request`): đọc `owner`, `repo`, `head`, `body` trong `tool_input`.

  Cách quyết định:
  - **Tìm spec:** tên nhánh head chứa slug của một thư mục trong `specs/`, hoặc body có `specs/<slug>` (cùng quy tắc `prMatches`).
  - **Tìm issue:** đọc issue theo dõi như spec 004.
  - **Loại repo:** PR ở repo gốc khi repo của PR trùng `origin` của dự án. PR ở repo submodule khi repo của PR là một repo trong `.gitmodules`. Repo khác thì cho qua.
  - Khi không có `--repo`, hook dùng `cd <dir> &&` ở đầu lệnh nếu có, rồi `cwd` trong input của hook, rồi `git remote get-url origin` ở thư mục đó.
  - **Đủ dòng liên kết** (`linkKind` đúng loại, R2): cho chạy.
  - **Thiếu:** chặn (exit 2) với thông báo `Add "Closes #12" to the PR description for 004-x (tracking issue https://…/issues/12), then create the PR again.`
  - **Spec chưa có issue:** cho chạy, kèm lời nhắc cho người dùng qua `permissionDecision: "allow"` và `permissionDecisionReason` (FR-002).
  - **Không xác định được spec, hoặc lệnh không phải tạo PR:** cho qua.
  - **Không đọc được GitHub:** chặn, kèm cách bỏ qua `SPECKIT_GATE_BYPASS`, như spec 004 FR-008.
  - `approvalGates: "off"` không tắt kiểm tra này. Có công tắc riêng `"prLinks": "off"`, xem R6.
- **Rationale**:
  - PR thường do Claude Code tạo bằng `gh` hoặc công cụ MCP GitHub.
  - Trong session web, `gh pr` (GraphQL) bị proxy chặn, nên Claude dùng `gh api …/pulls`. Phải nhận cả hai dạng.
  - Chặn trước khi gọi thì PR không bao giờ được tạo thiếu liên kết (SC-001).
- **Alternatives considered**:
  - Sửa PR sau khi tạo (`PostToolUse`): đó là một lần ghi lên GitHub từ hook. Đã loại.
  - Chỉ nhắc (Q3: B): không đạt SC-001. Đã loại.
- **Giới hạn**: lệnh shell quá phức tạp (biến, heredoc lồng nhau) có thể không đọc được body. Khi đó hook *chặn* và nói không đọc được mô tả PR, gợi ý dùng `--body-file`. Chặn nhầm thì sửa lại lệnh là xong, còn bỏ sót thì vi phạm SC-001.

## R5. Cập nhật các repo đã cài hook (speckit-ui #15, tohong #44)

- **Decision**:
  - `install` thêm điểm móc mới nếu thiếu. Nó vẫn không thêm trùng, và giữ mọi thứ khác.
  - Người dùng cập nhật bằng cách tải lại `speckit-gate.mjs` rồi chạy `install`.
  - speckit-ui hiện `gateCheck: 'outdated'` khi `settings.json` có `speckit-gate.mjs` nhưng thiếu matcher tạo PR. Thanh lệnh nhắc cập nhật.
- **Rationale**: Hai repo đã cài bản 004 chỉ có `UserPromptSubmit` và `PreToolUse/Skill`. Không cập nhật thì PR không bị kiểm tra.

## R6. Bật/tắt

- **Decision**: Thêm `"prLinks": "block" | "off"` vào `.specify/speckit-ui.json`, mặc định `"block"`. Trường này chỉ tắt việc chặn trong Claude Code. Phần hiển thị trong speckit-ui luôn bật, vì chỉ đọc.
- **Rationale**: Tách khỏi `approvalGates`, để repo không dùng khoá cổng vẫn dùng được liên kết, và ngược lại. Constitution I yêu cầu quy ước thêm phải tuỳ chọn và có mặc định.

## R8. Session không nạp hook (học từ PR #18)

- **Decision**: Thêm vào `CLAUDE.md` của speckit-ui một quy tắc ngắn trong mục Spec Kit. Dự án khác có thể chép lại quy tắc này, và README hướng dẫn việc đó. Nội dung:
  > Khi tạo PR cho `specs/NNN-…`, thêm `Closes #<issue theo dõi>` vào mô tả PR. Issue theo dõi là issue có nhãn `speckit` và tiêu đề `Spec NNN: …`. Với PR ở repo submodule, dùng `Part of <owner>/<root>#<issue>`.
- **Rationale**:
  - PR #18 (spec 006) được tạo không có `Closes #17`. Lúc đó 005 chưa được cài đặt, và session nhiều repo không nạp hook (spec 004 U3).
  - Claude đọc `CLAUDE.md` ở mọi loại session, kể cả session nhiều repo, nơi hook của repo không chạy.
  - Đây chỉ là hướng dẫn, không thay hook. Hook vẫn là cách chặn thật (R4).
- **Alternatives considered**: Chèn bước kiểm tra vào các skill `/speckit-*` (cách C đã bàn): không áp dụng được, vì tạo PR không đi qua skill nào.

## R7. Quan hệ với cổng Implement (FR-006)

- **Decision**: Không đổi `decideGate`.
  - Merge đóng issue, nhưng gates trong issue vẫn như cũ. Cổng Implement vẫn hiện "To approve".
  - Duyệt Implement trên issue đã đóng thì giữ issue đóng; code hiện chỉ gửi `state: closed` khi approve.
  - Reopen hoặc Request changes trên issue đã đóng thì mở lại issue (code hiện có).
- **Rationale**: Hành vi hiện có đã khớp FR-006. Chỉ cần test.
