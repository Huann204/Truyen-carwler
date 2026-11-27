"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkCheck, PlayCircle } from "lucide-react";

interface RecentRead {
  slug: string;
  title: string;
  chapNumber: string;
}

export default function ContinueReadingBar() {
  const [recent, setRecent] = useState<RecentRead | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("truyen_last_global");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.slug && parsed?.title && parsed?.chapNumber) {
          setRecent(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  if (!recent) return null;

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shrink-0">
          <BookmarkCheck className="w-3.5 h-3.5" />
          Đang đọc dở
        </span>
        <span className="font-semibold text-sm text-slate-800 truncate">
          {recent.title}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white border border-indigo-200 text-indigo-700 shrink-0">
          Chap {recent.chapNumber}
        </span>
      </div>

      <Link
        href={`/truyen/${recent.slug}/${encodeURIComponent(recent.chapNumber)}`}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shrink-0"
      >
        <PlayCircle className="w-4 h-4" />
        Đọc tiếp »
      </Link>
    </div>
  );
}
