import { NextRequest, NextResponse } from "next/server";
import { resolveAuthUserId } from "@/lib/server/auth-user";
import { getPublicPostById } from "@/lib/server/post-records";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  const { postId } = await context.params;
  const numericPostId = Number(postId);

  if (!Number.isInteger(numericPostId) || numericPostId <= 0) {
    return NextResponse.json({ message: "Identifiant de post invalide." }, { status: 400 });
  }

  const post = getPublicPostById(numericPostId, resolveAuthUserId(request) ?? undefined);
  if (!post) {
    return NextResponse.json({ message: "Post introuvable." }, { status: 404 });
  }

  return NextResponse.json({ post });
}
