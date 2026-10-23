# Implementation Plan: Bố cục mục nhận xét (emoji dưới nội dung, ba chấm khi hover ở mọi thẻ)

**Branch**: `feat/017-comment-item-layout` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-comment-item-layout/spec.md`

## Summary

Hai thay đổi giao diện trên thẻ nhận xét, cả hai chỉ ở lớp hiển thị:

1. **Emoji dưới nội dung.** Hàng viên emoji của nhận xét gốc chuyển từ `Thread` (chỉ có khi thẻ mở, sau dòng trạng thái) lên ngay dưới `.sk-cm-row` trong `Card`, nên thẻ đóng cũng có. Tiêu đề thẻ đóng bỏ chuỗi emoji, giữ số trả lời. Vì thẻ đóng có hàng emoji cao hơn 124 px cố định, những thẻ đó được **đo** như thẻ mở (rail đã có cơ chế đo).
2. **Ba chấm ở mọi thẻ của mình.** `MoreMenu` hiện ở tiêu đề thẻ đóng lẫn thẻ mở, ngoài cùng bên phải, chừa chỗ ngay cả lúc nghỉ (Clarifications Q1 A). CSS hover/focus của 015 đã áp cho mọi `.sk-cm-item` nên nút ba chấm và nút emoji hiện cùng nhau. Edit/Delete từ thẻ đóng dùng đúng luồng thẻ mở.

Không đổi dữ liệu, cách lưu, quyền hay `highlights.json`. Chuyển đổi duy nhất là cách dựng: `Card` nhận thêm `chips` (hàng emoji) và một cờ `measured`.

## Technical Context

**Language/Version**: TypeScript (`strict`), React 18.3.

**Primary Dependencies**: Có sẵn, không thêm. Token Modernist.

**Storage**: Không đổi. Thả/gỡ emoji dùng thay đổi `react` của 011.

**Testing**: Vitest (render tĩnh `Card`, `Thread`, `ReactionBar`, kiểm CSS bằng đọc file, hàm đo chiều cao thuần), Playwright ngoài repo (demo, GitHub giả; 1920, 1440, 924, 390; giả lập cảm ứng).

**Target Platform**: Trình duyệt hiện đại.

**Project Type**: Ứng dụng web một repo.

**Performance Goals**: Không đổi. Chỉ thẻ có emoji (hoặc màn hình cảm ứng) thêm một `ResizeObserver`.

**Constraints**: Ảnh demo lúc nghỉ giữ nguyên trừ tiêu đề thẻ đóng của mình (giờ dịch trái) và hàng emoji (ngoại lệ ghi trong PR); token Modernist, không màu mới; nút tròn vẫn là phần tử tròn duy nhất; không đổi thứ tự Tab của rail.

**Scale/Scope**: nhỏ, dưới 1 ngày: sửa `CommentRail.tsx`, `Thread.tsx`, `MoreMenu.tsx`, `Annotator.tsx`, `comments.ts`, `reader.css`, README, test.

**Modes affected**: demo, server, static, local (thành phần dùng chung).

## Constitution Check

| Nguyên tắc | Kết quả |
|---|---|
| I. Git là nguồn sự thật | Đạt. Không loại ghi mới; emoji, sửa, xoá dùng đường ghi hiện có. |
| II. Khoá thuộc về người dùng | Đạt. Không đụng khoá, token, mạng. |
| III. Ba chế độ, một hành vi | Đạt. Thành phần dùng chung; spec 016 (lưu hoãn) độc lập. |
| IV. Trung thành với thiết kế | Đạt có ghi chú: demo giữ nguyên ngoại trừ tiêu đề thẻ đóng của mình và hàng emoji, hai phần thuộc thẻ nhận xét của chuỗi spec 012–017 (không có trong thiết kế gốc, đã là ngoại lệ từ 012); liệt kê trong PR. Không bo góc mới. |
| V. Test trước khi merge | Đạt khi qua bốn lệnh. |
| VI. AI chỉ đề xuất | Không liên quan. |
| VII. Đơn giản trước | Đạt. Dời một thành phần có sẵn, thêm hai prop; không hook hay thư viện mới. |

Kiểm lại sau Phase 1: không đổi. Quy trình: specify + plan (UI, một thành phần chung).

## Project Structure

```text
specs/017-comment-item-layout/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/item-ui.md

src/annotations/
├── CommentRail.tsx   # Card: chips dưới row, ba chấm cho thẻ đóng, measured; rail đo thẻ có emoji/cảm ứng
├── Thread.tsx        # bỏ hàng emoji gốc khỏi thread; ReactionBar nhận tabbable
├── MoreMenu.tsx      # prop tabbable (thẻ đóng: ngoài thứ tự Tab)
├── Annotator.tsx     # chipsFor(card, open)
└── comments.ts       # không đổi dữ liệu; hằng ước lượng cho nhóm Outdated
src/styles/reader.css # hàng emoji trong item, chỗ ba chấm ở tiêu đề thẻ đóng, hiện trên cảm ứng
```

**Structure Decision**: giữ cấu trúc hiện tại; không tạo file mới.

## Complexity Tracking

Không có vi phạm cần biện minh.
