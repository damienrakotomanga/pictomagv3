import { NextRequest, NextResponse } from "next/server";
import { attachPreferenceUserCookie, resolvePreferenceUser } from "@/lib/server/preference-user";
import {
  readMarketplaceOrdersServer,
  seedUserRuntimeStateIfMissing,
  writeMarketplaceOrdersServer,
} from "@/lib/server/user-runtime-state-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  await seedUserRuntimeStateIfMissing(resolvedUser.userId);
  const orders = await readMarketplaceOrdersServer(resolvedUser.userId);
  const response = NextResponse.json({
    orders,
    userId: resolvedUser.userId,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}

export async function PUT(request: NextRequest) {
  const resolvedUser = resolvePreferenceUser(request);
  let payload: { orders?: unknown } | null = null;

  try {
    payload = (await request.json()) as { orders?: unknown };
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const orders = await writeMarketplaceOrdersServer(payload?.orders, resolvedUser.userId);
  const response = NextResponse.json({
    orders,
    userId: resolvedUser.userId,
  });

  attachPreferenceUserCookie(response, resolvedUser);
  return response;
}
