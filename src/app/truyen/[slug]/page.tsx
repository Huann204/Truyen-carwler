import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  ArrowRightCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  FolderOpen,
  Play,
  Star,
  Tag,
  User,
} from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { Story } from "@/models/Story";
import {
  getCachedChapterList,
  getCachedRelatedStories,
  getCachedStoryDetail,
} from "@/lib/queries";
import SmartImage from "@/components/SmartImage";
import ChapterListClient from "@/components/ChapterListClient";
import StoryCard from "@/components/StoryCard";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface StoryDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function StoryDetailPage({
  params,
}: StoryDetailPageProps) {
  const { slug } = await params;

  const [story, chapters] = await Promise.all([
    getCachedStoryDetail(slug),
    getCachedChapterList(slug),
  ]);

  if (!story) {
    notFound();
  }

  // Non-blocking background view increment
  after(async () => {
    try {
      await connectDB();
      await Story.updateOne({ slug }, { $inc: { views: 1 } }).exec();
    } catch {
      // ignore view count errors
    }
  });

  const relatedStories = await getCachedRelatedStories(
    story.categorySlug,
    slug
  );

  const firstChap = chapters[0]?.chapNumber || "1";
  const latestChap =
    chapters[chapters.length - 1]?.chapNumber || story.latestChapNumber || "1";
  const totalViews = (story.views || 0) + (story.sourceViews || 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-slate-500 mb-4 flex flex-wrap items-center gap-1.5">
        <Link href="/" className="hover:text-indigo-600">
          Trang chủ
        </Link>
        <span>/</span>
        <Link
          href={`/?category=${encodeURIComponent(story.categorySlug)}`}
          className="hover:text-indigo-600"
        >
          {story.category}
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate max-w-xs">
          {story.title}
        </span>
      </nav>

      {/* Story Info Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-40 sm:w-48 mx-auto sm:mx-0 shrink-0">
            <div className="aspect-[5/7] rounded-2xl overflow-hidden shadow-md bg-slate-900">
              <SmartImage
                src={story.coverUrl}
                alt={story.title}
                fallbackTitle={story.title}
                priority
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
                    story.storyType === "comic"
                      ? "bg-rose-600"
                      : "bg-indigo-600"
                  }`}
                >
                  {story.storyType === "comic" ? "Truyện Tranh" : "Truyện Chữ"}
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    story.status === "completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {story.status === "completed" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn thành
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" /> Đang tiến hành
                    </>
                  )}
                </span>

                <Link
                  href={`/?category=${encodeURIComponent(story.categorySlug)}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {story.category}
                </Link>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-3">
                {story.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Tác giả:</span>
                  <Link
                    href={`/?q=${encodeURIComponent(story.author)}`}
                    className="font-semibold text-indigo-600 hover:underline truncate"
                  >
                    {story.author}
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Lượt xem:</span>
                  <strong className="text-slate-800">
                    {totalViews.toLocaleString("vi-VN")}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Số chương:</span>
                  <strong className="text-slate-800">
                    {story.hasMultipleChapters
                      ? `${story.totalChapters} chap`
                      : "Truyện ngắn (1 chương)"}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <span>Đánh giá:</span>
                  <strong className="text-slate-800">
                    {(story.rating || 5).toFixed(1)} / 5.0
                  </strong>
                  <span className="text-xs text-slate-400">
                    • {formatRelativeTime(story.lastChapterUpdatedAt)}
                  </span>
                </div>
              </div>

              {story.tags && story.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <Tag className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                  {story.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/?q=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              <Link
                href={`/truyen/${story.slug}/${encodeURIComponent(firstChap)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
              >
                <Play className="w-4 h-4 fill-white" />
                {story.hasMultipleChapters ? "Đọc Từ Đầu" : "Đọc Truyện Ngay"}
              </Link>

              {story.hasMultipleChapters && latestChap !== firstChap && (
                <Link
                  href={`/truyen/${story.slug}/${encodeURIComponent(latestChap)}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  Chap Mới Nhất (C.{latestChap})
                </Link>
              )}
            </div>
          </div>
        </div>

        {story.description && (
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-500 mb-2">
              Tóm tắt nội dung
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {story.description}
            </p>
          </div>
        )}
      </div>

      <ChapterListClient storySlug={story.slug} chapters={chapters} />

      {relatedStories.length > 0 && (
        <section className="mt-8">
          <h2 className="font-extrabold text-base sm:text-lg text-slate-900 mb-3">
            Cùng chuyên mục {story.category}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
            {relatedStories.map((rel) => (
              <StoryCard key={rel.slug} story={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
