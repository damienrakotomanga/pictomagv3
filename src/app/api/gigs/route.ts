import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  createMarketplaceGigRecord,
  listMarketplaceGigs,
  listMarketplaceSellerGigRecords,
} from "@/lib/server/marketplace-records";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  const sellerQuery = request.nextUrl.searchParams.get("seller")?.trim();
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "48", 10);
  const sellerIdentifier =
    sellerQuery === "me" ? authenticatedUser?.user.id ?? null : sellerQuery ?? undefined;

  if (sellerQuery === "me" && !authenticatedUser) {
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  if (sellerQuery === "me" && authenticatedUser) {
    const sellerRecords = listMarketplaceSellerGigRecords(authenticatedUser.user.id);
    return NextResponse.json({
      gigs: sellerRecords.map((record) => record.gig),
      sellerRecords,
    });
  }

  const gigs = listMarketplaceGigs({
    sellerIdentifier: sellerIdentifier ?? undefined,
    viewerUserId: authenticatedUser?.user.id ?? null,
    limit: Number.isFinite(limit) ? limit : 48,
  });

  return NextResponse.json({ gigs });
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

  const draft = payload?.draft;
  if (!draft || typeof draft !== "object") {
    return NextResponse.json({ message: "Brouillon de gig invalide." }, { status: 400 });
  }

  const gig = createMarketplaceGigRecord({
    sellerUserId: authenticatedUser.user.id,
    draft: draft as Parameters<typeof createMarketplaceGigRecord>[0]["draft"],
  });

  if (!gig) {
    return NextResponse.json({ message: "Impossible de creer le gig." }, { status: 400 });
  }

  return NextResponse.json({ gig }, { status: 201 });
}
