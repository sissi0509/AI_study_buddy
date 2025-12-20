import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectToDb } from "@/app/db/mongoose";
import User from "@/app/db/Users";
import { signAuthToken, setAuthCookie } from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    await connectToDb();

    const { email, password } = await req.json();
    const emailNorm = String(email || "")
      .toLowerCase()
      .trim();
    const passwordStr = String(password || "");

    if (!emailNorm || !passwordStr) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // passwordHash has select:false, so we must opt-in
    const user = await User.findOne({ email: emailNorm })
      .select("+passwordHash")
      .lean();

    if (!user || user.isActive === false) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(passwordStr, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    const token = await signAuthToken({
      uid: user._id.toString(),
      role: user.role,
      name: user.name,
    });

    const res = NextResponse.json({ ok: true, role: user.role });
    setAuthCookie(res, token);
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
