import { NextRequest, NextResponse } from "next/server";
import { isRoleAllowed, resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import { attachPreferenceUserCookie, resolveExistingPreferenceUser } from "@/lib/server/preference-user";
import { listAuditLogs } from "@/lib/server/sqlite-store";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";

export const runtime = "nodejs";

function parseLimit(rawValue: string | null) {
  if (!rawValue) {
    return 120;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed)) {
    return 120;
  }

  return Math.max(1, Math.min(250, parsed));
}

function parseMetadata(rawValue: string) {
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const resolvedUser = resolveExistingPreferenceUser(request, {
    allowQueryUserId: false,
  });
  const authenticatedUser = resolveAuthenticatedAppUser(request);

  if (!authenticatedUser) {
    const denied = NextResponse.json(
      {
        message: "Authentification requise pour acceder aux logs d audit.",
      },
      { status: 401 },
    );
    attachPreferenceUserCookie(denied, resolvedUser);
    return denied;
  }

  if (!isRoleAllowed(authenticatedUser.role, ["admin", "moderator", "finance_admin"])) {
    const denied = NextResponse.json(
      {
        message: "Acces reserve aux roles admin/moderation/finance.",
        role: authenticatedUser.role,
      },
      { status: 403 },
    );
    attachPreferenceUserCookie(denied, resolvedUser);
    return denied;
  }

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const rawUserId = request.nextUrl.searchParams.get("userId")?.trim() ?? null;
  const targetUserId = rawUserId ? normalizePreferenceUserId(rawUserId) : undefined;
  const logs = listAuditLogs({
    limit,
    userId: targetUserId,
  }).map((log) => ({
    ...log,
    metadata_parsed: parseMetadata(log.metadata),
  }));

  const response = NextResponse.json({
    logs,
    count: logs.length,
    role: authenticatedUser.role,
    scope: targetUserId ?? "all",
  });
  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
