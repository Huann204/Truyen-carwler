import { NextRequest, NextResponse } from "next/server";
import { checkDBHealth, connectDB } from "@/lib/mongodb";
import { Story } from "@/models/Story";

export async function GET(req: NextRequest) {
  const health = await checkDBHealth();
  if (!health.connected) {
    return NextResponse.json({ items: [], total: 0, connected: false });
  }

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const type = sp.get("type")?.trim() || "";
  const status = sp.get("status")?.trim() || "";
  const category = sp.get("category")?.trim() || "";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(sp.get("limit") || "24", 10) || 24));

  const filter: Record<string, unknown> = {};
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { author: { $regex: escaped, $options: "i" } },
      { tags: { $regex: escaped, $options: "i" } },
    ];
  }
  if (type === "comic" || type === "text") {
    filter.storyType = type;
  }
  if (status === "ongoing" || status === "completed") {
    filter.status = status;
  }
  if (category) {
    filter.categorySlug = category;
  }

  const [items, total] = await Promise.all([
    Story.find(filter)
      .sort({ lastChapterUpdatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Story.countDocuments(filter),
  ]);

  return NextResponse.json({
    connected: true,
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
