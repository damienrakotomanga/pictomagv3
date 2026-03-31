import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolveExistingPreferenceUser,
} from "@/lib/server/preference-user";
import { listPersistedLiveOrdersForUser } from "@/lib/server/live-shopping-records";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const compatibilityUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (!authenticatedUser) {
    const denied = NextResponse.json({ message: "Authentification requise." }, { status: 401 });
    attachPreferenceUserCookie(denied, compatibilityUser);
    return denied;
  }

  const resolvedUser = bindPreferenceUserToUserId(request, authenticatedUser.user.id, "auth-token");
  const orders = listPersistedLiveOrdersForUser(authenticatedUser.user.id);
  const response = NextResponse.json({
    orders,
    userId: authenticatedUser.user.id,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

export async function PUT(request: NextRequest) {
  const compatibilityUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const response = NextResponse.json(
    {
      message: "Les commandes live sont gerees par les actions live et ne peuvent pas etre ecrasees ici.",
    },
    { status: 405 },
  );
  attachPreferenceUserCookie(response, compatibilityUser);
  return response;
}
