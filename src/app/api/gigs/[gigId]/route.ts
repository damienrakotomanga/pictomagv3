import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import { getMarketplaceGigRecordById } from "@/lib/server/marketplace-records";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gigId: string }> },
) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  const { gigId } = await context.params;
  const parsedGigId = Number.parseInt(gigId, 10);

  if (!Number.isFinite(parsedGigId)) {
    return NextResponse.json({ message: "Gig invalide." }, { status: 400 });
  }

  const gig = getMarketplaceGigRecordById({
    gigId: parsedGigId,
    viewerUserId: authenticatedUser?.user.id ?? null,
  });

  if (!gig) {
    return NextResponse.json({ message: "Gig introuvable." }, { status: 404 });
  }

  return NextResponse.json({ gig });
}
