// app/api/topics/[tid]/chat/route.ts
import { NextResponse } from "next/server";
import { connectToDb } from "@/app/db/mongoose";
import Topic from "@/app/db/Topics";

// import OpenAI from "openai"; // when you’re ready

type Params = { params: { tid: string } };

export async function POST(req: Request, { params }: Params) {
  await connectToDb();

  const body = await req.json();
  const { messages } = body; // [{ role, content }, ...]
  const { tid } = await params;
  const topic = await Topic.findById(tid).lean();
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  // TODO: call OpenAI here
  const reply = `This is a placeholder answer about topic: ${
    topic.title
  }. You asked: "${messages[messages.length - 1]?.content}"`;

  return NextResponse.json({ reply });
}
