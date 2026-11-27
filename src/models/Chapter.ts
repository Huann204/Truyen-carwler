import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IChapter extends Document {
  storyId: Types.ObjectId;
  storySlug: string;
  sourceStoryId: string;
  chapNumber: string;
  chapOrder: number;
  title: string;
  sourceUrl: string;
  contentType: "comic" | "text";
  images: string[];
  contentHtml: string;
  publishedAtText: string;
  isCrawled: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema = new Schema<IChapter>(
  {
    storyId: { type: Schema.Types.ObjectId, ref: "Story", required: true, index: true },
    storySlug: { type: String, required: true, index: true },
    sourceStoryId: { type: String, required: true, index: true },
    chapNumber: { type: String, required: true },
    chapOrder: { type: Number, required: true },
    title: { type: String, default: "" },
    sourceUrl: { type: String, required: true },
    contentType: {
      type: String,
      enum: ["comic", "text"],
      default: "text",
    },
    images: { type: [String], default: [] },
    contentHtml: { type: String, default: "" },
    publishedAtText: { type: String, default: "" },
    isCrawled: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChapterSchema.index({ storySlug: 1, chapNumber: 1 }, { unique: true });
ChapterSchema.index({ storySlug: 1, chapOrder: 1 });

export const Chapter: Model<IChapter> =
  mongoose.models.Chapter || mongoose.model<IChapter>("Chapter", ChapterSchema);
