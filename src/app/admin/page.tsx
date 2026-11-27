"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  DownloadCloud,
  Layers,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Square,
  XCircle,
} from "lucide-react";

interface CrawlerStatusResponse {
  dbHealth: {
    connected: boolean;
    uriMasked: string;
    error?: string;
  };
  live: {
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
  };
  stats: {
    totalStories: number;
    comicStories: number;
    textStories: number;
    totalChapters: number;
    crawledChapters: number;
    missingChapters: number;
  } | null;
  config: {
    autoCrawlEnabled: boolean;
    intervalMinutes: number;
    pagesPerAutoRun: number;
    initialChapLimit: number;
    requestDelayMs: number;
    scope: "all" | "comic" | "text";
    lastAutoRunAt?: string;
    nextAutoRunAt?: string;
  } | null;
  logs: Array<{
    _id: string;
    trigger: "auto" | "manual" | "single";
    status: "running" | "success" | "error";
    mode: string;
    pagesScanned: number;
    storiesAdded: number;
    storiesUpdated: number;
    chaptersCrawled: number;
    errorsCount: number;
    details: string[];
    errorMessage?: string;
    startedAt: string;
    finishedAt?: string;
  }>;
}

export default function AdminCrawlerPage() {
  const [data, setData] = useState<CrawlerStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string>("");

  // Bulk Crawl Form
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(2);
  const [section, setSection] = useState("");
  const [forceCheckExisting, setForceCheckExisting] = useState(false);

  // Single Story URL Form
  const [singleUrl, setSingleUrl] = useState("");
  const [crawlAllMissing, setCrawlAllMissing] = useState(false);

  // Schedule Config Form
  const [autoCrawlEnabled, setAutoCrawlEnabled] = useState(true);
  const [intervalMinutes, setIntervalMinutes] = useState(20);
  const [pagesPerAutoRun, setPagesPerAutoRun] = useState(2);
  const [initialChapLimit, setInitialChapLimit] = useState(10);
  const [requestDelayMs, setRequestDelayMs] = useState(350);
  const [scope, setScope] = useState<"all" | "comic" | "text">("all");
  const [configLoadedOnce, setConfigLoadedOnce] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/crawler", { cache: "no-store" });
      const json: CrawlerStatusResponse = await res.json();
      setData(json);
      if (json.config && !configLoadedOnce) {
        setAutoCrawlEnabled(json.config.autoCrawlEnabled);
        setIntervalMinutes(json.config.intervalMinutes);
        setPagesPerAutoRun(json.config.pagesPerAutoRun);
        setInitialChapLimit(json.config.initialChapLimit);
        setRequestDelayMs(json.config.requestDelayMs);
        setScope(json.config.scope);
        setConfigLoadedOnce(true);
      }
    } catch {
      // ignore transient network errors
    } finally {
      setLoading(false);
    }
  }, [configLoadedOnce]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const ms = data?.live?.isRunning ? 2200 : 12000;
    const timer = setInterval(() => {
      void fetchStatus();
    }, ms);
    return () => clearInterval(timer);
  }, [data?.live?.isRunning, fetchStatus]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4500);
  };

  const postAction = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch("/api/crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(`Lỗi: ${json.error || "Không thực hiện được"}`);
      } else {
        showToast(json.message || "Đã cập nhật thành công!");
      }
      await fetchStatus();
    } catch (err) {
      showToast(`Lỗi kết nối: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
        Đang tải bảng điều khiển Crawler...
      </div>
    );
  }

  const isRunning = Boolean(data?.live?.isRunning);
  const dbConnected = Boolean(data?.dbHealth?.connected);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Quản Trị Hệ Thống Cào Truyện Tự Động
          </h1>
          <p className="text-sm text-slate-500">
            Nguồn đồng bộ: <code className="font-mono text-indigo-600">https://vui.mobi/truyen/</code> • Tự động phát hiện truyện mới &amp; chap mới
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchStatus()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-indigo-600"
          >
            Xem Trang Đọc Truyện »
          </Link>
        </div>
      </div>

      {toast && (
        <div className="rounded-2xl bg-indigo-600 text-white px-4 py-3 text-sm font-semibold shadow-sm">
          {toast}
        </div>
      )}

      {/* MongoDB Connection Card */}
      <div
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
          dbConnected
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
            : "bg-rose-50 border-rose-200 text-rose-900"
        }`}
      >
        <div className="flex items-center gap-3">
          <Database
            className={`w-5 h-5 shrink-0 ${
              dbConnected ? "text-emerald-600" : "text-rose-600"
            }`}
          />
          <div className="text-sm">
            <strong>MongoDB:</strong>{" "}
            <code className="px-1.5 py-0.5 rounded bg-white/80 text-xs font-mono">
              {data?.dbHealth.uriMasked}
            </code>{" "}
            —{" "}
            {dbConnected ? (
              <span className="font-bold text-emerald-700">Đã kết nối sẵn sàng</span>
            ) : (
              <span className="font-bold text-rose-700">
                Chưa kết nối ({data?.dbHealth.error})
              </span>
            )}
          </div>
        </div>
        {data?.config?.nextAutoRunAt && dbConnected && (
          <div className="text-xs font-medium text-emerald-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Quét tự động kế tiếp:{" "}
            <strong>
              {new Date(data.config.nextAutoRunAt).toLocaleTimeString("vi-VN")}
            </strong>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Tổng bộ truyện",
              val: data.stats.totalStories,
              color: "text-slate-900",
            },
            {
              label: "Truyện Tranh",
              val: data.stats.comicStories,
              color: "text-rose-600",
            },
            {
              label: "Truyện Chữ",
              val: data.stats.textStories,
              color: "text-indigo-600",
            },
            {
              label: "Tổng số Chap",
              val: data.stats.totalChapters,
              color: "text-slate-900",
            },
            {
              label: "Chap đã tải sẵn",
              val: data.stats.crawledChapters,
              color: "text-emerald-600",
            },
            {
              label: "Chap chờ tải bù",
              val: data.stats.missingChapters,
              color: "text-amber-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs"
            >
              <div className="text-xs text-slate-500 font-medium mb-1">
                {item.label}
              </div>
              <div className={`text-2xl font-extrabold ${item.color}`}>
                {item.val.toLocaleString("vi-VN")}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Runner Banner & Terminal */}
      <div className="bg-slate-950 text-slate-100 rounded-3xl p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {isRunning ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ĐANG CHẠY CRAWLER
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                Đang chờ lệnh / Chạy ngầm theo lịch
              </span>
            )}
            <span className="text-xs sm:text-sm text-slate-300 truncate max-w-md">
              {data?.live.currentTask}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                type="button"
                disabled={!dbConnected}
                onClick={() =>
                  void postAction({ action: "run", mode: "quick_update" })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-slate-950" />
                Quét Truyện &amp; Chap Mới Ngay
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void postAction({ action: "stop" })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                Dừng An Toàn
              </button>
            )}
          </div>
        </div>

        {isRunning && (
          <div className="py-3 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              Tiến độ:{" "}
              <strong className="text-white">
                {data?.live.processedCount} / {data?.live.totalTarget || "?"}
              </strong>
            </div>
            <div>
              Truyện mới:{" "}
              <strong className="text-emerald-400">
                +{data?.live.storiesAdded}
              </strong>
            </div>
            <div>
              Cập nhật chap:{" "}
              <strong className="text-amber-300">
                {data?.live.storiesUpdated}
              </strong>
            </div>
            <div>
              Chap đã tải:{" "}
              <strong className="text-indigo-300">
                {data?.live.chaptersCrawled}
              </strong>
            </div>
          </div>
        )}

        <div className="mt-3 max-h-52 overflow-y-auto font-mono text-xs space-y-1 text-slate-300">
          {!data?.live.recentLogs || data.live.recentLogs.length === 0 ? (
            <div className="text-slate-500 py-3">
              Chưa có log trực tiếp trong phiên hiện tại. Bấm &quot;Quét Truyện &amp; Chap Mới Ngay&quot; để bắt đầu!
            </div>
          ) : (
            data.live.recentLogs.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      </div>

      {/* Action Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Bulk & URL Crawl */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
          <div>
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-indigo-600" />
              1. Cào Theo Trang &amp; Chuyên Mục
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Từ trang
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={startPage}
                  onChange={(e) => setStartPage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Đến trang
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={endPage}
                  onChange={(e) => setEndPage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Chuyên mục nguồn
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="">Tất cả (/truyen/)</option>
                  <option value="7">Truyện Tranh (section=7)</option>
                  <option value="1">Truyện Chữ (section=1)</option>
                  <option value="has_chapters">Có chia Chap</option>
                  <option value="3">Cổ tích Việt Nam</option>
                  <option value="4">Cổ tích thế giới</option>
                  <option value="5">Truyện ngụ ngôn</option>
                  <option value="6">Truyện Dân Gian</option>
                  <option value="9">Truyện Cười</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={forceCheckExisting}
                onChange={(e) => setForceCheckExisting(e.target.checked)}
                className="rounded"
              />
              Kiểm tra lại chi tiết cả những bộ đã có trong Database
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isRunning || !dbConnected}
                onClick={() =>
                  void postAction({
                    action: "run",
                    mode: "bulk_pages",
                    startPage,
                    endPage,
                    section,
                    forceCheckExisting,
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                Bắt Đầu Cào Danh Sách
              </button>

              {(data?.stats?.missingChapters || 0) > 0 && (
                <button
                  type="button"
                  disabled={isRunning || !dbConnected}
                  onClick={() =>
                    void postAction({
                      action: "run",
                      mode: "backfill_chapters",
                      backfillLimit: 40,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
                >
                  Tải bù 40 chap còn thiếu
                </button>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Single Story URL */}
          <div>
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2 mb-2">
              <Link2 className="w-5 h-5 text-indigo-600" />
              2. Cào 1 Bộ Truyện Cụ Thể Qua Link
            </h2>
            <input
              type="url"
              value={singleUrl}
              onChange={(e) => setSingleUrl(e.target.value)}
              placeholder="https://vui.mobi/forum/truyen-tranh/tien-si-slump-dr-slump-11202.html"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm mb-2.5"
            />
            <label className="flex items-center gap-2 text-xs text-slate-600 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={crawlAllMissing}
                onChange={(e) => setCrawlAllMissing(e.target.checked)}
                className="rounded"
              />
              Tải trước toàn bộ tất cả các chap của bộ này (thay vì tải chap mới + lazy load)
            </label>
            <button
              type="button"
              disabled={isRunning || !dbConnected || !singleUrl.trim()}
              onClick={() =>
                void postAction({
                  action: "run",
                  mode: "single_story",
                  singleUrl,
                  crawlAllMissing,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-indigo-600 disabled:opacity-40 cursor-pointer"
            >
              Cào Bộ Truyện Này
            </button>
          </div>
        </div>

        {/* Auto-Crawler Schedule Settings */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-indigo-600" />
              3. Cấu Hình Tự Động Cào Ngầm (Auto-Crawler)
            </h2>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 mb-4 cursor-pointer">
              <div>
                <div className="font-bold text-sm text-slate-900">
                  Tự động kiểm tra truyện &amp; chap mới
                </div>
                <div className="text-xs text-slate-500">
                  Chạy ngầm liên tục không cần bấm tay khi server đang bật
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoCrawlEnabled}
                onChange={(e) => setAutoCrawlEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-600"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Chu kỳ quét tự động (phút)
                </label>
                <input
                  type="number"
                  min={5}
                  max={1440}
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Số trang đầu quét mỗi chu kỳ
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={pagesPerAutoRun}
                  onChange={(e) => setPagesPerAutoRun(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Số chap tải sẵn khi gặp truyện mới
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={initialChapLimit}
                  onChange={(e) => setInitialChapLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Độ trễ lịch sự giữa các request (ms)
                </label>
                <input
                  type="number"
                  min={100}
                  max={5000}
                  step={50}
                  value={requestDelayMs}
                  onChange={(e) => setRequestDelayMs(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Phạm vi nội dung tự động cào
                </label>
                <select
                  value={scope}
                  onChange={(e) =>
                    setScope(e.target.value as "all" | "comic" | "text")
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="all">
                    Cả hai (Truyện tranh nhiều chap + Truyện chữ/truyện ngắn)
                  </option>
                  <option value="comic">Chỉ Truyện Tranh</option>
                  <option value="text">Chỉ Truyện Chữ</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {data?.config?.lastAutoRunAt
                ? `Lần tự động gần nhất: ${new Date(
                    data.config.lastAutoRunAt
                  ).toLocaleString("vi-VN")}`
                : "Chưa chạy chu kỳ tự động nào"}
            </span>
            <button
              type="button"
              disabled={!dbConnected}
              onClick={() =>
                void postAction({
                  action: "update_config",
                  autoCrawlEnabled,
                  intervalMinutes,
                  pagesPerAutoRun,
                  initialChapLimit,
                  requestDelayMs,
                  scope,
                })
              }
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Lưu Cấu Hình
            </button>
          </div>
        </div>
      </div>

      {/* Crawl History Logs */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <h2 className="font-extrabold text-base text-slate-900 mb-4">
          Lịch Sử Phiên Cào Gần Đây
        </h2>
        {!data?.logs || data.logs.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center">
            Chưa có lịch sử phiên chạy nào trong MongoDB.
          </div>
        ) : (
          <div className="space-y-3">
            {data.logs.map((log) => (
              <details
                key={log._id}
                className="group rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50/50"
              >
                <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5">
                    {log.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : log.status === "error" ? (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                    )}
                    <span className="font-bold text-slate-800">
                      {log.trigger === "auto"
                        ? "Tự động"
                        : log.trigger === "single"
                        ? "Theo link"
                        : "Thủ công"}{" "}
                      ({log.mode})
                    </span>
                    <span className="text-slate-400 text-xs">
                      {new Date(log.startedAt).toLocaleString("vi-VN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="text-emerald-700">
                      +{log.storiesAdded} truyện mới
                    </span>
                    <span className="text-amber-700">
                      {log.storiesUpdated} cập nhật
                    </span>
                    <span className="text-indigo-700">
                      {log.chaptersCrawled} chap
                    </span>
                  </div>
                </summary>

                {log.details && log.details.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 font-mono text-xs text-slate-600 space-y-1 max-h-48 overflow-y-auto">
                    {log.details.map((d, idx) => (
                      <div key={idx}>{d}</div>
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
