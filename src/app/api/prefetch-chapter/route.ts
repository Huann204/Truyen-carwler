import { NextRequest, NextResponse } from "next/server";
import { getCachedChapterContent } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.trim() || "";
  const chap = req.nextUrl.searchParams.get("chap")?.trim() || "";

  if (!slug || !chap) {
    return NextResponse.json(
      { ok: false, error: "Missing slug or chap" },
      { status: 400 }
    );
  }

  try {
    const data = await getCachedChapterContent(slug, chap);
    return NextResponse.json(
      {
        ok: true,
        isCrawled: Boolean(data?.isCrawled),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
