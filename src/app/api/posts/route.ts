import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import { listPublicPosts } from "@/lib/server/post-records";
import {
  createPostWithMedia,
  type StoredPostKind,
  type StoredPostMediaType,
  type StoredPostSurface,
} from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

function normalizeSurface(value: string | null): StoredPostSurface | undefined {
  if (value === "reel" || value === "classic") {
    return value;
  }

  return undefined;
}

function normalizeKinds(value: string | null): StoredPostKind[] | undefined {
  if (!value) {
    return undefined;
  }

  const values = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is StoredPostKind =>
      entry === "video" || entry === "photo" || entry === "letter" || entry === "gallery" || entry === "note",
    );

  return values.length > 0 ? values : undefined;
}

function normalizeScope(value: string | null) {
  if (value === "feed" || value === "classic" || value === "profile") {
    return value;
  }

  return "all";
}

export async function GET(request: NextRequest) {
  const scope = normalizeScope(request.nextUrl.searchParams.get("scope"));
  const userId = request.nextUrl.searchParams.get("userId")?.trim() ?? undefined;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "24");
  const explicitKinds = normalizeKinds(request.nextUrl.searchParams.get("kinds"));

  const surface =
    scope === "feed" ? "reel" : scope === "classic" ? "classic" : normalizeSurface(request.nextUrl.searchParams.get("surface"));

  const kinds =
    explicitKinds ??
    (scope === "feed"
      ? (["video", "photo"] as StoredPostKind[])
      : scope === "classic"
        ? (["letter", "gallery", "video", "note", "photo"] as StoredPostKind[])
        : undefined);

  const posts = listPublicPosts({
    userId,
    surface,
    kinds,
    limit: Number.isFinite(limit) ? limit : 24,
  });

  return NextResponse.json({
    posts,
  });
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

  const surface = typeof payload?.surface === "string" && (payload.surface === "reel" || payload.surface === "classic")
    ? payload.surface
    : "classic";
  const kind = typeof payload?.kind === "string" &&
    (payload.kind === "video" || payload.kind === "photo" || payload.kind === "letter" || payload.kind === "gallery" || payload.kind === "note")
    ? payload.kind
    : null;
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const albumName =
    typeof payload?.albumName === "string" && payload.albumName.trim().length > 0 ? payload.albumName.trim().slice(0, 80) : null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const trackName = typeof payload?.trackName === "string" ? payload.trackName.trim() : "";
  const durationLabel = typeof payload?.durationLabel === "string" ? payload.durationLabel.trim() : "0:00";
  const media = Array.isArray(payload?.media)
    ? payload.media.flatMap((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }

        const record = entry as Record<string, unknown>;
        const mediaType =
          record.mediaType === "image" || record.mediaType === "video"
            ? (record.mediaType as StoredPostMediaType)
            : null;
        const src = typeof record.src === "string" ? record.src.trim() : "";
        if (!mediaType || !src) {
          return [];
        }

        return [
          {
            mediaType,
            src,
            posterSrc: typeof record.posterSrc === "string" ? record.posterSrc.trim() : null,
            altText: typeof record.altText === "string" ? record.altText.trim() : "",
            position: typeof record.position === "number" ? record.position : index,
          },
        ];
      })
    : [];

  if (!kind || title.length === 0) {
    return NextResponse.json({ message: "Titre ou type de post invalide." }, { status: 400 });
  }

  if (media.length === 0 && (kind === "video" || kind === "photo" || kind === "gallery" || kind === "note")) {
    return NextResponse.json({ message: "Au moins un media est requis pour ce type de post." }, { status: 400 });
  }

  const postId = createPostWithMedia({
    userId: authenticatedUser.user.id,
    surface: surface as StoredPostSurface,
    kind,
    albumName,
    title,
    body,
    trackName,
    durationLabel,
    media,
  });

  const [post] = listPublicPosts({ userId: authenticatedUser.user.id, limit: 1 }).filter((entry) => entry.id === postId);
  return NextResponse.json({ post }, { status: 201 });
}
