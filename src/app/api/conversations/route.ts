import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  listMarketplaceConversationsForUser,
  openMarketplaceConversation,
} from "@/lib/server/marketplace-records";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  if (!authenticatedUser) {
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  const conversations = listMarketplaceConversationsForUser(authenticatedUser.user.id);
  return NextResponse.json({ conversations });
}

export async function POST(request: NextRequest) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  if (!authenticatedUser) {
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const participantIdentifier =
    typeof payload?.participantIdentifier === "string"
      ? payload.participantIdentifier.trim().replace(/^@/, "")
      : "";

  if (participantIdentifier.length === 0) {
    return NextResponse.json({ message: "Destinataire invalide." }, { status: 400 });
  }

  const result = openMarketplaceConversation({
    currentUserId: authenticatedUser.user.id,
    otherUserIdentifier: participantIdentifier,
  });

  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  return NextResponse.json({ conversation: result.conversation }, { status: 201 });
}
