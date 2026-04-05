import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME, verifySignedAuthToken } from "@/lib/server/auth-user";

const AUTH_PORTAL_PATHS = new Set(["/login", "/signup", "/forgot-password", "/auth"]);

function isAuthenticated(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE_NAME)?.value ?? null;
  return Boolean(verifySignedAuthToken(token));
}

function buildLoginRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (nextPath && nextPath !== "/") {
    loginUrl.searchParams.set("next", nextPath);
  } else {
    loginUrl.searchParams.set("next", "/");
  }

  return loginUrl;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (AUTH_PORTAL_PATHS.has(pathname) || pathname.startsWith("/u/")) {
    return NextResponse.next();
  }

  if (isAuthenticated(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(buildLoginRedirect(request));
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/compose/:path*",
    "/debug/:path*",
    "/live-shopping/:path*",
    "/marketplace/:path*",
    "/messages/:path*",
    "/onboarding/:path*",
    "/photos/:path*",
    "/posts/:path*",
    "/profile/:path*",
    "/sounds/:path*",
  ],
};
