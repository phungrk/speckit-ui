# Implementation Plan: Thẻ nhận xét gọn kiểu Google Docs (menu ba chấm, một màu)

**Branch**: `feat/014-comment-card-menu` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-comment-card-menu/spec.md`

## Summary

Gọn thẻ nhận xét của 012/013/011 theo Google Docs, không đổi dữ liệu hay cách lưu. Nhận xét mới luôn lưu màu Change (`o`) và hết chỗ chọn màu; mỗi mục của mình (nhận xét và từng trả lời) có nút ba chấm mở menu **Edit / Delete**; bỏ Copy và Ask; ô trả lời chỉ hiện Cancel / Reply khi được chọn hoặc có chữ. Tab Highlights bỏ ô lọc màu, nhãn màu, Copy, Ask, đổi màu (mục chỉ-màu còn Delete); "Before you approve" xếp theo thời gian. Phần chính là một thành phần menu mới dùng cho cả hai nơi, và gỡ bỏ phần cũ (hàng ô màu, nút, tuỳ chọn, thứ tự màu). Không dependency, không điểm đến mạng, không loại ghi mới, không đổi `version` của file.

## Technical Context

**Language/Version**: TypeScript (`strict`), React 18.3.

**Primary Dependencies**: Có sẵn, không thêm. Dùng lại `Icon`, token Modernist và `--hl-*`.

**Storage**: Không đổi: `specs/NNN-slug/highlights.json` `version` 1 hoặc 2 như 011. Màu của nhận xét mới là giá trị `o` đã hợp lệ; màu cũ (`y`, `b`, `p`, `n`) vẫn đọc và ghi lại nguyên.

**Testing**: Vitest (render tĩnh cho menu, thẻ, trả lời, tab; hàm thuần `briefNotes`), Playwright ngoài repo (demo + GitHub giả; 1440×900, 390).

**Target Platform**: Trình duyệt hiện đại, như các spec trước.

**Project Type**: Ứng dụng web một repo.

**Performance Goals**: Không đổi (thẻ đóng không dựng menu; menu chỉ dựng khi mở).

**Constraints**: Token Modernist, không bo góc, không màu mới; menu dùng được bằng bàn phím; nút ba chấm chạm ≥ 44 px ở màn hình cảm ứng; không thêm màu cho ô trả lời (ảnh tham chiếu bo tròn: không theo, R6).

**Scale/Scope**: nhỏ, khoảng 1–2 ngày: file mới `MoreMenu.tsx`; sửa `CommentRail.tsx`, `Thread.tsx`, `Annotator.tsx`, `HighlightsPanel.tsx`, `highlightActions.ts`, `brief.ts`, `colors.ts`, `reader.css`, ba shell, README; cập nhật nhiều test.

**Modes affected**: demo, server, static, local (thành phần dùng chung).

## Constitution Check

| Nguyên tắc | Kết quả |
|---|---|
| I. Git là nguồn sự thật | Đạt. Không loại ghi hay file mới; mọi lần lưu giữ nguyên (một commit `[skip ci]`, xác nhận một lần mỗi repo). Mở tài liệu không ghi gì (câu hỏi 1 A). |
| II. Khoá thuộc về người dùng | Đạt. Không đụng khoá, token, CSP, mạng. Bỏ Ask còn làm giảm một đường gửi chữ sang Copilot. |
| III. Ba chế độ, một hành vi | Đạt. Thành phần dùng chung; cả bốn chế độ nhận cùng thay đổi. |
| IV. Trung thành với thiết kế | Đạt có điều kiện. Chỉ đổi trong thẻ nhận xét và tab (đã ngoài thiết kế từ 012); demo mặc định không đổi điểm ảnh. **Không bo góc** theo constitution dù ảnh tham chiếu bo tròn ô trả lời (R6). Màu chỉ qua token `--hl-o`. |
| V. Test trước khi merge | Đạt khi qua bốn lệnh; nhiều test phải cập nhật vì bỏ chức năng. |
| VI. AI chỉ đề xuất | Đạt. Bỏ Ask (gửi đoạn chữ sang Copilot); "Before you approve" vẫn tính từ dữ liệu, không gọi model. |
| VII. Đơn giản trước | Đạt. Xoá nhiều hơn thêm; một thành phần menu mới, không dependency. Có Non-goals trong spec. |

Kiểm lại sau Phase 1: không đổi kết quả.

**Non-goals**: xem spec (không giải quyết/ẩn, không xem chi tiết phản ứng, không lấy liên kết, không đổi định dạng file).

## Project Structure

### Documentation (this feature)

```text
specs/014-comment-card-menu/
├── spec.md
├── plan.md
├── research.md                     # R1–R8
├── data-model.md                   # không đổi dữ liệu; mô hình giao diện
├── quickstart.md                   # kịch bản kiểm
├── contracts/card-menu-ui.md       # menu ba chấm, thẻ, trả lời, tab
├── checklists/requirements.md
└── tasks.md                        # /speckit-tasks
```

### Source Code (repository root)

```text
src/annotations/
├── MoreMenu.tsx          # (mới) nút ba chấm + menu Edit/Delete, bàn phím, đóng ngoài/Escape
├── highlightActions.ts   # còn { onEdit, onDelete, mine, readOnly }
├── CommentRail.tsx       # Card: tiêu đề có menu, bỏ hàng màu/nhãn màu/Copy/Ask/Edit/Delete cố định
├── Thread.tsx            # trả lời có menu; ô trả lời: Cancel/Reply khi được chọn hoặc có chữ
├── Annotator.tsx         # nhận xét mới color 'o'; bỏ onAsk, onColor, onCopy; menu
├── HighlightsPanel.tsx   # bỏ ô lọc màu, nhãn màu; mục chỉ-màu còn Delete; dải màu nhỏ giữ
├── brief.ts              # briefNotes xếp theo thời gian
└── colors.ts             # bỏ `meaningOf`/`HL_NONE` khỏi giao diện; giữ khoá màu để đọc dữ liệu cũ và tô

src/App.tsx, src/project/LiveWorkspace.tsx, src/project/LocalWorkspace.tsx  # bỏ onAsk cho Annotator
src/styles/reader.css    # .sk-cm-menu, .sk-cm-more; bỏ .sk-cm-colors/.sk-cm-sw/.sk-cm-meta/.sk-hlp-flt nếu không còn dùng
README.md                # mục Highlights

tests/commentRailMarkup.test.tsx, tests/threadMarkup.test.tsx, tests/highlightsPanelActions.test.tsx, tests/annotationsMarkup.test.tsx, tests/moreMenu.test.tsx, tests/comments.test.ts
```

**Structure Decision**: Giữ cấu trúc cũ; một file thành phần mới. Phần lớn công việc là gỡ.

## Complexity Tracking

Không có vi phạm hay phức tạp mới cần biện minh.
