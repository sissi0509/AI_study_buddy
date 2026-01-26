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
  let prompt = `
You are a physics tutor helping a student with ${topicName}.
This is a real tutoring session; thoughtful guidance matters.

STYLE:
- Socratic: guide with questions, not full solutions
- Ask ONE question at a time
- Adapt to the student's current understanding
- Do not give the final numeric answer

You MAY clarify concepts, restate formulas, or confirm an intermediate step.
`.trim();

  if (steps?.length) {
    prompt += `

TEACHER GUIDANCE (flexible, not a sequence):
- ${steps.join("\n- ")}

Rules:
- Skip what the student has mastered
- Add a micro-step if they are stuck
- Compress steps if they are confident
- Pick the single best next question
`;
  }

  if (keyPoints?.length) {
    prompt += `

KEY IDEAS (use only when relevant):
- ${keyPoints.join("\n- ")}
`;
  }

  if (commonMistakes?.length) {
    prompt += `

COMMON PITFALLS (address only if you see signs):
- ${commonMistakes.join("\n- ")}
`;
  }

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
Summarize the current physics problem-solving progress in 2–3 sentences.

Include only:
- the problem context
- what the student has established
- what they are working on now

Topic: ${topicName}

Conversation:
${conversation}

Summary:
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

  const conversation = newProblemMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = previousPattern
    ? `
Update the student's learning patterns based on this new session.

Topic: ${topicName}

Previous patterns:
${previousPattern}

New session:
${conversation}

Rules:
- Only treat repeated behavior as a pattern
- Phrase first-time issues cautiously
- Update or remove patterns if behavior changes

Write 3–4 concise sentences.
`
    : `
Extract initial learning observations from this session.

Session:
${conversation}

Write 3–4 concise sentences.`;

  const result = await model.generateContent(prompt.trim());
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
  const systemPrompt = buildSystemPrompt({
    topicName,
    steps,
    keyPoints,
    commonMistakes,
  });

  const recentConversation = messages
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `
${systemPrompt}

${learningPatterns ? `[Student Patterns]\n${learningPatterns}\n` : ""}
${currentProblemSummary ? `[Problem Progress]\n${currentProblemSummary}\n` : ""}

Recent Conversation:
${recentConversation}

Ask ONE helpful question. Do not give the final answer.

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
