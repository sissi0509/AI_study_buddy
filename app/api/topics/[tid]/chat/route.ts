// app/api/topics/[tid]/chat/route.ts - WITH AUTO AUTH & PROBLEM DETECTION

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDb } from "@/app/db/mongoose";
import Topic from "@/app/db/Topics";
import ChatSession from "@/app/db/ChatSessions";
import { getUserIdFromRequest } from "@/app/lib/auth";
import {
  generateTutorReply,
  generateProblemProgressSummary,
  refineLearningPatternSummary,
  type ChatMessage,
} from "@/app/lib/ai/tutor";

// Configuration constants
const SUMMARIZE_PROBLEM_EVERY = 15; // Summarize current problem every 15 messages
const ANALYZE_PATTERNS_AFTER_PROBLEM = 25; // Refine patterns after 25 messages (long problem)
const RECENT_MESSAGES_COUNT = 6; // Keep last 6 messages in context

/**
 * Detects if this is a new problem based on:
 * 1. Explicit flag from frontend (student clicked "New Problem" button)
 * 2. Keywords in last message suggesting new problem
 */
function detectNewProblem(
  messages: ChatMessage[],
  explicitFlag: boolean
): boolean {
  // Explicit flag takes precedence
  if (explicitFlag) return true;

  // Check last user message for new problem indicators
  if (messages.length < 2) return false;

  const lastUserMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUserMessage) return false;

  const content = lastUserMessage.content.toLowerCase();
  const newProblemKeywords = [
    "new problem",
    "next problem",
    "different problem",
    "another problem",
    "can we do another",
    "let's try a new",
    "moving on to",
  ];

  return newProblemKeywords.some((keyword) => content.includes(keyword));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  try {
    // Connect to database
    await connectToDb();

    // ==========================================
    // 1) USER AUTHENTICATION (AUTOMATIC)
    // ==========================================
    const userId = await getUserIdFromRequest();

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 401 });
    }

    // ==========================================
    // 2) TOPIC VALIDATION
    // ==========================================
    const { tid } = await params;
    if (!mongoose.Types.ObjectId.isValid(tid)) {
      return NextResponse.json({ error: "Invalid topic id" }, { status: 400 });
    }

    const topic = await Topic.findById(tid).lean();
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // ==========================================
    // 3) GET OR CREATE CHAT SESSION
    // ==========================================
    let session = await ChatSession.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      topicId: new mongoose.Types.ObjectId(tid),
    });

    if (!session) {
      session = await ChatSession.create({
        userId,
        topicId: tid,
        messages: [],
        currentProblemSummary: "",
        currentProblemStartIndex: 0,
        lastProblemSummarizedIndex: 0,
        learningPatterns: "",
        lastPatternsAnalyzedIndex: 0,
        patternsVersion: 0,
        problemsAttempted: 0,
      });
    }

    // ==========================================
    // 4) PARSE REQUEST BODY
    // ==========================================
    const body = await req.json();
    const messages = body?.messages;
    const explicitNewProblemFlag = body?.isNewProblem || false;

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const totalMessages = messages.length;
    let currentProblemSummary = session.currentProblemSummary || "";
    let learningPatterns = session.learningPatterns || "";

    // ==========================================
    // 5) DETECT NEW PROBLEM (AUTO + MANUAL)
    // ==========================================
    const isNewProblem = detectNewProblem(messages, explicitNewProblemFlag);

    if (isNewProblem) {
      // Get messages from the completed problem
      const completedProblemMessages = messages.slice(
        session.currentProblemStartIndex,
        totalMessages
      );

      // Only refine if there's enough conversation
      if (completedProblemMessages.length > 5) {
        // ITERATIVELY REFINE: Previous pattern + new problem messages
        const refinedPattern = await refineLearningPatternSummary(
          completedProblemMessages,
          session.learningPatterns || null,
          topic.name
        );

        learningPatterns = refinedPattern;

        // Update session with refined pattern and reset problem tracking
        await ChatSession.updateOne(
          { _id: session._id },
          {
            $set: {
              learningPatterns: refinedPattern,
              currentProblemSummary: "", // Reset problem summary
              currentProblemStartIndex: totalMessages, // New problem starts here
              lastProblemSummarizedIndex: totalMessages,
              lastPatternsAnalyzedIndex: totalMessages,
            },
            $inc: {
              problemsAttempted: 1,
              patternsVersion: 1, // Track how many times refined
            },
          }
        );
      }

      // Reset problem-level variables
      currentProblemSummary = "";
      session.currentProblemStartIndex = totalMessages;
    }

    // ==========================================
    // 6) TIER 1: SUMMARIZE CURRENT PROBLEM PROGRESS
    // ==========================================
    const messagesInCurrentProblem =
      totalMessages - session.currentProblemStartIndex;
    const messagesSinceLastProblemSummary =
      totalMessages - session.lastProblemSummarizedIndex;

    if (messagesSinceLastProblemSummary >= SUMMARIZE_PROBLEM_EVERY) {
      // Get messages to summarize (exclude very recent ones)
      const messagesToSummarize = messages.slice(
        session.currentProblemStartIndex,
        -RECENT_MESSAGES_COUNT
      );

      if (messagesToSummarize.length > 0) {
        const progressSummary = await generateProblemProgressSummary(
          messagesToSummarize,
          topic.name
        );

        currentProblemSummary = progressSummary;

        await ChatSession.updateOne(
          { _id: session._id },
          {
            $set: {
              currentProblemSummary: currentProblemSummary,
              lastProblemSummarizedIndex: totalMessages - RECENT_MESSAGES_COUNT,
            },
          }
        );

        console.log(`✅ Problem progress summarized`);
      }
    }

    // ==========================================
    // 7) TIER 2: REFINE PATTERNS FOR LONG PROBLEMS
    // ==========================================
    if (
      messagesInCurrentProblem >= ANALYZE_PATTERNS_AFTER_PROBLEM &&
      totalMessages - session.lastPatternsAnalyzedIndex >=
        ANALYZE_PATTERNS_AFTER_PROBLEM
    ) {
      console.log(
        `🔄 Long problem detected (${messagesInCurrentProblem} messages), refining patterns mid-problem`
      );

      const messagesToAnalyze = messages.slice(
        session.lastPatternsAnalyzedIndex,
        -RECENT_MESSAGES_COUNT
      );

      if (messagesToAnalyze.length > 5) {
        const refinedPattern = await refineLearningPatternSummary(
          messagesToAnalyze,
          session.learningPatterns || null,
          topic.name
        );

        learningPatterns = refinedPattern;

        await ChatSession.updateOne(
          { _id: session._id },
          {
            $set: {
              learningPatterns: refinedPattern,
              lastPatternsAnalyzedIndex: totalMessages - RECENT_MESSAGES_COUNT,
            },
            $inc: { patternsVersion: 1 },
          }
        );

        console.log(
          `✅ Patterns refined mid-problem (version ${
            session.patternsVersion + 1
          })`
        );
      }
    }

    // ==========================================
    // 8) GENERATE AI REPLY
    // ==========================================
    console.log(`🤖 Generating reply with:`);
    console.log(`   - Topic: ${topic.name}`);
    console.log(`   - Steps: ${topic.steps?.length || 0}`);
    console.log(`   - Key Points: ${topic.keyPoints?.length || 0}`);
    console.log(`   - Common Mistakes: ${topic.commonMistakes?.length || 0}`);
    console.log(
      `   - Problem Summary: ${currentProblemSummary ? "Yes" : "No"}`
    );
    console.log(
      `   - Learning Patterns: ${
        learningPatterns ? `Yes (v${session.patternsVersion})` : "No"
      }`
    );

    const reply = await generateTutorReply({
      topicName: topic.name,
      steps: topic.steps,
      keyPoints: topic.keyPoints,
      commonMistakes: topic.commonMistakes,
      messages: messages,
      currentProblemSummary: currentProblemSummary,
      learningPatterns: learningPatterns,
    });

    console.log(`✅ Reply generated successfully`);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("❌ Error in topic chat:", err);
    return NextResponse.json(
      {
        error: "Failed to chat",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
