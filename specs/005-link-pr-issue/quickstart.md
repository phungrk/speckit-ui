# Quickstart: Liên kết PR với issue

Mọi kịch bản dùng dữ liệu tự tạo, GitHub giả lập và `gh` giả lập. Không ghi vào GitHub thật (constitution V).

## Kịch bản 1: speckit-ui hiện liên kết (US1, FR-002, FR-003)

Repo giả lập `acme/alpha`:
- `001-login`: issue theo dõi #1, Specify đã duyệt. PR #10 (nhánh `feat/001-login`) có `Closes #1`; PR #11 cùng spec không có dòng liên kết.
- `002-export`: chưa có issue; PR #12 (nhánh `feat/002-export`).

Các bước:
1. Mở 001, tab Gate & PRs.
   - Kỳ vọng: "Add to the PR description: `Closes #1`" có nút Copy.
   - Kỳ vọng: #10 hiện "Closes #1". #11 hiện "Not linked to #1" kèm Copy.
   - Bấm Copy thì clipboard có `Closes #1` (SC-004).
2. Mở 002.
   - Kỳ vọng: "No tracking issue yet…". Không có nhãn liên kết.
3. Cổng Implement của 001.
   - Kỳ vọng: cảnh báo "Every linked PR links to #1" chưa đạt.
4. Lặp lại trên bản server, và ở bề rộng 390 px.

## Kịch bản 2: repo có submodule (FR-004, FR-007)

Thêm submodule `acme/back`. PR `acme/back#3` có `Part of acme/alpha#1`; PR `acme/back#4` có `Closes acme/alpha#1`.
- Kỳ vọng: #3 hiện "Linked to #1". #4 hiện "Closes #1 early".
- Kỳ vọng: có dòng "In submodule PRs: `Part of acme/alpha#1`".

## Kịch bản 3: merge đóng issue (US2, FR-006)

Đây là hành vi của GitHub, nên không mô phỏng toàn bộ. Kiểm tra phần speckit-ui:
- Issue #1 đóng, cổng Implement chưa tick.
  - Kỳ vọng: khung Gate hiện "issue #1 (closed)", Implement vẫn "To approve".
  - Duyệt Implement thì issue vẫn đóng.
  - Reopen thì issue mở lại.

## Kịch bản 4: chặn tạo PR trong Claude Code (FR-008, SC-001)

Repo tạm có `specs/001-login`, remote `acme/alpha`, `gh` giả lập trả issue #1. Script là `dist/speckit-gate.mjs`, đã chạy `install`.

1. Chạy `install` trên một `settings.json` của bản 004.
   - Kỳ vọng: điểm móc tạo PR được thêm; hai điểm móc cũ giữ nguyên.
2. `PreToolUse` Bash: `gh pr create --head feat/001-login --title x --body "Adds login"`.
   - Kỳ vọng: thoát 2; stderr nêu `Closes #1`.
3. Như bước 2 với `--body "Adds login\n\nCloses #1"`: thoát 0.
4. `gh api repos/acme/alpha/pulls -f head=feat/001-login -f title=x -F body=@body.md`:
   - Kỳ vọng: khi `body.md` có `Closes #1`, thoát 0; khi thiếu, thoát 2.
5. MCP `create_pull_request` với `owner=acme`, `repo=alpha`, `head=feat/001-login`, body thiếu.
   - Kỳ vọng: thoát 2.
6. PR ở `acme/back` (submodule), body có `Part of acme/alpha#1`.
   - Kỳ vọng: thoát 0. Với body chỉ có `Closes #1` thì thoát 2 và nêu `Part of acme/alpha#1`.
7. Spec 002 (chưa có issue).
   - Kỳ vọng: thoát 0, JSON `allow` kèm lời nhắc.
8. `gh pr list`, `git push`, `npm test`.
   - Kỳ vọng: thoát 0 ngay, không gọi `gh api`.
9. `prLinks: "off"`.
   - Kỳ vọng: thoát 0.
10. Trong một session Claude Code thật trên repo tạm, yêu cầu tạo PR thiếu liên kết.
    - Kỳ vọng: lệnh tạo PR bị chặn trước khi chạy, và Claude thêm `Closes #1` rồi tạo lại. `gh` giả lập ghi lại lệnh cuối, nên không có PR thật nào được tạo.

## Kịch bản 4b: session không nạp hook (R8)

`CLAUDE.md` có quy tắc liên kết. Trong một session nhiều repo (hook không chạy), yêu cầu Claude tạo PR cho spec 006 với `gh` giả lập.
- Kỳ vọng: lệnh tạo PR có `Closes #17` trong mô tả.
- Đây là kiểm tra hành vi theo hướng dẫn, không phải hook. Ghi lại kết quả; không chặn merge nếu lệch.

## Kịch bản 5: demo

So ảnh demo với `main` ở 1440×900 và 924×540, màn hình chính và hộp thoại New spec.
- Kỳ vọng: giống hệt.

## Lệnh kiểm tra

```bash
npm test && npm run typecheck && npm run build && npm run build:pages
```
