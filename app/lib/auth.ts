import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const COOKIE_NAME = "auth_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

/**
 * Creates a JWT token for authenticated users
 * Legacy name: signAuthToken (kept for backward compatibility)
 */
export async function signAuthToken(payload: {
  uid: string;
  role: string;
  name?: string;
}): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Token expires in 7 days
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verifies and decodes a JWT token
 * Returns the payload if valid, null if invalid
 */
export async function verifyAuthToken(
  token: string
): Promise<{ uid: string; role: string; name?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!payload.uid || !payload.role) {
      return null;
    }

    return {
      uid: payload.uid as string,
      role: payload.role as string,
      name: payload.name as string | undefined,
    };
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Get authenticated user ID from request cookies
 * Returns userId string or null if not authenticated
 *
 * Usage in API routes:
 * ```
 * const userId = await getUserIdFromRequest(req);
 * if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * ```
 */
export async function getUserIdFromRequest(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const auth = await verifyAuthToken(token);
    return auth?.uid || null;
  } catch (error) {
    console.error("Error getting user from request:", error);
    return null;
  }
}

/**
 * Get authenticated user with role from request
 * Returns { uid, role, name } or null if not authenticated
 *
 * Usage in API routes:
 * ```
 * const auth = await getAuthFromRequest(req);
 * if (!auth || auth.role !== 'teacher') {
 *   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 * }
 * ```
 */
export async function getAuthFromRequest(): Promise<{
  uid: string;
  role: string;
  name?: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    return await verifyAuthToken(token);
  } catch (error) {
    console.error("Error getting auth from request:", error);
    return null;
  }
}

// ============================================================================
// COOKIE HELPERS
// ============================================================================

/**
 * Sets the auth cookie with the token on a NextResponse
 * Use this after successful login/signup
 *
 * Usage:
 * ```
 * const token = await signAuthToken({ uid, role, name });
 * const res = NextResponse.json({ ok: true });
 * setAuthCookie(res, token);
 * return res;
 * ```
 */
export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Clears the auth cookie on a NextResponse
 * Use this for logout
 *
 * Usage:
 * ```
 * const res = NextResponse.json({ ok: true });
 * clearAuthCookie(res);
 * return res;
 * ```
 */
export function clearAuthCookie(res: NextResponse): void {
  res.cookies.delete(COOKIE_NAME);
}
