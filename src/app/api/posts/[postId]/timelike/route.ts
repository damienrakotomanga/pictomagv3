import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  createOrUpdatePostTimeLikeRow,
  getPostById,
  removePostTimeLikeRow,
} from "@/lib/server/sqlite-store";

export const runtime = "nodejs";

function resolveNumericPostId(postId: string) {
  const numericPostId = Number(postId);
  return Number.isInteger(numericPostId) && numericPostId > 0 ? numericPostId : null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  if (!authenticatedUser) {
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  const { postId } = await context.params;
  const numericPostId = resolveNumericPostId(postId);
  if (!numericPostId) {
    return NextResponse.json({ message: "Identifiant de post invalide." }, { status: 400 });
  }

  if (!getPostById(numericPostId)) {
    return NextResponse.json({ message: "Post introuvable." }, { status: 404 });
  }

  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  const activeMs = typeof payload?.activeMs === "number" ? payload.activeMs : 0;
  const maxProgress = typeof payload?.maxProgress === "number" ? payload.maxProgress : 0;

  const result = createOrUpdatePostTimeLikeRow({
    postId: numericPostId,
    userId: authenticatedUser.user.id,
    activeMs,
    maxProgress,
  });

  if (!result || !result.row) {
    return NextResponse.json({ message: "Impossible d'enregistrer ce TimeLike." }, { status: 400 });
  }

  return NextResponse.json({
    active: true,
    totalCount: result.timelikeCount,
    timelike: {
      activeMs: result.row.active_ms,
      maxProgress: result.row.max_progress,
      createdAt: result.row.created_at,
      updatedAt: result.row.updated_at,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const authenticatedUser = resolveAuthenticatedAppUser(request);
  if (!authenticatedUser) {
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  const { postId } = await context.params;
  const numericPostId = resolveNumericPostId(postId);
  if (!numericPostId) {
    return NextResponse.json({ message: "Identifiant de post invalide." }, { status: 400 });
  }

  if (!getPostById(numericPostId)) {
    return NextResponse.json({ message: "Post introuvable." }, { status: 404 });
  }

  const result = removePostTimeLikeRow({
    postId: numericPostId,
    userId: authenticatedUser.user.id,
  });

  if (!result) {
    return NextResponse.json({ message: "Impossible de retirer ce TimeLike." }, { status: 400 });
  }

  return NextResponse.json({
    active: false,
    removed: result.removed,
    totalCount: result.timelikeCount,
  });
}
