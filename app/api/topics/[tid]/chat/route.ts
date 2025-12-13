import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDb } from "@/app/db/mongoose";
import Topic from "@/app/db/Topics";
import User from "@/app/db/Users";
import { generateTutorReply } from "@/app/lib/ai/tutor";

const MAX_MESSAGES = 100;
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  try {
    await connectToDb();

    // 1) Identify user (MVP identity via header)
    const userId = req.headers.get("x-user-id");
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Missing user" }, { status: 401 });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }
    if (user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Topic
    const { tid } = await params;
    if (!mongoose.Types.ObjectId.isValid(tid)) {
      return NextResponse.json({ error: "Invalid topic id" }, { status: 400 });
    }

    const topic = await Topic.findById(tid).lean();
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // 3) Messages
    const body = await req.json();
    const messages = body?.messages;
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const safeMessages =
      messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;

    const reply = await generateTutorReply({
      topicName: topic.name,
      systemPrompt: topic.systemPrompt,
      steps: topic.steps,
      messages: safeMessages,
    });

    // // 4) Call OpenAI (Responses API)
    // const result = await client.responses.create({
    //   model: "gpt-4o-mini",
    //   instructions: `You are a friendly CS tutor. Topic: ${topicName}. Keep answers concise and beginner-friendly.`,
    //   input: messages.map((m: any) => ({
    //     role: m.role, // "user" | "assistant"
    //     content: m.content,
    //   })),
    // });

    // // Responses API returns output items; simplest is output_text helper
    // const reply = result.output_text || "Sorry — I couldn't generate a reply.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Error in topic chat:", err);
    return NextResponse.json({ error: "Failed to chat" }, { status: 500 });
  }
}
