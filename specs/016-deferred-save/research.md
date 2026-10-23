# Research: Lưu hoãn (016)

## R1. Chỗ đặt đường cắt: `HighlightStore`, không phải `Annotator`
- **Decision**: `deferredStore(inner, queueApi)` có cùng giao diện `HighlightStore` (thêm `deferred: true`). `save()` áp `applyChange` lên dữ liệu đang hiển thị để lỗi (quyền, mục đã xoá, ghi chú quá dài) vẫn báo ngay như hiện nay, rồi xếp hàng và trả `{ items: <dữ liệu đã lưu> }` không đổi. `Annotator` chỉ thay hai chỗ: bỏ hộp xác nhận từng thao tác và bỏ trạng thái "Sending" khi `store.deferred`.
- **Rationale**: Toàn bộ luồng viết, trả lời, emoji, sửa, xoá đi qua `store.save`; đổi ở một chỗ thì mọi thao tác theo cùng một đường, không sót.
- **Alternatives**: Sửa từng nơi gọi `save(...)` trong `Annotator`: nhiều chỗ, dễ lệch.

## R2. Hiển thị = áp hàng đợi lên dữ liệu đã lưu
- **Decision**: `LiveWorkspace` giữ `savedHls` (dữ liệu đã lưu, từ tải và làm mới) và hàng đợi riêng; danh sách đưa cho `Annotator`, Highlights panel và "Before you approve" là `foldPending(savedHls, queue)`. Làm mới (freshness) chỉ thay `savedHls`, hàng đợi tự áp lại lên bản mới. Bộ kiểm "có nhận xét mới" so với `savedHls`, không so với danh sách có hàng đợi.
- **Rationale**: Cùng nguyên lý lớp phủ (`overlay`) của 011; `applyChange` là hàm thuần dùng chung cho mọi chế độ nên kết quả giống hệt khi Save.
- **Alternatives**: Sửa trực tiếp `savedHls`: không phân biệt được cái đã lưu và chưa lưu (cần cho "Not saved", Discard, Save).

## R3. Thay đổi không áp được thì bỏ qua êm
- **Decision**: `foldPending` bắt `HighlightError` từng thay đổi và bỏ qua thay đổi đó (không chặn các thay đổi sau); số "chưa lưu" đếm các thay đổi áp được. Hàng đợi giữ nguyên thay đổi bị bỏ qua cho tới khi Save/Discard. Server cũng bỏ qua thay đổi lỗi 409 (đích đã bị xoá) và trả danh sách `skipped`; chỉ commit nếu có gì đổi.
- **Rationale**: FR-007, FR-011; không để một nhận xét bị người khác xoá làm hỏng cả lần Save.
- **Alternatives**: Tự xoá thay đổi bỏ qua khỏi hàng đợi: nguy hiểm khi dữ liệu đã lưu tạm trống (file hỏng), sẽ mất hàng đợi oan.

## R4. Gộp thay đổi (FR-015)
- **Decision**: `compactPending` chạy khi thêm vào hàng đợi và trước khi Save, với quy tắc nhỏ, mỗi quy tắc có test: (a) `remove` một mục do chính hàng đợi `add` thì bỏ `add` và mọi thay đổi tới mục đó; (b) hai `update` cùng mục: gộp thành một (ghi chú cuối); `update` sau `add`: gộp vào `add`; (c) `react` bật rồi tắt cùng emoji, cùng đích: bỏ cả hai; (d) `reply` rồi `reply-remove` cùng id: bỏ cả hai; `reply` rồi `reply-edit`: gộp thành `reply` với chữ mới; (e) còn lại giữ nguyên thứ tự.
- **Rationale**: Kết quả cuối giống áp tuần tự (test thuộc tính: `fold(compact(q)) == fold(q)` trừ `updatedAt`), commit sạch, không ghi bước thừa.
- **Alternatives**: Không gộp: xoá mục chưa từng lưu sẽ có thể lỗi ở server (mục không tồn tại), lịch sử nhiễu.

## R5. Nơi lưu hàng đợi: `localStorage`, key theo tài khoản, repo, nhánh, spec
- **Decision**: key `sk.pending.v1.{login}.{repo}@{branch}.{slug}`, giá trị `{ v: 1, changes: PendingChange[] }`. Theo lựa chọn "Remember" của ứng dụng (`storage` đã có ở `Root.tsx`): bật thì `localStorage`, tắt thì `sessionStorage` (qua được tải lại, không qua đóng tab; lời nhắc đóng tab bảo vệ). Nội dung là bình luận có thể từ repo riêng, nên không để lại trên thiết bị khi người dùng đã chọn không ghi nhớ (analyze B1). Mọi truy cập bọc `try/catch`; khi chặn hoặc đầy, hàng đợi giữ trong bộ nhớ tab và `SaveBar` nói sẽ mất nếu đóng tab. Giới hạn 500 thay đổi mỗi spec. Sự kiện `storage` đồng bộ hai tab. Giá trị sai khuôn dạng bị bỏ qua.
- **Rationale**: FR-002, FR-010; đơn giản, đã có mẫu ở `prefs`.
- **Alternatives**: luôn `localStorage` (để lại bình luận riêng trên thiết bị dù đã chọn không ghi nhớ); IndexedDB (nặng hơn cần thiết). `listPending(login, repo, storage)` đếm thay đổi chưa lưu ở mọi spec và nhánh của repo, cho thông báo "N unsaved in other specs" và `beforeunload` (analyze C1).

## R6. Ghi một lần: mở rộng đường `/api/highlights`, không thêm đường mới
- **Decision**: Thân POST nhận `changes: HighlightChange[]` (1 đến 200, mỗi phần tử qua `changeShapeOk`) bên cạnh `change` cũ; `saveHighlights` đọc file, áp lần lượt, một PUT Contents API. Giới hạn thân của `/api/highlights` nâng từ 8.000 ký tự lên `MAX_BYTES` (512 KiB), các đường khác giữ 8.000 (analyze U1). Thông điệp: một thay đổi thì như cũ; nhiều thì `{who} saved {N} comment changes on {spec} [skip ci]`. Giữ vòng thử lại 3 lần khi 409/422 (đọc lại, áp lại cả danh sách). Pages gọi cùng hàm trực tiếp (`backend.ts`).
- **Rationale**: Không loại ghi mới, chỉ gộp nhiều thay đổi vào một lần ghi; tác giả luôn là người server biết (không tin trang, như 010 FR-011).
- **Alternatives**: Đường mới `/api/highlights/batch`: thêm bề mặt API; gọi tuần tự N lần: N commit.

## R7. Xác nhận lần đầu chuyển sang Save
- **Decision**: `ConsentDialog` (đang nằm trong `Annotator.tsx`) được xuất ra; `LiveWorkspace` hiện nó ở lần bấm Save đầu của repo khi `askConsent`, rồi ghi sự đồng ý như cũ (`prefs`). Từ chối giữ nguyên hàng đợi.
- **Rationale**: FR-005; nơi hỏi đúng là nơi sắp có commit.
- **Alternatives**: Hỏi ở thao tác đầu: người dùng chưa biết commit nào.

## R8. Giao diện: thanh Save trên đầu khung đọc và tab Highlights
- **Decision**: Một `SaveBar` giữa thanh bước và khung đọc (thấy ở mọi độ rộng, kể cả khi rail ẩn) và cùng thanh ở đầu tab Highlights. Nội dung: số thay đổi, Save (đang lưu: "Saving…", tắt khi chỉ đọc kèm lý do), Discard (bước xác nhận "Discard N changes? Keep / Discard"). Lỗi lưu hiện ngay trong thanh kèm Retry. Trạng thái thẻ: `SaveState` thêm `{ state: 'queued' }` hiển thị "Not saved" (từ hàng đợi, không phai sau 10 giây). `beforeunload` khi hàng đợi không rỗng.
- **Rationale**: FR-003, FR-008, FR-009; một thành phần dùng hai nơi.
- **Alternatives**: Đặt trong header rail: rail ẩn ở màn hẹp, vi phạm FR-003.

## R9. Constitution PATCH 1.4.3
- **Decision**: Làm rõ nguyên tắc I: "mỗi lần lưu" là mỗi lần người dùng bấm Save, một commit có thể gồm nhiều thay đổi nhận xét; hàng đợi trong trình duyệt là nháp, không phải kho dữ liệu của dự án. Làm bằng `/speckit-constitution` trước khi viết mã ghi, cùng PR, ghi ở Constitution Check.
- **Rationale**: Chữ hiện tại "mỗi lần lưu là một commit" dễ bị hiểu là mỗi thao tác.
- **Alternatives**: Không sửa chữ: PR mâu thuẫn chữ của hiến pháp.

## R10. Save không làm mất thay đổi làm trong lúc đang lưu
- **Decision**: Trước khi gọi ghi, chụp danh sách đã gộp gửi đi (theo `id` và `at`). Thành công: bỏ khỏi hàng đợi đúng các mục đã gửi, giữ các mục mới hơn; thất bại: không bỏ gì. Nút Save tắt trong lúc đang lưu (analyze U2).
- **Rationale**: Thao tác mới (trả lời, emoji) có thể diễn ra trong lúc Save chạy; xoá cả hàng đợi sẽ mất chúng.

## R11. Giờ hiển thị trước khi lưu
- **Decision**: `foldPending` truyền `at` của từng mục làm `now` cho `applyChange`, nên giờ hiển thị là lúc viết; server đặt giờ lúc Save (analyze U3).
