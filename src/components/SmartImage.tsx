"use client";

import React, { useState } from "react";
import { BookOpen } from "lucide-react";

interface SmartImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  priority?: boolean;
  fadeIn?: boolean;
}

export default function SmartImage({
  src,
  alt,
  className = "",
  fallbackTitle,
  priority = false,
  fadeIn: _fadeIn,
}: SmartImageProps) {
  const cleanSrc = (src || "").trim();
  const [stage, setStage] = useState<"direct" | "proxy" | "fallback">(
    cleanSrc ? "direct" : "fallback"
  );

  if (!cleanSrc || stage === "fallback") {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-slate-800 to-slate-900 text-white p-3 text-center select-none ${className}`}
      >
        <BookOpen className="w-8 h-8 text-amber-400/90 mb-2 shrink-0" />
        {fallbackTitle && (
          <span className="text-xs font-semibold line-clamp-3 text-slate-100 leading-snug">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  const effectiveSrc =
    stage === "direct"
      ? cleanSrc
      : `/api/image-proxy?url=${encodeURIComponent(cleanSrc)}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={effectiveSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => {
        if (stage === "direct") {
          setStage("proxy");
        } else {
          setStage("fallback");
        }
      }}
    />
  );
}
