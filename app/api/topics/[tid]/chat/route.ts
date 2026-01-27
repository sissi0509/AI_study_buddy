// app/api/topics/[tid]/chat/route.ts

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

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  summarizeProblemEvery: 15,
  refinePatternsThreshold: 25,
  recentMessagesCount: 6,
  minMessagesForSummary: 5,
} as const;

// ============================================================================
// TYPES
// ============================================================================
interface SessionDoc {
  _id: mongoose.Types.ObjectId;
  messages: ChatMessage[];
  currentProblemSummary: string;
  learningPatterns: string;
  currentProblemStartIndex: number;
  lastProblemSummarizedIndex: number;
  lastPatternsAnalyzedIndex: number;
  patternsVersion: number;
}

interface SummarizationContext {
  session: SessionDoc;
  messages: ChatMessage[];
  topicName: string;
  totalMessages: number;
}

// ============================================================================
// HELPERS
// ============================================================================

const updateSession = (
  sessionId: mongoose.Types.ObjectId,
  sets: Record<string, unknown>,
  incs?: Record<string, number>,
) =>
  ChatSession.updateOne(
    { _id: sessionId },
    { $set: sets, ...(incs && { $inc: incs }) },
  );

function detectNewProblem(
  messages: ChatMessage[],
  explicitFlag: boolean,
): boolean {
  if (explicitFlag) return true;
  if (messages.length < 2) return false;

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMsg) return false;

  const content = lastUserMsg.content.toLowerCase();
  const keywords = [
    "new problem",
    "next problem",
    "different problem",
    "another problem",
    "can we do another",
    "let's try a new",
    "moving on to",
  ];

  return keywords.some((kw) => content.includes(kw));
}

function getMessageSlice(
  messages: ChatMessage[],
  start: number,
  end: number,
  minLength = CONFIG.minMessagesForSummary,
): ChatMessage[] | null {
  const slice = messages.slice(start, end);
  return slice.length >= minLength ? slice : null;
}

// ============================================================================
// SUMMARIZATION LOGIC
// ============================================================================

async function handleNewProblem(
  ctx: SummarizationContext,
): Promise<{ patterns: string; summary: string }> {
  const { session, messages, topicName, totalMessages } = ctx;

  const completedMessages = getMessageSlice(
    messages,
    session.currentProblemStartIndex,
    totalMessages,
  );

  if (!completedMessages) {
    await updateSession(session._id, {
      currentProblemSummary: "",
      currentProblemStartIndex: totalMessages,
      lastProblemSummarizedIndex: totalMessages,
      lastPatternsAnalyzedIndex: totalMessages,
    });
    return { patterns: session.learningPatterns, summary: "" };
  }

  const refinedPatterns = await refineLearningPatternSummary(
    completedMessages,
    session.learningPatterns || null,
    topicName,
  );

  await updateSession(
    session._id,
    {
      learningPatterns: refinedPatterns,
      currentProblemSummary: "",
      currentProblemStartIndex: totalMessages,
      lastProblemSummarizedIndex: totalMessages,
      lastPatternsAnalyzedIndex: totalMessages,
    },
    { problemsAttempted: 1, patternsVersion: 1 },
  );

  console.log("✅ New problem: patterns refined, tracking reset");
  return { patterns: refinedPatterns, summary: "" };
}

async function maybeSummarizeProblem(
  ctx: SummarizationContext,
  currentSummary: string,
): Promise<string> {
  const { session, messages, topicName, totalMessages } = ctx;

  const messagesSinceLastSummary =
    totalMessages - session.lastProblemSummarizedIndex;

  if (messagesSinceLastSummary < CONFIG.summarizeProblemEvery) {
    return currentSummary;
  }

  const endIndex = totalMessages - CONFIG.recentMessagesCount;
  const slice = getMessageSlice(
    messages,
    session.currentProblemStartIndex,
    endIndex,
  );

  if (!slice) return currentSummary;

  const summary = await generateProblemProgressSummary(slice, topicName);

  await updateSession(session._id, {
    currentProblemSummary: summary,
    lastProblemSummarizedIndex: endIndex,
  });

  console.log("✅ Problem progress summarized");
  return summary;
}

async function maybeRefinePatternsMidProblem(
  ctx: SummarizationContext,
  currentPatterns: string,
): Promise<string> {
  const { session, messages, topicName, totalMessages } = ctx;

  const messagesInProblem = totalMessages - session.currentProblemStartIndex;
  const messagesSinceLastAnalysis =
    totalMessages - session.lastPatternsAnalyzedIndex;

  if (
    messagesInProblem < CONFIG.refinePatternsThreshold ||
    messagesSinceLastAnalysis < CONFIG.refinePatternsThreshold
  ) {
    return currentPatterns;
  }

  const endIndex = totalMessages - CONFIG.recentMessagesCount;
  const slice = getMessageSlice(
    messages,
    session.lastPatternsAnalyzedIndex,
    endIndex,
  );

  if (!slice) return currentPatterns;

  console.log(
    `🔄 Long problem (${messagesInProblem} msgs), refining patterns mid-problem`,
  );

  const refined = await refineLearningPatternSummary(
    slice,
    session.learningPatterns || null,
    topicName,
  );

  await updateSession(
    session._id,
    { learningPatterns: refined, lastPatternsAnalyzedIndex: endIndex },
    { patternsVersion: 1 },
  );

  console.log(`✅ Patterns refined (v${session.patternsVersion + 1})`);
  return refined;
}

// ============================================================================
// GET: Load existing chat session
// ============================================================================

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tid: string }> },
) {
  try {
    await connectToDb();

    const userId = await getUserIdFromRequest();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { tid } = await params;
    if (!mongoose.Types.ObjectId.isValid(tid)) {
      return NextResponse.json({ error: "Invalid topic id" }, { status: 400 });
    }

    const session = await ChatSession.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      topicId: new mongoose.Types.ObjectId(tid),
    }).lean();

    return NextResponse.json({
      messages: session?.messages || [],
    });
  } catch (err) {
    console.error("❌ Error loading chat session:", err);
    return NextResponse.json(
      { error: "Failed to load chat session" },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST: Send message and get AI reply
// ============================================================================

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tid: string }> },
) {
  try {
    await connectToDb();

    // 1) Authentication
    const userId = await getUserIdFromRequest();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Not authenticated. Please log in." },
        { status: 401 },
      );
    }

    // 2) Topic validation
    const { tid } = await params;
    if (!mongoose.Types.ObjectId.isValid(tid)) {
      return NextResponse.json({ error: "Invalid topic id" }, { status: 400 });
    }

    const topic = await Topic.findById(tid).lean();
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // 3) Get or create session
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

    // 4) Parse request - now only expects the new user message
    const body = await req.json();
    const userMessage: string = body?.message;
    const explicitNewProblem = body?.isNewProblem || false;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    // 5) Build full message history from DB + new message
    const existingMessages: ChatMessage[] = session.messages || [];
    const newUserMsg: ChatMessage = { role: "user", content: userMessage };
    const allMessages = [...existingMessages, newUserMsg];

    // 6) Build summarization context
    const ctx: SummarizationContext = {
      session,
      messages: allMessages,
      topicName: topic.name,
      totalMessages: allMessages.length,
    };

    // 7) Process context updates
    let { currentProblemSummary, learningPatterns } = session;
    const isNewProblem = detectNewProblem(allMessages, explicitNewProblem);

    if (isNewProblem) {
      const result = await handleNewProblem(ctx);
      learningPatterns = result.patterns;
      currentProblemSummary = result.summary;
      ctx.session.currentProblemStartIndex = ctx.totalMessages;
    } else {
      currentProblemSummary = await maybeSummarizeProblem(
        ctx,
        currentProblemSummary || "",
      );
      learningPatterns = await maybeRefinePatternsMidProblem(
        ctx,
        learningPatterns || "",
      );
    }

    // 8) Generate reply
    console.log(`🤖 Generating reply for ${topic.name}`);
    console.log(
      `   Context: ${currentProblemSummary ? "problem summary" : "none"}, ${
        learningPatterns
          ? `patterns v${session.patternsVersion}`
          : "no patterns"
      }`,
    );

    const reply = await generateTutorReply({
      topicName: topic.name,
      steps: topic.steps,
      keyPoints: topic.keyPoints,
      commonMistakes: topic.commonMistakes,
      messages: allMessages,
      currentProblemSummary: currentProblemSummary || undefined,
      learningPatterns: learningPatterns || undefined,
    });

    // 9) Store both messages in database
    const assistantMsg: ChatMessage = { role: "assistant", content: reply };

    await ChatSession.updateOne(
      { _id: session._id },
      {
        $push: {
          messages: {
            $each: [newUserMsg, assistantMsg],
          },
        },
      },
    );

    console.log(`✅ Messages stored (total: ${allMessages.length + 1})`);

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("❌ Error in topic chat:", err);
    return NextResponse.json(
      {
        error: "Failed to chat",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
