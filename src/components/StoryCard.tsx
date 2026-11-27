import Link from "next/link";
import { Eye, Star } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { formatRelativeTime } from "@/lib/utils";

export interface StoryCardData {
  slug: string;
  title: string;
  coverUrl: string;
  author: string;
  storyType: "comic" | "text";
  hasMultipleChapters: boolean;
  category: string;
  totalChapters: number;
  latestChapNumber: string;
  views: number;
  sourceViews: number;
  rating: number;
  lastChapterUpdatedAt?: Date | string;
}

export default function StoryCard({ story }: { story: StoryCardData }) {
  const displayViews = (story.views || 0) + (story.sourceViews || 0);
  const chapBadge = story.hasMultipleChapters
    ? `Chap ${story.latestChapNumber}`
    : "Truyện ngắn";

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col h-full">
      <Link
        href={`/truyen/${story.slug}`}
        prefetch={false}
        className="relative block aspect-[5/7] bg-slate-900 overflow-hidden"
      >
        <SmartImage
          src={story.coverUrl}
          alt={story.title}
          fallbackTitle={story.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        <span
          className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold text-white shadow-xs ${
            story.storyType === "comic" ? "bg-rose-600/95" : "bg-indigo-600/95"
          }`}
        >
          {chapBadge}
        </span>

        <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900/75 text-amber-400 backdrop-blur-xs">
          <Star className="w-3 h-3 fill-amber-400" />
          {(story.rating || 5).toFixed(1)}
        </span>

        <span className="absolute bottom-2 left-2 max-w-[85%] truncate px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-900/80 text-slate-100 backdrop-blur-xs">
          {story.category}
        </span>
      </Link>

      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
            <Link href={`/truyen/${story.slug}`} prefetch={false} title={story.title}>
              {story.title}
            </Link>
          </h3>
          <p className="text-xs text-slate-500 truncate mt-1">{story.author}</p>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            {displayViews.toLocaleString("vi-VN")}
          </span>

          <Link
            href={`/truyen/${story.slug}/${encodeURIComponent(story.latestChapNumber || "1")}`}
            prefetch={false}
            className="font-semibold text-indigo-600 hover:text-indigo-700"
          >
            {story.hasMultipleChapters
              ? `Đọc C.${story.latestChapNumber} »`
              : "Đọc ngay »"}
          </Link>
        </div>
        {story.lastChapterUpdatedAt && (
          <div className="text-[10px] text-slate-400 mt-1">
            {formatRelativeTime(story.lastChapterUpdatedAt)}
          </div>
        )}
      </div>
    </div>
  );
}
