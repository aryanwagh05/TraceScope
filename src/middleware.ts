import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/security";

const publicPrefixes = [
  "/_next",
  "/favicon.ico",
  "/login",
  "/api/auth",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") {
    return true;
  }

  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function isTraceIngestionPost(request: NextRequest) {
  return request.nextUrl.pathname === "/api/traces" && request.method === "POST";
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isPublicPath(pathname) && !isTraceIngestionPost(request)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const isAuthed = await verifySessionToken(sessionCookie);

    if (!isAuthed) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", `${pathname}${search}`);

      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
