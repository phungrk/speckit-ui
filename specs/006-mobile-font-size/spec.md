# Feature Specification: Cỡ chữ phù hợp màn hình điện thoại

**Feature Branch**: `feat/006-mobile-font-size`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "hãy chỉnh sửa font size phù hợp giao diện smartphone (tham khảo bên istqb)"

## Clarifications

### Session 2026-10-18

- Q: Ở bề rộng điện thoại, demo có áp dụng cỡ chữ mới không? → A: Có, áp dụng cả demo. Bản thiết kế không có bản điện thoại nên không có gì để lệch. Quy tắc "giống từng pixel" của hiến pháp vẫn giữ từ 761px trở lên.
- Q: Cỡ chữ điện thoại bắt đầu ở màn hình rộng tới 640px (như ISTQB) hay tới 760px (ngưỡng bố cục một cột của app)? → A: 760px, để cỡ chữ và bố cục đổi cùng lúc.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Đọc được nội dung chính trên điện thoại mà không phải phóng to (Priority: P1)

Người dùng mở speckit-ui trên điện thoại (màn hình rộng tới 760px) để xem spec, kế hoạch, danh sách task, trạng thái cổng duyệt và hộp thoại. Hiện nay phần lớn chữ chỉ 12–14px, được chọn cho màn hình máy tính. Trên điện thoại người dùng phải phóng to hoặc nheo mắt.

Sau thay đổi này, chữ nội dung (đoạn văn, dòng trong danh sách, bảng, mô tả thẻ, thân hộp thoại, tài liệu spec) đạt cỡ đọc thoải mái cho điện thoại, tham khảo cách ứng dụng ISTQB đã làm: chữ nội dung 16px, chữ phụ 14px, và không có chữ nào nhỏ hơn 12px.

**Why this priority**: Đọc nội dung là việc chính của người dùng trên điện thoại. Nếu chữ không đọc được thì các phần khác không còn ý nghĩa.

**Independent Test**: Mở một spec ở bề rộng 390px. Chữ nội dung của spec, danh sách task và bảng đều đọc được mà không phóng to. Đo cỡ chữ đang áp dụng của từng loại chữ và so với bảng quy đổi trong FR-001.

**Acceptance Scenarios**:

1. **Given** màn hình rộng 390px, **When** người dùng mở một spec, **Then** chữ đoạn văn và chữ trong danh sách có cỡ không nhỏ hơn 16px.
2. **Given** màn hình rộng 390px, **When** người dùng xem bảng hoặc thẻ, **Then** chữ trong bảng và thẻ có cỡ không nhỏ hơn 14px, và tiêu đề cột hoặc nhãn nhỏ không nhỏ hơn 12px.
3. **Given** màn hình rộng 1280px, **When** người dùng mở cùng spec đó, **Then** cỡ chữ không đổi so với trước thay đổi này.

---

### User Story 2 - Nhập liệu trên điện thoại không bị trình duyệt tự phóng to (Priority: P2)

Người dùng điền ô nhập (token, tìm repo, ghi chú khi duyệt) và bấm nút trên điện thoại. Trên iPhone, ô nhập có chữ nhỏ hơn 16px làm trình duyệt tự phóng to trang khi chạm vào, rồi trang lệch khỏi khung nhìn.

Sau thay đổi, chữ trong mọi ô nhập, ô chọn và vùng văn bản trên điện thoại là 16px, nên trang không bị phóng to khi chạm. Nhãn ô nhập và chữ nút đọc rõ, đủ lớn để chạm đúng.

**Why this priority**: Lỗi tự phóng to chặn luồng kết nối và duyệt cổng trên iPhone, nhưng ít người gặp hơn so với việc đọc chữ nhỏ.

**Independent Test**: Trên iPhone hoặc trình mô phỏng iOS, chạm vào từng ô nhập. Trang không bị phóng to và không phải kéo ngang để quay về.

**Acceptance Scenarios**:

1. **Given** màn hình rộng 390px, **When** người dùng chạm vào ô nhập token hoặc ô tìm repo, **Then** chữ trong ô là 16px và trang không bị phóng to.
2. **Given** màn hình rộng 390px, **When** người dùng xem nút và nhãn ô nhập, **Then** chữ nút không nhỏ hơn 14px và nhãn không nhỏ hơn 12px.

---

### User Story 3 - Tiêu đề và chữ cỡ lớn thu nhỏ vừa màn hình hẹp (Priority: P3)

Tiêu đề trang (cỡ 42px, 32px, 25px ở bản máy tính) chiếm nhiều dòng và có thể tràn trên màn hình hẹp. Sau thay đổi, tiêu đề lớn được thu nhỏ theo bậc, tham khảo ISTQB (tiêu đề lớn nhất khoảng 30px), để tiêu đề ngắn nằm vừa trong 1–2 dòng và khoảng cách tới chữ nội dung vẫn cân đối.

**Why this priority**: Chỉ ảnh hưởng chỗ đặt tiêu đề, không chặn việc đọc hay nhập.

**Independent Test**: Ở bề rộng 360px và 390px, mọi tiêu đề trang và tiêu đề hộp thoại không tràn ngang, không cắt chữ.

**Acceptance Scenarios**:

1. **Given** màn hình rộng 360px, **When** người dùng mở trang có tiêu đề dài nhất trong app, **Then** tiêu đề xuống dòng gọn và không gây thanh cuộn ngang.

---

### Edge Cases

- Màn hình rộng đúng 760px và 761px: chỉ bề rộng tới 760px dùng cỡ chữ điện thoại, từ 761px dùng cỡ chữ hiện tại, không có bề rộng nào lai giữa hai bộ.
- Chữ to hơn làm bảng, thẻ, thanh lệnh hoặc dòng trạng thái rộng quá khung: nội dung xuống dòng hoặc cuộn trong khung của nó, không tràn cả trang.
- Người dùng đã đặt cỡ chữ lớn hơn trong hệ điều hành hoặc trình duyệt: giao diện vẫn dùng được, không bị đè chữ lên nhau.
- Mã, đường dẫn dài và dòng lệnh (chữ đơn cách): vẫn đọc được ở cỡ không nhỏ hơn 14px và cuộn ngang trong khung riêng thay vì làm cả trang tràn.
- Chữ trang trí hoặc chữ trong biểu tượng, huy hiệu và nhãn trạng thái rất nhỏ (10–11px): nâng lên 12px, không nhỏ hơn.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Trên màn hình rộng tới 760px, hệ thống PHẢI dùng bảng cỡ chữ riêng cho điện thoại, quy đổi từ cỡ hiện tại, tham khảo ISTQB:

  | Cỡ hiện tại | Cỡ trên điện thoại |
  |-------------|--------------------|
  | 10–12px | 12px |
  | 13px | 14px |
  | 14–15px | 16px |
  | 16px | 17px |
  | 17–18px | 18px |
  | 20px trở lên | thu nhỏ theo bậc, tiêu đề lớn nhất không quá 30px |

- **FR-002**: Chữ nội dung trên điện thoại (đoạn văn, dòng danh sách, tài liệu spec, thân hộp thoại) PHẢI là 16px, với khoảng cách dòng thoáng, khoảng 1.5 lần cỡ chữ.
- **FR-003**: Không có chữ nào hiển thị nhỏ hơn 12px trên điện thoại.
- **FR-004**: Mọi ô nhập, ô chọn và vùng văn bản PHẢI có chữ 16px trên điện thoại, để trình duyệt không tự phóng to khi chạm.
- **FR-005**: Các bề rộng từ 761px trở lên PHẢI giữ nguyên cỡ chữ hiện tại.
- **FR-006**: Cỡ chữ mới PHẢI áp dụng nhất quán cho mọi màn hình của app (kết nối, danh sách repo, workspace, hộp thoại và các thông báo), không để sót màn hình dùng cỡ cũ.
- **FR-007**: Sau khi đổi cỡ chữ, không màn hình nào ở bề rộng 360–760px được xuất hiện thanh cuộn ngang của cả trang, và không chữ nào bị cắt hoặc đè lên nhau.
- **FR-008**: Cỡ chữ điện thoại PHẢI lấy từ một bộ giá trị dùng chung thay vì rải số cỡ chữ trong từng nơi, để chỉnh một chỗ là đổi cho mọi màn hình.
- **FR-009**: Thay đổi áp dụng như nhau cho cả ba chế độ (demo, server, static).
- **FR-010**: Chế độ demo PHẢI dùng cùng cỡ chữ điện thoại như hai chế độ còn lại ở bề rộng tới 760px. Từ 761px trở lên demo giữ nguyên từng pixel so với bản thiết kế `Speckit Workspace.html`, vốn chỉ vẽ cho màn hình máy tính.

### Key Entities *(include if feature involves data)*

- **Bảng cỡ chữ điện thoại**: tập các cỡ chữ dùng cho màn hình tới 760px, ánh xạ từng cỡ hiện tại sang cỡ mới (FR-001).
- **Phân loại chữ**: nhóm chữ theo vai trò (nội dung, chữ phụ, nhãn nhỏ, tiêu đề, chữ đơn cách, chữ trong ô nhập), mỗi nhóm có cỡ riêng trên điện thoại.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ở bề rộng 390px, 100% chữ nội dung có cỡ từ 16px trở lên và 100% chữ hiển thị có cỡ từ 12px trở lên.
- **SC-002**: Ở bề rộng 761px trở lên, cỡ chữ của mọi phần tử giống hệt trước thay đổi (so sánh trước và sau cho cùng màn hình).
- **SC-003**: Người dùng đọc được một spec đầy đủ và duyệt một cổng trên điện thoại mà không phóng to, không kéo ngang trang, và không bị trình duyệt tự phóng to khi chạm vào ô nhập.
- **SC-004**: Ở các bề rộng 360px, 390px, 430px và 760px, không màn hình nào có thanh cuộn ngang của cả trang và không chữ nào bị cắt.
- **SC-005**: Muốn đổi một cỡ chữ điện thoại chỉ cần sửa tại một nơi (FR-008).

## Non-goals

- Không thiết kế lại bố cục, màu sắc hay phông chữ trên điện thoại.
- Không thêm nút để người dùng tự chỉnh cỡ chữ.
- Không đổi kích thước vùng chạm của nút và liên kết.
- Không đổi cỡ chữ từ 761px trở lên, ở bất kỳ chế độ nào.

## Assumptions

- "Điện thoại" nghĩa là bề rộng tới 760px, cùng ngưỡng app đã gom về bố cục một cột. ISTQB dùng 640px; ta chọn 760px để cỡ chữ và bố cục đổi cùng lúc (xem Clarifications).
- Phông chữ (Archivo) và màu không đổi. Thay đổi này chỉ chạm cỡ chữ, khoảng cách dòng và những bù trừ bố cục cần để chữ mới vừa khung.
- Bảng quy đổi ở FR-001 lấy từ cách ứng dụng ISTQB (repo `phungrk/istqb`) chỉnh cỡ chữ cho điện thoại và có thể tinh chỉnh khi xem thực tế.
- Không thêm nút người dùng tự chỉnh cỡ chữ. Cỡ chữ theo thiết lập của hệ điều hành và trình duyệt.
- Bố cục (số cột, thứ tự khối) trên điện thoại đã được xử lý ở các thay đổi trước. Thay đổi này không thiết kế lại bố cục.
- Chỉ đụng giao diện: không thay đổi khoá, quyền token, điểm đến mạng hay cách ghi dữ liệu. Theo CLAUDE.md, đây là thay đổi UI nên không cần chạy đủ Spec Kit, nhưng người dùng đã yêu cầu spec.
