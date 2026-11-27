import Link from "next/link";
import { BookOpen, Search, Settings } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold text-lg text-slate-900 hover:text-indigo-600 transition-colors shrink-0"
          >
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </span>
            <span>
              Truyện<span className="text-indigo-600">Mới</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Mới cập nhật
            </Link>
            <Link
              href="/?type=comic"
              className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Truyện Tranh
            </Link>
            <Link
              href="/?type=text"
              className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Truyện Chữ
            </Link>
            <Link
              href="/?status=completed"
              className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              Hoàn thành
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2.5 flex-1 justify-end max-w-md">
          <form action="/" method="get" className="relative flex-1 max-w-xs">
            <input
              type="search"
              name="q"
              placeholder="Tìm tên truyện, tác giả..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-full border border-slate-200 bg-slate-100 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-indigo-600 transition-colors shrink-0"
            title="Quản trị & Tự động cào truyện"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Crawler</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
