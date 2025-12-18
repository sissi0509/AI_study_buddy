import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDb } from "@/app/db/mongoose";
import Topic from "@/app/db/Topics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    await connectToDb();

    const { cid } = await params;

    // Validate chapter id
    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return NextResponse.json(
        { error: "Invalid chapter id" },
        { status: 400 }
      );
    }

    // Find topics under this chapter
    const docs = await Topic.find({ chapter: cid }).lean();

    const topics = docs.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      steps: doc.steps,
      systemPrompt: doc.systemPrompt,
      subject: doc.subject,
    }));

    return NextResponse.json({ topics });
  } catch (err) {
    console.error("Error fetching topics for chapter:", err);
    return NextResponse.json(
      { error: "Failed to load topics" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ cid: string }> }
) {
  try {
    await connectToDb();
    const { cid } = await params;

    if (!mongoose.Types.ObjectId.isValid(cid)) {
      return NextResponse.json(
        { error: "Invalid chapter id" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const name = (body.name ?? "").trim();
    const description = (body.description ?? "").trim();
    const systemPrompt = (body.systemPrompt ?? "").trim();
    const steps = Array.isArray(body.steps)
      ? body.steps.map((s: string) => s.trim()).filter(Boolean)
      : [];
    const subject = (body.subject ?? "Physics").trim(); // or force "Physics"

    if (!name || !description) {
      return NextResponse.json(
        { error: "name and description are required" },
        { status: 400 }
      );
    }

    const created = await Topic.create({
      name,
      description,
      steps,
      systemPrompt,
      subject,
      chapter: cid,
    });

    return NextResponse.json(
      { topic: { id: created._id.toString() } },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating topic:", err);
    return NextResponse.json(
      { error: "Failed to create topic" },
      { status: 500 }
    );
  }
}
