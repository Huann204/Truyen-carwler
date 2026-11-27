import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TruyệnMới - Đọc Truyện Tranh & Truyện Chữ Tự Động Cập Nhật",
  description:
    "Kho đọc truyện tranh manga và truyện chữ cập nhật chương mới tự động nhanh chóng, giao diện mượt mà trên mọi thiết bị.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="dns-prefetch" href="https://dilib.vn" />
        <link rel="preconnect" href="https://dilib.vn" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://vui.mobi" />
        <link rel="preconnect" href="https://vui.mobi" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 mt-12">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <div>
              <strong className="text-slate-800">TruyệnMới</strong> — Hệ thống đọc truyện &amp; tự động cập nhật chương mới.
            </div>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:text-indigo-600 transition-colors">
                Trang chủ
              </a>
              <a href="/?type=comic" className="hover:text-indigo-600 transition-colors">
                Truyện Tranh
              </a>
              <a href="/?type=text" className="hover:text-indigo-600 transition-colors">
                Truyện Chữ
              </a>
              <a href="/admin" className="hover:text-indigo-600 transition-colors font-medium">
                Quản trị Crawler
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
