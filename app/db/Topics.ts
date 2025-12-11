import { Schema, models, model } from "mongoose";

const TopicSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    steps: [String],
    subject: { type: String, default: "Physics" },
    systemPrompt: { type: String },
    chapter: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: false,
    },
  },
  { timestamps: true }
);

const Topic = models.Topic || model("Topic", TopicSchema);
export default Topic;
