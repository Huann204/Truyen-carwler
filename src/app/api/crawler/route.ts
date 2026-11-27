import { NextRequest, NextResponse } from "next/server";
import { checkDBHealth, connectDB } from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { Chapter } from "@/models/Chapter";
import { CrawlerLog } from "@/models/CrawlerLog";
import { CrawlerConfig } from "@/models/CrawlerConfig";
import {
  getCrawlerLiveStatus,
  getOrCreateCrawlerConfig,
  requestStopCrawler,
  runCrawlJob,
} from "@/lib/crawler/engine";
import {
  getAdminSecret,
  isAdminAuthenticated,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authRequired = Boolean(getAdminSecret());
  if (authRequired && !isAdminAuthenticated(req)) {
    return NextResponse.json(
      {
        authRequired: true,
        authenticated: false,
        error: "Yêu cầu đăng nhập quản trị",
      },
      { status: 401 }
    );
  }

  const dbHealth = await checkDBHealth();
  const live = getCrawlerLiveStatus();

  if (!dbHealth.connected) {
    return NextResponse.json({
      authRequired,
      dbHealth,
      live,
      stats: null,
      config: null,
      logs: [],
    });
  }

  await connectDB();
  const [
    totalStories,
    comicStories,
    textStories,
    vuiStories,
    ttbStories,
    totalChapters,
    crawledChapters,
    config,
    logs,
  ] = await Promise.all([
    Story.countDocuments(),
    Story.countDocuments({ storyType: "comic" }),
    Story.countDocuments({ storyType: "text" }),
    Story.countDocuments({ sourceSite: { $ne: "tuthienbao.com" } }),
    Story.countDocuments({ sourceSite: "tuthienbao.com" }),
    Chapter.countDocuments(),
    Chapter.countDocuments({ isCrawled: true }),
    getOrCreateCrawlerConfig(),
    CrawlerLog.find().sort({ startedAt: -1 }).limit(15).lean(),
  ]);

  return NextResponse.json({
    authRequired,
    dbHealth,
    live,
    stats: {
      totalStories,
      comicStories,
      textStories,
      vuiStories,
      ttbStories,
      totalChapters,
      crawledChapters,
      missingChapters: Math.max(0, totalChapters - crawledChapters),
    },
    config,
    logs,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string;

    const secret = getAdminSecret();
    const hasValidSession = isAdminAuthenticated(req);
    const hasValidBodySecret =
      Boolean(secret) &&
      typeof body?.secret === "string" &&
      verifyAdminPassword(body.secret);

    if (secret && !hasValidSession && !hasValidBodySecret) {
      return NextResponse.json(
        {
          authRequired: true,
          error: "Phiên đăng nhập hết hạn hoặc sai mật khẩu quản trị",
        },
        { status: 401 }
      );
    }

    if (action === "stop") {
      requestStopCrawler();
      return NextResponse.json({ ok: true, message: "Đã gửi tín hiệu dừng." });
    }

    const health = await checkDBHealth();
    if (!health.connected) {
      return NextResponse.json(
        {
          error: `Chưa kết nối được MongoDB (${health.uriMasked}): ${health.error}`,
        },
        { status: 503 }
      );
    }

    if (action === "toggle_auto") {
      const cfg = await getOrCreateCrawlerConfig();
      const autoCrawlEnabled = Boolean(body.autoCrawlEnabled);
      const intervalMinutes = Math.min(
        1440,
        Math.max(5, cfg.intervalMinutes || 20)
      );

      const updateOps = autoCrawlEnabled
        ? {
            $set: {
              autoCrawlEnabled: true,
              nextAutoRunAt: new Date(Date.now() + intervalMinutes * 60_000),
            },
          }
        : {
            $set: { autoCrawlEnabled: false },
            $unset: { nextAutoRunAt: 1 },
          };

      const updated = await CrawlerConfig.findOneAndUpdate(
        { key: "main" },
        updateOps,
        { new: true }
      );

      if (!autoCrawlEnabled) {
        const live = getCrawlerLiveStatus();
        if (live.isRunning && live.trigger === "auto") {
          requestStopCrawler();
        }
      }

      return NextResponse.json({
        ok: true,
        config: updated,
        message: autoCrawlEnabled
          ? "Đã BẬT chế độ tự động cào!"
          : "Đã TẮT chế độ tự động cào — hệ thống sẽ không tự chạy nữa.",
      });
    }

    if (action === "update_config") {
      await getOrCreateCrawlerConfig();
      const intervalMinutes = Math.min(
        1440,
        Math.max(5, Number(body.intervalMinutes) || 20)
      );
      const pagesPerAutoRun = Math.min(
        20,
        Math.max(1, Number(body.pagesPerAutoRun) || 2)
      );
      const initialChapLimit = Math.min(
        200,
        Math.max(1, Number(body.initialChapLimit) || 10)
      );
      const requestDelayMs = Math.min(
        5000,
        Math.max(100, Number(body.requestDelayMs) || 350)
      );
      const autoCrawlEnabled = Boolean(body.autoCrawlEnabled);
      const scope = ["all", "comic", "text"].includes(body.scope)
        ? body.scope
        : "all";
      const sourceMode = ["both", "vui.mobi", "tuthienbao.com"].includes(
        body.sourceMode
      )
        ? body.sourceMode
        : "both";

      const updateOps = autoCrawlEnabled
        ? {
            $set: {
              autoCrawlEnabled: true,
              intervalMinutes,
              pagesPerAutoRun,
              initialChapLimit,
              requestDelayMs,
              scope,
              sourceMode,
              nextAutoRunAt: new Date(Date.now() + intervalMinutes * 60_000),
            },
          }
        : {
            $set: {
              autoCrawlEnabled: false,
              intervalMinutes,
              pagesPerAutoRun,
              initialChapLimit,
              requestDelayMs,
              scope,
              sourceMode,
            },
            $unset: { nextAutoRunAt: 1 },
          };

      const updated = await CrawlerConfig.findOneAndUpdate(
        { key: "main" },
        updateOps,
        { new: true }
      );

      if (!autoCrawlEnabled) {
        const live = getCrawlerLiveStatus();
        if (live.isRunning && live.trigger === "auto") {
          requestStopCrawler();
        }
      }

      return NextResponse.json({
        ok: true,
        config: updated,
        message: autoCrawlEnabled
          ? "Đã lưu cấu hình & BẬT tự động cào!"
          : "Đã lưu cấu hình (Chế độ tự động đang TẮT).",
      });
    }

    if (action === "run") {
      const live = getCrawlerLiveStatus();
      if (live.isRunning) {
        return NextResponse.json(
          { error: "Crawler đang chạy tác vụ khác, vui lòng đợi hoặc bấm Dừng." },
          { status: 409 }
        );
      }

      // Fire and forget in Node background so HTTP response returns immediately
      void runCrawlJob({
        trigger: body.mode === "single_story" ? "single" : "manual",
        mode: body.mode || "quick_update",
        source: ["both", "vui.mobi", "tuthienbao.com"].includes(body.source)
          ? body.source
          : undefined,
        ttbForumId: typeof body.ttbForumId === "string" ? body.ttbForumId : undefined,
        startPage: Number(body.startPage) || 1,
        endPage: Number(body.endPage) || 1,
        section: body.section || "",
        singleUrl: body.singleUrl || "",
        storySlug: body.storySlug || "",
        backfillLimit: Number(body.backfillLimit) || 30,
        crawlAllMissing: Boolean(body.crawlAllMissing),
        forceCheckExisting: Boolean(body.forceCheckExisting),
      }).catch((err) => {
        console.error("[Crawler API] Background job error:", err);
      });

      return NextResponse.json({
        ok: true,
        message: "Đã bắt đầu tiến trình cào dữ liệu!",
      });
    }

    return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
