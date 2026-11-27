export const SOURCE_BASE_URL =
  process.env.SOURCE_BASE_URL?.replace(/\/+$/, "") || "https://vui.mobi";

export function resolveSourceUrl(href?: string | null): string {
  if (!href) return "";
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith("/")) {
    return `${SOURCE_BASE_URL}${trimmed}`;
  }
  return `${SOURCE_BASE_URL}/${trimmed}`;
}

export function slugifyCategory(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "truyen"
  );
}

export function extractSlugAndSourceId(urlOrPath: string): {
  slug: string;
  sourceId: string;
} | null {
  try {
    const cleanPath = urlOrPath.split("?")[0].split("#")[0];
    const filename = cleanPath.split("/").filter(Boolean).pop() || "";
    const match = filename.match(/^(.+)-(\d+)\.html$/i);
    if (!match) return null;
    return {
      slug: `${match[1]}-${match[2]}`,
      sourceId: match[2],
    };
  } catch {
    return null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatRelativeTime(dateInput?: Date | string | null): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(diffSec)) return "";
  if (diffSec < 60) return "Vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}
