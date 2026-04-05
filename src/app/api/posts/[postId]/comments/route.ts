import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedAppUser } from "@/lib/server/auth-user";
import {
  createPublicPostComment,
  getPublicPostById,
  listPublicPostComments,
} from "@/lib/server/post-records";

export const runtime = "nodejs";

function resolveNumericPostId(postId: string) {
  const numericPostId = Number(postId);
  return Number.isInteger(numericPostId) && numericPostId > 0 ? numericPostId : null;
}

export async function GET(
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

  const post = getPublicPostById(numericPostId);
  if (!post) {
    return NextResponse.json({ message: "Post introuvable." }, { status: 404 });
  }

  const comments = listPublicPostComments(numericPostId) ?? [];

  return NextResponse.json({
    comments,
    totalCount: comments.length,
  });
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

  const post = getPublicPostById(numericPostId);
  if (!post) {
    return NextResponse.json({ message: "Post introuvable." }, { status: 404 });
  }

  let payload: Record<string, unknown> | null = null;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "JSON body invalide." }, { status: 400 });
  }

  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (body.length === 0) {
    return NextResponse.json({ message: "Ecris un commentaire avant d'envoyer." }, { status: 400 });
  }

  const comment = createPublicPostComment({
    postId: numericPostId,
    userId: authenticatedUser.user.id,
    body,
  });

  if (!comment) {
    return NextResponse.json({ message: "Impossible d'ajouter ce commentaire." }, { status: 400 });
  }

  const comments = listPublicPostComments(numericPostId) ?? [];

  return NextResponse.json(
    {
      comment,
      totalCount: comments.length,
    },
    { status: 201 },
  );
}
