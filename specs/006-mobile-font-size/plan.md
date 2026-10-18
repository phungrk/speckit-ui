# Implementation Plan: Cỡ chữ phù hợp màn hình điện thoại

**Branch**: `feat/006-mobile-font-size` | **Date**: 2026-10-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-mobile-font-size/spec.md`

## Summary

Đổi mọi cỡ chữ của app thành biến CSS, rồi đặt lại giá trị các biến đó ở bề rộng tới 760px (R2, R4).

- **Thang cỡ chữ:** 15 biến `--fs-10 … --fs-42` trong `:root` của `src/styles/modernist.css`, mỗi biến bằng đúng cỡ chữ hiện tại. Khối `@media (max-width: 760px)` duy nhất đặt lại theo bảng ở research R3: chữ nội dung 16px, chữ phụ 14px, nhãn nhỏ 12px, tiêu đề lớn nhất 30px.
- **Thay thế cơ học:** 123 khai báo `font-size: Npx` trong 3 file CSS và 13 chỗ `fontSize: 13` trong 7 file TSX chuyển sang `var(--fs-N)`. Ở máy tính kết quả giống hệt từng pixel vì biến bằng giá trị cũ.
- **Ô nhập:** một quy tắc chung `input, select, textarea { font-size: 16px !important }` chỉ ở điện thoại, để iOS không phóng to khi chạm (R5).
- **Kiểm tra:** một test tĩnh Vitest giữ cho không ai viết lại cỡ chữ cứng (FR-008); đo tràn ngang và cỡ chữ thật trên trình duyệt theo quickstart (R6, R7).

Ảnh hưởng cả ba chế độ (demo, server, tĩnh) như nhau, vì CSS cùng một bundle (FR-009, R8).

## Technical Context

**Language/Version**: CSS thuần và TypeScript (strict), React 18.3. Không đổi.

**Primary Dependencies**: Không thêm dependency.

**Storage**: Không có. Không có cấu hình repo mới.

**Testing**:
- Vitest: `tests/typescale.test.ts` đọc CSS và TSX (research R6).
- Playwright có sẵn trong môi trường, chạy tay theo quickstart: cỡ chữ tính ra, tràn ngang, ranh giới 760/761px.
- So ảnh demo ở 1440×900 và 924×540 (hiến pháp IV).

**Target Platform**: Trình duyệt trên điện thoại (iOS Safari, Chrome Android) và máy tính; bản Pages và bản server.

**Project Type**: Ứng dụng web (SPA React + server Node nhỏ + bản tĩnh).

**Performance Goals**: Không đổi. Biến CSS không tốn thêm tài nguyên đáng kể.

**Constraints**:
- Từ 761px trở lên giống hệt từng pixel (FR-005, SC-002, hiến pháp IV).
- Không màu mới, không component ngoài hệ thống (hiến pháp IV).
- Không dùng `!important` ngoài quy tắc ô nhập.

**Scale/Scope**: 3 file CSS (123 khai báo) và 7 file TSX (13 chỗ); 1 file test mới. Không file nguồn mới.

**Modes affected**: Cả ba chế độ (demo, server, tĩnh) như nhau. Demo ở ≤ 760px dùng cỡ chữ mới (clarification 2026-10-18); demo từ 761px trở lên không đổi.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Kết quả: **PASS** trước Phase 0 và sau thiết kế Phase 1.

- [x] **I. Git là nguồn sự thật**: Không đổi dữ liệu, không thêm loại ghi, không thêm nơi lưu.
- [x] **II. Khoá thuộc về người dùng**: Không đụng khoá, quyền token, CSP hay điểm đến mạng.
- [x] **III. Ba chế độ, một hành vi**: Một bundle CSS cho cả ba chế độ; spec và plan nêu rõ chế độ nào bị ảnh hưởng (mục Modes affected).
- [x] **IV. Trung thành với thiết kế**:
  - Giá trị máy tính của mọi biến bằng giá trị cũ, nên demo từ 761px trở lên giữ từng pixel. PR phải so ảnh ở 1440×900 và 924×540 (cả hai > 760px).
  - Không thêm màu hay component. Biến mới thuộc `modernist.css`, nơi hiến pháp đặt token.
  - Giúp thực hiện nguyên tắc "Bố cục PHẢI dùng được ở bề rộng điện thoại".
  - Không đổi `:focus-visible` hay nhãn trợ năng.
- [x] **V. Test trước khi merge**: Có test tĩnh cho thang cỡ chữ (research R6). Test không gọi GitHub hay Anthropic; fixture tự tạo. Đủ bốn lệnh kiểm tra.
- [x] **VI. AI chỉ đề xuất**: Không đụng Copilot hay luồng duyệt.
- [x] **VII. Đơn giản trước**: Không thêm dependency, dịch vụ hay nơi lưu. Spec có mục Non-goals (thêm theo plan này). Một `!important` được biện minh ở Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-mobile-font-size/
├── spec.md
├── plan.md              # File này
├── research.md          # Phase 0: R1–R8
├── data-model.md        # Phase 1: thang 15 biến và cách đọc theo vai trò
├── quickstart.md        # Phase 1: 8 kịch bản
├── contracts/
│   └── type-scale.md    # Quy tắc dùng biến cỡ chữ và khối CSS chuẩn
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, chưa tạo)
```

### Source Code (repository root)

```text
src/styles/
├── modernist.css        # SỬA: khai báo 15 biến --fs-N trong :root; khối @media (max-width:760px) đặt lại biến + quy tắc ô nhập; 24 khai báo → var()
├── workspace.css        # SỬA: 70 khai báo → var(--fs-N)
└── live.css             # SỬA: 29 khai báo → var(--fs-N)

src/                     # SỬA: fontSize: 13 → fontSize: 'var(--fs-13)' (13 chỗ)
├── App.tsx
├── views/views.tsx
└── project/
    ├── GatePanel.tsx
    ├── views.tsx
    ├── Overview.tsx
    ├── RepoPicker.tsx
    └── LiveWorkspace.tsx

tests/
└── typescale.test.ts    # MỚI: không còn cỡ chữ cứng, biến khớp bảng, sàn 12px, quy tắc ô nhập

README.md                # (tuỳ chọn) một dòng trong mục UI: cỡ chữ dùng var(--fs-N)
```

Sau khi thay thế cơ học, các chỗ tràn ngang phát hiện ở quickstart (kịch bản 5) được sửa cục bộ trong các file CSS trên (research R7). Danh sách cụ thể có sau khi đo, và đưa vào `tasks.md`.

**Structure Decision**: Giữ nguyên cấu trúc. Không thêm file nguồn; chỉ thêm một file test. Thang cỡ chữ đặt trong `modernist.css` cùng các token khác của hệ thống.

## Complexity Tracking

| Thêm | Vì sao cần | Phương án đơn giản hơn bị loại vì |
|---|---|---|
| `!important` trong `input, select, textarea { font-size: 16px !important }` ở điện thoại | FR-004: iOS phóng to trang khi ô nhập dưới 16px. Cỡ ô nhập nằm ở nhiều selector và có chỗ kế thừa; một quy tắc chung bảo đảm không ô nào lọt. | Đặt `--fs-N` riêng cho ô nhập ở từng selector: dễ quên khi thêm ô mới. `maximum-scale=1` trong viewport: chặn người dùng tự phóng to, hại trợ năng. |
| 15 biến thay cho 15 số ghi cứng | FR-008, SC-005: đổi cỡ chữ điện thoại ở đúng một chỗ, và test tĩnh chặn việc quay lại số ghi cứng. | Khối `@media` ghi đè từng selector (~100 selector): sót và lệch dần, không kiểm tĩnh được (research R2). |
