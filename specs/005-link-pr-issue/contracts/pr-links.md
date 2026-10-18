# Contract: liên kết PR ↔ issue

## API (bản server; bản Pages gọi cùng hàm trong trình duyệt)

`GET /api/tracking`: mỗi `prs[slug][i]` có thêm trường `link`:

```jsonc
{ "repo": "o/root", "number": 21, "state": "open", "headRef": "feat/004-x", "bumped": null,
  "link": "closes" }   // "closes" | "mentions" | "none" | null (spec chưa có issue)
```

`GET /api/project`: `gateCheck` có thêm giá trị `"outdated"`.

Không có endpoint mới và không có lần ghi mới.

## Giao diện: khung Gate › Pull requests · merge order

| Trạng thái | Hiển thị |
|---|---|
| Spec có issue #N | "Add to the PR description:" `Closes #N` (last PR) [Copy] và `Part of #N` (earlier PRs) [Copy]. Repo có submodule thêm: "In submodule PRs:" `Part of o/root#N` [Copy] |
| Spec chưa có issue | "No tracking issue yet. Approve Specify to create it, then link PRs to it." |
| PR đúng | `tag` "Closes #N" hoặc "Linked to #N" |
| PR thiếu hoặc sai | `sk-warn` "Not linked to #N" hoặc "Closes #N early" (PR submodule), kèm [Copy] dòng đúng |

Cổng Implement thêm hai cảnh báo: `Every PR links to #N` và `A PR in this repo closes #N`.

Khi `gateCheck` là `"outdated"`, thanh lệnh hiện: "The gate check here doesn't check PR links yet. Update it →" (liên kết README).

## Bước kiểm tra trong Claude Code (`speckit-gate.mjs`)

`install` thêm, nếu thiếu, điểm móc thứ ba:

```json
{ "matcher": "Bash|mcp__.*__create_pull_request",
  "hooks": [{ "type": "command", "timeout": 30, "command": "<như spec 004>" }] }
```

### Nhận dạng

| Đầu vào `PreToolUse` | Là tạo PR khi |
|---|---|
| `Bash`, `tool_input.command` | có `gh pr create`, hoặc `gh api` tới `repos/<o>/<r>/pulls` với `-f`/`-F`/`--field`/`--raw-field` hoặc `-X POST`/`--method POST` |
| `mcp__…__create_pull_request` | luôn |

Mọi lệnh Bash khác: thoát 0, không in gì, và không đọc GitHub.

### Kết quả

| Trường hợp | Mã thoát | Đầu ra |
|---|---|---|
| Không tìm thấy spec cho PR, repo không phải gốc hay submodule, hoặc `prLinks: "off"` | 0 | không có |
| Spec chưa có issue | 0 | JSON `permissionDecision: "allow"`, `permissionDecisionReason: "No tracking issue for <slug> yet, so this PR isn't linked. Approve Specify in speckit-ui to create it."` |
| Có dòng liên kết đúng loại (PR ở repo gốc: `Closes #N` hoặc `Part of #N`; PR submodule: `Part of o/root#N`) | 0 | không có |
| Thiếu hoặc sai | 2 | stderr: `Add "Closes #12" (or "Part of #12" if more PRs follow) to the PR description for 004-x (tracking issue <url>), then create the PR again.` Với PR submodule thì dòng cần thêm là `Part of o/root#12`. |
| Không đọc được mô tả PR từ lệnh | 2 | stderr: `Could not read the PR description from this command. Put it in a file and pass --body-file (gh pr create) or -F body=@file (gh api).` |
| Không đọc được GitHub | 2 | như spec 004, kèm `SPECKIT_GATE_BYPASS` |

PR thuộc nhiều spec thì cần đủ dòng liên kết cho từng spec.
