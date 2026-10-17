# Quickstart: Phải duyệt xong mới sang bước tiếp theo

Mọi kịch bản dùng dữ liệu tự tạo và GitHub giả lập. Không kịch bản nào ghi vào GitHub thật (constitution V).

## Chuẩn bị

- Repo giả lập `acme/alpha`:
  - `001-login`: có spec.md, chưa có issue theo dõi.
  - `002-export`: có spec.md, plan.md, tasks.md; Specify chưa duyệt (spec đi trước phần duyệt).
  - `003-search`: Specify đã duyệt; plan.md có.
  - `004-light`: `**Track**: light`; Clarify là Not run.
- Bản build: `npm run build:pages` (phục vụ `dist` ở `:4173/speckit-ui/`) và `npm run build` (server, chế độ token).

## Kịch bản 1: khoá trong speckit-ui (US1, US3)

1. Mở `acme/alpha`, chọn `001-login`.
   - Kỳ vọng: Clarify và các bước sau "Locked". Thanh lệnh không có lệnh, Copy tắt, có dòng "Approve Specify first". Next up chỉ có "Approve Specify" (FR-001–FR-004).
2. Chọn bước Plan của `001-login`.
   - Kỳ vọng: "Waiting for Specify approval" và nút "Go to Specify". Không có `/speckit-plan` ở bất kỳ đâu trên trang (SC-001).
3. Duyệt Specify.
   - Kỳ vọng: trong 1 giây, Clarify hoặc Plan (bước kế tiếp theo file) mở, và thanh lệnh gợi ý lệnh đó (SC-002).
4. Reopen Specify.
   - Kỳ vọng: các bước sau lại "Locked" ngay (FR-009).
5. Chọn `002-export`.
   - Kỳ vọng: Plan và Tasks hiện nội dung, nhãn "Ran early", có dòng "Ran before Specify was approved". Cổng Plan: nút Approve tắt, lý do "Approve Specify first." (US3).
   - Gọi thẳng `POST /api/gates` duyệt Plan: `409 Approve Specify first.` (FR-005).
6. Chọn `004-light`.
   - Kỳ vọng: Clarify (Not run) không chặn. Sau khi duyệt Specify, Plan mở.
7. Thêm `"approvalGates": "off"` vào `.specify/speckit-ui.json` của repo giả lập, rồi Refresh.
   - Kỳ vọng: hoạt động như trước tính năng (FR-011).
8. Lặp lại bước 1 và 5 trên bản server.
   - Kỳ vọng: cùng kết quả (FR-010).
9. Ở bề rộng 390 px, thanh lệnh và màn hình bước khoá không tràn ngang.

## Kịch bản 2: thông báo cài bước kiểm tra (FR-012)

- Repo giả lập không có `.claude/hooks/speckit-gate.mjs`.
  - Kỳ vọng: thanh lệnh có dòng "Commands aren't blocked in Claude Code for this repo. Install the gate check →".
- Thêm file đó và `.claude/settings.json` có chứa `speckit-gate.mjs`, rồi Refresh.
  - Kỳ vọng: dòng này biến mất.

## Kịch bản 3: chặn trong Claude Code (US2)

Chạy trên một repo tạm (`git init`, remote `acme/alpha`), với `gh` giả lập trả issue theo dõi từ fixture.

1. `node dist/speckit-gate.mjs install`.
   - Kỳ vọng: `.claude/settings.json` có hai hook. Chạy lần hai không thêm trùng.
2. Đưa vào stdin của script đầu vào `UserPromptSubmit` với `prompt: "/speckit-plan 001"`, khi Specify của 001 chưa duyệt.
   - Kỳ vọng: thoát 2; stderr nêu "Approve Specify" và link issue (hoặc "Approve it in speckit-ui.").
3. Như bước 2 nhưng Specify đã duyệt.
   - Kỳ vọng: thoát 0, không in gì.
4. Đầu vào `PreToolUse` với `tool_name: "Skill"` cho `speckit-plan`.
   - Kỳ vọng: cùng kết quả như bước 2 và 3.
5. Lặp với `/speckit-clarify`, `-tasks`, `-analyze`, `-implement` trên các spec fixture.
   - Kỳ vọng: chặn đúng như `blockingGates`. Không file nào trong repo tạm bị đổi (SC-003).
6. `gh` lỗi mạng hoặc trả 401.
   - Kỳ vọng: thoát 2, thông báo nêu `SPECKIT_GATE_BYPASS`.
   - Đặt `SPECKIT_GATE_BYPASS="offline demo"`: thoát 0, stdout ghi lý do (FR-008).
7. `approvalGates: "off"`.
   - Kỳ vọng: thoát 0 với mọi lệnh.
8. Trong một session Claude Code thật (không ghi GitHub thật: dùng repo thử của chính người dùng, hoặc chỉ kiểm tra lệnh bị chặn), ghi lại JSON `PreToolUse` của `Skill` để xác nhận tên trường (R2).

## Kịch bản 4: chế độ demo

So ảnh demo với `main` ở 1440×900 và 924×540, màn hình chính và hộp thoại New spec.
- Kỳ vọng: giống hệt (constitution IV).

## Lệnh kiểm tra

```bash
npm test && npm run typecheck && npm run build && npm run build:pages
```
