import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
        <BookOpen className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Không tìm thấy trang hoặc bộ truyện
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Đường dẫn bạn truy cập không tồn tại hoặc bộ truyện chưa được đồng bộ về hệ thống.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        Quay về Trang chủ
      </Link>
    </div>
  );
}
