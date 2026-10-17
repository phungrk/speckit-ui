# Contract: Trạng thái phía trình duyệt

## Địa chỉ (FR-008)

| Query | Ý nghĩa |
|---|---|
| `repo=owner/name` | Mở repo này. Không có thì mở `lastRepo`, rồi `defaultRepo`, nếu không có thì hiện danh sách repo |
| `spec=NNN-slug` | Spec cần mở trong repo |
| `step=<constitution\|specify\|clarify\|plan\|tasks\|analyze\|implement>` | Bước cần mở |
| `view=overview` | Màn hình tổng quan các repo đã ghim |
| `view=repos` | Danh sách repo |
| `demo` | Chế độ demo (giữ nguyên) |

**Bất biến**: query KHÔNG BAO GIỜ chứa token, khoá hay mã phiên. Giao diện cập nhật query bằng `history.replaceState`, nên không tạo thêm mục trong lịch sử trình duyệt mỗi lần đổi bước.

## Lưu trữ trên thiết bị

| Khoá | Nơi lưu | Nội dung |
|---|---|---|
| `sk.settings` | session hoặc local (đã có) | Bản Pages: token GitHub, khoá Anthropic, `remember`. **Bỏ trường `repo` bắt buộc**; repo mở lần đầu chọn từ danh sách |
| `sk.u.<login>.pins` | local; session nếu bản Pages không tick Remember | `string[]` |
| `sk.u.<login>.last` | như trên | `{ [fullName]: { spec, step } }` |
| `sk.u.<login>.lastRepo` | như trên | `string` |
| `sk.speckit.<owner/repo>@<pushedAt>` | session | `true \| false`, kết quả nhận diện (R2) |

Mọi lần đọc và ghi bọc `try/catch`. Thiếu dữ liệu lưu thì ứng dụng vẫn chạy đúng. **Disconnect** (bản Pages) và **Sign out** (bản server) xoá `sk.settings` và mọi khoá `sk.speckit.*`, nhưng giữ ghim và vị trí đang xem, vì đây chỉ là tuỳ chọn hiển thị.

## Màn hình và luồng

1. **Xác định người dùng**:
   - Bản Pages: màn hình Connect, chỉ còn token, khoá Anthropic và Remember. Ô repo trở thành tuỳ chọn, chuyển sang mục "Advanced".
   - Bản server: `GET /api/session`.
2. **Danh sách repo** (`view=repos`): có ô tìm kiếm, nút ghim, nhãn "Spec Kit" hoặc "Checking…", và ô nhập tay `owner/name` (FR-007). Có đúng một repo Spec Kit thì mở thẳng repo đó (US1-AS3).
3. **Workspace**: giao diện hiện tại, thêm bộ chọn repo trên thanh điều hướng (FR-004) và liên kết "All repos" và "Overview".
4. **Tổng quan** (`view=overview`): mỗi repo đã ghim là một khối, gồm danh sách `OverviewItem` hoặc lỗi riêng của repo đó. Chưa ghim repo nào thì hiện hướng dẫn ghim (US4-AS4).

Mọi thành phần mới dùng class và token của Modernist (nguyên tắc IV). Chế độ demo không đổi.
