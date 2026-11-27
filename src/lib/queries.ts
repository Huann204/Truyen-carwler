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
  const key = "categories:top12";
  const hit = metaCache.get(key) as CategoryGroupDTO[] | undefined;
  if (hit) return hit;

  await connectDB();
  const data = await Story.aggregate<CategoryGroupDTO>([
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

  if (data.length > 0) {
    metaCache.set(key, data, 180);
  }
  return data;
}

export async function getCachedHotStories(): Promise<StoryCardData[]> {
  const key = "hot:top6";
  const hit = metaCache.get(key) as StoryCardData[] | undefined;
  if (hit) return hit;

  await connectDB();
  const raw = await Story.find()
    .select(CARD_PROJECTION)
    .sort({ sourceViews: -1, views: -1 })
    .limit(6)
    .lean();

  const mapped = raw.map((s) =>
    mapToCard(s as unknown as Record<string, unknown>)
  );
  if (mapped.length > 0) {
    metaCache.set(key, mapped, 120);
  }
  return mapped;
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
  const hit = gridCache.get(cacheKey) as
    | { stories: StoryCardData[]; totalCount: number }
    | undefined;
  if (hit) return hit;

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

  const result = {
    totalCount,
    stories: raw.map((s) =>
      mapToCard(s as unknown as Record<string, unknown>)
    ),
  };

  if (totalCount > 0) {
    gridCache.set(cacheKey, result, 60);
  }
  return result;
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
  const key = `story:${slug}`;
  const hit = storyCache.get(key) as StoryDetailDTO | undefined;
  if (hit) return hit;

  await connectDB();
  const s = await Story.findOne({ slug }).lean();
  if (!s) return null;

  const dto: StoryDetailDTO = {
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

  storyCache.set(key, dto, 120);
  return dto;
}

export async function getCachedChapterList(
  slug: string
): Promise<ChapterItemDTO[]> {
  const key = `chapters:${slug}`;
  const hit = storyCache.get(key) as ChapterItemDTO[] | undefined;
  if (hit) return hit;

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

  const mapped: ChapterItemDTO[] = raw.map((c) => ({
    chapNumber: c.chapNumber,
    chapOrder: c.chapOrder,
    title: c.title || `Chap ${c.chapNumber}`,
    publishedAtText: c.publishedAtText || "",
    isCrawled: Boolean(c.isCrawled),
  }));

  if (mapped.length > 0) {
    storyCache.set(key, mapped, 120);
  }
  return mapped;
}

export async function getCachedRelatedStories(
  categorySlug: string,
  excludeSlug: string
): Promise<StoryCardData[]> {
  const key = `related:${categorySlug}:${excludeSlug}`;
  const hit = storyCache.get(key) as StoryCardData[] | undefined;
  if (hit) return hit;

  await connectDB();
  const raw = await Story.find({
    categorySlug,
    slug: { $ne: excludeSlug },
  })
    .select(CARD_PROJECTION)
    .sort({ lastChapterUpdatedAt: -1 })
    .limit(6)
    .lean();

  const mapped = raw.map((s) =>
    mapToCard(s as unknown as Record<string, unknown>)
  );
  storyCache.set(key, mapped, 180);
  return mapped;
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
  const key = `chap:${storySlug}:${chapNumber}`;
  const hit = chapterCache.get(key) as ChapterContentDTO | undefined;
  if (hit) return hit;

  const ch = await ensureChapterCrawled(storySlug, chapNumber);
  if (!ch) return null;

  const dto: ChapterContentDTO = {
    id: String(ch._id),
    storySlug: ch.storySlug,
    chapNumber: ch.chapNumber,
    title: ch.title || `Chap ${ch.chapNumber}`,
    contentType: ch.contentType,
    images: ch.images || [],
    contentHtml: ch.contentHtml || "",
    isCrawled: Boolean(ch.isCrawled),
  };

  if (dto.isCrawled && (dto.images.length > 0 || dto.contentHtml)) {
    chapterCache.set(key, dto, 600);
  }
  return dto;
}
