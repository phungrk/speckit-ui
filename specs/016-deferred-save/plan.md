# Implementation Plan: Lưu nhận xét theo hai cách (tức thì, hoặc giữ trong trình duyệt tới khi Save)

**Branch**: `feat/016-deferred-save` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-deferred-save/spec.md`

## Summary

Ở hai môi trường lưu qua commit (GitHub Pages và server/VPS, cùng dùng `LiveWorkspace`), mỗi thao tác nhận xét hiện nay là một commit. Thay đổi: thao tác chỉ **xếp hàng trong trình duyệt**, màn hình hiển thị ngay kết quả của hàng đợi áp lên dữ liệu đã lưu, và một nút **Save** ghi cả hàng đợi trong **một commit**. Local và demo không đổi.

Ba mảnh, mỗi mảnh nhỏ và tách bạch:

1. **Hàng đợi thuần** (`src/annotations/pending.ts`): kiểu `PendingChange`, `foldPending(server, queue)` (áp từng thay đổi bằng chính `applyChange` đã dùng chung, bỏ qua thay đổi không áp được), `compactPending(queue)` (gộp thay đổi liên tiếp, FR-015) và lưu trữ có chịu lỗi (`pendingStorage`, key theo tài khoản, repo, nhánh, spec).
2. **Cửa hàng hoãn** (`deferredStore` trong `src/annotations/store.ts`): bọc `gitHubStore`; `save()` kiểm tra bằng `applyChange` lên dữ liệu đang hiển thị (lỗi vẫn báo ngay như cũ), rồi xếp hàng thay vì gọi GitHub. `Annotator` gần như không đổi, chỉ biết `store.deferred` (không hỏi xác nhận từng thao tác, không trạng thái "Sending").
3. **Ghi một lần** (`saveHighlights` ở server và Pages, đường `/api/highlights` nhận `changes`): đọc file, áp lần lượt các thay đổi, một commit `[skip ci]`; thay đổi không áp được (mục đã bị xoá) được bỏ qua và báo lại, không chặn phần còn lại.

Giao diện: thanh `SaveBar` ("N thay đổi chưa lưu", Save, Discard) trên đầu khung đọc và trên đầu tab Highlights; dấu "Not saved" trên thẻ và trả lời đang chờ; nhắc khi đóng tab. Hộp xác nhận lần đầu chuyển sang lúc bấm Save. Không đổi `highlights.json`, quyền hay đích mạng.

## Technical Context

**Language/Version**: TypeScript (`strict`), React 18.3.

**Primary Dependencies**: Có sẵn, không thêm.

**Storage**: Hàng đợi trong `localStorage` của trình duyệt (nháp, không phải trạng thái dự án, như nháp bình luận và `prefs`); ghi lên GitHub chỉ qua `highlights.json` như cũ. Chịu lỗi bộ nhớ chặn/đầy: giữ trong bộ nhớ của tab và báo.

**Testing**: Vitest (hàm thuần `foldPending`, `compactPending`, lưu trữ với bộ nhớ giả, `saveHighlights` với GitHub giả như test 010, kết xuất tĩnh `SaveBar`, `Card`, kiểm CSS), Playwright ngoài repo (GitHub giả: nhiều thao tác một commit, tải lại, hợp nhất với người khác, lỗi, Discard, hai tab).

**Target Platform**: Trình duyệt hiện đại; server Node (`npm start`).

**Project Type**: Ứng dụng web một repo, có server tuỳ chọn.

**Performance Goals**: Mỗi thao tác hiện trong dưới 0,3 giây (không chờ mạng); `foldPending` chạy trên danh sách nhận xét của một spec (hàng trăm mục) trong vài mili giây.

**Constraints**: Không loại ghi mới ra GitHub (vẫn một commit chỉ đổi `highlights.json`); không lưu khoá hay token trong hàng đợi; hàng đợi gắn tài khoản; local và demo giữ nguyên.

**Scale/Scope**: vừa, khoảng 2 đến 3 ngày: file mới `pending.ts`, `SaveBar.tsx`; sửa `store.ts`, `LiveWorkspace.tsx`, `Annotator.tsx`, `CommentRail.tsx` (trạng thái "queued"), `Thread.tsx`, `HighlightsPanel.tsx`, `backend.ts`, `server/highlights.ts`, `server/highlightsFile.ts`, `server/routes.ts`, `reader.css`, README, constitution (PATCH), test.

**Modes affected**: server (VPS) và static (Pages) đổi hành vi; local và demo không đổi.

## Constitution Check

| Nguyên tắc | Kết quả |
|---|---|
| I. Git là nguồn sự thật | Đạt, kèm một làm rõ chữ (PATCH 1.4.3): "mỗi lần lưu là một commit" nay là mỗi lần người dùng bấm Save, có thể gồm nhiều thay đổi. Hàng đợi là nháp trong trình duyệt (như nháp bình luận, `prefs`), không phải kho dữ liệu của dự án; trạng thái vẫn suy ra từ `highlights.json`. Ghi vẫn chỉ vào `specs/*/highlights.json`, một commit `[skip ci]`, sau xác nhận một lần cho mỗi repo (nay ở lần Save đầu). Không loại ghi mới. |
| II. Khoá thuộc về người dùng | Đạt. Hàng đợi không chứa khoá, token hay cookie; key chứa tên tài khoản (không bí mật). CSP và đích mạng giữ nguyên. |
| III. Ba chế độ, một hành vi | Có chủ đích, đã nêu trong spec: Pages và server dùng chung `LiveWorkspace` nên cùng hành vi; local (ghi file) và demo (trình duyệt) không qua commit nên giữ lưu tức thì. Mỗi chế độ ghi rõ ở FR-001, FR-012. |
| IV. Trung thành với thiết kế | Thêm `SaveBar` và dấu "Not saved" là phần mới thuộc chuỗi nhận xét, không thay phần nào của thiết kế gốc. Chỉ hiện khi có thay đổi chưa lưu nên demo mặc định (không qua đường này) không đổi điểm ảnh. Token Modernist, không bo góc. |
| V. Test trước khi merge | Đạt khi qua bốn lệnh; test dùng dữ liệu tự tạo, GitHub giả. |
| VI. AI chỉ đề xuất | Không liên quan. |
| VII. Đơn giản trước | Đạt: dùng lại `applyChange` làm bộ gộp và hàng đợi thuần; không dịch vụ nền, không đồng bộ giữa thiết bị. Gộp thay đổi chỉ có vài quy tắc rõ. |

Kiểm lại sau Phase 1: đạt; PATCH 1.4.3 làm trước khi viết mã ghi (T-task), cùng PR. Quy trình: đủ flow (ảnh hưởng 2 chế độ, đường ghi đổi hình dạng).

**Non-goals**: xem spec.

## Project Structure

### Documentation (this feature)

```text
specs/016-deferred-save/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
└── contracts/
    ├── batch-save-api.md     # /api/highlights nhận `changes`, kết quả, bỏ qua
    └── save-bar-ui.md        # thanh Save, dấu "Not saved", Discard, nhắc đóng tab
```

### Source Code (repository root)

```text
src/annotations/
├── pending.ts        # MỚI: PendingChange, foldPending, compactPending, pendingStorage, usePending
├── SaveBar.tsx       # MỚI: "N changes not saved", Save, Discard
├── store.ts          # + deferredStore(inner, queueApi)
├── Annotator.tsx     # store.deferred: không hỏi xác nhận từng thao tác, không "Sending"
├── CommentRail.tsx   # SaveNote: trạng thái queued ("Not saved")
├── comments.ts       # SaveState + { state: 'queued' }
└── HighlightsPanel.tsx  # SaveBar ở đầu tab
src/project/LiveWorkspace.tsx  # hàng đợi, view = fold, Save, Discard, đồng ý commit lần đầu, beforeunload
src/backend.ts      # + saveHighlights (server và Pages)
server/
├── highlights.ts      # + saveHighlights(src, { slug, branch, changes, user })
├── highlightsFile.ts  # + commitMessageBatch
└── routes.ts          # /api/highlights nhận `changes` (giữ `change`)
src/styles/reader.css  # SaveBar, dấu queued
.specify/memory/constitution.md  # PATCH 1.4.3
```

**Structure Decision**: giữ cấu trúc hiện tại; hai file mới nhỏ, cho phần thuần (dễ test) và phần giao diện.

## Complexity Tracking

| Điểm | Vì sao cần | Cách đơn giản hơn bị loại vì |
|------|-----------|------------------------------|
| Một loại thay đổi nhận danh sách (`changes`) ở API ghi | Một commit cho nhiều thao tác phải đọc, áp, ghi một lần | Gọi API từng thay đổi tuần tự: vẫn N commit, trái mục tiêu |
| Quy tắc gộp thay đổi (`compactPending`) | FR-015: xoá mục chưa từng lưu không để lại gì; bật rồi tắt emoji không ghi | Ghi nguyên chuỗi: lịch sử file nhiễu, có thể lỗi khi xoá mục chưa có trên GitHub |
