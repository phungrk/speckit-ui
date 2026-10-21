# Contract: `specs/NNN-slug/highlights.json` và đường ghi

## File

```json
{
  "version": 1,
  "highlights": [
    {
      "id": "h_k3v9x0q2m1ab",
      "phase": "specify",
      "doc": "spec.md",
      "quote": "MUST require step-up authentication",
      "prefix": "above the daily cap, the app ",
      "suffix": " before the transfer is sent.",
      "startHint": 1842,
      "docSha": "3f2c…",
      "color": "b",
      "note": "What happens for users with no biometrics enrolled?",
      "author": { "login": "octocat" },
      "createdAt": "2026-10-21T08:15:00.000Z",
      "updatedAt": "2026-10-21T08:15:00.000Z"
    }
  ]
}
```

- UTF-8, thụt lề 2, xuống dòng cuối file; phần tử sắp theo `createdAt`, khoá theo thứ tự ở trên.
- `note` và `quote` là văn bản thuần; ứng dụng không bao giờ render chúng thành HTML.
- Tối đa 512 KB. File rỗng hợp lệ: `{ "version": 1, "highlights": [] }`.

## Ghi qua GitHub (server, Pages) — `server/highlights.ts`

```text
saveHighlight(src, { slug, branch, change, user }) →
  { file: HighlightsFile, commit: { sha, url } }
```

1. `GET /repos/{o}/{r}/contents/specs/{slug}/highlights.json?ref={branch}` → `sha`, nội dung
   (404 → file mới).
2. Parse; hỏng → lỗi "highlights.json cannot be read; fix the file first." (không ghi).
3. Áp `change` (data-model "Thay đổi"); kiểm tra tác giả; kiểm tra kích thước.
4. `PUT …/contents/specs/{slug}/highlights.json` với
   `{ message, content: base64(json), branch, sha? }`.
5. `409` hoặc `422` sha sai → về bước 1, tối đa 3 lần (research R2).

Thông điệp commit (research R16):

```text
{login} {highlighted|noted|recoloured|removed a highlight} on {Phase}: "{60 ký tự đầu của quote}" [skip ci]
```

Lỗi trả về người dùng:

| Tình huống | Thông báo |
|---|---|
| 403/404 khi PUT | Your token cannot commit to `{branch}` (needs Contents: Read and write), or the branch is protected. |
| 422 nhánh không còn | `{branch}` no longer exists, so highlights here are read-only. |
| Hết 3 lần thử | Someone else saved highlights at the same time. Try again. |
| Quá 512 KB | This spec has too many highlights to save more. |
| Không phải tác giả | Only {author} can change this highlight. |

## Route server

`POST /api/highlights` — chỉ cùng origin, `Content-Type: application/json` (như `/api/gates`).

```json
{ "repo": "owner/name", "slug": "010-x", "branch": "feat/010-x", "change": { "type": "add", "highlight": { } } }
```

Trả `200 { file, commit }` hoặc `4xx { error }` với thông báo ở bảng trên. Token lấy từ phiên ở
server, không bao giờ xuống trình duyệt (constitution II).

## Ghi ở local

`localFileStore.save(slug, change)`: đọc `specs/{slug}/highlights.json` qua directory handle, áp
`change` như trên, ghi lại bằng `createWritable()`. Không commit, không push, không gọi mạng.
Không có handle hoặc quyền ghi → chỉ đọc, thông báo "This folder was opened read-only. Choose it
again with write access to save highlights."
