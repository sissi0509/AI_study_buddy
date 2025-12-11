import { NextResponse } from "next/server";
import { connectToDb } from "@/app/db/mongoose";
import Topic from "@/app/db/Topics";

export async function GET(
  request: Request,
  { params }: { params: { cid: string } }
) {
  try {
    await connectToDb();
    const { cid } = await params;

    const docs = await Topic.find({ chapter: cid }).lean();

    const topics = docs.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
    }));

    return NextResponse.json({ topics });
  } catch (err) {
    console.error("Error fetching topics for chapter:", err);
    return NextResponse.json(
      { error: "Failed to fetch topics for chapter" },
      { status: 500 }
    );
  }
}
