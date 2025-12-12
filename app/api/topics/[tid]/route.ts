// app/api/topics/[tid]/route.ts
import { NextResponse } from "next/server";
import { connectToDb } from "@/app/db/mongoose";
import Topic from "@/app/db/Topics";

type Context = {
  params: Promise<{ tid: string }>;
};

export async function GET(_req: Request, context: Context) {
  await connectToDb();
  const { tid } = await context.params;

  const topic = await Topic.findById(tid).lean();
  if (!topic) console.log("Topic not found for id:", tid);
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }
  return NextResponse.json({ topic });
}

export async function PATCH(req: Request, { params }: Params) {
  await connectToDb();
  const updates = await req.json();
  const topic = await Topic.findByIdAndUpdate(params.tid, updates, {
    new: true,
  }).lean();
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }
  return NextResponse.json({ topic });
}

export async function DELETE(_req: Request, context: Context) {
  await connectToDb();
  const { tid } = await context.params;
  await Topic.findByIdAndDelete(tid);
  return NextResponse.json({ ok: true });
}
