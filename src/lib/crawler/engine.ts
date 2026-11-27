import { connectDB } from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { Chapter, type IChapter } from "@/models/Chapter";
import { CrawlerLog } from "@/models/CrawlerLog";
import { CrawlerConfig, type ICrawlerConfig } from "@/models/CrawlerConfig";
import {
  parseChapterPage,
  parseStoryDetailPage,
  parseStoryListPage,
  type ListedStoryCard,
} from "@/lib/crawler/parser";
import { resolveSourceUrl, SOURCE_BASE_URL, sleep } from "@/lib/utils";
import { invalidateAllStoryCaches } from "@/lib/cache";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface CrawlerLiveState {
  isRunning: boolean;
  stopRequested: boolean;
  startedAt: string | null;
  currentTask: string;
  processedCount: number;
  totalTarget: number;
  storiesAdded: number;
  storiesUpdated: number;
  chaptersCrawled: number;
  errorsCount: number;
  recentLogs: string[];
}

declare global {
  // eslint-disable-next-line no-var
  var _crawlerLiveState: CrawlerLiveState | undefined;
}

function getLiveState(): CrawlerLiveState {
  if (!global._crawlerLiveState) {
    global._crawlerLiveState = {
      isRunning: false,
      stopRequested: false,
      startedAt: null,
      currentTask: "Đang nghỉ",
      processedCount: 0,
      totalTarget: 0,
      storiesAdded: 0,
      storiesUpdated: 0,
      chaptersCrawled: 0,
      errorsCount: 0,
      recentLogs: [],
    };
  }
  return global._crawlerLiveState;
}

export function getCrawlerLiveStatus(): CrawlerLiveState {
  return {
    ...getLiveState(),
    recentLogs: [...getLiveState().recentLogs],
  };
}

export function requestStopCrawler(): void {
  const state = getLiveState();
  if (state.isRunning) {
    state.stopRequested = true;
    pushLiveLog("⏹ Đã nhận yêu cầu dừng an toàn sau tác vụ hiện tại...");
  }
}

function pushLiveLog(line: string) {
  const state = getLiveState();
  const ts = new Date().toLocaleTimeString("vi-VN", { hour12: false });
  state.recentLogs.unshift(`[${ts}] ${line}`);
  if (state.recentLogs.length > 80) {
    state.recentLogs.length = 80;
  }
}

export async function fetchHtmlPage(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(18000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} khi tải ${url}`);
      }

      const html = await res.text();
      if (
        html.includes("cf-turnstile") ||
        html.includes("Verify you are human") ||
        html.includes("g-recaptcha")
      ) {
        throw new Error(
          "Trang nguồn bật CAPTCHA / anti-bot — đã dừng an toàn."
        );
      }
      return html;
    } catch (err) {
      lastError = err;
      if (attempt === 0) {
        await sleep(500);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function getOrCreateCrawlerConfig(): Promise<ICrawlerConfig> {
  await connectDB();
  let cfg = await CrawlerConfig.findOne({ key: "main" });
  if (!cfg) {
    const defaultInterval =
      parseInt(process.env.CRAWL_INTERVAL_MINUTES || "20", 10) || 20;
    cfg = await CrawlerConfig.create({
      key: "main",
      autoCrawlEnabled: true,
      intervalMinutes: defaultInterval,
      pagesPerAutoRun: 2,
      initialChapLimit: 10,
      requestDelayMs: 350,
      scope: "all",
      nextAutoRunAt: new Date(Date.now() + defaultInterval * 60_000),
    });
  }
  return cfg;
}

export async function syncSingleStory(params: {
  sourceUrl: string;
  cardHint?: Partial<ListedStoryCard>;
  initialChapLimit: number;
  delayMs: number;
  crawlAllMissing?: boolean;
}): Promise<{
  isNew: boolean;
  chaptersCrawled: number;
  newChaptersFound: number;
  title: string;
  slug: string;
}> {
  await connectDB();
  const fullUrl = resolveSourceUrl(params.sourceUrl);
  const html = await fetchHtmlPage(fullUrl);
  const parsed = parseStoryDetailPage(
    html,
    fullUrl,
    params.cardHint?.coverUrl || ""
  );

  if (!parsed) {
    throw new Error(`URL không đúng định dạng truyện: ${fullUrl}`);
  }

  const existingStory = await Story.findOne({ sourceId: parsed.sourceId });
  const isNew = !existingStory;
  const now = new Date();

  // Single-post text story
  if (!parsed.hasMultipleChapters) {
    const storyDoc = await Story.findOneAndUpdate(
      { sourceId: parsed.sourceId },
      {
        $set: {
          slug: parsed.slug,
          sourceUrl: parsed.sourceUrl,
          title: parsed.title,
          coverUrl: parsed.coverUrl || params.cardHint?.coverUrl || "",
          author:
            parsed.author !== "Đang cập nhật"
              ? parsed.author
              : params.cardHint?.author || "Sưu tầm",
          status: "completed",
          storyType: "text",
          hasMultipleChapters: false,
          category: parsed.category || params.cardHint?.category || "Truyện Chữ",
          categorySlug: parsed.categorySlug,
          tags: parsed.tags,
          description: parsed.description,
          totalChapters: 1,
          crawledChaptersCount: 1,
          latestChapNumber: "1",
          latestChapTitle: "Toàn văn",
          sourceViews: Math.max(
            parsed.sourceViews,
            params.cardHint?.sourceViews || 0
          ),
          rating: parsed.rating,
          lastSyncedAt: now,
        },
        $setOnInsert: {
          lastChapterUpdatedAt: now,
        },
      },
      { upsert: true, new: true }
    );

    await Chapter.findOneAndUpdate(
      { storySlug: storyDoc.slug, chapNumber: "1" },
      {
        $set: {
          storyId: storyDoc._id,
          storySlug: storyDoc.slug,
          sourceStoryId: parsed.sourceId,
          chapNumber: "1",
          chapOrder: 1,
          title: "Toàn văn",
          sourceUrl: parsed.sourceUrl,
          contentType: "text",
          images: [],
          contentHtml:
            parsed.singlePostContentHtml || `<p>${parsed.description}</p>`,
          publishedAtText: parsed.chapters[0]?.publishedAtText || "",
          isCrawled: true,
        },
      },
      { upsert: true, new: true }
    );

    invalidateAllStoryCaches(storyDoc.slug);

    return {
      isNew,
      chaptersCrawled: isNew ? 1 : 0,
      newChaptersFound: isNew ? 1 : 0,
      title: storyDoc.title,
      slug: storyDoc.slug,
    };
  }

  // Multi-chapter story (Manga / Long Novel)
  const latestStub = parsed.chapters[parsed.chapters.length - 1];
  const storyDoc = await Story.findOneAndUpdate(
    { sourceId: parsed.sourceId },
    {
      $set: {
        slug: parsed.slug,
        sourceUrl: parsed.sourceUrl,
        title: parsed.title,
        coverUrl: parsed.coverUrl || params.cardHint?.coverUrl || "",
        author: parsed.author,
        status: parsed.status,
        storyType: parsed.storyType,
        hasMultipleChapters: true,
        category: parsed.category,
        categorySlug: parsed.categorySlug,
        tags: parsed.tags,
        description: parsed.description,
        totalChapters: parsed.chapters.length,
        latestChapNumber: latestStub?.chapNumber || "1",
        latestChapTitle: latestStub?.title || "",
        sourceViews: Math.max(
          parsed.sourceViews,
          params.cardHint?.sourceViews || 0
        ),
        rating: parsed.rating,
        lastSyncedAt: now,
      },
      $setOnInsert: {
        lastChapterUpdatedAt: now,
      },
    },
    { upsert: true, new: true }
  );

  const existingChaps = await Chapter.find(
    { storySlug: storyDoc.slug },
    { chapNumber: 1, isCrawled: 1 }
  ).lean();
  const existingMap = new Map<string, boolean>();
  for (const ch of existingChaps) {
    existingMap.set(ch.chapNumber, Boolean(ch.isCrawled));
  }

  const newStubs = parsed.chapters.filter(
    (ch) => !existingMap.has(ch.chapNumber)
  );

  if (parsed.chapters.length > 0) {
    await Chapter.bulkWrite(
      parsed.chapters.map((ch) => ({
        updateOne: {
          filter: { storySlug: storyDoc.slug, chapNumber: ch.chapNumber },
          update: {
            $set: {
              storyId: storyDoc._id,
              sourceStoryId: parsed.sourceId,
              chapOrder: ch.chapOrder,
              title: ch.title,
              sourceUrl: ch.sourceUrl,
              publishedAtText: ch.publishedAtText,
            },
            $setOnInsert: {
              contentType: parsed.storyType,
              images: [],
              contentHtml: "",
              isCrawled: false,
            },
          },
          upsert: true,
        },
      }))
    );
  }

  if (!isNew && newStubs.length > 0) {
    await Story.updateOne(
      { _id: storyDoc._id },
      { $set: { lastChapterUpdatedAt: now } }
    );
  }

  let targetsToCrawl = newStubs;
  if (params.crawlAllMissing) {
    targetsToCrawl = parsed.chapters.filter(
      (ch) => !existingMap.get(ch.chapNumber)
    );
  } else if (isNew) {
    if (parsed.chapters.length <= params.initialChapLimit) {
      targetsToCrawl = [...parsed.chapters];
    } else {
      const firstChap = parsed.chapters[0];
      const tailChaps = parsed.chapters.slice(
        -Math.max(1, params.initialChapLimit - 1)
      );
      const selected = new Map<string, (typeof parsed.chapters)[0]>();
      if (firstChap) selected.set(firstChap.chapNumber, firstChap);
      for (const tc of tailChaps) selected.set(tc.chapNumber, tc);
      targetsToCrawl = Array.from(selected.values());
    }
  } else if (newStubs.length > 30) {
    targetsToCrawl = newStubs.slice(-30);
  }

  const state = getLiveState();
  let chaptersCrawled = 0;
  let detectedType: "comic" | "text" | null = null;

  for (const stub of targetsToCrawl) {
    if (state.stopRequested) break;
    try {
      state.currentTask = `Đang tải ${storyDoc.title} — Chap ${stub.chapNumber}`;
      await sleep(params.delayMs);
      const chapHtml = await fetchHtmlPage(stub.sourceUrl);
      const chapData = parseChapterPage(chapHtml);
      if (!detectedType) detectedType = chapData.contentType;

      await Chapter.updateOne(
        { storySlug: storyDoc.slug, chapNumber: stub.chapNumber },
        {
          $set: {
            contentType: chapData.contentType,
            images: chapData.images,
            contentHtml: chapData.contentHtml,
            isCrawled: true,
          },
        }
      );
      chaptersCrawled++;
    } catch (err) {
      state.errorsCount++;
      pushLiveLog(
        `⚠️ Lỗi tải Chap ${stub.chapNumber} (${storyDoc.title}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  const crawledCount = await Chapter.countDocuments({
    storySlug: storyDoc.slug,
    isCrawled: true,
  });

  await Story.updateOne(
    { _id: storyDoc._id },
    {
      $set: {
        crawledChaptersCount: crawledCount,
        ...(detectedType ? { storyType: detectedType } : {}),
      },
    }
  );

  invalidateAllStoryCaches(storyDoc.slug);

  return {
    isNew,
    chaptersCrawled,
    newChaptersFound: newStubs.length,
    title: storyDoc.title,
    slug: storyDoc.slug,
  };
}

export async function ensureChapterCrawled(
  storySlug: string,
  chapNumber: string
): Promise<IChapter | null> {
  await connectDB();
  const chap = await Chapter.findOne({ storySlug, chapNumber });
  if (!chap) return null;
  if (chap.isCrawled && (chap.images.length > 0 || chap.contentHtml)) {
    return chap;
  }

  try {
    const html = await fetchHtmlPage(chap.sourceUrl);
    const parsed = parseChapterPage(html);
    chap.contentType = parsed.contentType;
    chap.images = parsed.images;
    chap.contentHtml = parsed.contentHtml;
    chap.isCrawled = true;
    await chap.save();

    const crawledCount = await Chapter.countDocuments({
      storySlug,
      isCrawled: true,
    });
    await Story.updateOne(
      { slug: storySlug },
      {
        $set: {
          crawledChaptersCount: crawledCount,
          storyType: parsed.contentType,
        },
      }
    );
    invalidateAllStoryCaches(storySlug);
  } catch (err) {
    console.error("[LazyCrawl] Lỗi tự động tải chap:", err);
  }

  return chap;
}

export interface RunCrawlOptions {
  trigger?: "auto" | "manual" | "single";
  mode?: "quick_update" | "bulk_pages" | "single_story" | "backfill_chapters";
  startPage?: number;
  endPage?: number;
  section?: string; // "", "1" (text), "7" (comic), "has_chapters"
  singleUrl?: string;
  storySlug?: string;
  backfillLimit?: number;
  crawlAllMissing?: boolean;
  forceCheckExisting?: boolean;
}

export async function runCrawlJob(options: RunCrawlOptions = {}) {
  const state = getLiveState();
  if (state.isRunning) {
    return { alreadyRunning: true, state: getCrawlerLiveStatus() };
  }

  await connectDB();
  const cfg = await getOrCreateCrawlerConfig();

  const trigger = options.trigger || "manual";
  const mode = options.mode || "quick_update";
  const delayMs = cfg.requestDelayMs || 350;
  const initialChapLimit = cfg.initialChapLimit || 10;

  state.isRunning = true;
  state.stopRequested = false;
  state.startedAt = new Date().toISOString();
  state.currentTask = "Đang khởi tạo tiến trình...";
  state.processedCount = 0;
  state.totalTarget = 0;
  state.storiesAdded = 0;
  state.storiesUpdated = 0;
  state.chaptersCrawled = 0;
  state.errorsCount = 0;

  const logDoc = await CrawlerLog.create({
    trigger,
    status: "running",
    mode,
    startedAt: new Date(),
    details: [],
  });

  const detailLogs: string[] = [];
  const record = (msg: string) => {
    pushLiveLog(msg);
    detailLogs.push(msg);
  };

  try {
    if (mode === "single_story") {
      let targetUrl = (options.singleUrl || "").trim();
      if (!targetUrl && options.storySlug) {
        const st = await Story.findOne({ slug: options.storySlug }).lean();
        if (st) targetUrl = st.sourceUrl;
      }
      if (!targetUrl) {
        throw new Error("Vui lòng nhập đường dẫn URL truyện từ vui.mobi");
      }

      state.totalTarget = 1;
      state.currentTask = `Đang cào truyện: ${targetUrl}`;
      record(`🔗 Bắt đầu đồng bộ truyện từ URL: ${targetUrl}`);

      const res = await syncSingleStory({
        sourceUrl: targetUrl,
        initialChapLimit,
        delayMs,
        crawlAllMissing: Boolean(options.crawlAllMissing),
      });
      state.processedCount = 1;
      if (res.isNew) state.storiesAdded++;
      else if (res.newChaptersFound > 0) state.storiesUpdated++;
      state.chaptersCrawled += res.chaptersCrawled;

      record(
        `✅ Đã lưu "${res.title}" (${res.isNew ? "Truyện mới" : `+${res.newChaptersFound} chap mới`}, tải ${res.chaptersCrawled} chap)`
      );
    } else if (mode === "backfill_chapters") {
      const limit = options.backfillLimit || 30;
      const filter = options.storySlug
        ? { storySlug: options.storySlug, isCrawled: false }
        : { isCrawled: false };
      const missing = await Chapter.find(filter)
        .sort({ chapOrder: 1 })
        .limit(limit);

      state.totalTarget = missing.length;
      record(`📥 Đang tải bù ${missing.length} chap chưa có nội dung...`);

      const touchedSlugs = new Set<string>();
      for (const ch of missing) {
        if (state.stopRequested) break;
        state.currentTask = `Tải bù ${ch.storySlug} - Chap ${ch.chapNumber}`;
        await sleep(delayMs);
        try {
          const html = await fetchHtmlPage(ch.sourceUrl);
          const parsed = parseChapterPage(html);
          ch.contentType = parsed.contentType;
          ch.images = parsed.images;
          ch.contentHtml = parsed.contentHtml;
          ch.isCrawled = true;
          await ch.save();
          touchedSlugs.add(ch.storySlug);
          state.chaptersCrawled++;
          state.processedCount++;
        } catch (err) {
          state.errorsCount++;
          record(
            `⚠️ Lỗi tải ${ch.storySlug} C.${ch.chapNumber}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }

      for (const slug of touchedSlugs) {
        const cnt = await Chapter.countDocuments({
          storySlug: slug,
          isCrawled: true,
        });
        await Story.updateOne({ slug }, { $set: { crawledChaptersCount: cnt } });
      }
      record(`✅ Đã tải bù thành công ${state.chaptersCrawled}/${missing.length} chap.`);
    } else {
      // quick_update or bulk_pages
      const startPage = Math.max(1, options.startPage || 1);
      const endPage = Math.max(
        startPage,
        options.endPage ||
          (mode === "quick_update" ? cfg.pagesPerAutoRun || 2 : startPage)
      );

      const totalStories = await Story.countDocuments();
      const listUrls: string[] = [];

      if (mode === "quick_update" && !options.section) {
        if (cfg.scope === "comic") {
          for (let p = 1; p <= endPage; p++) {
            listUrls.push(
              `${SOURCE_BASE_URL}/truyen/?section=7${p > 1 ? `&page=${p}` : ""}`
            );
          }
        } else if (cfg.scope === "text") {
          for (let p = 1; p <= endPage; p++) {
            listUrls.push(
              `${SOURCE_BASE_URL}/truyen/?section=1${p > 1 ? `&page=${p}` : ""}`
            );
          }
        } else {
          // Scope === 'all': scan main /truyen/ pages + page 1 of section=1 (text stories)
          for (let p = 1; p <= endPage; p++) {
            listUrls.push(
              `${SOURCE_BASE_URL}/truyen/${p > 1 ? `?page=${p}` : ""}`
            );
          }
          listUrls.push(`${SOURCE_BASE_URL}/truyen/?section=1`);
        }
      } else {
        for (let p = startPage; p <= endPage; p++) {
          const sp = new URLSearchParams();
          if (options.section === "has_chapters") {
            sp.set("has_chapters", "1");
          } else if (options.section) {
            sp.set("section", options.section);
          }
          if (p > 1) sp.set("page", String(p));
          const qs = sp.toString();
          listUrls.push(`${SOURCE_BASE_URL}/truyen/${qs ? `?${qs}` : ""}`);
        }
      }

      record(
        `🔍 Quét ${listUrls.length} trang danh sách (${
          trigger === "auto" ? "Tự động định kỳ" : "Thủ công"
        })${totalStories === 0 ? " — Khởi tạo dữ liệu đầu tiên" : ""}...`
      );

      const candidates: ListedStoryCard[] = [];
      const seenIds = new Set<string>();

      for (const url of listUrls) {
        if (state.stopRequested) break;
        state.currentTask = `Đang đọc danh sách: ${url}`;
        const listHtml = await fetchHtmlPage(url);
        const { items } = parseStoryListPage(listHtml);
        for (const item of items) {
          if (!seenIds.has(item.sourceId)) {
            seenIds.add(item.sourceId);
            candidates.push(item);
          }
        }
        await sleep(delayMs);
      }

      logDoc.pagesScanned = listUrls.length;
      state.totalTarget = candidates.length;

      for (const card of candidates) {
        if (state.stopRequested) break;
        state.processedCount++;

        const existing = await Story.findOne(
          { sourceId: card.sourceId },
          {
            hasMultipleChapters: 1,
            latestChapNumber: 1,
            sourceViews: 1,
          }
        ).lean();

        if (existing && !options.forceCheckExisting) {
          if (!existing.hasMultipleChapters) {
            continue;
          }
          if (
            card.listedLatestChap &&
            existing.latestChapNumber === card.listedLatestChap
          ) {
            if (card.sourceViews > (existing.sourceViews || 0)) {
              await Story.updateOne(
                { sourceId: card.sourceId },
                { $set: { sourceViews: card.sourceViews, lastSyncedAt: new Date() } }
              );
            }
            continue;
          }
        }

        state.currentTask = `Đang đồng bộ: ${card.title}`;
        await sleep(delayMs);

        try {
          const syncRes = await syncSingleStory({
            sourceUrl: card.sourceUrl,
            cardHint: card,
            initialChapLimit,
            delayMs,
          });

          if (syncRes.isNew) {
            state.storiesAdded++;
            state.chaptersCrawled += syncRes.chaptersCrawled;
            record(
              `🆕 [Mới] ${syncRes.title} (đã tải ${syncRes.chaptersCrawled} chap)`
            );
          } else if (syncRes.newChaptersFound > 0) {
            state.storiesUpdated++;
            state.chaptersCrawled += syncRes.chaptersCrawled;
            record(
              `⚡ [Chap mới] ${syncRes.title} (+${syncRes.newChaptersFound} chap)`
            );
          }
        } catch (err) {
          state.errorsCount++;
          record(
            `❌ Lỗi "${card.title}": ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }

      record(
        `🏁 Hoàn tất: +${state.storiesAdded} truyện mới, ${state.storiesUpdated} truyện cập nhật chap mới, ${state.chaptersCrawled} chap đã tải.`
      );
    }

    logDoc.status = "success";
    logDoc.storiesAdded = state.storiesAdded;
    logDoc.storiesUpdated = state.storiesUpdated;
    logDoc.chaptersCrawled = state.chaptersCrawled;
    logDoc.errorsCount = state.errorsCount;
    logDoc.details = detailLogs.slice(0, 80);
    logDoc.finishedAt = new Date();
    await logDoc.save();

    if (
      state.storiesAdded > 0 ||
      state.storiesUpdated > 0 ||
      state.chaptersCrawled > 0
    ) {
      invalidateAllStoryCaches();
    }

    return {
      alreadyRunning: false,
      summary: {
        storiesAdded: state.storiesAdded,
        storiesUpdated: state.storiesUpdated,
        chaptersCrawled: state.chaptersCrawled,
        errorsCount: state.errorsCount,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record(`💥 Lỗi tiến trình: ${msg}`);
    logDoc.status = "error";
    logDoc.errorMessage = msg;
    logDoc.storiesAdded = state.storiesAdded;
    logDoc.storiesUpdated = state.storiesUpdated;
    logDoc.chaptersCrawled = state.chaptersCrawled;
    logDoc.errorsCount = state.errorsCount + 1;
    logDoc.details = detailLogs.slice(0, 80);
    logDoc.finishedAt = new Date();
    await logDoc.save();
    throw err;
  } finally {
    state.isRunning = false;
    state.stopRequested = false;
    state.currentTask = "Đang nghỉ";
  }
}
