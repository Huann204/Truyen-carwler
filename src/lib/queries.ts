import { connectDB } from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { Chapter } from "@/models/Chapter";
import { ensureChapterCrawled } from "@/lib/crawler/engine";
import {
  chapterCache,
  gridCache,
  metaCache,
  storyCache,
} from "@/lib/cache";
import type { StoryCardData } from "@/components/StoryCard";
import type { ChapterItemDTO } from "@/components/ChapterListClient";

const CARD_PROJECTION =
  "slug title coverUrl author storyType hasMultipleChapters category totalChapters latestChapNumber views sourceViews rating lastChapterUpdatedAt";

function mapToCard(s: Record<string, unknown>): StoryCardData {
  return {
    slug: String(s.slug),
    title: String(s.title),
    coverUrl: String(s.coverUrl || ""),
    author: String(s.author || "Đang cập nhật"),
    storyType: s.storyType === "comic" ? "comic" : "text",
    hasMultipleChapters: Boolean(s.hasMultipleChapters),
    category: String(s.category || "Truyện"),
    totalChapters: Number(s.totalChapters || 1),
    latestChapNumber: String(s.latestChapNumber || "1"),
    views: Number(s.views || 0),
    sourceViews: Number(s.sourceViews || 0),
    rating: Number(s.rating || 5),
    lastChapterUpdatedAt: s.lastChapterUpdatedAt
      ? new Date(s.lastChapterUpdatedAt as string | Date).toISOString()
      : undefined,
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface CategoryGroupDTO {
  _id: string;
  name: string;
  count: number;
}

export async function getCachedCategories(): Promise<CategoryGroupDTO[]> {
  return metaCache.getOrLoadSWR<CategoryGroupDTO[]>(
    "categories:top12",
    180,
    1800,
    async () => {
      await connectDB();
      return Story.aggregate<CategoryGroupDTO>([
        {
          $group: {
            _id: "$categorySlug",
            name: { $first: "$category" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]);
    },
    (d) => d.length > 0
  );
}

export async function getCachedHotStories(): Promise<StoryCardData[]> {
  return metaCache.getOrLoadSWR<StoryCardData[]>(
    "hot:top6",
    120,
    1800,
    async () => {
      await connectDB();
      const raw = await Story.find()
        .select(CARD_PROJECTION)
        .sort({ sourceViews: -1, views: -1 })
        .limit(6)
        .lean();
      return raw.map((s) =>
        mapToCard(s as unknown as Record<string, unknown>)
      );
    },
    (d) => d.length > 0
  );
}

export async function getCachedStoryGrid(params: {
  q: string;
  type: string;
  status: string;
  categorySlug: string;
  sort: string;
  page: number;
  pageSize: number;
}): Promise<{ stories: StoryCardData[]; totalCount: number }> {
  const cacheKey = `grid:${JSON.stringify(params)}`;
  return gridCache.getOrLoadSWR<{
    stories: StoryCardData[];
    totalCount: number;
  }>(
    cacheKey,
    60,
    1800,
    async () => {
      await connectDB();
      const filter: Record<string, unknown> = {};
      if (params.type) filter.storyType = params.type;
      if (params.status) filter.status = params.status;
      if (params.categorySlug) filter.categorySlug = params.categorySlug;
      if (params.q) {
        const rx = new RegExp(escapeRegex(params.q), "i");
        filter.$or = [{ title: rx }, { author: rx }, { tags: rx }];
      }

      const sortSpec: Record<string, 1 | -1> =
        params.sort === "views"
          ? { sourceViews: -1, views: -1 }
          : { lastChapterUpdatedAt: -1, _id: -1 };

      const [totalCount, raw] = await Promise.all([
        Object.keys(filter).length === 0
          ? Story.estimatedDocumentCount()
          : Story.countDocuments(filter),
        Story.find(filter)
          .select(CARD_PROJECTION)
          .sort(sortSpec)
          .skip((params.page - 1) * params.pageSize)
          .limit(params.pageSize)
          .lean(),
      ]);

      return {
        totalCount,
        stories: raw.map((s) =>
          mapToCard(s as unknown as Record<string, unknown>)
        ),
      };
    },
    (d) => d.totalCount > 0
  );
}

export interface StoryDetailDTO {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  author: string;
  status: "ongoing" | "completed";
  storyType: "comic" | "text";
  hasMultipleChapters: boolean;
  category: string;
  categorySlug: string;
  tags: string[];
  description: string;
  totalChapters: number;
  latestChapNumber: string;
  views: number;
  sourceViews: number;
  rating: number;
  lastChapterUpdatedAt: string;
}

export async function getCachedStoryDetail(
  slug: string
): Promise<StoryDetailDTO | null> {
  return storyCache.getOrLoadSWR<StoryDetailDTO | null>(
    `story:${slug}`,
    120,
    1800,
    async () => {
      await connectDB();
      const s = await Story.findOne({ slug }).lean();
      if (!s) return null;

      return {
        id: String(s._id),
        slug: s.slug,
        title: s.title,
        coverUrl: s.coverUrl || "",
        author: s.author || "Đang cập nhật",
        status: s.status,
        storyType: s.storyType,
        hasMultipleChapters: Boolean(s.hasMultipleChapters),
        category: s.category || "Truyện",
        categorySlug: s.categorySlug || "truyen",
        tags: s.tags || [],
        description: s.description || "",
        totalChapters: s.totalChapters || 1,
        latestChapNumber: s.latestChapNumber || "1",
        views: s.views || 0,
        sourceViews: s.sourceViews || 0,
        rating: s.rating || 5,
        lastChapterUpdatedAt: s.lastChapterUpdatedAt
          ? new Date(s.lastChapterUpdatedAt).toISOString()
          : new Date().toISOString(),
      };
    },
    (d) => d !== null
  );
}

export async function getCachedChapterList(
  slug: string
): Promise<ChapterItemDTO[]> {
  return storyCache.getOrLoadSWR<ChapterItemDTO[]>(
    `chapters:${slug}`,
    120,
    1800,
    async () => {
      await connectDB();
      const raw = await Chapter.find(
        { storySlug: slug },
        {
          chapNumber: 1,
          chapOrder: 1,
          title: 1,
          publishedAtText: 1,
          isCrawled: 1,
        }
      )
        .sort({ chapOrder: 1 })
        .lean();

      return raw.map((c) => ({
        chapNumber: c.chapNumber,
        chapOrder: c.chapOrder,
        title: c.title || `Chap ${c.chapNumber}`,
        publishedAtText: c.publishedAtText || "",
        isCrawled: Boolean(c.isCrawled),
      }));
    },
    (d) => d.length > 0
  );
}

export async function getCachedRelatedStories(
  categorySlug: string,
  excludeSlug: string
): Promise<StoryCardData[]> {
  return storyCache.getOrLoadSWR<StoryCardData[]>(
    `related:${categorySlug}:${excludeSlug}`,
    180,
    1800,
    async () => {
      await connectDB();
      const raw = await Story.find({
        categorySlug,
        slug: { $ne: excludeSlug },
      })
        .select(CARD_PROJECTION)
        .sort({ lastChapterUpdatedAt: -1 })
        .limit(6)
        .lean();

      return raw.map((s) =>
        mapToCard(s as unknown as Record<string, unknown>)
      );
    }
  );
}

export interface ChapterContentDTO {
  id: string;
  storySlug: string;
  chapNumber: string;
  title: string;
  contentType: "comic" | "text";
  images: string[];
  contentHtml: string;
  isCrawled: boolean;
}

export async function getCachedChapterContent(
  storySlug: string,
  chapNumber: string
): Promise<ChapterContentDTO | null> {
  return chapterCache.getOrLoadSWR<ChapterContentDTO | null>(
    `chap:${storySlug}:${chapNumber}`,
    600,
    3600,
    async () => {
      const ch = await ensureChapterCrawled(storySlug, chapNumber);
      if (!ch) return null;

      return {
        id: String(ch._id),
        storySlug: ch.storySlug,
        chapNumber: ch.chapNumber,
        title: ch.title || `Chap ${ch.chapNumber}`,
        contentType: ch.contentType,
        images: ch.images || [],
        contentHtml: ch.contentHtml || "",
        isCrawled: Boolean(ch.isCrawled),
      };
    },
    (d) => Boolean(d && d.isCrawled && (d.images.length > 0 || d.contentHtml))
  );
}
