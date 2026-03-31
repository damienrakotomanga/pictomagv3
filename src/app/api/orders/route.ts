import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  advanceMarketplaceOrderStage,
  createMarketplaceOrderRecord,
  listMarketplaceOrdersForUser,
  releaseMarketplaceOrderPayment,
} from "@/lib/server/marketplace-records";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  if (!authenticatedUser) {
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  const orders = listMarketplaceOrdersForUser(authenticatedUser.user.id);
  return NextResponse.json({ orders });
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

  const gigId = Number(payload?.gigId);
  const packageId = typeof payload?.packageId === "string" ? payload.packageId.trim() : "";
  const brief = typeof payload?.brief === "string" ? payload.brief : "";
  const totalBudget = typeof payload?.totalBudget === "number" ? payload.totalBudget : undefined;

  if (!Number.isFinite(gigId) || packageId.length === 0) {
    return NextResponse.json({ message: "Commande invalide." }, { status: 400 });
  }

  const result = createMarketplaceOrderRecord({
    buyerUserId: authenticatedUser.user.id,
    gigId,
    packageId,
    brief,
    totalBudget,
  });

  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  return NextResponse.json({ order: result.order }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
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

  const orderId = Number(payload?.orderId);
  const action = payload?.action;

  if (!Number.isFinite(orderId) || (action !== "advanceStage" && action !== "releasePayment")) {
    return NextResponse.json({ message: "Mise a jour de commande invalide." }, { status: 400 });
  }

  const result =
    action === "advanceStage"
      ? advanceMarketplaceOrderStage({
          orderId,
          actorUserId: authenticatedUser.user.id,
        })
      : releaseMarketplaceOrderPayment({
          orderId,
          actorUserId: authenticatedUser.user.id,
        });

  if ("error" in result) {
    return NextResponse.json(
      { message: result.error },
      { status: result.error === "Action non autorisee." ? 403 : 400 },
    );
  }

  return NextResponse.json({ order: result.order });
}
