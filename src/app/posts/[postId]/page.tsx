import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { PostDetailPage } from "@/components/post-detail-page";
import { AUTH_TOKEN_COOKIE_NAME, verifySignedAuthToken } from "@/lib/server/auth-user";
import { getPublicPostById, listPublicPosts } from "@/lib/server/post-records";

type PostPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function PostPage({ params }: PostPageProps) {
  const cookieStore = await cookies();
  const viewerUserId = verifySignedAuthToken(cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value)?.sub;
  const { postId } = await params;
  const numericPostId = Number(postId);

  if (!Number.isInteger(numericPostId) || numericPostId <= 0) {
    notFound();
  }

  const post = getPublicPostById(numericPostId, viewerUserId);
  if (!post) {
    notFound();
  }

  const relatedPosts = listPublicPosts({ userId: post.userId, limit: 6, viewerUserId })
    .filter((entry) => entry.id !== post.id)
    .slice(0, 3);

  return <PostDetailPage post={post} relatedPosts={relatedPosts} />;
}
