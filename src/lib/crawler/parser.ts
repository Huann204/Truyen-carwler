import * as cheerio from "cheerio";
import {
  extractSlugAndSourceId,
  resolveSourceUrl,
  slugifyCategory,
} from "@/lib/utils";

export interface ListedStoryCard {
  sourceId: string;
  slug: string;
  sourceUrl: string;
  title: string;
  coverUrl: string;
  author: string;
  category: string;
  listedLatestChap: string | null;
  isShortBadge: boolean;
  sourceViews: number;
  rating: number;
}

export interface ParsedChapterStub {
  chapNumber: string;
  chapOrder: number;
  title: string;
  sourceUrl: string;
  publishedAtText: string;
}

export interface ParsedStoryDetail {
  sourceId: string;
  slug: string;
  sourceUrl: string;
  title: string;
  coverUrl: string;
  author: string;
  status: "ongoing" | "completed";
  storyType: "comic" | "text";
  hasMultipleChapters: boolean;
  category: string;
  categorySlug: string;
  tags: string[];
  description: string;
  sourceViews: number;
  rating: number;
  chapters: ParsedChapterStub[];
  singlePostContentHtml?: string;
}

export interface ParsedChapterContent {
  contentType: "comic" | "text";
  images: string[];
  contentHtml: string;
  title?: string;
}

export function sanitizeStoryHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  const $ = cheerio.load(`<div id="__root">${rawHtml}</div>`);
  const root = $("#__root");

  root.find("script, style, iframe, object, embed, form, button, input").remove();

  root.find("*").each((_, el) => {
    if (el.type !== "tag") return;
    const attribs = el.attribs || {};
    for (const attrName of Object.keys(attribs)) {
      if (
        attrName.toLowerCase().startsWith("on") ||
        attrName.toLowerCase() === "style"
      ) {
        $(el).removeAttr(attrName);
      }
    }
    if (el.tagName.toLowerCase() === "img") {
      const src = $(el).attr("data-src") || $(el).attr("src");
      if (src) {
        $(el).attr("src", resolveSourceUrl(src));
        $(el).attr("loading", "lazy");
        $(el).attr("referrerpolicy", "no-referrer");
      }
    }
    if (el.tagName.toLowerCase() === "a") {
      const href = $(el).attr("href") || "";
      if (href.startsWith("javascript:")) {
        $(el).removeAttr("href");
      }
    }
  });

  // Remove auto-appended comment line sometimes embedded at end of old forum imports
  root.find("p").each((_, p) => {
    const txt = $(p).text().trim();
    if (/^\d{2}\.\d{2}\.\d{4}\s+\d{2}.*Truyện đọc rất hay/i.test(txt)) {
      $(p).remove();
    }
  });

  return root.html()?.trim() || "";
}

export function parseStoryListPage(html: string): {
  items: ListedStoryCard[];
  totalPages: number;
} {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: ListedStoryCard[] = [];

  // Target the main story grid first; fall back to any .story-card if needed
  let cards = $(
    ".row.row-cols-2.row-cols-sm-3.row-cols-md-4.row-cols-lg-6 .story-card"
  );
  if (cards.length === 0) {
    cards = $(".story-card");
  }

  cards.each((_, cardEl) => {
    const card = $(cardEl);
    const titleAnchor = card.find("h3.card-title a").first();
    const href = titleAnchor.attr("href") || "";
    const ids = extractSlugAndSourceId(href);
    if (!ids || seen.has(ids.sourceId)) return;
    seen.add(ids.sourceId);

    const title =
      titleAnchor.text().trim() ||
      card.find("h3.card-title").attr("title")?.trim() ||
      "";
    if (!title) return;

    const imgSrc = card.find(".position-relative a img").first().attr("src") || "";
    const coverUrl = imgSrc.includes("default_cover.svg")
      ? ""
      : resolveSourceUrl(imgSrc);

    const topEndBadge = card
      .find(".position-absolute.top-0.end-0")
      .first()
      .text()
      .trim();

    let listedLatestChap: string | null = null;
    const chapMatch = topEndBadge.match(/(?:Chap|C\.)\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (chapMatch) {
      listedLatestChap = chapMatch[1];
    }
    const isShortBadge = /Ngắn/i.test(topEndBadge);

    const category =
      card.find(".position-absolute.bottom-0.start-0").first().text().trim() ||
      (href.includes("/truyen-tranh/") ? "Truyện Tranh" : "Truyện Chữ");

    const author =
      card.find(".card-body .text-muted.small.text-truncate").first().text().trim() ||
      "Đang cập nhật";

    const viewsText = card.find(".card-body .border-top span").first().text();
    const sourceViews = parseInt(viewsText.replace(/[^\d]/g, ""), 10) || 0;

    const ratingText = card
      .find(".position-absolute.top-0.start-0")
      .first()
      .text()
      .trim();
    const ratingVal = parseFloat(ratingText);
    const rating =
      !Number.isNaN(ratingVal) && ratingVal > 0 && ratingVal <= 5 ? ratingVal : 5.0;

    items.push({
      sourceId: ids.sourceId,
      slug: ids.slug,
      sourceUrl: resolveSourceUrl(href),
      title,
      coverUrl,
      author,
      category,
      listedLatestChap,
      isShortBadge,
      sourceViews,
      rating,
    });
  });

  let totalPages = 1;
  $("ul.pagination a.page-link").each((_, a) => {
    const href = $(a).attr("href") || "";
    const m = href.match(/[?&]page=(\d+)/);
    if (m) {
      const p = parseInt(m[1], 10);
      if (p > totalPages) totalPages = p;
    }
  });

  return { items, totalPages };
}

export function parseStoryDetailPage(
  html: string,
  pageUrl: string,
  fallbackCover = ""
): ParsedStoryDetail | null {
  const ids = extractSlugAndSourceId(pageUrl);
  if (!ids) return null;

  const $ = cheerio.load(html);
  const chapterLinks = $("#chaptersListGroup a.chapter-item");

  // Breadcrumb categories
  const breadcrumbs = $("ol.breadcrumb li span[property='name']")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  if (chapterLinks.length > 0) {
    // Multi-chapter mode (Manga / Long Novel)
    const title =
      $("h1.h4.fw-bold").first().text().trim() ||
      $("h1").first().text().trim() ||
      ids.slug;

    const detailImg =
      $(".card-body .row .col-4 img").first().attr("src") ||
      $("meta[property='og:image']").attr("content") ||
      "";
    const coverUrl =
      detailImg && !detailImg.includes("apple-touch-icon") && !detailImg.includes("default_cover")
        ? resolveSourceUrl(detailImg)
        : fallbackCover;

    const isCompleted =
      $(".badge")
        .filter((_, el) => /Hoàn thành/i.test($(el).text()))
        .length > 0;

    const categoryFromBadge = $(".badge i.bi-folder2-open")
      .parent()
      .text()
      .trim();
    const category =
      categoryFromBadge ||
      breadcrumbs[breadcrumbs.length - 2] ||
      (pageUrl.includes("/truyen-tranh/") ? "Truyện Tranh" : "Truyện Chữ");

    let author = "Đang cập nhật";
    $("li").each((_, li) => {
      const txt = $(li).text();
      if (txt.includes("Tác giả:")) {
        const aTxt = $(li).find("a").first().text().trim();
        author = aTxt || txt.replace(/.*Tác giả:\s*/i, "").trim() || author;
      }
    });

    let sourceViews = 0;
    $("li").each((_, li) => {
      const txt = $(li).text();
      if (txt.includes("Lượt xem:")) {
        sourceViews = parseInt(txt.replace(/[^\d]/g, ""), 10) || 0;
      }
    });

    const ratingAvg = parseFloat($("#ratingAvgDisplay").text().trim());
    const rating = !Number.isNaN(ratingAvg) && ratingAvg > 0 ? ratingAvg : 5.0;

    const tags = $("a[rel='tag']")
      .map((_, el) => $(el).text().replace(/^#+/, "").trim())
      .get()
      .filter(Boolean);

    const description =
      $(".story-reading-content").first().text().replace(/\s+/g, " ").trim() ||
      $("meta[name='description']").attr("content")?.trim() ||
      "";

    const chapters: ParsedChapterStub[] = [];
    const seenChap = new Set<string>();

    chapterLinks.each((idx, el) => {
      const href = $(el).attr("href") || "";
      const qMatch = href.match(/[?&]chap=([^&#]+)/i);
      const chapNumber = qMatch
        ? decodeURIComponent(qMatch[1]).trim()
        : String(idx + 1);
      if (!chapNumber || seenChap.has(chapNumber)) return;
      seenChap.add(chapNumber);

      const numeric = parseFloat(chapNumber);
      const chapOrder = !Number.isNaN(numeric) ? numeric : idx + 1;
      const badgeTxt = $(el).find(".badge").first().text().trim();
      const rawTitle = $(el).find("span.fw-bold").first().text().trim();
      const chapTitle = rawTitle || badgeTxt || `Chap ${chapNumber}`;

      const metaText = $(el).find(".text-muted.small").text().trim();
      const dateMatch = metaText.match(/\d{2}\/\d{2}\/\d{4}/);
      const publishedAtText = dateMatch ? dateMatch[0] : "";

      chapters.push({
        chapNumber,
        chapOrder,
        title: chapTitle,
        sourceUrl: resolveSourceUrl(href),
        publishedAtText,
      });
    });

    chapters.sort((a, b) => a.chapOrder - b.chapOrder);

    const isComic =
      pageUrl.includes("/truyen-tranh/") ||
      /truyện tranh|manga|doraemon|ngọc rồng/i.test(category);

    return {
      sourceId: ids.sourceId,
      slug: ids.slug,
      sourceUrl: resolveSourceUrl(pageUrl),
      title,
      coverUrl,
      author,
      status: isCompleted ? "completed" : "ongoing",
      storyType: isComic ? "comic" : "text",
      hasMultipleChapters: true,
      category,
      categorySlug: slugifyCategory(category),
      tags,
      description,
      sourceViews,
      rating,
      chapters,
    };
  }

  // Single-post Story Mode (Cổ tích, Dân gian, Ngụ ngôn, Truyện cười...)
  const title =
    $("h1.story-title").first().text().trim() ||
    $("h1").first().text().trim() ||
    ids.slug;

  const category =
    $("#mainStoryCard .r8-box__title a").first().text().trim() ||
    breadcrumbs[breadcrumbs.length - 2] ||
    "Truyện Chữ";

  const author =
    $("[itemprop='author'] [itemprop='name']").first().text().trim() ||
    "Sưu tầm";

  const metaSpanText = $(".r8-meta").text();
  const viewsMatch = metaSpanText.match(/([\d,]+)\s*lượt xem/i);
  const sourceViews = viewsMatch
    ? parseInt(viewsMatch[1].replace(/[^\d]/g, ""), 10) || 0
    : 0;
  const dateMatch = metaSpanText.match(/\d{2}\/\d{2}\/\d{4}/);
  const publishedAtText = dateMatch ? dateMatch[0] : "";

  const ogImg = $("meta[property='og:image']").attr("content") || "";
  const coverUrl =
    ogImg && !ogImg.includes("apple-touch-icon") && !ogImg.includes("default_cover")
      ? resolveSourceUrl(ogImg)
      : fallbackCover;

  const tags = $("footer a[href^='/tag/'], a[rel='tag']")
    .map((_, el) => $(el).text().replace(/^#+/, "").trim())
    .get()
    .filter(Boolean);

  const rawArea =
    $("#storyReadingArea").html() ||
    $(".story-reading-content").first().html() ||
    "";
  const singlePostContentHtml = sanitizeStoryHtml(rawArea);

  const plainText = cheerio
    .load(`<div>${singlePostContentHtml}</div>`)
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const description =
    plainText.length > 260 ? `${plainText.slice(0, 260).trim()}...` : plainText;

  return {
    sourceId: ids.sourceId,
    slug: ids.slug,
    sourceUrl: resolveSourceUrl(pageUrl),
    title,
    coverUrl,
    author,
    status: "completed",
    storyType: "text",
    hasMultipleChapters: false,
    category,
    categorySlug: slugifyCategory(category),
    tags,
    description,
    sourceViews,
    rating: 5.0,
    chapters: [
      {
        chapNumber: "1",
        chapOrder: 1,
        title: "Toàn văn",
        sourceUrl: resolveSourceUrl(pageUrl),
        publishedAtText,
      },
    ],
    singlePostContentHtml,
  };
}

export function parseChapterPage(html: string): ParsedChapterContent {
  const $ = cheerio.load(html);
  const heading = $("#chapterReaderCard h1").first().text().trim();

  const mangaImages = $(".manga-container .manga-page img")
    .map((_, img) => {
      const src = $(img).attr("data-src") || $(img).attr("src") || "";
      return resolveSourceUrl(src);
    })
    .get()
    .filter(Boolean);

  if (mangaImages.length > 0) {
    return {
      contentType: "comic",
      images: mangaImages,
      contentHtml: "",
      title: heading || undefined,
    };
  }

  const readerTextArea =
    $("#chapterReaderCard .story-reading-content").html() ||
    $("#storyReadingArea").html() ||
    $(".story-reading-content").first().html() ||
    "";

  return {
    contentType: "text",
    images: [],
    contentHtml: sanitizeStoryHtml(readerTextArea),
    title: heading || undefined,
  };
}
