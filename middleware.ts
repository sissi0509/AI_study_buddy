import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyAuthToken } from "@/app/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // public routes
  if (
    pathname === "/auth/login" ||
    pathname === "/auth/signup" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const auth = token ? await verifyAuthToken(token) : null;

  // protect student area
  if (pathname.startsWith("/student")) {
    if (!auth || auth.role !== "student") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // protect teacher area
  if (pathname.startsWith("/teacher")) {
    if (!auth || (auth.role !== "teacher" && auth.role !== "admin")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*"],
};
