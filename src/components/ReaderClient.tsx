"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Moon,
  Plus,
  Sun,
} from "lucide-react";
import SmartImage from "@/components/SmartImage";

interface ChapterNavItem {
  chapNumber: string;
  title: string;
}

interface ReaderClientProps {
  storySlug: string;
  storyTitle: string;
  hasMultipleChapters: boolean;
  chapNumber: string;
  chapTitle: string;
  contentType: "comic" | "text";
  images: string[];
  contentHtml: string;
  prevChap: string | null;
  nextChap: string | null;
  allChapters: ChapterNavItem[];
}

type ReaderTheme = "light" | "sepia" | "dark";

export default function ReaderClient({
  storySlug,
  storyTitle,
  hasMultipleChapters,
  chapNumber,
  chapTitle,
  contentType,
  images,
  contentHtml,
  prevChap,
  nextChap,
  allChapters,
}: ReaderClientProps) {
  const router = useRouter();
  const [fontSize, setFontSize] = useState<number>(19);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const [serif, setSerif] = useState<boolean>(false);
  const [showFloating, setShowFloating] = useState<boolean>(false);

  // Save reading history + restore preferences
  useEffect(() => {
    try {
      const key = `truyen_history_${storySlug}`;
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      const readChaps = new Set<string>(
        Array.isArray(existing.readChaps) ? existing.readChaps : []
      );
      readChaps.add(chapNumber);
      localStorage.setItem(
        key,
        JSON.stringify({
          lastChap: chapNumber,
          readChaps: Array.from(readChaps),
          updatedAt: Date.now(),
        })
      );
      localStorage.setItem(
        "truyen_last_global",
        JSON.stringify({
          slug: storySlug,
          title: storyTitle,
          chapNumber,
        })
      );

      const savedPrefs = JSON.parse(
        localStorage.getItem("truyen_reader_prefs") || "{}"
      );
      if (savedPrefs.fontSize) setFontSize(Number(savedPrefs.fontSize));
      if (savedPrefs.theme) setTheme(savedPrefs.theme);
      if (typeof savedPrefs.serif === "boolean") setSerif(savedPrefs.serif);
    } catch {
      // ignore
    }
  }, [storySlug, storyTitle, chapNumber]);

  // Silent background prefetch of next chapter (route + lazy-crawl warm cache)
  useEffect(() => {
    if (!nextChap) return;
    const nextHref = `/truyen/${storySlug}/${encodeURIComponent(nextChap)}`;
    router.prefetch(nextHref);

    const timer = setTimeout(() => {
      void fetch(
        `/api/prefetch-chapter?slug=${encodeURIComponent(
          storySlug
        )}&chap=${encodeURIComponent(nextChap)}`,
        { priority: "low" } as RequestInit
      ).catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, [storySlug, nextChap, router]);

  // Show floating quick bar after scrolling down
  useEffect(() => {
    const onScroll = () => {
      setShowFloating(window.scrollY > 360);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const updatePrefs = (
    next: Partial<{ fontSize: number; theme: ReaderTheme; serif: boolean }>
  ) => {
    const merged = {
      fontSize: next.fontSize ?? fontSize,
      theme: next.theme ?? theme,
      serif: next.serif ?? serif,
    };
    setFontSize(merged.fontSize);
    setTheme(merged.theme);
    setSerif(merged.serif);
    try {
      localStorage.setItem("truyen_reader_prefs", JSON.stringify(merged));
    } catch {
      // ignore
    }
  };

  // Keyboard left/right chapter navigation
  useEffect(() => {
    if (!hasMultipleChapters) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft" && prevChap) {
        router.push(`/truyen/${storySlug}/${encodeURIComponent(prevChap)}`);
      } else if (e.key === "ArrowRight" && nextChap) {
        router.push(`/truyen/${storySlug}/${encodeURIComponent(nextChap)}`);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasMultipleChapters, prevChap, nextChap, router, storySlug]);

  const themeClasses: Record<ReaderTheme, string> = {
    light: "bg-white text-slate-800 border-slate-200",
    sepia: "bg-[#fbf3e4] text-[#4a3b2c] border-[#e7d6b9]",
    dark: "bg-slate-900 text-slate-200 border-slate-800",
  };

  const NavControls = () =>
    hasMultipleChapters ? (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {prevChap ? (
          <Link
            href={`/truyen/${storySlug}/${encodeURIComponent(prevChap)}`}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Chap trước
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Chap trước
          </button>
        )}

        <select
          value={chapNumber}
          onChange={(e) =>
            router.push(
              `/truyen/${storySlug}/${encodeURIComponent(e.target.value)}`
            )
          }
          className="px-3 py-2 rounded-full text-xs sm:text-sm font-semibold bg-white border border-indigo-300 text-slate-800 max-w-[220px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {allChapters.map((ch) => (
            <option key={ch.chapNumber} value={ch.chapNumber}>
              Chap {ch.chapNumber}
              {ch.title && ch.title !== `Chap ${ch.chapNumber}`
                ? `: ${ch.title}`
                : ""}
            </option>
          ))}
        </select>

        {nextChap ? (
          <Link
            href={`/truyen/${storySlug}/${encodeURIComponent(nextChap)}`}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Chap sau
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
          >
            Chap sau
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    ) : null;

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-5">
      {/* Top Reader Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm mb-3">
          <Link
            href={`/truyen/${storySlug}`}
            className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <List className="w-4 h-4" />
            {storyTitle}
          </Link>
          {hasMultipleChapters && (
            <span className="text-slate-400 text-xs hidden sm:inline">
              Mẹo: Dùng phím mũi tên ← / → để chuyển chap
            </span>
          )}
        </div>

        <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 text-center mb-4">
          {hasMultipleChapters
            ? `${storyTitle} — Chap ${chapNumber}${
                chapTitle && !chapTitle.toLowerCase().includes(`chap ${chapNumber}`)
                  ? `: ${chapTitle}`
                  : ""
              }`
            : storyTitle}
        </h1>

        <NavControls />

        {/* Text Reader Customization Toolbar */}
        {contentType === "text" && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="inline-flex items-center rounded-full border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  updatePrefs({ fontSize: Math.max(14, fontSize - 2) })
                }
                className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 cursor-pointer"
                title="Giảm cỡ chữ"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2.5 font-semibold text-slate-700">
                {fontSize}px
              </span>
              <button
                type="button"
                onClick={() =>
                  updatePrefs({ fontSize: Math.min(30, fontSize + 2) })
                }
                className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 cursor-pointer"
                title="Tăng cỡ chữ"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => updatePrefs({ serif: !serif })}
              className={`px-3 py-1.5 rounded-full border font-medium cursor-pointer ${
                serif
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 inline mr-1" />
              {serif ? "Chữ có chân (Sách)" : "Chữ hiện đại"}
            </button>

            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => updatePrefs({ theme: "light" })}
                className={`px-2.5 py-1.5 rounded-full border cursor-pointer inline-flex items-center gap-1 ${
                  theme === "light"
                    ? "border-indigo-500 bg-white font-bold text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Sáng
              </button>
              <button
                type="button"
                onClick={() => updatePrefs({ theme: "sepia" })}
                className={`px-2.5 py-1.5 rounded-full border cursor-pointer ${
                  theme === "sepia"
                    ? "border-amber-600 bg-[#fbf3e4] font-bold text-[#4a3b2c]"
                    : "border-slate-200 bg-[#fbf3e4] text-[#5f4b32]"
                }`}
              >
                Giấy ấm
              </button>
              <button
                type="button"
                onClick={() => updatePrefs({ theme: "dark" })}
                className={`px-2.5 py-1.5 rounded-full border cursor-pointer inline-flex items-center gap-1 ${
                  theme === "dark"
                    ? "border-indigo-400 bg-slate-900 font-bold text-white"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Đêm
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {contentType === "comic" ? (
        <div className="bg-slate-950 rounded-2xl p-1 sm:p-3 shadow-md">
          {images.length === 0 ? (
            <div className="py-16 text-center text-slate-300 text-sm">
              Không tìm thấy trang ảnh nào cho chương này.
            </div>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-1">
              {images.map((imgUrl, idx) => (
                <div
                  key={`${idx}-${imgUrl}`}
                  className="w-full bg-slate-900/50 min-h-[320px] sm:min-h-[480px]"
                >
                  <SmartImage
                    src={imgUrl}
                    alt={`Trang ${idx + 1} - Chap ${chapNumber} - ${storyTitle}`}
                    priority={idx < 4}
                    className="w-full h-auto block mx-auto"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <article
          className={`rounded-2xl border shadow-xs p-5 sm:p-8 md:p-10 transition-colors story-prose leading-relaxed ${
            themeClasses[theme]
          } ${serif ? "font-serif" : "font-sans"}`}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
          dangerouslySetInnerHTML={{
            __html:
              contentHtml ||
              "<p>Nội dung chương đang được cập nhật. Vui lòng tải lại trang sau giây lát.</p>",
          }}
        />
      )}

      {/* Bottom Navigation */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col items-center gap-3">
        <NavControls />
        <Link
          href={`/truyen/${storySlug}`}
          className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-indigo-600"
        >
          ← Quay về trang giới thiệu &amp; mục lục truyện
        </Link>
      </div>

      {/* Floating Quick-Action Bar */}
      {showFloating && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur text-white p-1.5 rounded-full shadow-lg border border-white/10">
          {hasMultipleChapters && prevChap && (
            <Link
              href={`/truyen/${storySlug}/${encodeURIComponent(prevChap)}`}
              className="p-2 rounded-full hover:bg-white/15 transition-colors"
              title="Chap trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}
          {hasMultipleChapters && nextChap && (
            <Link
              href={`/truyen/${storySlug}/${encodeURIComponent(nextChap)}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-bold transition-colors"
              title="Chap sau"
            >
              Chap sau
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="p-2 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
            title="Lên đầu trang"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
