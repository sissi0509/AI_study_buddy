import { NextResponse } from "next/server";
import { connectToDb } from "@/app/db/mongoose";
import Chapter from "@/app/db/Chapters";
import mongoose from "mongoose";

export async function GET(
  request: Request,
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

    const doc = await Chapter.findById(cid).lean();

    if (!doc) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const chapter = {
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      // add other fields you want to expose
    };

    return NextResponse.json({ chapter });
  } catch (err) {
    console.error("Error fetching chapter:", err);
    return NextResponse.json(
      { error: "Failed to load chapter" },
      { status: 500 }
    );
  }
}
