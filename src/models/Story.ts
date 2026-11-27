import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IStory extends Document {
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
  totalChapters: number;
  crawledChaptersCount: number;
  latestChapNumber: string;
  latestChapTitle: string;
  views: number;
  sourceViews: number;
  rating: number;
  lastSyncedAt: Date;
  lastChapterUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    sourceUrl: { type: String, required: true },
    title: { type: String, required: true, index: true },
    coverUrl: { type: String, default: "" },
    author: { type: String, default: "Đang cập nhật" },
    status: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "ongoing",
      index: true,
    },
    storyType: {
      type: String,
      enum: ["comic", "text"],
      default: "text",
      index: true,
    },
    hasMultipleChapters: { type: Boolean, default: false },
    category: { type: String, default: "Truyện", index: true },
    categorySlug: { type: String, default: "truyen", index: true },
    tags: { type: [String], default: [] },
    description: { type: String, default: "" },
    totalChapters: { type: Number, default: 1 },
    crawledChaptersCount: { type: Number, default: 0 },
    latestChapNumber: { type: String, default: "1" },
    latestChapTitle: { type: String, default: "" },
    views: { type: Number, default: 0, index: true },
    sourceViews: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    lastSyncedAt: { type: Date, default: Date.now },
    lastChapterUpdatedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

StorySchema.index({ lastChapterUpdatedAt: -1, _id: -1 });
StorySchema.index({ sourceViews: -1, views: -1 });
StorySchema.index({ storyType: 1, lastChapterUpdatedAt: -1 });
StorySchema.index({ status: 1, lastChapterUpdatedAt: -1 });
StorySchema.index({ categorySlug: 1, lastChapterUpdatedAt: -1 });

export const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>("Story", StorySchema);
