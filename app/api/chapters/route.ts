import { NextResponse } from "next/server";
import { connectToDb } from "@/app/db/mongoose";
import Chapter from "@/app/db/Chapters";

export async function GET() {
  try {
    await connectToDb();

    const docs = await Chapter.find().sort({ name: 1 }).lean();

    const chapters = docs.map((doc: any) => ({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description ?? "",
      subject: doc.subject ?? "Physics",
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

export async function POST(req: Request) {
  try {
    await connectToDb();
    const body = await req.json();

    const name = (body.name ?? "").trim();
    const description = (body.description ?? "").trim();

    // auto-fill subject for now
    const subject = (body.subject ?? "Physics").trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const existing = await Chapter.findOne({ name, subject }).lean();
    if (existing) {
      return NextResponse.json({
        chapter: {
          id: existing._id.toString(),
          name: existing.name,
          description: existing.description ?? "",
          subject: existing.subject ?? subject,
        },
        created: false,
      });
    }

    const created = await Chapter.create({
      name,
      description, // can be empty string
      subject,
    });

    return NextResponse.json({
      chapter: {
        id: created._id.toString(),
        name: created.name,
        description: created.description ?? "",
        subject: created.subject ?? subject,
      },
      created: true,
    });
  } catch (err) {
    console.error("Error creating chapter:", err);
    return NextResponse.json(
      { error: "Failed to create chapter" },
      { status: 500 }
    );
  }
}
