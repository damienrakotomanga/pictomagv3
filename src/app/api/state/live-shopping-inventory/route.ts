import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  attachPreferenceUserCookie,
  bindPreferenceUserToUserId,
  resolveExistingPreferenceUser,
} from "@/lib/server/preference-user";
import {
  listPersistedLiveInventoryForOwner,
  replacePersistedLiveInventoryForOwner,
} from "@/lib/server/live-shopping-records";
import {
  normalizeLiveInventoryProduct,
  type LiveInventoryProduct,
} from "@/lib/live-shopping-inventory";

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
  const inventory = listPersistedLiveInventoryForOwner(authenticatedUser.user.id);
  const response = NextResponse.json({
    inventory,
    userId: authenticatedUser.user.id,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

export async function PUT(request: NextRequest) {
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
  let payload: { inventory?: unknown } | null = null;

  try {
    payload = (await request.json()) as { inventory?: unknown };
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const incomingInventory = Array.isArray(payload?.inventory) ? payload.inventory : [];
  const inventory = replacePersistedLiveInventoryForOwner({
    ownerUserId: authenticatedUser.user.id,
    inventory: incomingInventory.map((entry) => normalizeLiveInventoryProduct(entry as LiveInventoryProduct)),
  });
  const response = NextResponse.json({
    inventory,
    userId: authenticatedUser.user.id,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
