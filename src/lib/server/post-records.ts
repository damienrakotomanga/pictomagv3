import {
  createPostCommentRow,
  countPostsByUserId,
  getPostById,
  getPostTimeLikeRow,
  getProfileByUserId,
  getProfileByUsername,
  getUserById,
  listPostTimeLikeRowsByPostIdsForUser,
  listPostCommentRowsByPostId,
  listPostMediaRowsByPostIds,
  listPostsRows,
  type StoredPostKind,
  type StoredPostCommentRow,
  type StoredPostMediaRow,
  type StoredPostRow,
  type StoredPostSurface,
  type StoredPostTimeLikeRow,
} from "@/lib/server/sqlite-store";
import type { PublicPost, PublicPostAuthor, PublicPostComment, PublicProfileBundle } from "@/lib/posts";
import { serializePublicAuthUser } from "@/lib/server/auth-user";

function toPublicAuthor(userId: string): PublicPostAuthor | null {
  const profile = getProfileByUserId(userId);
  if (!profile) {
    return null;
  }

  return {
    userId: profile.user_id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    avatarUrl: profile.avatar_url,
    websiteUrl: profile.website_url,
  };
}

function toPublicPost(
  post: StoredPostRow,
  author: PublicPostAuthor,
  media: StoredPostMediaRow[],
  viewerTimeLikeRow?: StoredPostTimeLikeRow | null,
): PublicPost {
  return {
    id: post.id,
    userId: post.user_id,
    surface: post.surface,
    kind: post.kind,
    albumName: post.album_name,
    title: post.title,
    body: post.body,
    trackName: post.track_name,
    durationLabel: post.duration_label,
    timelikeCount: post.timelike_count,
    commentCount: post.comment_count,
    shareCount: post.share_count,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    publishedAt: post.published_at,
    author,
    viewerHasTimeLike: Boolean(viewerTimeLikeRow),
    viewerTimeLikeActiveMs: viewerTimeLikeRow?.active_ms ?? null,
    viewerTimeLikeMaxProgress: viewerTimeLikeRow?.max_progress ?? null,
    media: media.map((entry) => ({
      id: entry.id,
      postId: entry.post_id,
      mediaType: entry.media_type,
      src: entry.src,
      posterSrc: entry.poster_src,
      altText: entry.alt_text,
      position: entry.position,
    })),
  };
}

function toPublicPostComment(row: StoredPostCommentRow, author: PublicPostAuthor): PublicPostComment {
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author,
  };
}

export function listPublicPosts({
  userId,
  surface,
  kinds,
  limit,
  viewerUserId,
}: {
  userId?: string;
  surface?: StoredPostSurface;
  kinds?: StoredPostKind[];
  limit?: number;
  viewerUserId?: string;
}) {
  const posts = listPostsRows({ userId, surface, kinds, limit });
  const mediaByPostId = new Map<number, StoredPostMediaRow[]>();
  const viewerTimeLikesByPostId = new Map<number, StoredPostTimeLikeRow>();

  for (const media of listPostMediaRowsByPostIds(posts.map((post) => post.id))) {
    const current = mediaByPostId.get(media.post_id) ?? [];
    current.push(media);
    mediaByPostId.set(media.post_id, current);
  }

  if (viewerUserId) {
    for (const row of listPostTimeLikeRowsByPostIdsForUser({
      postIds: posts.map((post) => post.id),
      userId: viewerUserId,
    })) {
      viewerTimeLikesByPostId.set(row.post_id, row);
    }
  }

  return posts.flatMap((post) => {
    const author = toPublicAuthor(post.user_id);
    if (!author) {
      return [];
    }

    return [toPublicPost(post, author, mediaByPostId.get(post.id) ?? [], viewerTimeLikesByPostId.get(post.id) ?? null)];
  });
}

export function getPublicPostById(postId: number, viewerUserId?: string) {
  const post = getPostById(postId);
  if (!post) {
    return null;
  }

  const author = toPublicAuthor(post.user_id);
  if (!author) {
    return null;
  }

  const media = listPostMediaRowsByPostIds([post.id]);
  const viewerTimeLikeRow = viewerUserId ? getPostTimeLikeRow({ postId: post.id, userId: viewerUserId }) : null;
  return toPublicPost(post, author, media, viewerTimeLikeRow);
}

export function listPublicPostComments(postId: number, limit = 120) {
  const post = getPostById(postId);
  if (!post) {
    return null;
  }

  const comments = listPostCommentRowsByPostId({ postId, limit });

  return comments.flatMap((comment) => {
    const author = toPublicAuthor(comment.user_id);
    if (!author) {
      return [];
    }

    return [toPublicPostComment(comment, author)];
  });
}

export function createPublicPostComment({
  postId,
  userId,
  body,
}: {
  postId: number;
  userId: string;
  body: string;
}) {
  const comment = createPostCommentRow({ postId, userId, body });
  if (!comment) {
    return null;
  }

  const author = toPublicAuthor(comment.user_id);
  if (!author) {
    return null;
  }

  return toPublicPostComment(comment, author);
}

export function getPublicProfileBundle(identifier: string, viewerUserId?: string): PublicProfileBundle | null {
  const profile = getProfileByUserId(identifier) ?? getProfileByUsername(identifier);
  if (!profile) {
    return null;
  }

  const user = getUserById(profile.user_id);
  if (!user) {
    return null;
  }

  return {
    user: serializePublicAuthUser(user),
    profile: {
      userId: profile.user_id,
      username: profile.username,
      displayName: profile.display_name,
      bio: profile.bio,
      avatarUrl: profile.avatar_url,
      websiteUrl: profile.website_url,
    },
    stats: {
      posts: countPostsByUserId(profile.user_id),
    },
    posts: listPublicPosts({ userId: profile.user_id, limit: 50, viewerUserId }),
  };
}
