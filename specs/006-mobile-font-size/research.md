# Research: Cỡ chữ phù hợp màn hình điện thoại

Số liệu lấy từ `src/styles/*.css`, `src/**/*.tsx` và `phungrk/istqb` (`src/app/app.css`, chỉ đọc) ngày 2026-10-18.

## R1. Hiện trạng: cỡ chữ nằm rải rác

- **Decision**: Coi đây là vấn đề của *cách khai báo*, không chỉ của giá trị.
- **Rationale**:
  - CSS có 123 khai báo `font-size: Npx`: `modernist.css` 24, `workspace.css` 70, `live.css` 29.
  - 15 giá trị khác nhau, từ 10px đến 42px; 13px (37 lần), 12px (28) và 14px (19) chiếm đa số.
  - TSX còn 13 chỗ viết thẳng `style={{ fontSize: 13 }}` (7 file: `App.tsx`, `views/views.tsx`, `project/GatePanel.tsx`, `project/views.tsx`, `project/Overview.tsx`, `project/RepoPicker.tsx`, `project/LiveWorkspace.tsx`).
  - Không chỗ nào dùng `em`, `rem` hay `clamp()`, nên không có cỡ chữ tương đối nào để co giãn theo.
  - Media query hiện có (ngưỡng 760px) chỉ đổi bố cục, không đổi cỡ chữ.
- **Consequence**: Sửa từng selector trong một khối `@media` sẽ phải chạm ~100 selector và dễ sót (FR-006, FR-008, SC-005). Style viết thẳng trong TSX thì media query không ghi đè được nếu không dùng `!important`.

## R2. Cách đổi: một thang cỡ chữ bằng biến CSS

- **Decision**:
  - Thêm 15 biến `--fs-10 … --fs-42` vào `:root` trong `src/styles/modernist.css`, mỗi biến bằng đúng cỡ chữ hiện tại (`--fs-13: 13px`).
  - Thay mọi `font-size: Npx` bằng `font-size: var(--fs-N)`. Thay `fontSize: 13` bằng `fontSize: 'var(--fs-13)'`.
  - Trong một khối `@media (max-width: 760px)` duy nhất, đặt lại giá trị các biến theo bảng ở R3.
- **Rationale**:
  - Ở máy tính, biến bằng đúng giá trị cũ, nên kết quả giống hệt từng pixel (SC-002, hiến pháp IV) và có thể kiểm bằng một test tĩnh.
  - Một khối cho điện thoại, một chỗ sửa (FR-008, SC-005).
  - Chữ trong TSX cũng đổi theo, mà không cần `!important`.
  - Đây là cách ISTQB dùng (`--fs-10 … --fs-72` được đặt lại trong `@media (max-width: 640px)`).
- **Alternatives considered**:
  - Khối `@media` ghi đè theo selector (cách ISTQB làm cho phần `.topic`): ~100 selector phải liệt kê, thêm CSS mới là quên. Loại.
  - `rem` kèm đổi `html { font-size }`: phải đổi mọi cỡ sang `rem`, và cỡ chữ không đổi tỉ lệ đều (13→14 nhưng 14→16). Loại.
  - `clamp()` co giãn liên tục: ra cỡ lẻ (15.4px), khó kiểm bằng ngưỡng cố định ở SC-001. Loại.
  - Tên biến theo vai trò (`--fs-body`, `--fs-caption`): đẹp hơn nhưng phải quyết từng chỗ đang dùng vai trò nào, dễ làm lệch demo. Đặt tên theo cỡ cũ cho phép đổi cơ học và chỉ cần đổi tên sau nếu cần.

## R3. Bảng quy đổi trên điện thoại

- **Decision**:

  | Biến | Máy tính | Điện thoại | Ghi chú |
  |---|---|---|---|
  | `--fs-10`, `--fs-11`, `--fs-12` | 10, 11, 12px | 12px | không dưới 12px (FR-003) |
  | `--fs-13` | 13px | 14px | chữ phụ |
  | `--fs-14`, `--fs-15` | 14, 15px | 16px | chữ nội dung và ô nhập (FR-002, FR-004) |
  | `--fs-16` | 16px | 17px | |
  | `--fs-17`, `--fs-18` | 17, 18px | 18px | |
  | `--fs-20` | 20px | 20px | |
  | `--fs-24`, `--fs-25` | 24, 25px | 22px | tiêu đề cấp 3 |
  | `--fs-28`, `--fs-32` | 28, 32px | 26px | |
  | `--fs-42` | 42px | 30px | tiêu đề lớn nhất ≤ 30px (FR-001) |

- **Rationale**: 10–18px lấy đúng bảng của ISTQB (`--fs-13: 14px`, `--fs-14: 16px`, `--fs-16: 17px`, `--fs-17: 18px`). Từ 20px trở lên, ISTQB đặt tiêu đề h1 là 30px, h3 22px; các bậc 24–32px ở đây nội suy theo cùng nhịp. Thứ tự lớn nhỏ giữa các bậc không bị đảo.
- **Alternatives considered**: Giữ nguyên 20px trở lên (chỉ nâng chữ nhỏ): tiêu đề 42px chiếm 2–3 dòng ở 360px, vi phạm US3. Loại.

## R4. Ngưỡng là 760px

- **Decision**: Một ngưỡng `max-width: 760px`, cùng ngưỡng với các khối `@media` hiện có trong `live.css` và `workspace.css`.
- **Rationale**: Clarification 2026-10-18 đã chọn 760px. Khi bố cục là một cột thì chữ cũng phải ở cỡ điện thoại, nếu không 641–760px là vùng khó đọc nhất.
- **Consequence**: Không có `min-width` kèm theo, nên từ 761px trở lên không có gì đổi (FR-005). Ngưỡng 1180px của bố cục máy tính bảng không liên quan đến chữ.

## R5. Ô nhập phải là 16px, bất kể selector nào

- **Decision**: Trong khối điện thoại thêm `input, select, textarea { font-size: 16px !important; }`.
- **Rationale**: iOS tự phóng to khi chạm vào ô có chữ dưới 16px (FR-004). Cỡ ô nhập hiện nằm ở nhiều selector (`.input`, `.sk-cmdin`, `.sk-note textarea`, `.sk-cp-in textarea`, `.sk-repo-switch` kế thừa `font: inherit`). Selector thêm sau này sẽ làm hỏng điều kiện này mà không ai để ý. Một quy tắc chung đảm bảo mọi lúc; đây là chỗ duy nhất đáng dùng `!important`, và chỉ ở điện thoại.
- **Alternatives considered**: `maximum-scale=1` trong thẻ viewport để chặn phóng to: cũng chặn người dùng tự phóng to, hại trợ năng. Loại.

## R6. Cách kiểm tra

- **Decision**:
  - **Test tĩnh (Vitest, `tests/typescale.test.ts`)**: đọc CSS và TSX, kiểm:
    1. không còn `font-size: Npx` ở ngoài khối biến, và không còn `fontSize: <số>` trong TSX;
    2. mọi `var(--fs-N)` đang dùng đều đã khai báo;
    3. giá trị máy tính của `--fs-N` đúng bằng `Npx` (SC-002);
    4. giá trị điện thoại khớp bảng R3, đều ≥ 12px (FR-003), và `--fs-14`, `--fs-15` bằng 16px (FR-002);
    5. khối điện thoại có quy tắc ô nhập 16px.
  - **Đo trên trình duyệt (Playwright có sẵn trong môi trường, chạy tay theo quickstart)**: ở 360, 390, 430, 760 và 761px, mở từng màn hình, kiểm `scrollWidth ≤ innerWidth` (FR-007, SC-004) và đo `getComputedStyle` cỡ chữ nhỏ nhất (SC-001).
  - **So ảnh demo** ở 1440×900 và 924×540 trước và sau (hiến pháp IV). Cả hai lớn hơn 760px nên phải giống hệt.
- **Rationale**: Test tĩnh chạy trong `npm test` mỗi PR, giữ cho FR-008 không bị phá dần. jsdom không tính media query, nên phần đo thật phải ở trình duyệt.
- **Alternatives considered**: Thêm `@playwright/test` làm devDependency: thêm dependency và thời gian CI cho một thay đổi chỉ ở CSS (hiến pháp VII). Loại; chạy tay trong quickstart, như các spec trước.

## R7. Chữ to hơn có làm vỡ bố cục không

- **Decision**: Coi là rủi ro cần đo, xử lý trong bước implement bằng sửa cục bộ.
- **Rationale**: Chữ tăng 14–20% ở phần dày đặc: thanh bước, bảng, thanh lệnh, cột `96px 1fr` của `.sk-props`. Bố cục một cột đã xử lý ở các spec trước, nhưng chưa từng chạy với chữ lớn hơn.
- **Consequence**: Quickstart có bước đo tràn ngang ở từng màn hình; chỗ tràn xử lý bằng `overflow-wrap`, đổi cột cố định sang `minmax(0, …)` hoặc cho cuộn trong khung của nó (edge case của spec). Không thiết kế lại bố cục (assumption của spec).

## R8. Không thêm gì ngoài CSS và TSX

- **Decision**: Không đổi server, parser, cấu hình repo, CSP hay dependency.
- **Rationale**: CSS đi vào cùng một bundle cho ba chế độ (demo, server, tĩnh), nên chế độ nào cũng nhận đúng thay đổi (FR-009). Không có dữ liệu mới, quyền token mới hay điểm đến mạng mới.
