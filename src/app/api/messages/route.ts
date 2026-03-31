import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  listMarketplaceMessages,
  sendMarketplaceMessage,
} from "@/lib/server/marketplace-records";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  if (!authenticatedUser) {
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  const conversationId = Number.parseInt(
    request.nextUrl.searchParams.get("conversationId") ?? "",
    10,
  );

  if (!Number.isFinite(conversationId)) {
    return NextResponse.json({ message: "Conversation invalide." }, { status: 400 });
  }

  const result = listMarketplaceMessages({
    conversationId,
    viewerUserId: authenticatedUser.user.id,
  });

  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: 404 });
  }

  return NextResponse.json({ messages: result.messages });
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

  const conversationId = Number(payload?.conversationId);
  const body = typeof payload?.body === "string" ? payload.body : "";

  if (!Number.isFinite(conversationId)) {
    return NextResponse.json({ message: "Conversation invalide." }, { status: 400 });
  }

  const result = sendMarketplaceMessage({
    conversationId,
    senderUserId: authenticatedUser.user.id,
    body,
  });

  if ("error" in result) {
    return NextResponse.json(
      { message: result.error },
      { status: result.error === "Conversation introuvable." ? 404 : 400 },
    );
  }

  return NextResponse.json({ message: result.message }, { status: 201 });
}
