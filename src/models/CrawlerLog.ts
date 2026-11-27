import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICrawlerLog extends Document {
  trigger: "auto" | "manual" | "single";
  status: "running" | "success" | "error";
  mode: string;
  pagesScanned: number;
  storiesAdded: number;
  storiesUpdated: number;
  chaptersCrawled: number;
  errorsCount: number;
  details: string[];
  errorMessage: string;
  startedAt: Date;
  finishedAt?: Date;
}

const CrawlerLogSchema = new Schema<ICrawlerLog>(
  {
    trigger: {
      type: String,
      enum: ["auto", "manual", "single"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["running", "success", "error"],
      default: "running",
      index: true,
    },
    mode: { type: String, default: "quick_update" },
    pagesScanned: { type: Number, default: 0 },
    storiesAdded: { type: Number, default: 0 },
    storiesUpdated: { type: Number, default: 0 },
    chaptersCrawled: { type: Number, default: 0 },
    errorsCount: { type: Number, default: 0 },
    details: { type: [String], default: [] },
    errorMessage: { type: String, default: "" },
    startedAt: { type: Date, default: Date.now, index: true },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

CrawlerLogSchema.index({ startedAt: -1 });

export const CrawlerLog: Model<ICrawlerLog> =
  mongoose.models.CrawlerLog ||
  mongoose.model<ICrawlerLog>("CrawlerLog", CrawlerLogSchema);
