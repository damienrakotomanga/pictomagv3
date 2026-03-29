import {
  countPostsByUserId,
  getPostById,
  getProfileByUserId,
  getProfileByUsername,
  getUserById,
  listPostMediaRowsByPostIds,
  listPostsRows,
  type StoredPostKind,
  type StoredPostMediaRow,
  type StoredPostRow,
  type StoredPostSurface,
} from "@/lib/server/sqlite-store";
import type { PublicPost, PublicPostAuthor, PublicProfileBundle } from "@/lib/posts";
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

function toPublicPost(post: StoredPostRow, author: PublicPostAuthor, media: StoredPostMediaRow[]): PublicPost {
  return {
    id: post.id,
    userId: post.user_id,
    surface: post.surface,
    kind: post.kind,
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

export function listPublicPosts({
  userId,
  surface,
  kinds,
  limit,
}: {
  userId?: string;
  surface?: StoredPostSurface;
  kinds?: StoredPostKind[];
  limit?: number;
}) {
  const posts = listPostsRows({ userId, surface, kinds, limit });
  const mediaByPostId = new Map<number, StoredPostMediaRow[]>();

  for (const media of listPostMediaRowsByPostIds(posts.map((post) => post.id))) {
    const current = mediaByPostId.get(media.post_id) ?? [];
    current.push(media);
    mediaByPostId.set(media.post_id, current);
  }

  return posts.flatMap((post) => {
    const author = toPublicAuthor(post.user_id);
    if (!author) {
      return [];
    }

    return [toPublicPost(post, author, mediaByPostId.get(post.id) ?? [])];
  });
}

export function getPublicPostById(postId: number) {
  const post = getPostById(postId);
  if (!post) {
    return null;
  }

  const author = toPublicAuthor(post.user_id);
  if (!author) {
    return null;
  }

  const media = listPostMediaRowsByPostIds([post.id]);
  return toPublicPost(post, author, media);
}

export function getPublicProfileBundle(identifier: string): PublicProfileBundle | null {
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
    posts: listPublicPosts({ userId: profile.user_id, limit: 50 }),
  };
}
