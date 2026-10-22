# Implementation Plan: Hiệu ứng hover trên thẻ nhận xét (nút emoji nổi, ba chấm)

**Branch**: `feat/015-comment-hover` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-comment-hover/spec.md`

## Summary

Làm thẻ nhận xét sạch lúc nghỉ và đúng chỗ khi trỏ tới, như Google Docs. Mỗi mục (nhận xét gốc, từng trả lời) của thẻ đang mở là một **hàng** có thể hover: dòng nội dung đậm hơn; ở mép phải nổi một **nút emoji tròn trắng có bóng** (mặt cười kèm dấu cộng) thay cho nút "+" của 011; nút **ba chấm** của 014 chỉ hiện khi hover hoặc có tiêu điểm trong hàng. Trên thiết bị không có hover cả hai nút hiện sẵn. Hiển thị chỉ bằng CSS (`:hover`, `:focus-within`, trạng thái đang mở); phần mới về mã là thành phần `EmojiButton` (nút nổi + bộ emoji đặt cố định theo nút) và một hook đặt vị trí dùng chung với `MoreMenu`. Không đổi dữ liệu, cách lưu hay quyền. Có một việc về quy tắc: nút tròn cần **constitution 1.4.2** (ngoại lệ của nguyên tắc IV), làm trước khi làm nút tròn, cùng PR.

## Technical Context

**Language/Version**: TypeScript (`strict`), React 18.3.

**Primary Dependencies**: Có sẵn, không thêm. Dùng token Modernist (`--color-bg`, `--color-text`, `--shadow-md`).

**Storage**: Không đổi. Thả/gỡ emoji dùng đúng thay đổi `react` của 011.

**Testing**: Vitest (render tĩnh cho `EmojiButton`, `ReactionBar`, hàng trong `Card` và `Thread`; kiểm CSS bằng đọc file: luật hover, `:focus-within`, `(hover: none)`, không màu cứng, đúng một `border-radius` tròn), Playwright ngoài repo (hover thật, bàn phím, giả lập cảm ứng; 1440×900, 390).

**Target Platform**: Trình duyệt hiện đại; thiết bị cảm ứng dùng `@media (hover: none), (pointer: coarse)`.

**Project Type**: Ứng dụng web một repo.

**Performance Goals**: Không đổi; hover là CSS, không render lại React; bộ emoji chỉ dựng khi mở.

**Constraints**: Hover không làm đổi chiều cao thẻ hay vị trí rail (luôn chừa chỗ phải cho nút, không chỉ khi hover); token Modernist, không màu mới; nút tròn là ngoại lệ duy nhất; tôn trọng `prefers-reduced-motion`.

**Scale/Scope**: nhỏ, khoảng 1–2 ngày: file mới `EmojiButton.tsx`, `usePopover.ts`; sửa `CommentRail.tsx`, `Thread.tsx`, `MoreMenu.tsx`, `Annotator.tsx`, `reader.css`, README, constitution, test.

**Modes affected**: demo, server, static, local (thành phần dùng chung).

## Constitution Check

| Nguyên tắc | Kết quả |
|---|---|
| I. Git là nguồn sự thật | Đạt. Không loại ghi hay file mới; thả/gỡ emoji giữ đường ghi của 011 (một commit `[skip ci]`, xác nhận một lần mỗi repo). |
| II. Khoá thuộc về người dùng | Đạt. Không đụng khoá, token, CSP, mạng. |
| III. Ba chế độ, một hành vi | Đạt. Thành phần dùng chung; cả bốn chế độ nhận cùng thay đổi. |
| IV. Trung thành với thiết kế | **Ngoại lệ có chủ đích:** nút emoji nổi hình tròn trái "không bo góc". Người dùng chọn phương án A (Clarifications Q2): sửa constitution 1.4.2 (patch, nguyên tắc IV) bằng `/speckit-constitution` **trước** khi làm nút tròn, cùng PR, ghi ở Complexity Tracking. Chỉ qua token (`--color-bg`, `--shadow-md`), không màu mới. Phần còn lại vẫn vuông. Demo mặc định không đổi điểm ảnh (hiệu ứng chỉ trên thẻ đang mở, phần ngoài thiết kế từ 012). |
| V. Test trước khi merge | Đạt khi qua bốn lệnh; test dùng dữ liệu tự tạo và GitHub giả. |
| VI. AI chỉ đề xuất | Đạt. Không liên quan Copilot. |
| VII. Đơn giản trước | Đạt. Hiển thị bằng CSS thuần; một thành phần mới và một hook nhỏ tái dùng. Có Non-goals trong spec. |

Kiểm lại sau Phase 1: không đổi kết quả. Quy trình: chỉ specify + plan (một chế độ chung, UI), cộng một sửa constitution kèm.

**Non-goals**: xem spec (không dấu tick giải quyết, không xem chi tiết phản ứng, không đổi bộ emoji hay cách lưu).

## Project Structure

### Documentation (this feature)

```text
specs/015-comment-hover/
├── spec.md
├── plan.md
├── research.md                     # R1–R8
├── data-model.md                   # không đổi dữ liệu; mô hình giao diện
├── quickstart.md                   # kịch bản kiểm
├── contracts/hover-ui.md           # hàng, nút nổi, ba chấm, cảm ứng
├── checklists/requirements.md
└── tasks.md                        # /speckit-tasks
```

### Source Code (repository root)

```text
src/annotations/
├── usePopover.ts         # (mới) đặt vị trí cố định theo nút, đóng khi bấm ngoài/cuộn/đổi cỡ, một cái mở một lúc
├── EmojiButton.tsx       # (mới) nút tròn nổi + bộ 6 emoji (dùng usePopover)
├── MoreMenu.tsx          # dùng usePopover thay cho mã đặt vị trí riêng
├── Thread.tsx            # hàng trả lời: bọc nội dung, EmojiButton; ReactionBar chỉ còn viên emoji (bỏ "+" và bộ chọn)
├── CommentRail.tsx       # Card: hàng nhận xét gốc (khối .sk-cm-item), nhận `rowToolFor`
└── Annotator.tsx         # dựng EmojiButton cho nhận xét gốc

src/styles/reader.css     # .sk-cm-item, .sk-cm-row, .sk-cm-float; hover/focus-within; (hover: none); bỏ "+" cũ
.specify/memory/constitution.md, CLAUDE.md  # 1.4.2 (ngoại lệ nút tròn)
README.md                 # mục Highlights

tests/threadMarkup.test.tsx, tests/commentRailMarkup.test.tsx, tests/moreMenu.test.tsx, tests/emojiButton.test.tsx (mới), tests/hoverCss.test.ts (mới)
```

**Structure Decision**: Giữ cấu trúc cũ; hai file mới nhỏ.

## Complexity Tracking

| Việc | Vì sao cần | Cách đơn giản hơn đã bỏ |
|---|---|---|
| Ngoại lệ constitution IV cho đúng nút emoji nổi tròn (1.4.2) | Người dùng yêu cầu nút tròn như ảnh tham chiếu (Q2 A) | Nút vuông có bóng: đúng luật nhưng khác yêu cầu và ảnh |
| Hook `usePopover` dùng chung | Menu ba chấm và bộ emoji cần cùng cách đặt vị trí cố định, đóng ngoài, một cái mở một lúc; để khỏi lặp mã | Sao chép mã của `MoreMenu`: hai bản dễ lệch nhau |
