import { notFound } from "next/navigation";
import { after } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Story } from "@/models/Story";
import { Chapter } from "@/models/Chapter";
import {
  getCachedChapterContent,
  getCachedChapterList,
  getCachedStoryDetail,
} from "@/lib/queries";
import ReaderClient from "@/components/ReaderClient";

export const dynamic = "force-dynamic";

interface ChapterReaderPageProps {
  params: Promise<{ slug: string; chap: string }>;
}

export default async function ChapterReaderPage({
  params,
}: ChapterReaderPageProps) {
  const { slug, chap } = await params;
  const chapNumber = decodeURIComponent(chap);

  const [story, currentChap, allChapters] = await Promise.all([
    getCachedStoryDetail(slug),
    getCachedChapterContent(slug, chapNumber),
    getCachedChapterList(slug),
  ]);

  if (!story || !currentChap) {
    notFound();
  }

  const chapId = currentChap.id;
  const storyId = story.id;
  after(async () => {
    try {
      await connectDB();
      await Promise.all([
        Chapter.updateOne({ _id: chapId }, { $inc: { views: 1 } }).exec(),
        Story.updateOne({ _id: storyId }, { $inc: { views: 1 } }).exec(),
      ]);
    } catch {
      // ignore view count errors
    }
  });

  const currentIdx = allChapters.findIndex((c) => c.chapNumber === chapNumber);
  const prevChap =
    currentIdx > 0 ? allChapters[currentIdx - 1].chapNumber : null;
  const nextChap =
    currentIdx >= 0 && currentIdx < allChapters.length - 1
      ? allChapters[currentIdx + 1].chapNumber
      : null;

  return (
    <ReaderClient
      storySlug={story.slug}
      storyTitle={story.title}
      hasMultipleChapters={story.hasMultipleChapters}
      chapNumber={currentChap.chapNumber}
      chapTitle={currentChap.title || `Chap ${currentChap.chapNumber}`}
      contentType={currentChap.contentType}
      images={currentChap.images || []}
      contentHtml={currentChap.contentHtml || ""}
      prevChap={prevChap}
      nextChap={nextChap}
      allChapters={allChapters.map((c) => ({
        chapNumber: c.chapNumber,
        title: c.title || `Chap ${c.chapNumber}`,
      }))}
    />
  );
}
