# Implementation Plan: Liên kết PR với issue và đóng issue khi PR được merge

**Branch**: `feat/005-link-pr-issue` | **Date**: 2026-10-17, rà lại 2026-10-18 sau PR #18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-link-pr-issue/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

PR của một spec liên kết với issue theo dõi bằng một dòng trong mô tả PR (R1):
- **PR cuối ở repo gốc:** `Closes #N`. GitHub liên kết hai bên và tự đóng issue khi PR được merge vào nhánh mặc định. Các PR trước ở repo gốc dùng `Part of #N`, để issue không đóng sớm.
- **PR ở repo submodule:** `Part of <owner>/<root>#N`. Dòng này chỉ liên kết, không đóng issue.

Ba phần cần làm:
- **speckit-ui** (server và Pages) đọc mô tả PR đã có sẵn trong danh sách PR (R2):
  - hiện từng PR có liên kết đúng chưa;
  - cho sao chép dòng cần thêm (R3);
  - thêm một cảnh báo ở cổng Implement.
- **Bước kiểm tra trong Claude Code** (`speckit-gate.mjs` của spec 004) thêm điểm móc `PreToolUse` cho `Bash` và công cụ MCP tạo PR (R4):
  - nhận ra `gh pr create`, `gh api …/pulls` và `create_pull_request`;
  - chặn khi mô tả thiếu dòng liên kết, và nêu đúng dòng cần thêm.
- **Cập nhật hook đã cài:** `install` thêm điểm móc mới cho các repo đã cài bản 004. speckit-ui báo `outdated` khi thiếu (R5).

Không có lần ghi mới. Việc đóng issue do GitHub làm. Cổng Implement không đổi (R7).

PR #18 (spec 006) được tạo không có liên kết tới issue #17, vì 005 chưa được cài đặt và session nhiều repo không nạp hook. Do đó plan thêm một quy tắc trong `CLAUDE.md` (R8). Quy tắc này có tác dụng cả trong session không nạp hook, nhưng chỉ là hướng dẫn, không chặn được.

## Technical Context

**Language/Version**: TypeScript (strict, `erasableSyntaxOnly`), React 18.3; Node ≥ 22.18 cho server; Node ≥ 18 cho script hook.

**Primary Dependencies**: Không thêm.

**Storage**: Không có. Thêm hai trường cấu hình tuỳ chọn (`prLinks`) và một giá trị `gateCheck`.

**Testing**: Vitest:
- `linkKind`/`linkStatus`;
- `loadTracking` gắn `link`;
- cảnh báo cổng Implement;
- `gateCheck: outdated`;
- hook: nhận dạng lệnh tạo PR (nhiều dạng `gh`, MCP), đọc body từ đối số hoặc file, repo gốc hay submodule, chưa có issue, tắt, không đọc được body.

Playwright cho kịch bản 1–2 trên Pages và server. Claude Code thật cho kịch bản 4 bước 10. So ảnh demo.

**Target Platform**: Trình duyệt (Pages), Node 22 (server), Claude Code (hook).

**Project Type**: Ứng dụng web + script hook phát hành kèm.

**Performance Goals**:
- Không thêm lần gọi API nào trong app.
- Hook: lệnh Bash không phải tạo PR thì thoát ngay, không gọi GitHub, thoát ngay, không đọc cấu hình và không gọi GitHub, vì phần lớn lệnh Bash đi qua đây (test T010 kiểm tra điều này). Lệnh tạo PR tốn 1 lần đọc issue.

**Constraints**:
- `gh pr` bị proxy chặn trong session web, nên phải nhận cả `gh api …/pulls`.
- Hook phải chặn khi lỗi: chỉ mã 2 mới chặn.
- CSP bản Pages không đổi.

**Scale/Scope**: Khoảng 7 file nguồn sửa, không file mới ngoài test.

**Modes affected**: Bản server và bản Pages (nhãn liên kết, dòng sao chép, cảnh báo, `outdated`). Chế độ demo không đổi. Ngoài app: hook trong repo dự án.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Kết quả: **PASS** trước Phase 0 và sau thiết kế Phase 1.

- [x] **I. Git là nguồn sự thật**:
  - Liên kết nằm trong mô tả PR do người tạo PR viết; app chỉ đọc.
  - Không có loại ghi mới: app không sửa PR và không tự đóng issue.
  - `prLinks` là tuỳ chọn, mặc định `"block"`.
- [x] **II. Khoá thuộc về người dùng**:
  - App: không thêm điểm đến; CSP không đổi. Đọc mô tả PR dùng quyền Pull requests đọc đã có.
  - Hook: dùng `gh` hoặc token sẵn có như spec 004; không in token. Đọc file body chỉ trong máy người dùng.
- [x] **III. Ba chế độ, một hành vi**:
  - `linkKind` và `linkLine` nằm trong `src/project/gates.ts`, dùng chung cho server, Pages và hook.
  - Thiếu issue hoặc không đọc được PR thì app hiện cảnh báo, không trắng trang.
- [x] **IV. Trung thành với thiết kế**:
  - Dùng `tag`, `sk-warn`, `btn`, `sk-cmdhint` có sẵn; không thêm màu.
  - Demo không đổi; PR phải so ảnh demo.
  - Nút Copy dùng được bằng bàn phím và có nhãn.
  - Thử ở 390 px.
- [x] **V. Test trước khi merge**: Có unit test cho nhận dạng liên kết, gắn `link`, cảnh báo cổng và mọi nhánh của hook. GitHub và `gh` giả lập; fixture tự tạo. Đủ 4 lệnh kiểm tra.
- [x] **VI. AI chỉ đề xuất**: Copilot không đổi. Hook chặn Claude Code tạo PR thiếu liên kết, nhưng không tự sửa hay tạo gì.
- [x] **VII. Đơn giản trước**: Dùng cơ chế "closing keyword" có sẵn của GitHub, thay vì API liên kết hay tự đóng issue. Không thêm dependency hay dịch vụ.

## Project Structure

### Documentation (this feature)

```text
specs/005-link-pr-issue/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0: R1–R7
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── pr-links.md      # API, giao diện, hook
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, chưa tạo)
```

### Source Code (repository root)

```text
src/project/
├── gates.ts             # SỬA: linkKind(), linkLine(), linkStatus(); hai cảnh báo "Every PR links to #N" và "A PR in this repo closes #N" ở cổng Implement; hằng matcher tạo PR
├── types.ts             # SỬA: SpecPR.link; Project.gateCheck thêm 'outdated'
├── GatePanel.tsx        # SỬA: dòng liên kết + Copy; nhãn từng PR; lời nhắc chưa có issue
└── LiveWorkspace.tsx    # SỬA: dòng "Update the gate check" khi outdated

server/
├── parse.ts             # SỬA: parseUiConfig thêm prLinks
├── github.ts            # SỬA: gateCheck nhận 'outdated'
└── tracking.ts          # SỬA: loadTracking gắn link cho từng PR

hook/
└── speckit-gate.ts      # SỬA: điểm móc tạo PR (Bash gh pr create / gh api pulls, MCP); install thêm matcher

README.md                # SỬA: mục "Linking PRs to the tracking issue"; cập nhật hướng dẫn cài lại hook; quy tắc CLAUDE.md để chép sang dự án khác
CLAUDE.md                # SỬA: quy tắc "Closes #<issue theo dõi>" khi tạo PR cho spec (R8)

tests/
├── links.test.ts        # MỚI: linkKind/linkStatus, loadTracking, cảnh báo Implement, gateCheck outdated
└── hook.test.ts         # SỬA: tạo PR qua gh/gh api/MCP, body file, submodule, chưa có issue, tắt, install nâng cấp
```

**Structure Decision**: Giữ cấu trúc hiện tại. Logic liên kết nằm trong `src/project/gates.ts` để app và hook dùng chung.

## Complexity Tracking

| Thêm | Vì sao cần | Phương án đơn giản hơn bị loại vì |
|---|---|---|
| Đọc lệnh shell để lấy mô tả PR trong hook | FR-008, Q3: A: chặn PR thiếu liên kết do Claude Code tạo | Chỉ nhắc thì không đạt SC-001. Sửa PR sau khi tạo thì cần ghi lên GitHub từ hook. Lệnh không đọc được thì bị chặn kèm cách sửa (R4), để không bỏ sót. |
