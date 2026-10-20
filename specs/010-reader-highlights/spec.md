# Feature Specification: Chế độ đọc kiểu Kindle

**Feature Branch**: `feat/010-reader-highlights`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Implement Kindle-style Reader Mode + Highlights for the Speckit web app". Mô tả đầy đủ (mục A–H, tham chiếu prototype `Speckit Workspace.html`, `speckit/reader.jsx`, `speckit/app.jsx` trong dự án claude.ai/design 89b4bbc2-…) được dán trong lệnh `/speckit-specify` ngày 2026-10-20. Các giá trị cụ thể (màu, cỡ chữ, kích thước) của mô tả đó là nguồn cho plan, và được chép vào `contracts/` ở bước plan. Spec này chỉ còn mục A–C; mục D–E chuyển sang `010-spec-annotations` (xem Clarifications).

## Clarifications

### Session 2026-10-20

- Q: Áp dụng cho chế độ nào, demo có đổi theo thiết kế mới không? → A: Server, Pages và local đều có đủ chức năng như nhau. Demo cập nhật theo thiết kế mới, lấy lại mốc so ảnh pixel.
- Q: Highlight dùng chung lưu ở đâu, ai xem, ai sửa; commit vào nhánh nào; local có được ghi không? → A: Đã trả lời (file JSON riêng trong thư mục spec; nhánh đang xem; local ghi đúng file đó, không commit). Các quyết định này chuyển sang spec annotations cùng phần highlight, xem `moved-to-annotations.md`.
- Q: Spec `010-spec-annotations` cũng làm highlight và ghi chú; xử lý trùng lặp thế nào? → A: Tách phạm vi. Annotations giữ highlight và ghi chú (mục D–E), theo các quyết định ở câu trên. Spec này chỉ còn cài đặt đọc, theme và ẩn/hiện sidebar (mục A–C), và không ghi gì vào repo hay GitHub.
- Q: Nền "White" mặc định giữ màu hiện tại (`#f3f2f2`) hay dùng trắng `#FFFFFF` của bản thiết kế? → A: Theo bản thiết kế. Màu, font và kích thước lấy đúng từ prototype người dùng gửi (`speckit/reader.jsx`, `Speckit Workspace.html`): White là `#FFFFFF` / `#F3F3F1` / `#1A1A1A`, và là mặc định. Giao diện mặc định đổi cho mọi người dùng.

## Bối cảnh

Việc chính của trang là **đọc và duyệt spec**. Tính năng này làm việc đọc giống đọc sách giấy (kiểu Kindle).

Thứ tự giao, mỗi bước dùng được ngay:

| Bước | Nội dung | Story |
|---|---|---|
| A | Cài đặt đọc ("Aa") | US1 |
| B | Theme cho toàn bộ khung | US2 |
| C | Ẩn/hiện sidebar | US3 |

Highlight, ghi chú, tab Highlights và ghi chú trong "Before you approve" (mục D–E) thuộc spec `010-spec-annotations`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chỉnh cách đọc (Priority: P1)

Người đọc bấm nút **Aa** ở header và chọn:
- font đọc (Literata, Source Serif 4, Atkinson Hyperlegible, Archivo);
- cỡ chữ (15–22px, 6 nấc);
- giãn dòng (3 mức);
- độ rộng cột (600, 700, 820px);
- nền trang (White, Sepia, Green, Dark).

Chỉ phần văn xuôi trong cột đọc đổi theo. Tiêu đề, mã artifact (`FR-001`, `US1`, `T009`…), đường dẫn file, nhãn và nút vẫn dùng font giao diện. Lựa chọn được nhớ cho người dùng đó và được áp dụng ngay từ lần hiển thị đầu, không bị nháy theme mặc định.

**Why this priority**: Việc chính là đọc. Đây là thay đổi nhỏ nhất mà mọi người đều thấy được ngay.

**Independent Test**: Mở một spec, đổi font sang Atkinson và cỡ 22px. Đoạn văn đổi font, còn `FR-001` và tiêu đề vẫn là font giao diện. Tải lại trang: lựa chọn vẫn còn, và trang không nháy theme mặc định.

**Acceptance Scenarios**:

1. **Given** đang đọc một spec, **When** chọn font, cỡ, giãn dòng hoặc độ rộng, **Then** chỉ văn xuôi trong cột đọc đổi. Tiêu đề, mã artifact, nhãn và nút giữ font giao diện.
2. **Given** popover Aa đang mở, **When** bấm ra ngoài, nhấn Escape hoặc bấm lại Aa, **Then** popover đóng, và mọi điều khiển trong đó dùng được bằng bàn phím.
3. **Given** đã chỉnh cài đặt, **When** tải lại trang, **Then** cài đặt vẫn còn và không có nháy theme mặc định.
4. **Given** bấm "Reset to default", **When** popover cập nhật, **Then** mọi giá trị về mặc định (Literata, 18px, 1.7, 700px, White).

---

### User Story 2 - Theme cho toàn bộ khung (Priority: P1)

Chọn nền Sepia, Green hoặc Dark thì cả header, hai sidebar, cột giữa, hộp thoại và popover đều đổi màu theo, không chỉ cột đọc. Chữ thường đạt độ tương phản tối thiểu 4.5:1 ở cả bốn nền.

**Why this priority**: Đọc lâu với nền trắng ở viền và nền sepia ở giữa thì khó chịu hơn không đổi gì.

**Independent Test**: Chọn Dark. Không còn vùng nào có nền trắng cứng. Đo tương phản chữ thường trên cả bốn nền.

**Acceptance Scenarios**:

1. **Given** chọn một nền, **When** trang cập nhật, **Then** header, sidebar, cột giữa, hộp thoại và popover Aa đều dùng màu của nền đó.
2. **Given** bất kỳ nền nào, **When** đo tương phản chữ thường, **Then** đạt từ 4.5:1 trở lên.
3. **Given** người dùng bật "giảm chuyển động", **When** đổi nền, **Then** không có hiệu ứng chuyển màu.

---

### User Story 3 - Ẩn/hiện sidebar (Priority: P2)

Hai nút ở hai đầu header ẩn hoặc hiện sidebar trái (hàng chờ và danh sách spec) và sidebar phải (cổng, Copilot, và tab Highlights khi spec annotations có). Ẩn cả hai thì còn một cột đọc ở giữa. Trạng thái ẩn/hiện được nhớ cho người dùng.

**Why this priority**: Giúp tập trung đọc, nhưng không bắt buộc để đọc được.

**Independent Test**: Ẩn cả hai sidebar, rồi bấm Tab qua trang: không có phần tử nào bị ẩn nhận được focus. Tải lại trang: vẫn ẩn.

**Acceptance Scenarios**:

1. **Given** ẩn sidebar trái hoặc phải, **When** trang cập nhật, **Then** cột đọc giãn ra lấp chỗ trống, và nội dung của sidebar bị ẩn không nhận focus.
2. **Given** màn hình hẹp (từ 1180px trở xuống, rồi 760px trở xuống), **When** bấm nút ẩn/hiện, **Then** nút vẫn hoạt động với bố cục xếp chồng.
3. **Given** đã ẩn hoặc hiện, **When** tải lại trang, **Then** trạng thái vẫn giữ.


### Edge Cases

- **Chế độ local:** không có login GitHub, nên cài đặt đọc và trạng thái sidebar lưu cho trình duyệt đó.
- **Font chưa tải xong hoặc bị chặn:** cột đọc dùng font dự phòng cùng loại (serif hoặc sans), không để trống chữ.
- **Màn hình hẹp:** từ 1180px trở xuống sidebar phải xếp dưới vùng chính; từ 760px trở xuống mọi thứ một cột. Nút ẩn/hiện vẫn hoạt động.
- **Bộ nhớ trình duyệt bị chặn** (chế độ riêng tư): cài đặt vẫn áp dụng trong phiên, chỉ không được nhớ.

## Requirements *(mandatory)*

### Functional Requirements

**Cài đặt đọc (A)**

- **FR-001**: Header MUST có nút **Aa** mở popover cài đặt đọc gồm: Font (4 lựa chọn), Size (15, 16, 17, 18, 20, 22px), Spacing (giãn dòng 1.5, 1.7, 1.9), Width (600, 700, 820px), Page (White, Sepia, Green, Dark) và "Reset to default". Mặc định là Literata, 18px, 1.7, 700px, White.
- **FR-002**: Font đọc, cỡ, giãn dòng và độ rộng MUST chỉ áp cho văn xuôi trong cột đọc. Bảng, danh sách tiêu chí và checklist nhỏ hơn 2px. Giá trị ngắn (ô khoá–giá trị, lựa chọn clarify) nhỏ hơn 3px. Tiêu đề, mã artifact, đường dẫn file, dòng meta, nhãn, nút và dấu "cần làm rõ" của Clarify MUST giữ font giao diện; mã artifact giữ cỡ 12px.
- **FR-003**: Font đọc MUST có đủ dấu tiếng Việt. Không dùng font của Amazon.
- **FR-004**: Cài đặt đọc và trạng thái sidebar MUST được nhớ cho từng người dùng đã đăng nhập (không theo vai trò), theo cùng cách ứng dụng đang lưu tuỳ chọn khác. Cài đặt MUST được áp dụng trước lần hiển thị đầu tiên.

**Theme (B)**

- **FR-005**: Nền đã chọn MUST đổi màu toàn bộ khung: header, hai sidebar, cột giữa, hộp thoại, popover. Không vùng nào được giữ màu nền cứng. Ngoại lệ duy nhất: các phần mà spec annotations quy định giữ màu cố định (thanh công cụ highlight, màu highlight).
- **FR-005a**: Màu của bốn nền MUST lấy đúng từ prototype: White `#FFFFFF`/`#F3F3F1`/`#1A1A1A`, Sepia `#F6EEDC`/`#EDE2CA`/`#5B4636`, Green `#D6E9D5`/`#C7DEC6`/`#22301F`, Dark `#121212`/`#1E1E1E`/`#D8D2C6` (nền / bề mặt / chữ), kèm màu đường kẻ tương ứng. White là mặc định, nên giao diện mặc định đổi từ nền `#f3f2f2` hiện tại sang trắng. Các token khác của Modernist (màu nhấn, font giao diện, khoảng cách) giữ nguyên.
- **FR-006**: Chữ thường MUST đạt tương phản từ 4.5:1 ở cả bốn nền. Nền Dark MUST đổi cả các màu nhấn nhạt để các khung chú thích vẫn đọc được.

**Sidebar (C)**

- **FR-007**: Header MUST có hai nút ẩn/hiện sidebar trái và phải. Mỗi nút cho biết đang ẩn hay hiện cho trình đọc màn hình, và có tooltip ("Queue & features", "Gate, highlights & Copilot").
- **FR-008**: Sidebar bị ẩn MUST không nhận focus và không được đọc ra. Ẩn cả hai thì còn một cột đọc ở giữa. Phím tắt `[` và `]` MAY có, và bị bỏ qua khi đang gõ chữ.

**Chất lượng (F)**

- **FR-009**: Mọi điều khiển MUST dùng được bằng bàn phím và có viền focus rõ. Popover Aa MUST được trình đọc màn hình nhận là hộp thoại có tên.
- **FR-010**: Vùng bấm MUST từ 36px trở lên trên máy tính và 44px trên cảm ứng. Khi người dùng bật "giảm chuyển động", không có chuyển màu theme.
- **FR-011**: Đổi font hoặc cỡ chữ MUST chỉ làm cột đọc dàn lại, không làm phần khác của trang xê dịch.

**Chế độ**

- **FR-012**: Server, Pages, local và demo MUST có cùng cài đặt đọc, theme và ẩn/hiện sidebar. Demo MUST theo thiết kế mới, kèm mốc so ảnh pixel mới.
- **FR-013**: Tính năng này MUST NOT ghi vào repo hay GitHub, và MUST NOT gọi mạng ngoài việc tải font.

### Key Entities

- **Cài đặt đọc**: font, cỡ, giãn dòng, độ rộng, nền; thuộc về một người dùng (hoặc một trình duyệt ở local và demo).
- **Trạng thái sidebar**: trái hiện/ẩn, phải hiện/ẩn; thuộc về cùng chủ như cài đặt đọc.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Đổi font, cỡ, giãn dòng hoặc độ rộng chỉ đổi văn xuôi trong cột đọc. 100% mã artifact, tiêu đề và nút giữ font giao diện.
- **SC-002**: Ở cả bốn nền, mọi vùng của trang đổi màu theo, và chữ thường đạt tương phản từ 4.5:1.
- **SC-003**: Cài đặt đọc và trạng thái sidebar còn nguyên sau khi tải lại, và không có lần nháy theme mặc định nào.
- **SC-004**: Toàn bộ luồng dùng được chỉ bằng bàn phím: mở Aa, đổi từng cài đặt, đóng popover, ẩn/hiện hai sidebar.
- **SC-005**: Ẩn cả hai sidebar thì 0 phần tử bị ẩn nhận được focus.

## Assumptions

- **Chế độ bị ảnh hưởng** (nguyên tắc III): cả bốn, cùng hành vi (FR-012). Demo được lấy lại mốc so ảnh pixel ở bước implement, sau khi so với prototype.
- **"Theo người dùng":** là tài khoản GitHub đang đăng nhập.
  - Ứng dụng đang lưu tuỳ chọn theo login GitHub trong trình duyệt (`localStorage` khi bật Remember, `sessionStorage` trên Pages nếu không). Cài đặt đọc dùng cùng cơ chế đó.
  - Đồng bộ sang thiết bị khác cần một nơi lưu hồ sơ phía server mà ứng dụng chưa có. Việc đó nằm ngoài phạm vi.
- **Ở local và demo:** không có login GitHub, nên cài đặt lưu theo trình duyệt.
- **Thiết kế:**
  - Bản thiết kế tham chiếu là dự án claude.ai/design "Speckit Workspace" (`Speckit Workspace.html`, `speckit/reader.jsx`, `speckit/app.jsx`).
  - Người dùng đã gửi bản xuất của dự án (zip) ngày 2026-10-20. Màu, font, kích thước và bố cục trong spec này lấy từ đó. Token Modernist trong `styles.css` của prototype trùng với `src/styles/modernist.css`. Bản zip không được commit vào repo; plan chép các giá trị cần dùng vào `contracts/`.
  - Bốn nền màu (kể cả White mới) là ngoại lệ có chủ ý so với constitution IV ("không thêm màu mới"). Bước plan phải ghi vào Complexity Tracking, hoặc đề xuất sửa constitution.
  - Đổi nền mặc định làm thay đổi ảnh so pixel của mọi màn hình, không chỉ demo; bước implement lấy lại toàn bộ mốc.
- **Font:** tải từ Google Fonts. Bản Pages hiện chỉ cho tải stylesheet từ `fonts.googleapis.com` và font từ `fonts.gstatic.com`. Bước plan cần kiểm tra CSP (constitution II).
- **Nguyên tắc I:** tính năng này không ghi gì (FR-013), nên không cần sửa constitution về nơi ghi.

## Non-Goals

- Không đồng bộ cài đặt đọc giữa các thiết bị (chưa có nơi lưu hồ sơ phía server).
- Không có highlight, ghi chú, tab Highlights hay ghi chú trong "Before you approve"; các phần đó thuộc `010-spec-annotations`.
- Không dùng font của Amazon (Bookerly…).
