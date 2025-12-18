import { NextResponse } from "next/server";
import { connectToDb } from "@/app/db/mongoose";
import Chapter from "@/app/db/Chapters";
import Topic from "@/app/db/Topics";
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

    return NextResponse.json({
      chapter: {
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description ?? "",
        subject: doc.subject ?? "Physics",
      },
    });
  } catch (err) {
    console.error("Error fetching chapter:", err);
    return NextResponse.json(
      { error: "Failed to load chapter" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const topicsCount = await Topic.countDocuments({ chapter: cid });

    if (topicsCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete this chapter because it still has ${topicsCount} topic(s). Move or delete those topics first.`,
          topicsCount,
        },
        { status: 409 }
      );
    }

    const deleted = await Chapter.findByIdAndDelete(cid);
    if (!deleted) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete chapter", err },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json();

    const name = (body.name ?? "").trim();
    const description = (body.description ?? "").trim();

    const subject = (body.subject ?? "Physics").trim();

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const duplicate = await Chapter.findOne({
      _id: { $ne: cid },
      name,
      subject,
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        { error: "A chapter with the same name already exists." },
        { status: 409 }
      );
    }

    const updated = await Chapter.findByIdAndUpdate(
      cid,
      { name, description, subject },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    return NextResponse.json({
      chapter: {
        id: updated._id.toString(),
        name: updated.name,
        description: updated.description ?? "",
        subject: updated.subject ?? subject,
      },
    });
  } catch (err) {
    console.error("Error updating chapter:", err);
    return NextResponse.json(
      { error: "Failed to update chapter" },
      { status: 500 }
    );
  }
}
