import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICrawlerConfig extends Document {
  key: string;
  autoCrawlEnabled: boolean;
  intervalMinutes: number;
  pagesPerAutoRun: number;
  initialChapLimit: number;
  requestDelayMs: number;
  scope: "all" | "comic" | "text";
  lastAutoRunAt?: Date;
  nextAutoRunAt?: Date;
}

const CrawlerConfigSchema = new Schema<ICrawlerConfig>(
  {
    key: { type: String, default: "main", unique: true },
    autoCrawlEnabled: { type: Boolean, default: true },
    intervalMinutes: { type: Number, default: 20, min: 5, max: 1440 },
    pagesPerAutoRun: { type: Number, default: 2, min: 1, max: 20 },
    initialChapLimit: { type: Number, default: 10, min: 1, max: 200 },
    requestDelayMs: { type: Number, default: 350, min: 100, max: 5000 },
    scope: {
      type: String,
      enum: ["all", "comic", "text"],
      default: "all",
    },
    lastAutoRunAt: { type: Date },
    nextAutoRunAt: { type: Date },
  },
  { timestamps: true }
);

export const CrawlerConfig: Model<ICrawlerConfig> =
  mongoose.models.CrawlerConfig ||
  mongoose.model<ICrawlerConfig>("CrawlerConfig", CrawlerConfigSchema);
