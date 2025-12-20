import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDb } from "@/app/db/mongoose";
import User from "@/app/db/Users";
import { signAuthToken, setAuthCookie } from "@/app/lib/auth";

// For now: both can sign up. Later you can change this to only ["student"].
const ALLOWED_SIGNUP_ROLES = new Set(["student", "teacher"]);

export async function POST(req: Request) {
  try {
    await connectToDb();

    const body = await req.json();
    const name = String(body?.name || "").trim() || "Student";
    const email = String(body?.email || "")
      .toLowerCase()
      .trim();
    const password = String(body?.password || "");
    const role = String(body?.role || "student").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (!ALLOWED_SIGNUP_ROLES.has(role)) {
      return NextResponse.json(
        { error: "Invalid role for signup." },
        { status: 400 }
      );
    }

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      return NextResponse.json(
        { error: "Email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role, // "student" or "teacher"
      isActive: true,
    });

    // ✅ auto-login: same as login route (JWT + cookie)
    const token = await signAuthToken({
      uid: user._id.toString(),
      role: user.role,
      name: user.name,
    });

    const res = NextResponse.json(
      { ok: true, role: user.role },
      { status: 201 }
    );
    setAuthCookie(res, token);
    return res;
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "Email already exists." },
        { status: 409 }
      );
    }
    console.error("Signup error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
