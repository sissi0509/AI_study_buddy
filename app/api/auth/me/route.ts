// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/app/lib/auth";

export async function GET() {
  const auth = await getAuthFromRequest();

  if (!auth) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      uid: auth.uid,
      role: auth.role,
      name: auth.name,
    },
  });
}
