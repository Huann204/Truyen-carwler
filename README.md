# TruyệnMới — Web Đọc Truyện & Tự Động Cào Cập Nhật (`vui.mobi/truyen/`)

Hệ thống web đọc **Truyện Tranh (Manga)** & **Truyện Chữ** xây dựng bằng **Next.js 15 (App Router) + TypeScript + Tailwind CSS + MongoDB (Mongoose)**, tích hợp bộ lập lịch tự động quét truyện mới / chương mới khi web nguồn cập nhật.

## Tính năng chính
- **Tự động phát hiện truyện mới & chương mới (`Auto-Crawler`)**:
  - Khởi động tự động cùng server qua `src/instrumentation.ts` và `node-cron`.
  - Định kỳ quét các trang đầu của `https://vui.mobi/truyen/`, đối chiếu `sourceId` và `latestChapNumber` với MongoDB — chỉ tải thêm những bộ mới hoặc các chap mới tăng thêm (nhẹ nhàng, không gây quá tải nguồn).
- **Cào tức thời khi người đọc mở chap chưa tải (`Lazy Crawl`)**:
  - Với các bộ truyện dài hàng trăm chap (như *Doraemon 823 chap*, *7 Viên Ngọc Rồng 520 chap*), hệ thống lập chỉ mục toàn bộ danh sách chap ngay lập tức, tải trước các chap đầu & mới nhất, và tự động tải + lưu vĩnh viễn vào MongoDB ngay khi độc giả bấm đọc bất kỳ chap nào ở giữa.
- **Lưu link ảnh gốc + Image Proxy dự phòng (`/api/image-proxy`)**:
  - Thành phần `SmartImage` tải trực tiếp ảnh gốc với `no-referrer` giúp nhẹ ổ cứng và nhanh; nếu ảnh gặp chặn hiển thị từ máy chủ ảnh gốc sẽ tự động chuyển qua `/api/image-proxy` có cache.
- **Trình đọc tối ưu cho cả Truyện Tranh & Truyện Chữ**:
  - Truyện tranh: Chế độ cuộn dọc nền tối sắc nét, chuyển chap bằng phím mũi tên `←` / `→`.
  - Truyện chữ: Chỉnh cỡ chữ, phông chữ (Sách/Hiện đại), chủ đề màu nền (Sáng / Giấy ấm Sepia / Ban đêm).
  - Tự động lưu lịch sử đọc dở vào trình duyệt.
- **Trang Quản trị Crawler (`/admin`)**:
  - Theo dõi trạng thái kết nối MongoDB, thống kê số truyện/số chap, xem log trực tiếp theo thời gian thực.
  - Bấm quét cập nhật ngay, cào hàng loạt theo trang/chuyên mục, cào 1 bộ bất kỳ qua link, hoặc chỉnh chu kỳ tự động quét mà không cần khởi động lại server.

## Cấu hình & Chạy dự án

1. Kiểm tra file `.env.local`:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/truyen_vui
SOURCE_BASE_URL=https://vui.mobi
CRAWL_INTERVAL_MINUTES=20
ADMIN_SECRET=
```

2. Chạy môi trường phát triển:
```bash
npm run dev
```

3. Mở trình duyệt:
- Trang đọc truyện: http://localhost:3000
- Trang quản trị Crawler: http://localhost:3000/admin
