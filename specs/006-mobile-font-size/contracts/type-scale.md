# Contract: thang cỡ chữ

Tính năng này không thêm endpoint, kiểu dữ liệu hay định dạng file. Hợp đồng duy nhất là giữa CSS/TSX và thang cỡ chữ: người viết giao diện sau này phải tuân theo để giữ FR-008 và SC-005.

## Quy tắc cho người viết giao diện

1. **Mọi cỡ chữ đi qua biến.** Viết `font-size: var(--fs-13)`, không viết `font-size: 13px`. Trong TSX viết `style={{ fontSize: 'var(--fs-13)' }}`, không viết `fontSize: 13`.
2. **Chỉ dùng biến đã có** (`--fs-10 … --fs-42`). Cần cỡ mới thì thêm một biến vào *cả hai* nơi: `:root` và khối điện thoại trong `src/styles/modernist.css`, cùng một PR.
3. **Giá trị máy tính của `--fs-N` phải bằng `Npx`.** Muốn đổi cỡ chữ trên máy tính thì đổi biến mà phần tử đang dùng, không đổi giá trị của biến đã có (vì biến đó dùng ở nhiều nơi).
4. **Không dùng `!important` cho cỡ chữ**, ngoại lệ duy nhất là quy tắc ô nhập bên dưới.
5. **Ô nhập, ô chọn, vùng văn bản không cần tự đặt cỡ chữ cho điện thoại.** Quy tắc chung đảm bảo 16px.

## Khối trong `src/styles/modernist.css`

```css
:root {
  --fs-10: 10px;  /* … đủ 15 biến, bằng đúng giá trị cũ … */
  --fs-42: 42px;
}

@media (max-width: 760px) {
  :root {
    --fs-10: 12px; --fs-11: 12px; --fs-12: 12px; --fs-13: 14px;
    --fs-14: 16px; --fs-15: 16px; --fs-16: 17px; --fs-17: 18px; --fs-18: 18px;
    --fs-20: 20px; --fs-24: 22px; --fs-25: 22px; --fs-28: 26px; --fs-32: 26px;
    --fs-42: 30px;
  }
  input, select, textarea { font-size: 16px !important; }
}
```

Giá trị lấy từ [data-model.md](../data-model.md). Hai nơi này phải khớp với bảng đó; `tests/typescale.test.ts` kiểm.

## Hành vi quan sát được

| Bề rộng | Kết quả |
|---|---|
| ≤ 760px | Cỡ chữ theo cột "điện thoại". Không chữ nào dưới 12px. Ô nhập 16px. |
| ≥ 761px | Giống hệt trước thay đổi, ở cả ba chế độ. |

Ngưỡng 760px là cùng ngưỡng với các khối `@media` hiện có trong `live.css` và `workspace.css`. Nếu ngưỡng bố cục đổi, ngưỡng chữ phải đổi theo.
