"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Search, Settings } from "lucide-react";

const NAV_TABS = [
  { label: "Mới cập nhật", href: "/" },
  { label: "Truyện Tranh", href: "/?type=comic" },
  { label: "Truyện Chữ", href: "/?type=text" },
  { label: "Hoàn thành", href: "/?status=completed" },
] as const;

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
  const [searchTerm, setSearchTerm] = useState("");

  const searchString = searchParams.toString();
  const currentHref = getCurrentNavHref(pathname, searchParams);
  const activeHref = pendingHref ?? currentHref;

  // Clear optimistic pending indicator once navigation finishes
  useEffect(() => {
    setPendingHref(null);
  }, [pathname, searchString]);

  // Prefetch the 4 main nav destinations right after initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      for (const tab of NAV_TABS) {
        router.prefetch(tab.href);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [router]);

  const navigate = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    const target = q ? `/?q=${encodeURIComponent(q)}` : "/";
    setPendingHref(target);
    startTransition(() => {
      router.push(target);
    });
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
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
            <input
              type="search"
              name="q"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên truyện, tác giả..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-full border border-slate-200 bg-slate-100 focus:bg-white focus:border-indigo-500 focus:outline-none transition-colors"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

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
