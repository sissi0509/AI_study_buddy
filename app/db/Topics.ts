// app/db/Topics.ts
import mongoose, { Schema, models, model } from "mongoose";

const TopicSchema = new Schema(
  {
    name: { type: String, required: true }, // "Forces & Newton's Laws"
    description: { type: String, required: true }, // short explanation
    subject: { type: String, default: "Physics" }, // optional, for future
  },
  { timestamps: true }
);

const Topic = models.Topic || model("Topic", TopicSchema);
export default Topic;
