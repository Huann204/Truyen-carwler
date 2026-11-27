"use client";

import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Loader2, Search, Settings, X } from "lucide-react";
import SmartImage from "@/components/SmartImage";

const NAV_TABS = [
  { label: "Mới cập nhật", href: "/" },
  { label: "Truyện Tranh", href: "/?type=comic" },
  { label: "Truyện Chữ", href: "/?type=text" },
  { label: "Hoàn thành", href: "/?status=completed" },
] as const;

interface LiveSuggestion {
  slug: string;
  title: string;
  coverUrl?: string;
  author?: string;
  storyType: "comic" | "text";
  hasMultipleChapters: boolean;
  latestChapNumber: string;
}

function NavLabel({ text }: { text: string }) {
  return (
    <span className="inline-grid text-center">
      <span className="col-start-1 row-start-1">{text}</span>
      <span
        aria-hidden="true"
        className="col-start-1 row-start-1 font-bold invisible h-0 overflow-hidden select-none pointer-events-none"
      >
        {text}
      </span>
    </span>
  );
}

function getCurrentNavHref(
  pathname: string,
  searchParams: URLSearchParams
): string {
  if (pathname !== "/") return pathname;
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  if (type === "comic") return "/?type=comic";
  if (type === "text") return "/?type=text";
  if (status === "completed") return "/?status=completed";
  return "/";
}

function NavbarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const urlQuery = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(urlQuery);
  const [suggestions, setSuggestions] = useState<LiveSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const userTypedRef = useRef(false);

  const searchString = searchParams.toString();
  const currentHref = getCurrentNavHref(pathname, searchParams);
  const activeHref = pendingHref ?? currentHref;

  // Clear optimistic pending indicator & close dropdown on route change
  useEffect(() => {
    setPendingHref(null);
    setDropdownOpen(false);
    userTypedRef.current = false;
    setSearchTerm(urlQuery);
  }, [pathname, searchString, urlQuery]);

  // Prefetch the 4 main nav destinations right after initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const tab of NAV_TABS) {
        router.prefetch(tab.href);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [router]);

  // Close live search dropdown on outside click or Escape
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // 300ms debounced live search dropdown via /api/stories
  useEffect(() => {
    if (!userTypedRef.current) return;

    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearching(false);
      setDropdownOpen(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    setDropdownOpen(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/stories?q=${encodeURIComponent(trimmed)}&limit=6`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const json = await res.json();
        setSuggestions(Array.isArray(json.items) ? json.items : []);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm]);

  const navigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    setDropdownOpen(false);
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    userTypedRef.current = false;
    setDropdownOpen(false);
    const q = searchTerm.trim();
    const target = q ? `/?q=${encodeURIComponent(q)}` : "/";
    setPendingHref(target);
    startTransition(() => {
      router.push(target);
    });
  };

  const clearSearch = () => {
    userTypedRef.current = false;
    setSearchTerm("");
    setSuggestions([]);
    setDropdownOpen(false);
    if (pathname === "/" && urlQuery) {
      startTransition(() => {
        router.replace("/", { scroll: false });
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            onClick={(e) => navigate(e, "/")}
            className="flex items-center gap-2 font-extrabold text-lg text-slate-900 hover:text-indigo-600 transition-colors shrink-0"
          >
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </span>
            <span>
              Truyện<span className="text-indigo-600">Mới</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm text-slate-600">
            {NAV_TABS.map((tab) => {
              const isActive =
                pathname === "/" &&
                !searchParams.get("q") &&
                !searchParams.get("category") &&
                activeHref === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={(e) => navigate(e, tab.href)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-indigo-600 font-bold"
                      : "font-medium hover:text-slate-900"
                  }`}
                >
                  <NavLabel text={tab.label} />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 flex-1 justify-end max-w-md">
          <div ref={searchBoxRef} className="relative flex-1 max-w-xs">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                name="q"
                value={searchTerm}
                onFocus={() => {
                  if (suggestions.length > 0) setDropdownOpen(true);
                }}
                onChange={(e) => {
                  userTypedRef.current = true;
                  setSearchTerm(e.target.value);
                }}
                placeholder="Tìm tên truyện, tác giả..."
                autoComplete="off"
                className="w-full pl-9 pr-8 py-1.5 text-sm rounded-full border border-slate-200 bg-slate-100 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Xóa từ khóa"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Live Debounced Search Dropdown */}
            {dropdownOpen && searchTerm.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 min-w-[260px]">
                {searching ? (
                  <div className="px-4 py-4 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    Đang tìm truyện...
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-slate-500 text-center">
                    Không tìm thấy truyện phù hợp.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {suggestions.map((item) => (
                      <Link
                        key={item.slug}
                        href={`/truyen/${item.slug}`}
                        prefetch={false}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50/60 transition-colors"
                      >
                        <div className="w-9 h-12 rounded-md overflow-hidden bg-slate-900 shrink-0">
                          <SmartImage
                            src={item.coverUrl}
                            alt={item.title}
                            fallbackTitle={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.author || "Đang cập nhật"}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                          {item.hasMultipleChapters
                            ? `C.${item.latestChapNumber}`
                            : "Ngắn"}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="w-full px-3 py-2 text-xs font-bold text-indigo-600 bg-slate-50 hover:bg-indigo-50 border-t border-slate-100 text-center cursor-pointer"
                >
                  Xem tất cả kết quả cho &ldquo;{searchTerm.trim()}&rdquo; »
                </button>
              </div>
            )}
          </div>

          <Link
            href="/admin"
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-slate-900 text-white hover:bg-indigo-600 transition-colors shrink-0"
            title="Quản trị & Tự động cào truyện"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Crawler</span>
          </Link>
        </div>
      </div>

      {/* Mobile compact quick tabs */}
      <nav className="md:hidden border-t border-slate-100 px-3 py-1.5 flex items-center gap-2 overflow-x-auto text-xs text-slate-600">
        {NAV_TABS.map((tab) => {
          const isActive =
            pathname === "/" &&
            !searchParams.get("q") &&
            !searchParams.get("category") &&
            activeHref === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={(e) => navigate(e, tab.href)}
              className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
                isActive
                  ? "text-indigo-600 font-bold"
                  : "font-medium text-slate-600 hover:text-slate-900"
              }`}
            >
              <NavLabel text={tab.label} />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function NavbarStaticShell() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-extrabold text-lg text-slate-900 shrink-0"
        >
          <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5" />
          </span>
          <span>
            Truyện<span className="text-indigo-600">Mới</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={<NavbarStaticShell />}>
      <NavbarInner />
    </Suspense>
  );
}
