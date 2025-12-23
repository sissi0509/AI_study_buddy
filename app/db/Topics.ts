// Topics.ts - FINAL VERSION
import { Schema, models, model } from "mongoose";

const TopicSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    subject: { type: String, default: "Physics" },
    chapter: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: false,
    },

    // TEACHER INPUTS - Simple, pedagogical
    steps: [String], // Problem-solving steps
    keyPoints: [String], // Important concepts students must understand
    commonMistakes: [String], // What students typically get wrong
  },
  { timestamps: true }
);

const Topic = models.Topic || model("Topic", TopicSchema);
export default Topic;
