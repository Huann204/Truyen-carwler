import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Flame,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { checkDBHealth } from "@/lib/mongodb";
import {
  getCachedCategories,
  getCachedHotStories,
  getCachedStoryGrid,
} from "@/lib/queries";
import StoryCard from "@/components/StoryCard";
import ContinueReadingBar from "@/components/ContinueReadingBar";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
}

function StoriesSectionSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-24 rounded-2xl bg-slate-200/80" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden"
          >
            <div className="aspect-[5/7] bg-slate-200" />
            <div className="p-2.5 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-4/5" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function HomeStoriesSection({
  q,
  type,
  status,
  categorySlug,
  sort,
  page,
}: {
  q: string;
  type: string;
  status: string;
  categorySlug: string;
  sort: string;
  page: number;
}) {
  const health = await checkDBHealth();

  if (!health.connected) {
    return (
      <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">
              Chưa kết nối được tới MongoDB
            </h2>
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">
              Hệ thống đang cấu hình kết nối tới{" "}
              <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs">
                {health.uriMasked}
              </code>{" "}
              nhưng chưa phản hồi ({health.error}).
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <RefreshCw className="w-4 h-4" />
                Thử kết nối lại
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Mở trang Quản trị Crawler
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pageSize = 24;
  const isDefaultHome = !q && !type && !status && !categorySlug && page === 1;

  const [{ totalCount, stories }, hotStories, categoryGroups] = await Promise.all([
    getCachedStoryGrid({
      q,
      type,
      status,
      categorySlug,
      sort,
      page,
      pageSize,
    }),
    isDefaultHome ? getCachedHotStories() : Promise.resolve([]),
    getCachedCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const buildFilterHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q: q || undefined,
      type: type || undefined,
      status: status || undefined,
      category: categorySlug || undefined,
      sort: sort !== "latest" ? sort : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const str = params.toString();
    return str ? `/?${str}` : "/";
  };

  if (totalCount === 0 && !q && !type && !status && !categorySlug) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-8 sm:p-12 text-center my-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">
          Kho truyện đang khởi tạo dữ liệu đầu tiên
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
          MongoDB đã kết nối thành công! Hệ thống tự động cào đang chạy ngầm, hoặc bạn có thể vào trang Quản trị để bấm cào ngay và theo dõi log trực tiếp.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <RefreshCw className="w-4 h-4" />
            Mở Quản Trị &amp; Bấm Cào Ngay
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Làm mới trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {hotStories.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 inline-flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
              Truyện Đang Hot
            </h2>
            <Link
              href="/?sort=views"
              className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Xem bảng xếp hạng »
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
            {hotStories.map((st) => (
              <StoryCard key={`hot-${st.slug}`} story={st} />
            ))}
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">
            Định dạng:
          </span>
          {[
            { label: "Tất cả", val: undefined },
            { label: "Truyện Tranh", val: "comic" },
            { label: "Truyện Chữ", val: "text" },
          ].map((opt) => {
            const active = (type || undefined) === opt.val;
            return (
              <Link
                key={opt.label}
                href={buildFilterHref({ type: opt.val, page: undefined })}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}

          <span className="text-xs font-bold text-slate-500 ml-2 mr-1">
            Tình trạng:
          </span>
          {[
            { label: "Tất cả", val: undefined },
            { label: "Đang tiến hành", val: "ongoing" },
            { label: "Hoàn thành", val: "completed" },
          ].map((opt) => {
            const active = (status || undefined) === opt.val;
            return (
              <Link
                key={opt.label}
                href={buildFilterHref({ status: opt.val, page: undefined })}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        {categoryGroups.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 mr-1">
              Chuyên mục:
            </span>
            <Link
              href={buildFilterHref({ category: undefined, page: undefined })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                !categorySlug
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tất cả
            </Link>
            {categoryGroups.map((cat) => (
              <Link
                key={cat._id}
                href={buildFilterHref({ category: cat._id, page: undefined })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  categorySlug === cat._id
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cat.name}{" "}
                <span className="opacity-60">({cat.count})</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            {q ? `Kết quả tìm kiếm: "${q}"` : "Truyện Mới Cập Nhật"}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200/80 text-slate-700">
            {totalCount.toLocaleString("vi-VN")} bộ
          </span>
        </div>

        <div className="inline-flex rounded-full bg-white border border-slate-200 p-0.5 text-xs font-semibold">
          <Link
            href={buildFilterHref({ sort: undefined, page: undefined })}
            className={`px-3 py-1 rounded-full ${
              sort === "latest"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mới cập nhật
          </Link>
          <Link
            href={buildFilterHref({ sort: "views", page: undefined })}
            className={`px-3 py-1 rounded-full ${
              sort === "views"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Xem nhiều
          </Link>
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          Không tìm thấy bộ truyện nào khớp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {stories.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 flex-wrap">
          {page > 1 && (
            <Link
              href={buildFilterHref({ page: String(page - 1) })}
              className="px-3.5 py-1.5 rounded-full text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-100"
            >
              « Trang trước
            </Link>
          )}
          <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-indigo-600 text-white">
            Trang {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildFilterHref({ page: String(page + 1) })}
              className="px-3.5 py-1.5 rounded-full text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-100"
            >
              Trang sau »
            </Link>
          )}
        </div>
      )}
    </>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const type = sp.type === "comic" || sp.type === "text" ? sp.type : "";
  const status =
    sp.status === "ongoing" || sp.status === "completed" ? sp.status : "";
  const categorySlug = (sp.category || "").trim();
  const sort = sp.sort === "views" ? "views" : "latest";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const filterKey = `${q}|${type}|${status}|${categorySlug}|${sort}|${page}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 mb-6 shadow-md">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-amber-300 border border-white/10 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Tự động đồng bộ truyện &amp; chap mới liên tục
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
            Cổng Đọc Truyện Tranh &amp; Truyện Chữ
          </h1>
          <p className="text-slate-300 text-sm mb-5">
            Đọc mượt mà trên điện thoại và máy tính — tự động kiểm tra và cập nhật ngay khi có chương mới.
          </p>

          <form action="/" method="get" className="max-w-lg mx-auto flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Nhập tên truyện, tác giả, thể loại..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer shrink-0"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </div>

      <ContinueReadingBar />

      <Suspense key={filterKey} fallback={<StoriesSectionSkeleton />}>
        <HomeStoriesSection
          q={q}
          type={type}
          status={status}
          categorySlug={categorySlug}
          sort={sort}
          page={page}
        />
      </Suspense>
    </div>
  );
}
