import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * HTTP Basic Auth gate for the whole app (pages + API routes), since the
 * costly resource here is the Anthropic API calls behind /api/chat, not
 * just the UI. Configure via APP_USERNAME / APP_PASSWORD env vars; if
 * either is unset, the gate is skipped (local dev without a .env stays
 * usable without locking anyone out).
 */
export function proxy(request: NextRequest) {
  const expectedUser = process.env.APP_USERNAME;
  const expectedPass = process.env.APP_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const sepIndex = decoded.indexOf(":");
    if (sepIndex !== -1) {
      const user = decoded.slice(0, sepIndex);
      const pass = decoded.slice(sepIndex + 1);
      if (safeEqual(user, expectedUser) && safeEqual(pass, expectedPass)) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="AI Team Workspace", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
