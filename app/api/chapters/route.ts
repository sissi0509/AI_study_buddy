import { NextResponse } from "next/server";
import { connectToDb } from "@/app/db/mongoose";
import Chapter from "@/app/db/Chapters";

export async function GET() {
  try {
    await connectToDb();

    const docs = await Chapter.find().sort({ order: 1 }).lean();

    const chapters = docs.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description ?? "",
    }));

    return NextResponse.json({ chapters });
  } catch (err) {
    console.error("Error fetching chapters:", err);
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
