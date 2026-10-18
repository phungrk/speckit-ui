# Data Model: Cỡ chữ phù hợp màn hình điện thoại

Không có dữ liệu lưu, không có kiểu TypeScript mới, không có cấu hình repo mới. "Dữ liệu" của tính năng là thang cỡ chữ trong CSS. Nó có hai thực thể, đúng như Key Entities của spec.

## Bảng cỡ chữ điện thoại: 15 biến CSS `--fs-N`

Khai báo trong `:root` của `src/styles/modernist.css`. Tên biến `N` là cỡ chữ hiện tại tính bằng px, để thay thế cơ học và đọc là biết nó thay cho gì.

| Biến | Giá trị trong `:root` (máy tính) | Giá trị khi `max-width: 760px` | Số khai báo CSS thay thế |
|---|---|---|---|
| `--fs-10` | 10px | 12px | 4 |
| `--fs-11` | 11px | 12px | 14 |
| `--fs-12` | 12px | 12px | 28 |
| `--fs-13` | 13px | 14px | 37 (+ 13 trong TSX) |
| `--fs-14` | 14px | 16px | 19 |
| `--fs-15` | 15px | 16px | 5 |
| `--fs-16` | 16px | 17px | 3 |
| `--fs-17` | 17px | 18px | 2 |
| `--fs-18` | 18px | 18px | 1 |
| `--fs-20` | 20px | 20px | 4 |
| `--fs-24` | 24px | 22px | 1 |
| `--fs-25` | 25px | 22px | 1 |
| `--fs-28` | 28px | 26px | 2 |
| `--fs-32` | 32px | 26px | 1 |
| `--fs-42` | 42px | 30px | 1 |

Tổng: 123 khai báo trong CSS (khớp số đếm ở research R1) và 13 chỗ trong TSX.

### Quy tắc kiểm được (cho `tests/typescale.test.ts`)

- **Đối xứng**: giá trị máy tính của `--fs-N` luôn bằng `Npx`. Nhờ đó thay thế không đổi một pixel nào ở bề rộng từ 761px trở lên (FR-005, SC-002).
- **Sàn**: mọi giá trị điện thoại ≥ 12px (FR-003).
- **Chữ nội dung**: `--fs-14` và `--fs-15` bằng 16px trên điện thoại (FR-002).
- **Đơn điệu**: nếu `a < b` thì cỡ điện thoại của `--fs-a` ≤ cỡ điện thoại của `--fs-b`. Hai chữ khác bậc không bao giờ đảo thứ tự lớn nhỏ.
- **Không sót**: không còn `font-size: <số>px` hay `fontSize: <số>` ngoài khối khai báo.
- **Không thiếu**: mọi `var(--fs-N)` đang dùng có khai báo.

## Phân loại chữ

Không phải bảng trong code: chỉ là cách đọc bảng trên theo vai trò, để người sửa biết chạm vào đâu.

| Vai trò | Biến đang dùng | Cỡ trên điện thoại |
|---|---|---|
| Nhãn nhỏ, huy hiệu, tiêu đề cột | `--fs-10`, `--fs-11`, `--fs-12` | 12px |
| Chữ phụ (chú thích, mô tả thẻ, dòng trạng thái) | `--fs-13` | 14px |
| Chữ nội dung (đoạn văn, danh sách, tài liệu spec, thân hộp thoại, ô nhập) | `--fs-14`, `--fs-15` | 16px |
| Chữ nhấn, tiêu đề nhỏ | `--fs-16`, `--fs-17`, `--fs-18` | 17–18px |
| Tiêu đề | `--fs-20` … `--fs-42` | 20–30px |

Ô nhập, ô chọn và vùng văn bản **luôn** 16px nhờ quy tắc riêng (research R5), không phụ thuộc vào biến nào.
