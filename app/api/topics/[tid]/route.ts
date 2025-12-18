// app/api/topics/[tid]/route.ts
import { NextResponse } from "next/server";
import { connectToDb } from "@/app/db/mongoose";
import Topic from "@/app/db/Topics";
import Chapter from "@/app/db/Chapters";
import mongoose from "mongoose";

type Context = {
  params: Promise<{ tid: string }>;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  try {
    await connectToDb();

    const { tid } = await params;

    // Validate topic id
    if (!mongoose.Types.ObjectId.isValid(tid)) {
      return NextResponse.json({ error: "Invalid topic id" }, { status: 400 });
    }

    // Parse query params
    const url = new URL(request.url);
    const include = url.searchParams.get("include");
    const includeChapter = include?.split(",").includes("chapter") ?? false;

    // Fetch topic
    const topicDoc = await Topic.findById(tid).lean();
    if (!topicDoc) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const topic = {
      id: topicDoc._id.toString(),
      name: topicDoc.name,
      description: topicDoc.description,
      chapterId: topicDoc.chapter ? topicDoc.chapter.toString() : null,
    };

    // If chapter not requested or topic has no chapter
    if (!includeChapter || !topic.chapterId) {
      return NextResponse.json({ topic });
    }

    // Validate chapter id (extra safety)
    if (!mongoose.Types.ObjectId.isValid(topic.chapterId)) {
      return NextResponse.json({ topic, chapter: null });
    }

    // Fetch chapter
    const chapterDoc = await Chapter.findById(topic.chapterId).lean();

    const chapter = chapterDoc
      ? {
          id: chapterDoc._id.toString(),
          name: chapterDoc.name,
          description: chapterDoc.description,
        }
      : null;

    return NextResponse.json({ topic, chapter });
  } catch (err) {
    console.error("Error fetching topic:", err);
    return NextResponse.json(
      { error: "Failed to load topic" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: Context) {
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

export async function DELETE(req: Request, { params }: Context) {
  try {
    await connectToDb();
    const { tid } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(tid)) {
      return NextResponse.json({ error: "Invalid topic id" }, { status: 400 });
    }

    const deleted = await Topic.findByIdAndDelete(tid);

    if (!deleted) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete topic", err },
      { status: 500 }
    );
  }
}
