"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, CheckCircle2, CloudDownload, Search } from "lucide-react";

export interface ChapterItemDTO {
  chapNumber: string;
  chapOrder: number;
  title: string;
  publishedAtText: string;
  isCrawled: boolean;
}

export default function ChapterListClient({
  storySlug,
  chapters,
}: {
  storySlug: string;
  chapters: ChapterItemDTO[];
}) {
  const [query, setQuery] = useState("");
  const [descOrder, setDescOrder] = useState(true);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [lastReadChap, setLastReadChap] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`truyen_history_${storySlug}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.readChaps)) {
          setReadSet(new Set(parsed.readChaps));
        }
        if (parsed.lastChap) {
          setLastReadChap(String(parsed.lastChap));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [storySlug]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? chapters.filter(
          (c) =>
            c.chapNumber.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q)
        )
      : [...chapters];

    list.sort((a, b) =>
      descOrder ? b.chapOrder - a.chapOrder : a.chapOrder - b.chapOrder
    );
    return list;
  }, [chapters, query, descOrder]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-bold text-base sm:text-lg text-slate-900">
            Danh sách chương ({chapters.length})
          </h2>
          {lastReadChap && (
            <Link
              href={`/truyen/${storySlug}/${encodeURIComponent(lastReadChap)}`}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
            >
              Đọc tiếp Chap {lastReadChap} »
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm số chap..."
              className="pl-8 pr-3 py-1.5 text-xs sm:text-sm rounded-full border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none w-36 sm:w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={() => setDescOrder((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            <ArrowDownUp className="w-3.5 h-3.5" />
            {descOrder ? "Mới nhất trước" : "Từ Chap 1"}
          </button>
        </div>
      </div>

      <div className="max-h-[480px] overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Không tìm thấy chương phù hợp.
          </div>
        ) : (
          filtered.map((chap) => {
            const isRead = readSet.has(chap.chapNumber);
            return (
              <Link
                key={chap.chapNumber}
                href={`/truyen/${storySlug}/${encodeURIComponent(chap.chapNumber)}`}
                className={`flex items-center justify-between px-4 py-3 hover:bg-indigo-50/60 transition-colors ${
                  isRead ? "bg-slate-50/80 text-slate-500" : "text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                      isRead
                        ? "bg-slate-100 text-slate-500 border-slate-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-100"
                    }`}
                  >
                    Chap {chap.chapNumber}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {chap.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0 ml-2">
                  {chap.publishedAtText && (
                    <span className="hidden sm:inline">{chap.publishedAtText}</span>
                  )}
                  {chap.isCrawled ? (
                    <span title="Đã lưu sẵn trong MongoDB">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </span>
                  ) : (
                    <span title="Tự động tải ngay khi mở đọc">
                      <CloudDownload className="w-4 h-4 text-slate-300" />
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
