import { Schema, models, model } from "mongoose";

const ChapterSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    subject: { type: String, default: "Physics" },
    // order: { type: Number },
  },
  { timestamps: true }
);

const Chapter = models.Chapter || model("Chapter", ChapterSchema);
export default Chapter;
