import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL_NAME = "gemini-2.5-flash-lite";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================

/**
 * Builds the base system prompt for the AI tutor based on teacher inputs
 */
export function buildSystemPrompt({
  topicName,
  steps,
  keyPoints,
  commonMistakes,
}: {
  topicName: string;
  steps?: string[];
  keyPoints?: string[];
  commonMistakes?: string[];
}): string {
  // Base Socratic pedagogy
  let prompt = `You are a patient high school physics tutor helping a student with ${topicName}.

Your teaching approach follows the Socratic method:
- NEVER give direct answers or solutions
- Guide the student step-by-step through questions
- Ask ONE question at a time
- Start by asking the student to explain the problem in their own words
- Help them identify what they know and what they need to find
- Encourage critical thinking at each step
- If they make a mistake, ask guiding questions to help them discover it
- Provide hints rather than solutions
- Only confirm the final answer after they've worked through the entire problem`;

  // Add problem-solving steps if provided
  if (steps && steps.length > 0) {
    prompt += `\n\nProblem-Solving Steps to guide them through:\n`;
    steps.forEach((step, i) => {
      prompt += `${i + 1}. ${step}\n`;
    });
  }

  // Add key points if provided
  if (keyPoints && keyPoints.length > 0) {
    prompt += `\n\nKey Concepts students must understand:\n`;
    keyPoints.forEach((point) => {
      prompt += `- ${point}\n`;
    });
  }

  // Add common mistakes if provided
  if (commonMistakes && commonMistakes.length > 0) {
    prompt += `\n\nCommon student mistakes to watch for:\n`;
    commonMistakes.forEach((mistake) => {
      prompt += `- ${mistake}\n`;
    });
  }

  // Emotional prompt to improve AI performance and commitment
  prompt += `\n\nIMPORTANT: The student is trusting you to guide their learning journey. Your patient, thoughtful guidance will help them build genuine understanding and confidence in physics. Take your time with each question and truly help them discover the answers themselves.`;

  return prompt.trim();
}

// ============================================================================
// PROBLEM PROGRESS SUMMARIZATION
// ============================================================================

/**
 * Generates a concise summary of the current problem-solving progress
 * Used to maintain context about the specific problem being worked on
 */
export async function generateProblemProgressSummary(
  messages: ChatMessage[],
  topicName: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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

// ============================================================================
// ITERATIVE LEARNING PATTERN REFINEMENT
// ============================================================================

/**
 * Refines the understanding of student's learning patterns over time
 * - First problem: Creates initial pattern observations
 * - Subsequent problems: Updates patterns based on new evidence
 *
 * This mimics how real teachers develop deeper understanding of their students
 */
export async function refineLearningPatternSummary(
  newProblemMessages: ChatMessage[],
  previousPattern: string | null,
  topicName: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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
2. What mistakes the student makes (patterns, not one-time errors), if it is the first time the student made the mistake, also include it here.
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

// ============================================================================
// TUTOR PROMPT ASSEMBLY
// ============================================================================

/**
 * Assembles the complete prompt for the AI tutor
 * Combines: system prompt + learning patterns + problem progress + recent conversation
 */
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
}): string {
  // Build base system prompt from teacher inputs
  const systemPrompt = buildSystemPrompt({
    topicName,
    steps,
    keyPoints,
    commonMistakes,
  });

  // Add learning patterns if available (refined from previous problems)
  const learningPatternSection = learningPatterns
    ? `\n\n[Student's Learning Patterns (refined from previous problems)]:\n${learningPatterns}`
    : "";

  // Add current problem progress if available
  const problemProgressSection = currentProblemSummary
    ? `\n\n[Current Problem Progress]:\n${currentProblemSummary}`
    : "";

  // Include recent conversation history (last 6 messages = ~3 exchanges)
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

ASSISTANT:
`.trim();
}

// ============================================================================
// TUTOR REPLY GENERATION
// ============================================================================

/**
 * Main function to generate the AI tutor's response
 * Uses all context (teacher inputs, learning patterns, problem progress)
 */
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

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
