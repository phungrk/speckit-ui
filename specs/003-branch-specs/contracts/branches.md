# Contract: Spec trên nhiều nhánh

Hành vi giống nhau ở bản server (`/api/*`) và bản Pages (`Backend` gọi thẳng `server/github.ts`), nguyên tắc III.

## `GET /api/project?repo=owner/name[&ref=…][&refresh=1]`

Không có `ref`, và server không đặt `GITHUB_REF` cho repo đó: ứng dụng đọc nhánh chính và các nhánh theo `branchPrefixes`. Response giữ dạng cũ, thêm các trường sau (xem data-model.md):

```json
{ "configured": true, "project": {
  "repo": "phungrk/speckit-ui", "ref": "main", "sha": "…",
  "branches": [ { "name": "feat/003-branch-specs", "sha": "…", "specsTreeSha": "…", "unmergedSlugs": ["003-branch-specs"], "error": null } ],
  "skippedBranches": 0,
  "specs": [ { "slug": "003-branch-specs", "branch": "feat/003-branch-specs", "sha": "…", "unmerged": true,
              "variants": [ { "branches": ["feat/003-branch-specs"], "treeSha": "…", "sha": "…", "onDefault": false, "stage": 2, "committedAt": null } ],
              "…": "các trường SpecFeature hiện có" } ],
  "warnings": [] } }
```

Có `ref`: chỉ đọc nhánh đó như hiện nay. `branches` rỗng, mọi spec có `branch: null`, `unmerged: false` (FR-010).

## `GET /api/spec?repo=owner/name&slug=NNN-slug&branch=feat/x`

Mới. Trả `{ "feature": SpecFeature }` của bản trên nhánh `branch`, để chuyển bản (US3-AS2) mà không phải tải lại cả dự án. Mã lỗi:
- `404`: không có slug này trên nhánh đó;
- `400`: nhánh không khớp `branchPrefixes`;
- còn lại giống `/api/project`.

## `POST /api/gates`

Body thêm `"branch"` tuỳ chọn. Không có thì dùng bản đang hiển thị theo quy tắc chọn bản.

```json
{ "repo": "o/r", "slug": "003-branch-specs", "branch": "feat/003-branch-specs", "gate": "specify", "action": "approve" }
```

Kiểm tra cổng chạy trên nội dung của đúng bản đó. Issue theo dõi vẫn là issue duy nhất của slug. Link spec trong issue mới trỏ tới nhánh của bản đó.

## Địa chỉ trang

Thêm tham số `branch` vào danh sách tham số được phép (`repo`, `spec`, `branch`, `step`, `view`), cả khi giữ địa chỉ qua bước đăng nhập (`safeReturn`).

## Cấu hình repo: `.specify/speckit-ui.json` (trên nhánh chính)

```json
{ "mergeOrder": ["edge", "wedding-front"], "branchPrefixes": ["feat/"] }
```

- Thiếu `branchPrefixes`: mặc định `["feat/"]`.
- `[]`: không đọc thêm nhánh nào.
- Giá trị không phải mảng chuỗi: bị bỏ qua và dùng mặc định.

## Giao diện (chế độ demo không đổi)

| Chỗ | Hiển thị |
|---|---|
| Danh sách Specs (panel trái) | Spec chưa merge có `tag` ghi tên nhánh (bỏ tiền tố `feat/`) |
| Đầu spec | Dòng `sk-file` hiện `feat/x · specs/NNN-slug`. Nếu `variants.length > 1`, có bộ chọn bản liệt kê từng bản kèm các nhánh |
| Thanh lệnh | Bản chưa merge: dòng nhắc "Run on `feat/x`: `git switch feat/x`" |
| Warnings | Trùng số thứ tự, lỗi từng nhánh, số nhánh bị bỏ qua |
| Next up, Overview | Gồm cả spec chưa merge, nhãn kèm tên nhánh |
