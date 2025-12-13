import mongoose, { Schema } from "mongoose";

const ChatMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    messages: { type: [ChatMessageSchema], default: [] },
  },
  { timestamps: true }
);

// one session per (user, topic)
ChatSessionSchema.index({ userId: 1, topicId: 1 }, { unique: true });

export default mongoose.models.ChatSession ||
  mongoose.model("ChatSession", ChatSessionSchema);
