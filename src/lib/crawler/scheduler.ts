import cron, { type ScheduledTask } from "node-cron";
import { checkDBHealth } from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { CrawlerConfig } from "@/models/CrawlerConfig";
import {
  getCrawlerLiveStatus,
  getOrCreateCrawlerConfig,
  runCrawlJob,
} from "@/lib/crawler/engine";

declare global {
  // eslint-disable-next-line no-var
  var _autoCrawlerCronTask: ScheduledTask | undefined;
}

export function startAutoCrawlerScheduler() {
  if (global._autoCrawlerCronTask) return;

  console.log("[AutoCrawler] Khởi động bộ lập lịch tự động quét truyện mới.");

  const task = cron.schedule("* * * * *", async () => {
    try {
      const live = getCrawlerLiveStatus();
      if (live.isRunning) return;

      const health = await checkDBHealth();
      if (!health.connected) return;

      const cfg = await getOrCreateCrawlerConfig();
      if (!cfg.autoCrawlEnabled) return;

      const now = Date.now();
      const nextTime = cfg.nextAutoRunAt
        ? new Date(cfg.nextAutoRunAt).getTime()
        : 0;

      if (now >= nextTime) {
        const intervalMs = Math.max(5, cfg.intervalMinutes || 20) * 60_000;
        await CrawlerConfig.updateOne(
          { key: "main" },
          {
            $set: {
              lastAutoRunAt: new Date(now),
              nextAutoRunAt: new Date(now + intervalMs),
            },
          }
        );

        await runCrawlJob({
          trigger: "auto",
          mode: "quick_update",
        });
      }
    } catch (err) {
      console.error("[AutoCrawler] Lỗi chu kỳ kiểm tra:", err);
    }
  });

  global._autoCrawlerCronTask = task;

  // Auto-bootstrap when database is connected and empty
  setTimeout(async () => {
    try {
      if (getCrawlerLiveStatus().isRunning) return;
      const health = await checkDBHealth();
      if (!health.connected) return;
      const cfg = await getOrCreateCrawlerConfig();
      if (!cfg.autoCrawlEnabled) return;

      const total = await Story.estimatedDocumentCount();
      if (total === 0) {
        const now = Date.now();
        const intervalMs = Math.max(5, cfg.intervalMinutes || 20) * 60_000;
        await CrawlerConfig.updateOne(
          { key: "main" },
          {
            $set: {
              lastAutoRunAt: new Date(now),
              nextAutoRunAt: new Date(now + intervalMs),
            },
          }
        );
        await runCrawlJob({
          trigger: "auto",
          mode: "quick_update",
        });
      }
    } catch {
      // Ignore if MongoDB is not running yet
    }
  }, 3500);
}
