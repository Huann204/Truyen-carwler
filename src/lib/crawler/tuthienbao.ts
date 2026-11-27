import * as cheerio from "cheerio";
import type { ParsedChapterStub } from "@/lib/crawler/parser";
import { slugifyCategory } from "@/lib/utils";

export const TUTHIENBAO_BASE_URL = "https://tuthienbao.com/forum";

export interface TuthienbaoForumMeta {
  id: string;
  label: string;
  kind: "shelf" | "threads";
}

export const TUTHIENBAO_FORUMS: TuthienbaoForumMeta[] = [
  { id: "47", label: "Truyện Tranh 1 — Mới nhất (f=47)", kind: "shelf" },
  { id: "1203", label: "Truyện Tranh 8 (f=1203)", kind: "shelf" },
  { id: "890", label: "Truyện Tranh 7 (f=890)", kind: "shelf" },
  { id: "782", label: "Truyện Tranh 6 (f=782)", kind: "shelf" },
  { id: "682", label: "Truyện Tranh 5 (f=682)", kind: "shelf" },
  { id: "615", label: "Truyện Tranh 4 (f=615)", kind: "shelf" },
  { id: "548", label: "Truyện Tranh 3 (f=548)", kind: "shelf" },
  { id: "437", label: "Truyện Tranh 2 (f=437)", kind: "shelf" },
  { id: "284", label: "Tổng Hợp Nhiều Truyện (f=284)", kind: "threads" },
  { id: "640", label: "Truyện Ngắn Một Tập (f=640)", kind: "threads" },
];

const SHELF_FORUM_IDS = new Set([
  "47",
  "437",
  "548",
  "615",
  "682",
  "782",
  "890",
  "1203",
]);

const THREAD_LIST_FORUM_IDS = new Set(["284", "640"]);

const NON_STORY_FORUM_IDS = new Set([
  "27",
  "44",
  "45",
  "47",
  "284",
  "416",
  "437",
  "548",
  "571",
  "615",
  "640",
  "682",
  "782",
  "890",
  "1203",
  // School/unrelated subforums visible in vBulletin jump/footer
  "517",
  "518",
  "519",
  "520",
  "525",
  "526",
  "528",
  "568",
]);

const SKIP_THREAD_IDS = new Set(["192940"]);

export type ParsedTuthienbaoTarget =
  | { kind: "forum"; forumId: string; page?: number }
  | { kind: "thread"; threadId: string; page?: number };

export function isTuthienbaoUrl(url: string): boolean {
  const trimmed = (url || "").trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return /(^|\.)tuthienbao\.com$/i.test(parsed.hostname);
  } catch {
    return /tuthienbao\.com/i.test(trimmed);
  }
}

export function isTuthienbaoShelfForumId(forumId: string): boolean {
  return SHELF_FORUM_IDS.has(forumId);
}

export function isTuthienbaoThreadListForumId(forumId: string): boolean {
  return THREAD_LIST_FORUM_IDS.has(forumId);
}

export function isTuthienbaoContainerForumId(forumId: string): boolean {
  return NON_STORY_FORUM_IDS.has(forumId);
}

export function parseTuthienbaoUrl(
  rawUrl: string
): ParsedTuthienbaoTarget | null {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed.replace(/^\/+/, ""), `${TUTHIENBAO_BASE_URL}/`);
  } catch {
    return null;
  }

  const pageRaw = parsed.searchParams.get("page");
  const pageNum = pageRaw ? parseInt(pageRaw, 10) : undefined;
  const validPage =
    pageNum && !Number.isNaN(pageNum) && pageNum > 0 ? pageNum : undefined;

  const pathname = parsed.pathname.toLowerCase();
  const forumId = parsed.searchParams.get("f");
  if (forumId && /^\d+$/.test(forumId) && pathname.includes("forumdisplay")) {
    return { kind: "forum", forumId, page: validPage };
  }

  const threadId = parsed.searchParams.get("t");
  if (threadId && /^\d+$/.test(threadId) && pathname.includes("showthread")) {
    return { kind: "thread", threadId, page: validPage };
  }

  return null;
}

export function cleanTuthienbaoTitle(raw: string): string {
  let cleaned = (raw || "")
    .replace(/\s*[-–|]+\s*๑.*$/i, "")
    .replace(/\s*[-–|]+\s*TuThienBao\.Com.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const withoutPrefix = cleaned.replace(/^(?:truyện|truyen)\s+/i, "").trim();
  if (withoutPrefix.length >= 3) {
    cleaned = withoutPrefix;
  }
  return cleaned;
}

export function buildTuthienbaoSlug(title: string, suffixId: string): string {
  const base = slugifyCategory(title).slice(0, 72) || "truyen";
  return `ttb-${base}-${suffixId}`;
}

export function detectCompleted(text: string): boolean {
  return /\b(end|full|hoàn\s*thành|hoan\s*thanh)\b/i.test(text || "");
}

export function extractAuthorFromTitle(title: string): string {
  const match = title.match(/\s+[-–]\s+([A-Za-zÀ-ỹ0-9 .,'-]{3,40})$/);
  if (!match) return "Đang cập nhật";
  const candidate = match[1].trim();
  if (/\b(end|full|tập|tap|chap)\b/i.test(candidate)) {
    return "Đang cập nhật";
  }
  return candidate;
}

export function cleanTuthienbaoDescription(rawText: string): string {
  const lines = (rawText || "")
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((l) => {
      const upper = l.toUpperCase();
      if (
        upper.includes("LÀM MỚI LẠI TRANG") ||
        upper.includes("S.HO.PEE") ||
        upper.includes("SHOPEE") ||
        upper.includes("KHUYẾN MÃI") ||
        upper.includes("ỦNG HỘ TTB") ||
        upper.includes("CLICK VÀO MUA") ||
        upper.includes("VÀO LINK RỒI TÌM MUA") ||
        upper.includes("MỤC VIDEO VỀ SẢN PHẨM")
      ) {
        return false;
      }
      return true;
    });

  let joined = lines.join(" ").replace(/\s+/g, " ").trim();
  // Also strip leading inline promo sentence if no newline separated it
  joined = joined
    .replace(
      /^LÀM MỚI LẠI TRANG[\s\S]*?(?:ỦNG HỘ TTB|CLICK VÀO MUA|QUÀ CHO|SẢN PHẨM)[^.]*\.?\s*/i,
      ""
    )
    .trim();

  if (!joined || /S\.HO\.PEE|ỦNG HỘ TTB/i.test(joined.slice(0, 120))) {
    return "";
  }
  return joined.length > 300 ? `${joined.slice(0, 297).trim()}...` : joined;
}

export function parseTuthienbaoPagenav($: cheerio.CheerioAPI): {
  currentPage: number;
  totalPages: number;
} {
  let currentPage = 1;
  let totalPages = 1;

  const ctrlText = $(".pagenav td.vbmenu_control").first().text().trim();
  const match = ctrlText.match(/Trang\s+(\d+)\s*\/\s*(\d+)/i);
  if (match) {
    currentPage = Math.max(1, parseInt(match[1], 10) || 1);
    totalPages = Math.max(currentPage, parseInt(match[2], 10) || 1);
  }

  $(".pagenav a[href*='page=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const pm = href.match(/[?&]page=(\d+)/);
    if (pm) {
      const p = parseInt(pm[1], 10);
      if (p > totalPages) totalPages = p;
    }
  });

  return { currentPage, totalPages };
}

export interface TuthienbaoSubforumItem {
  forumId: string;
  title: string;
  sourceUrl: string;
  threadCount: number;
  latestPostText: string;
  isCompleted: boolean;
}

export interface TuthienbaoThreadItem {
  threadId: string;
  title: string;
  rawTitle: string;
  sourceUrl: string;
  isCompleted: boolean;
}

export function parseTuthienbaoListingPage(html: string): {
  forumTitle: string;
  subforums: TuthienbaoSubforumItem[];
  threads: TuthienbaoThreadItem[];
  currentPage: number;
  totalPages: number;
} {
  const $ = cheerio.load(html);
  const forumTitle = cleanTuthienbaoTitle($("title").text());
  const { currentPage, totalPages } = parseTuthienbaoPagenav($);

  const subforums: TuthienbaoSubforumItem[] = [];
  const seenSubIds = new Set<string>();

  $('img[id^="forum_statusicon_"]').each((_, imgEl) => {
    const forumId = ($(imgEl).attr("id") || "").replace(
      "forum_statusicon_",
      ""
    );
    if (
      !forumId ||
      !/^\d+$/.test(forumId) ||
      NON_STORY_FORUM_IDS.has(forumId) ||
      seenSubIds.has(forumId)
    ) {
      return;
    }

    const innerRow = $(imgEl).closest("tr");
    const link = innerRow.find('a[href*="forumdisplay.php"]').first();
    const rawTitle = link.text().trim();
    if (!rawTitle) return;

    seenSubIds.add(forumId);
    const outerTr = $(imgEl).closest("table").closest("tr");
    const tds = outerTr.children("td");
    const latestPostText = tds
      .eq(1)
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const threadCountText = tds.eq(2).text().replace(/[^\d]/g, "");
    const threadCount = parseInt(threadCountText, 10) || 0;
    const cleanedTitle = cleanTuthienbaoTitle(rawTitle);

    subforums.push({
      forumId,
      title: cleanedTitle,
      sourceUrl: `${TUTHIENBAO_BASE_URL}/forumdisplay.php?f=${forumId}`,
      threadCount,
      latestPostText,
      isCompleted: detectCompleted(`${rawTitle} ${latestPostText}`),
    });
  });

  const threads: TuthienbaoThreadItem[] = [];
  const seenThreadIds = new Set<string>();

  $('a[id^="thread_title_"]').each((_, el) => {
    const threadId = ($(el).attr("id") || "").replace("thread_title_", "");
    const rawTitle = $(el).text().replace(/\s+/g, " ").trim();
    if (
      !threadId ||
      !/^\d+$/.test(threadId) ||
      SKIP_THREAD_IDS.has(threadId) ||
      seenThreadIds.has(threadId) ||
      !rawTitle
    ) {
      return;
    }
    if (/danh\s*sách\s*truyện/i.test(rawTitle)) return;

    seenThreadIds.add(threadId);
    threads.push({
      threadId,
      title: cleanTuthienbaoTitle(rawTitle),
      rawTitle,
      sourceUrl: `${TUTHIENBAO_BASE_URL}/showthread.php?t=${threadId}`,
      isCompleted: detectCompleted(rawTitle),
    });
  });

  return {
    forumTitle,
    subforums,
    threads,
    currentPage,
    totalPages,
  };
}

export function buildChapterStubsFromThreads(
  threadsNewestFirst: TuthienbaoThreadItem[]
): ParsedChapterStub[] {
  const chronological = [...threadsNewestFirst].reverse();
  const seenNumbers = new Set<string>();
  const stubs: ParsedChapterStub[] = [];

  chronological.forEach((th, idx) => {
    const numMatch = th.rawTitle.match(
      /(?:tập|tap|chap(?:ter)?|chương|chuong|vol\.?|phần|phan)\s*([0-9]+(?:\.[0-9]+)?)/i
    );
    const baseNum = numMatch ? numMatch[1] : String(idx + 1);
    let chapNumber = baseNum;
    if (seenNumbers.has(chapNumber)) {
      let suffix = 2;
      while (seenNumbers.has(`${baseNum}.${suffix}`)) {
        suffix++;
      }
      chapNumber = `${baseNum}.${suffix}`;
    }
    seenNumbers.add(chapNumber);

    const numeric = parseFloat(chapNumber);
    const chapOrder = !Number.isNaN(numeric) ? numeric : idx + 1;

    stubs.push({
      chapNumber,
      chapOrder,
      title: th.rawTitle || `Tập ${chapNumber}`,
      sourceUrl: th.sourceUrl,
      publishedAtText: "",
    });
  });

  stubs.sort((a, b) => a.chapOrder - b.chapOrder || a.chapNumber.localeCompare(b.chapNumber));
  return stubs;
}

function normalizeTuthienbaoImageUrl(rawSrc: string): string {
  const src = (rawSrc || "").trim();
  if (!src || src.startsWith("data:") || src.startsWith("javascript:")) {
    return "";
  }

  let normalized = src;
  if (normalized.startsWith("//")) {
    normalized = `https:${normalized}`;
  } else if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    // Relative forum paths (images/smilies, clear.gif, etc.) are UI icons, not comic pages
    return "";
  }

  const lower = normalized.toLowerCase();
  if (
    lower.includes("tuthienbao.com/forum/images/") ||
    lower.includes("tuthienbao.com/forum/clientscript/") ||
    lower.includes("/statusicon/") ||
    lower.includes("/smilies/") ||
    lower.includes("clear.gif") ||
    lower.includes("shopee") ||
    lower.includes("lazada") ||
    lower.includes("doubleclick") ||
    lower.includes("googlesyndication")
  ) {
    return "";
  }

  if (
    normalized.startsWith("http://") &&
    (lower.includes("blogger.googleusercontent.com") ||
      lower.includes("bp.blogspot.com") ||
      lower.includes("tuthienbao.com"))
  ) {
    normalized = `https://${normalized.slice("http://".length)}`;
  }

  return normalized;
}

export function parseTuthienbaoThreadPage(html: string): {
  title: string;
  images: string[];
  description: string;
  currentPage: number;
  totalPages: number;
  isCompleted: boolean;
} {
  const $ = cheerio.load(html);
  const rawTitle =
    $("td.navbar strong").last().text().trim() || $("title").text().trim();
  const title = cleanTuthienbaoTitle(rawTitle);
  const { currentPage, totalPages } = parseTuthienbaoPagenav($);

  const images: string[] = [];
  const seenImgs = new Set<string>();
  let description = "";

  $('div[id^="post_message_"]').each((idx, postEl) => {
    const post = $(postEl);

    if (idx === 0 && !description) {
      const clone = post.clone();
      clone.find("script, style, img").remove();
      description = cleanTuthienbaoDescription(clone.text());
    }

    post.find("img").each((_, imgEl) => {
      const rawSrc =
        $(imgEl).attr("data-src") || $(imgEl).attr("src") || "";
      const imgUrl = normalizeTuthienbaoImageUrl(rawSrc);
      if (imgUrl && !seenImgs.has(imgUrl)) {
        seenImgs.add(imgUrl);
        images.push(imgUrl);
      }
    });
  });

  return {
    title,
    images,
    description,
    currentPage,
    totalPages,
    isCompleted: detectCompleted(rawTitle),
  };
}
