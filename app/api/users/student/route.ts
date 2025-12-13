import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDb } from "@/app/db/mongoose";
import User from "@/app/db/Users";

export async function POST(request: Request) {
  try {
    await connectToDb();

    // If client already has an id, keep it (idempotent)
    const existingId = request.headers.get("x-user-id");
    if (existingId && mongoose.Types.ObjectId.isValid(existingId)) {
      const existing = await User.findById(existingId).lean();
      if (existing) {
        return NextResponse.json({
          userId: existing._id.toString(),
          role: existing.role,
          displayName: existing.displayName,
        });
      }
    }

    // Otherwise create a new student user
    const user = await User.create({ role: "student", displayName: "Student" });

    return NextResponse.json(
      {
        userId: user._id.toString(),
        role: user.role,
        displayName: user.displayName,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating student user:", err);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
