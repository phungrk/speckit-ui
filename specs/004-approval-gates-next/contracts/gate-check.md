# Contract: bước kiểm tra trong Claude Code (`speckit-gate.mjs`)

Một file ES module, Node ≥ 18, không có dependency. Nguồn ở `hook/speckit-gate.ts` trong speckit-ui, được phát hành ở `<pages>/speckit-gate.mjs` (R8).

## Cài vào repo dự án

`node .claude/hooks/speckit-gate.mjs install` thêm vào `.claude/settings.json`:
- giữ mọi khoá đã có;
- không thêm lần hai nếu đã có hook chứa `speckit-gate.mjs`.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "timeout": 30,
        "command": "command -v node >/dev/null || { echo 'speckit gate: node not found' >&2; exit 2; }; node \"$CLAUDE_PROJECT_DIR/.claude/hooks/speckit-gate.mjs\"" }] }
    ],
    "PreToolUse": [
      { "matcher": "Skill", "hooks": [{ "type": "command", "timeout": 30,
        "command": "command -v node >/dev/null || { echo 'speckit gate: node not found' >&2; exit 2; }; node \"$CLAUDE_PROJECT_DIR/.claude/hooks/speckit-gate.mjs\"" }] }
    ]
  }
}
```

## Đầu vào (stdin, JSON của Claude Code)

| Sự kiện | Trường dùng |
|---|---|
| `UserPromptSubmit` | `prompt`: dòng người dùng gõ, ví dụ `/speckit-plan 004` |
| `PreToolUse` (`tool_name: "Skill"`) | Tên skill trong `tool_input.skill` (hoặc `name`, `command`); đối số trong `tool_input.args` nếu có (R2: kiểm chứng khi cài đặt) |
| cả hai | `cwd`; thư mục gốc lấy từ `CLAUDE_PROJECT_DIR`, nếu không có thì từ `cwd` |

Lệnh được nhận dạng khi tên khớp `^/?<prefix>(clarify|plan|tasks|analyze|implement)\b`, với `<prefix>` là `speckit-` hoặc `speckit.`, hoặc tiền tố trong `.specify/integration.json`. Mọi đầu vào khác: thoát 0, không in gì.

## Kết quả

| Trường hợp | Mã thoát | Đầu ra |
|---|---|---|
| Không phải lệnh có cổng, không xác định được spec, hoặc spec chưa có thư mục | 0 | không có |
| `approvalGates: "off"` | 0 | không có |
| Không bị chặn | 0 | không có |
| Bị chặn | 2 | stderr: `Approve Specify for 004-approval-gates-next before running /speckit-plan. Tracking issue: <url>` (khi chưa có issue thì thay link bằng `Approve it in speckit-ui.`) |
| Không kiểm tra được | 2 | stderr: `Could not check approvals for <slug>: <lý do>. To run anyway, set SPECKIT_GATE_BYPASS="<why>" and try again.` |
| Có `SPECKIT_GATE_BYPASS` | 0 | `UserPromptSubmit`: stdout `Approval gate check bypassed for <slug>: <why>` (thêm vào session). `PreToolUse`: stdout JSON `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Approval gate check bypassed for <slug>: <why>"}}` |
| Lỗi bất ngờ trong script | 2 | stderr: `speckit gate: <message>` |

Quy tắc chặn là `blockingGates` (data-model.md). Nó chạy trên `phaseStatus` của file trong thư mục làm việc và issue theo dõi đọc từ GitHub.

## Lệnh phụ

- `node speckit-gate.mjs install`: xem trên.
- `node speckit-gate.mjs check <NNN|slug> <step>`: in kết quả kiểm tra cho người dùng tự thử. Dùng trong quickstart.
- `node speckit-gate.mjs --version`: in commit build.
