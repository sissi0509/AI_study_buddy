// tutor.ts - ITERATIVE REFINEMENT

import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildSystemPrompt } from "./promptBuilder";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Problem progress summary (unchanged)
export async function generateProblemProgressSummary(
  messages: ChatMessage[],
  topicName: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const conversation = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const summaryPrompt = `
Summarize the current problem-solving progress in 2-3 sentences.

Focus on:
1. What is the specific problem being solved (numbers, context)
2. What has the student already figured out or established
3. What step they are currently working on

DO NOT include: mistakes, learning patterns, or pedagogical notes - just factual progress.

Topic: ${topicName}

Conversation:
${conversation}

Problem Progress Summary:
`.trim();

  const result = await model.generateContent(summaryPrompt);
  return result.response.text();
}

// NEW: Iterative pattern refinement
export async function refineLearningPatternSummary(
  newProblemMessages: ChatMessage[],
  previousPattern: string | null,
  topicName: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const newConversation = newProblemMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  // Different prompt based on whether we have previous patterns
  const summaryPrompt = previousPattern
    ? `
You are refining your understanding of a student's learning patterns in physics.

Topic: ${topicName}

PREVIOUS LEARNING PATTERNS (from earlier problems):
${previousPattern}

NEW PROBLEM SESSION (just completed):
${newConversation}

Task: Update and refine the learning patterns based on this new evidence.
- CONFIRM patterns that appear again (e.g., "still struggles with...")
- UPDATE patterns if the student has improved (e.g., "previously struggled with X, now showing mastery")
- ADD new patterns if you notice new consistent behaviors
- REMOVE patterns if they no longer apply

Focus on:
1. What problem-solving skills the student has MASTERED (confirmed or newly observed)
2. What mistakes the student REPEATEDLY makes (patterns, not one-time errors)
3. What concepts the student STRUGGLES with consistently
4. What types of hints work best for this student

Write 3-4 concise sentences that represent your UPDATED understanding.

REFINED Learning Patterns:
`.trim()
    : `
Analyze this first physics problem-solving session and extract initial learning patterns.

Topic: ${topicName}

FIRST PROBLEM SESSION:
${newConversation}

Focus on:
1. What problem-solving skills the student demonstrated
2. What mistakes the student made (if repeated, note as potential pattern)
3. What concepts the student struggled with
4. What types of hints seemed to help

Write 3-4 concise sentences about initial observations.

Initial Learning Patterns:
`.trim();

  const result = await model.generateContent(summaryPrompt);
  return result.response.text();
}

// Build tutor prompt (unchanged from before)
function buildTutorPrompt({
  topicName,
  steps,
  keyPoints,
  commonMistakes,
  messages,
  currentProblemSummary,
  learningPatterns,
}: {
  topicName: string;
  steps?: string[];
  keyPoints?: string[];
  commonMistakes?: string[];
  messages: ChatMessage[];
  currentProblemSummary?: string;
  learningPatterns?: string;
}) {
  const systemPrompt = buildSystemPrompt({
    topicName,
    steps,
    keyPoints,
    commonMistakes,
  });

  const learningPatternSection = learningPatterns
    ? `\n\n[Student's Learning Patterns (refined from ${
        learningPatterns.split("\n").length
      } previous problems)]:\n${learningPatterns}`
    : "";

  const problemProgressSection = currentProblemSummary
    ? `\n\n[Current Problem Progress]:\n${currentProblemSummary}`
    : "";

  const recentExchanges = messages.slice(-6);
  const conversation = recentExchanges
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `
${systemPrompt}
${learningPatternSection}
${problemProgressSection}

Recent Conversation:
${conversation}

Remember: Guide through questions, never give direct answers.

A:
`.trim();
}

export async function generateTutorReply(args: {
  topicName: string;
  steps?: string[];
  keyPoints?: string[];
  commonMistakes?: string[];
  messages: ChatMessage[];
  currentProblemSummary?: string;
  learningPatterns?: string;
}): Promise<string> {
  const prompt = buildTutorPrompt(args);

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
