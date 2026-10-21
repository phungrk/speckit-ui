# Quickstart: kiểm tra chú thích (010-spec-annotations)

Giá trị và thông báo mong đợi: [contracts/annotations-ui.md](contracts/annotations-ui.md),
[contracts/highlights-file.md](contracts/highlights-file.md). Dữ liệu: [data-model.md](data-model.md).

## Chuẩn bị

```bash
npm ci
npm test && npm run typecheck && npm run build && npm run build:pages
npm run dev     # http://localhost:5173 ; demo: /?demo ; local: /?local
```

- Thử ghi thật chỉ trên một repo thử nghiệm của mình, không trên repo của người khác. Test tự
  động dùng GitHub giả lập (`tests/fakeGitHub.ts`), không ghi GitHub thật (constitution V).
- Playwright dùng Chromium có sẵn (`executablePath: '/opt/pw-browsers/chromium'`); script để trong
  scratchpad, không commit.

## Kịch bản

### 1. Demo: giống bản thiết kế

1. Mở `/?demo`, feature 003: tab Highlights hiện `4`, ghim ở đoạn có ghi chú, đoạn được tô.
2. So ảnh với bản thiết kế ở 1440×900 và 924×540: không còn chênh ở phần highlight.

### 2. Tạo, ghi chú, sửa, xoá (US1)

1. Bôi đen một câu trong cột đọc: thanh công cụ hiện trên đoạn chọn, trong khung nhìn.
2. Chọn Issue: đoạn được tô hồng; tải lại vẫn còn.
3. Bôi đen câu khác, Note, gõ ghi chú, ⌘/Ctrl+Enter: ghim xuất hiện ngang dòng đầu.
4. Bấm vào highlight: đổi sang Question; Remove: mất khỏi văn bản và panel.
5. Ask: tab Copilot mở với câu "Explain this passage from Specify and flag any risk or gap: …".
6. Đoạn văn lặp lại hai lần: highlight lần thứ hai, tải lại, vẫn gắn đúng lần thứ hai.

### 3. Server và Pages: commit (US2, FR-009 – FR-012)

1. Lưu highlight đầu tiên: hộp thoại "Commit highlights?" nêu nhánh và login. Cancel: không có
   commit nào, highlight đang soạn còn nguyên.
2. Commit highlights: toast "Saved · commit abc1234". Trên GitHub: một commit mới, thông điệp kết
   thúc bằng `[skip ci]`, chỉ đổi `specs/NNN/highlights.json`, không có lần chạy Actions nào.
3. Lưu lần hai: không hỏi lại. Bật "Ask before committing highlights" ở cuối tab Highlights: hỏi lại.
4. Spec ở nhánh `feat/`: commit nằm trên nhánh đó; spec đã merge: commit nằm trên `main`.
5. Token không có Contents: write: lưu báo lỗi theo bảng ở contract; thanh công cụ chỉ còn Copy và
   Ask; mọi highlight vẫn xem được.
6. Ghi đồng thời: hai tab, hai tài khoản, lưu cùng lúc: cả hai highlight có trong file.
7. Sửa tay `highlights.json` cho hỏng: panel báo lỗi, không lưu được, không bị ghi đè.

### 4. Quyền theo tác giả (FR-011)

Tài khoản B mở highlight của A: không có Remove, không đổi màu, không sửa ghi chú; Copy và Ask vẫn có.

### 5. Panel và cổng (US3)

1. Tab Highlights: bộ lọc theo màu có số đếm; nhóm `02 · Specify`…; mục có ghi chú, tác giả,
   nghĩa, thời gian.
2. Bấm mục ở bước khác: chuyển bước, đoạn văn cách đỉnh khoảng 120px, gạch chân 1.6 giây.
3. Tab Gate của bước có ghi chú Issue và Key: "Before you approve" có hai dòng, Issue trước.

### 6. Tài liệu đổi (US4)

Sửa câu đã tô trong tài liệu (commit trên nhánh), Refresh: highlight không tô, panel hiện
"Outdated, text changed". Đưa câu về như cũ: gắn lại.

### 7. Local (FR-016, FR-017)

1. `/?local`, chọn thư mục bằng "Choose repository folder" (Chromium): lưu highlight đầu tiên hỏi
   tên tác giả và quyền ghi thư mục.
2. `specs/NNN/highlights.json` trong thư mục đổi; `git status` chỉ có đúng file đó; không có commit.
3. Mở thư mục bằng ô chọn file (không có quyền ghi): chỉ xem, kèm lý do.

### 8. Bàn phím, điện thoại, hiệu năng

1. Chọn chữ bằng Shift+mũi tên, Tab tới thanh công cụ, Enter chọn màu; Escape đóng.
2. 390px: tạo, sửa, xoá được, không cuộn ngang.
3. Spec mẫu 200 highlight: chuyển bước, highlight hiện dưới 1 giây (đo bằng `performance.now()`).
