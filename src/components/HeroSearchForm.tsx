"use client";

import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

function HeroSearchFormInner({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlQuery = searchParams.get("q") ?? initialQuery;
  const [value, setValue] = useState(urlQuery);
  const userTypedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input when URL ?q= changes externally (e.g., clicking Navbar tab)
  useEffect(() => {
    userTypedRef.current = false;
    setValue(urlQuery);
  }, [urlQuery]);

  // 350ms debounced search without full page reload
  useEffect(() => {
    if (!userTypedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const trimmed = value.trim();
      const target = trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/";
      startTransition(() => {
        router.replace(target, { scroll: false });
      });
    }, 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    userTypedRef.current = false;
    const trimmed = value.trim();
    const target = trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/";
    startTransition(() => {
      router.push(target, { scroll: false });
    });
  };

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    userTypedRef.current = false;
    setValue("");
    startTransition(() => {
      router.replace("/", { scroll: false });
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg mx-auto flex gap-2"
      role="search"
    >
      <div className="relative flex-1">
        <input
          type="text"
          name="q"
          value={value}
          onChange={(e) => {
            userTypedRef.current = true;
            setValue(e.target.value);
          }}
          placeholder="Nhập tên truyện, tác giả, thể loại..."
          className="w-full pl-10 pr-9 py-2.5 rounded-full bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Xóa từ khóa tìm kiếm"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer shrink-0"
      >
        Tìm kiếm
      </button>
    </form>
  );
}

export default function HeroSearchForm({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto flex gap-2">
          <div className="flex-1 h-10 rounded-full bg-white/90" />
          <div className="w-24 h-10 rounded-full bg-amber-400" />
        </div>
      }
    >
      <HeroSearchFormInner initialQuery={initialQuery} />
    </Suspense>
  );
}
