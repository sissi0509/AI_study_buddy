// ChatSessions.ts - SINGLE EVOLVING PATTERN
import mongoose, { Schema } from "mongoose";

const ChatMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ChatSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true },
    messages: { type: [ChatMessageSchema], default: [] },

    // TIER 1: Current problem tracking
    currentProblemSummary: { type: String, default: "" },
    currentProblemStartIndex: { type: Number, default: 0 },
    lastProblemSummarizedIndex: { type: Number, default: 0 },

    // TIER 2: Single evolving learning pattern
    learningPatterns: { type: String, default: "" }, // One cumulative pattern
    lastPatternsAnalyzedIndex: { type: Number, default: 0 },
    patternsVersion: { type: Number, default: 0 }, // How many times refined

    // Metadata
    problemsAttempted: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ChatSessionSchema.index({ userId: 1, topicId: 1 }, { unique: true });

export default mongoose.models.ChatSession ||
  mongoose.model("ChatSession", ChatSessionSchema);
