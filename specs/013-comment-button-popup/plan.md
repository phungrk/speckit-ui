# Implementation Plan: Hộp chọn chữ chỉ còn một nút "Comment"

**Branch**: `feat/013-comment-button-popup` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-comment-button-popup/spec.md`

## Summary

Hộp hiện ra khi chọn chữ (thanh công cụ tối của 010) thu lại thành **một nút "Comment"** trên bề mặt sáng nhỏ, theo token Modernist, đặt cạnh vùng chọn. Bốn ô màu, Copy và Ask rời khỏi hộp và chuyển sang nơi người dùng đã xem nhận xét: hàng hành động của **thẻ đang chọn** (thêm Copy và Ask cho mọi người xem; đổi màu, Sửa, Xoá vẫn của tác giả) và **mục trong tab Highlights** (hàng hành động cho highlight chỉ có màu, vốn không có thẻ). Bấm vào highlight chỉ có màu của mình trong văn bản vẫn hiện hộp, nhưng chỉ có "Comment". Không đổi dữ liệu, cách lưu hay điểm đến mạng.

## Technical Context

**Language/Version**: TypeScript (`strict`), React 18.3.

**Primary Dependencies**: Có sẵn, không thêm. Dùng lại `Icon` (`note` là hình bong bóng), token `--color-bg`, `--color-text`, `--shadow-md`.

**Storage**: Không đổi (`specs/NNN-slug/highlights.json`, `version: 1`). Mọi thay đổi là giao diện; các thao tác ghi (thêm nhận xét, đổi màu, xoá, sửa ghi chú) là những loại ghi đã có ở 010/012.

**Testing**: Vitest (render tĩnh cho `HlToolbar`, `Card`, `HighlightsPanel`; logic thuần cho vị trí hộp). Playwright ngoài repo ở 1440×900, 924×540 và 390.

**Target Platform**: Trình duyệt hiện đại, như 010/012.

**Project Type**: Ứng dụng web một repo.

**Performance Goals**: Không đổi; hộp là một phần tử nổi, không ảnh hưởng bố trí rail.

**Constraints**: Nhãn một dòng từ 320 px; hộp nằm gọn trong màn hình; không thêm màu; không bo góc (Modernist); tương phản chữ ≥ 4,5:1 ở cả bốn nền đọc.

**Scale/Scope**: Nhỏ, khoảng 1 ngày: sửa `Toolbar.tsx`, `Annotator.tsx`, `CommentRail.tsx` (Card), `HighlightsPanel.tsx`, ba shell (nối hành động sang tab), `reader.css`, README, vài test.

**Modes affected**: demo, server, static, local (một thành phần dùng chung; spec FR-011).

## Constitution Check

| Nguyên tắc | Kết quả |
|---|---|
| I. Git là nguồn sự thật | Đạt. Không thêm loại ghi; đổi màu/xoá/ghi chú giữ đúng một commit `[skip ci]` mỗi lần lưu và xác nhận một lần mỗi repo. |
| II. Khoá thuộc về người dùng | Đạt. Không đụng khoá, token, CSP hay điểm đến mạng. |
| III. Ba chế độ, một hành vi | Đạt. Chỉ sửa thành phần dùng chung `src/annotations/`; cả demo, server, static, local nhận cùng hành vi. |
| IV. Trung thành với thiết kế | **Chênh có chủ đích, phải ghi ở PR.** Hộp chọn chữ khác bản thiết kế `Speckit Workspace.html` (thanh tối nhiều nút) theo yêu cầu người dùng. Hộp mới chỉ dùng token Modernist, không thêm màu. Câu "thanh công cụ luôn tối" trong nguyên tắc IV mô tả hộp cũ; xem Complexity Tracking. |
| V. Test trước khi merge | Đạt khi qua bốn lệnh; test dùng dữ liệu tự tạo và GitHub giả. |
| VI. AI chỉ đề xuất | Đạt. "Ask" vẫn chỉ mở Copilot với đoạn chữ; không tự ghi. |
| VII. Đơn giản trước | Đạt. Không dependency, không lớp mới; có mục Non-goals dưới đây. |

Kiểm lại sau Phase 1: không đổi kết quả.

**Non-goals**: không đổi rail, thẻ, hộp soạn, luồng chọn của 012; không thêm thao tác mới (trả lời, emoji, giải quyết thuộc 011); không đổi định dạng file; không đa ngôn ngữ; không thay lớp chọn chữ gốc của trình duyệt (menu Copy/Look Up của iOS vẫn do hệ điều hành).

## Project Structure

### Documentation (this feature)

```text
specs/013-comment-button-popup/
├── spec.md
├── plan.md                         # file này
├── research.md                     # R1–R8
├── data-model.md                   # không đổi dữ liệu; mô hình giao diện
├── quickstart.md                   # kịch bản kiểm
├── contracts/selection-popup-ui.md # hộp, hành động của thẻ, hành động ở tab
├── checklists/requirements.md
└── tasks.md                        # /speckit-tasks
```

### Source Code (repository root)

```text
src/annotations/
├── Toolbar.tsx          # HlToolbar: một nút "Comment"; toolbarPosition theo bề rộng hộp
├── Annotator.tsx        # bỏ add(color) và onColor/onCopy/onAsk/onDelete của hộp; chỉ mở hộp cho highlight chỉ có màu của mình; xuất hành động cho tab
├── CommentRail.tsx      # Card: thêm Copy và Ask (mọi người), giữ đổi màu/Sửa/Xoá cho tác giả
├── HighlightsPanel.tsx  # hàng hành động cho mục highlight chỉ có màu
└── highlightActions.ts  # kiểu HighlightActions dùng chung giữa Annotator, Card và tab

src/App.tsx, src/project/LiveWorkspace.tsx, src/project/LocalWorkspace.tsx  # nhận hành động từ Annotator, đưa cho tab
src/styles/reader.css    # kiểu hộp sáng; bỏ kiểu thanh tối nếu không còn dùng; kiểu hàng hành động ở tab
README.md                # nhãn "Comment"
specs/012-…/contracts/comment-rail-ui.md  # nhãn "Add comment" → "Comment" ở chỗ nói về nút

tests/annotationsMarkup.test.tsx, tests/commentRailMarkup.test.tsx  # cập nhật; thêm test hành động của thẻ và của tab
```

**Structure Decision**: Giữ cấu trúc 010/012. Chỉ thêm một file kiểu nhỏ (`highlightActions.ts`) để ba nơi dùng cùng một chữ ký hành động.

## Complexity Tracking

| Việc | Vì sao cần | Cách đơn giản hơn đã bỏ |
|---|---|---|
| Sửa nguyên tắc IV (patch 1.4.1): bỏ cụm "thanh công cụ luôn tối", giữ bảng `--hl-*` | Hộp mới dùng token Modernist nên đi theo nền đọc, không còn là thanh luôn tối; để nguyên câu sẽ sai với code | Giữ hộp tối: trái yêu cầu "kiểu Google Docs" (bề mặt sáng) |
| Cầu nối `onActions` Annotator → shell → tab | Tab ở sidebar ngoài `Annotator`, còn lưu và Ask nằm trong `Annotator` | Chuyển logic lưu lên shell: đổi nhiều hơn mà không có lợi (R5) |
