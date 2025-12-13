import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function buildTutorPrompt({
  topicName,
  systemPrompt,
  steps,
  messages,
}: {
  topicName: string;
  systemPrompt?: string;
  steps?: string[];
  messages: ChatMessage[];
}) {
  const pedagogy = [
    systemPrompt?.trim(),
    steps && steps.length > 0
      ? `Follow these steps when helping the student:\n` +
        steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const conversation = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `
You are a tutoring assistant.

Topic: ${topicName}

${pedagogy}

Conversation so far:
${conversation}

ASSISTANT:
`.trim();
}

export async function generateTutorReply(args: {
  topicName: string;
  systemPrompt?: string;
  steps?: string[];
  messages: ChatMessage[];
}): Promise<string> {
  const prompt = buildTutorPrompt(args);

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(prompt);
  return result.response.text();
}
