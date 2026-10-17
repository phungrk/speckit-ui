# Implementation Plan: Phải duyệt xong mới sang bước tiếp theo

**Branch**: `feat/004-approval-gates-next` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-approval-gates-next/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Một bước bị khoá khi cổng đầu tiên chưa duyệt nằm trước nó. Quy tắc này là một hàm duy nhất, `blockingGates`, dùng chung ở ba nơi (R1):

- **Giao diện speckit-ui:**
  - bước bị chặn hiện "Locked", và thanh lệnh không gợi ý lệnh nào;
  - bước đã chạy trước khi duyệt hiện "Ran early";
  - nút Approve vượt cổng bị tắt (R9).
- **Ghi phê duyệt:** `decideGate` từ chối duyệt vượt cổng (409), kiểm tra lại ngay trước khi ghi (FR-005).
- **Claude Code:** một hook của dự án (`.claude/hooks/speckit-gate.mjs`, khai báo trong `.claude/settings.json`).
  - Nó chặn `/speckit-clarify` … `/speckit-implement`, cả khi người dùng gõ (`UserPromptSubmit`) lẫn khi Claude tự gọi skill (`PreToolUse` → `Skill`) (R2).
  - Nó đọc issue theo dõi bằng `gh api` hoặc token sẵn có của người dùng (R5).
  - Không kiểm tra được thì chặn, và có cách bỏ qua bằng `SPECKIT_GATE_BYPASS` (FR-008).

Khoá bật mặc định. Mỗi repo tắt được bằng `"approvalGates": "off"` trong `.specify/speckit-ui.json` (R6). speckit-ui phát hành script hook trên Pages và hướng dẫn cài; người dùng tự cài vào repo của họ (R8). speckit-ui nhắc khi repo chưa cài (R7).

## Technical Context

**Language/Version**: TypeScript (strict, `erasableSyntaxOnly`), React 18.3; Node ≥ 22.18 cho server; Node ≥ 18 cho script hook.

**Primary Dependencies**: Không thêm dependency runtime. Script hook được build bằng Vite (Rolldown) có sẵn, cấu hình riêng `vite.hook.config.ts`.

**Storage**: Không có. Phê duyệt vẫn ở issue theo dõi; cấu hình thêm một trường trong `.specify/speckit-ui.json`.

**Testing**:
- Vitest cho `blockingGates`, `decideGate` từ chối duyệt vượt cổng, `parseUiConfig`, phát hiện hook đã cài, và script hook (stdin giả lập, `gh` giả lập).
- Playwright cho quickstart, bản Pages và bản server.
- So ảnh demo.

**Target Platform**: Trình duyệt (Pages); Node 22 (server); Claude Code trên máy và trên web (hook).

**Project Type**: Ứng dụng web (SPA React + server Node nhỏ + bản tĩnh), cộng một script CLI nhỏ được phát hành kèm.

**Performance Goals**:
- SC-002: mở khoá ≤ 1 giây sau khi duyệt. Không cần gọi thêm, vì `decideGate` đã trả về tracking mới.
- Hook: ≤ 2 lần gọi GitHub; timeout 30 giây.

**Constraints**:
- Module dùng chung không dùng API riêng của Node.
- Hook phải *chặn khi lỗi*, vì mã thoát khác 2 không chặn được (R2).
- CSP bản Pages không đổi.

**Scale/Scope**: Khoảng 10 file nguồn sửa, 3 file mới (`src/project/status.ts`, `hook/speckit-gate.ts`, `vite.hook.config.ts`).

**Modes affected**: Bản server và bản Pages (khoá, từ chối duyệt vượt cổng, thông báo cài hook). Chế độ demo không đổi. Ngoài app: hook trong repo dự án.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Kết quả: **PASS** trước Phase 0 và sau thiết kế Phase 1.

- [x] **I. Git là nguồn sự thật**:
  - Trạng thái khoá suy ra từ file và issue theo dõi; không thêm nơi lưu.
  - Không thêm loại ghi: vẫn chỉ ghi issue theo dõi, và việc ghi bị *hạn chế thêm*.
  - speckit-ui không ghi hook vào repo; người dùng tự cài (FR-012).
  - Trường cấu hình mới `approvalGates` là tuỳ chọn, mặc định `"block"`.
- [x] **II. Khoá thuộc về người dùng**:
  - App không đổi cách giữ khoá. CSP không đổi; không có điểm đến mới.
  - Hook chạy trên máy hoặc session của người dùng. Nó chỉ dùng `gh` hoặc `GH_TOKEN`/`GITHUB_TOKEN` sẵn có và chỉ gọi `api.github.com`.
  - Hook không in token và không ghi token vào file.
  - Quyền cần có: đọc Issues (đã có trong hướng dẫn token).
- [x] **III. Ba chế độ, một hành vi**:
  - `blockingGates` nằm trong `src/project/gates.ts`. `phaseStatus` chuyển sang `src/project/status.ts` (không import Node, không import `../data`).
  - Server, Pages và hook chạy cùng code.
  - Kiểm tra chạy lại trước khi ghi.
  - Không đọc được phê duyệt thì app suy giảm mềm: không gợi ý lệnh và hiện ghi chú. Hook thì chặn có lý do, theo FR-008.
- [x] **IV. Trung thành với thiết kế**:
  - Chỉ dùng class có sẵn (`locked`, `review`, `sk-warn`, `sk-cmdhint`, `btn`); không thêm màu.
  - Demo không đổi; PR phải so ảnh demo.
  - Nút "Go to K" và dòng "Approve K first" dùng được bằng bàn phím.
  - Thử ở 390 px.
- [x] **V. Test trước khi merge**: Có unit test cho quy tắc khoá, từ chối ghi, cấu hình, phát hiện hook và từng nhánh của script hook. GitHub và `gh` luôn được giả lập; fixture tự tạo. Đủ 4 lệnh kiểm tra.
- [x] **VI. AI chỉ đề xuất**: Copilot nhận thêm thông tin "Locked" và không gợi ý lệnh bị chặn. Copilot không duyệt hay mở khoá gì.
- [x] **VII. Đơn giản trước**: Không thêm dependency hay dịch vụ. Script hook là một file phát hành kèm Pages; biện minh ở Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-approval-gates-next/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0: R1–R10
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── ui-api.md        # /api/project, /api/gates, giao diện
│   └── gate-check.md    # Script hook: cài, đầu vào, kết quả
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, chưa tạo)
```

### Source Code (repository root)

```text
src/project/
├── status.ts            # MỚI: phaseStatus, allTasks (chuyển từ phases.ts; chỉ import ./types.ts)
├── phases.ts            # SỬA: export lại từ status.ts
├── gates.ts             # SỬA: blockingGates(); lý do "Approve K first."
├── types.ts             # SỬA: Project.approvalGates, Project.gateCheck
├── overview.ts          # SỬA: không gợi ý lệnh khi bị chặn hoặc không đọc được phê duyệt
├── LiveWorkspace.tsx    # SỬA: ô thanh bước, thanh tiến độ, thanh lệnh khoá, dòng cài hook
├── views.tsx            # SỬA: NotStarted "Waiting for K approval" + "Go to K"; dòng "Ran before K was approved"
├── GatePanel.tsx        # SỬA: tắt Approve khi bị chặn, kèm lý do
└── copilot.ts           # SỬA: ngữ cảnh và câu trả lời offline biết bước bị khoá

server/
├── parse.ts             # SỬA: parseUiConfig thêm approvalGates
├── github.ts            # SỬA: đọc .claude/settings.json; tính gateCheck
└── tracking.ts          # SỬA: decide() từ chối duyệt vượt cổng (409)

hook/
└── speckit-gate.ts      # MỚI: script hook (stdin → quyết định; install; check; --version)

vite.hook.config.ts      # MỚI: build hook → dist/speckit-gate.mjs (Node, một file)
package.json             # SỬA: build chạy thêm build hook
README.md                # SỬA: mục "Approval gates" và hướng dẫn cài hook

tests/
├── gating.test.ts       # MỚI: blockingGates, decideGate 409, overview, cấu hình, gateCheck
└── hook.test.ts         # MỚI: script hook với stdin và gh giả lập; install idempotent
```

**Structure Decision**: Giữ cấu trúc hiện tại. Thêm thư mục `hook/` cho nguồn script hook. Nó được build thành một file trong `dist/` cùng bản app, nên Pages phục vụ luôn mà không cần quy trình phát hành riêng.

## Complexity Tracking

| Thêm | Vì sao cần | Phương án đơn giản hơn bị loại vì |
|---|---|---|
| Script hook build riêng (`vite.hook.config.ts`, `hook/`) | FR-007: chặn lệnh trong Claude Code với quy tắc giống hệt app | Chỉ khoá trong app thì người dùng vẫn chạy lệnh được, đúng điều được báo. Viết script riêng bằng bash thì quy tắc sẽ lệch khỏi app. |
| Đọc thêm `.claude/settings.json` khi nạp dự án | FR-012: biết repo đã cài hook chưa | Không đọc thì không nhắc được. File nhỏ, chỉ đọc khi có trong cây. |

Không kiểm tra phiên bản hook đã cài so với app. Khi quy tắc đổi, README ghi rõ cần tải lại script. Có thể thêm sau nếu cần.
