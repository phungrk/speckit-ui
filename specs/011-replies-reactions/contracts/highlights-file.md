# Contract: `highlights.json` với trả lời và emoji

```json
{
  "version": 2,
  "highlights": [
    {
      "id": "h_ab12", "phase": "specify", "doc": "spec.md",
      "quote": "…", "prefix": "", "suffix": "", "startHint": 120, "docSha": null,
      "color": "n", "note": "Why daily?",
      "author": { "login": "mai" },
      "createdAt": "2026-10-22T08:00:00.000Z", "updatedAt": "2026-10-22T09:15:00.000Z",
      "reactions": [ { "emoji": "👍", "author": { "login": "lan" } } ],
      "replies": [
        { "id": "r_x9k2", "author": { "login": "lan" }, "createdAt": "2026-10-22T09:10:00.000Z",
          "text": "Because the cap is per day.", "reactions": [ { "emoji": "🎉", "author": { "login": "mai" } } ] }
      ]
    }
  ]
}
```

## Quy tắc đọc

- `version` 1 hoặc 2; khác thì "unknown format", không ghi (010).
- `replies`, `reactions` thiếu hoặc không phải mảng: coi là rỗng.
- Phản ứng sai hình dạng hoặc `emoji` ngoài bộ: bỏ qua. Trả lời thiếu `id`/`author`/`createdAt`/`text` hoặc `text` quá 2.000 ký tự: bỏ qua và tính vào số "không đọc được" (chặn ghi như 010 FR-014, để không âm thầm xoá).
- Trùng (emoji, người) trên một mục: tính một lần.

## Quy tắc ghi

- Thứ tự trường như ví dụ; `replies` theo `createdAt` rồi `id`; `reactions` theo `emoji` rồi tên người.
- Không ghi trường rỗng (`replies: []`, `reactions: []` bị bỏ).
- `version` theo bảng trong data-model.md.
- Kích thước ≤ 512 KB, ngược lại 413 "too many highlights".
- File 010/012 thuần (không có trường mới) đọc và ghi lại giống hệt (từng byte) khi không có thay đổi liên quan.
