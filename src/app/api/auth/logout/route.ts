import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  createGuestPreferenceUser,
} from "@/lib/server/preference-user";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const guestPreferenceUser = createGuestPreferenceUser(request);
  const response = NextResponse.json({
    authenticated: false,
    compatibilityMode: true,
    userId: guestPreferenceUser.userId,
    sessionId: guestPreferenceUser.sessionId,
  });

  clearAuthCookies(response);
  attachPreferenceUserCookie(response, guestPreferenceUser);

  return response;
}
