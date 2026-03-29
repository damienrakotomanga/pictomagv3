export type SoundClip = {
  id: number;
  src: string;
  author: string;
  avatar: string;
  caption: string;
  views: string;
};

export type SoundCollection = {
  slug: string;
  title: string;
  creatorName: string;
  creatorHandle: string;
  artwork: string;
  reelsCount: number;
  previewSrc: string;
  clips: SoundClip[];
};

const sharedClips: SoundClip[] = [
  {
    id: 1,
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    author: "axelbelujon",
    avatar: "/figma-assets/avatar-post.png",
    caption: "Live blaze stage vibes",
    views: "455 k",
  },
  {
    id: 2,
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    author: "world.of.tcgp",
    avatar: "/figma-assets/avatar-user.png",
    caption: "Blue city pulse",
    views: "238 k",
  },
  {
    id: 3,
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    author: "pictomag.news",
    avatar: "/figma-assets/avatar-story.png",
    caption: "Road trip perspective",
    views: "311 k",
  },
  {
    id: 4,
    src: "https://pictomag-news-1.vercel.app/video/video-3.mp4",
    author: "world.of.tcgp",
    avatar: "/figma-assets/avatar-post.png",
    caption: "Chromecast motion cut",
    views: "187 k",
  },
  {
    id: 5,
    src: "https://pictomag-news-1.vercel.app/video/feed-video-2.mp4",
    author: "pictomag.news",
    avatar: "/figma-assets/avatar-user.png",
    caption: "Editorial dark feed",
    views: "264 k",
  },
  {
    id: 6,
    src: "https://pictomag-news-1.vercel.app/video/feed-video-3.mp4",
    author: "studio.heat",
    avatar: "/figma-assets/avatar-story.png",
    caption: "Studio heat promo",
    views: "198 k",
  },
];

export const soundCollections: SoundCollection[] = [
  {
    slug: "neon-driver-stage-echo",
    title: "Neon Driver - Stage Echo",
    creatorName: "Axel Belujon",
    creatorHandle: "@axelbelujon",
    artwork: "/figma-assets/avatar-post.png",
    reelsCount: 6,
    previewSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    clips: sharedClips,
  },
  {
    slug: "riverline-city-pulse",
    title: "Riverline - City Pulse",
    creatorName: "Riverline",
    creatorHandle: "@riverline",
    artwork: "/figma-assets/avatar-user.png",
    reelsCount: 6,
    previewSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    clips: [...sharedClips].reverse(),
  },
  {
    slug: "rondicch-open-route",
    title: "Rondicch - Open Route",
    creatorName: "Rondicch",
    creatorHandle: "@rondicch",
    artwork: "/figma-assets/avatar-story.png",
    reelsCount: 6,
    previewSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    clips: sharedClips.slice(0, 5),
  },
  {
    slug: "pictomag-session-chrome-flow",
    title: "Pictomag Session - Chrome Flow",
    creatorName: "Pictomag Sessions",
    creatorHandle: "@pictomag.sessions",
    artwork: "/figma-assets/avatar-post.png",
    reelsCount: 5,
    previewSrc: "https://pictomag-news-1.vercel.app/video/video-3.mp4",
    clips: sharedClips.slice(1),
  },
  {
    slug: "pictomag-session-feed-pulse",
    title: "Pictomag Session - Feed Pulse",
    creatorName: "Pictomag Sessions",
    creatorHandle: "@pictomag.sessions",
    artwork: "/figma-assets/avatar-user.png",
    reelsCount: 5,
    previewSrc: "https://pictomag-news-1.vercel.app/video/feed-video-2.mp4",
    clips: sharedClips.slice(0, 5),
  },
  {
    slug: "pictomag-session-studio-heat",
    title: "Pictomag Session - Studio Heat",
    creatorName: "Studio Heat",
    creatorHandle: "@studio.heat",
    artwork: "/figma-assets/avatar-story.png",
    reelsCount: 6,
    previewSrc: "https://pictomag-news-1.vercel.app/video/feed-video-3.mp4",
    clips: sharedClips,
  },
];

export function getSoundCollectionBySlug(soundId: string) {
  return soundCollections.find((collection) => collection.slug === soundId) ?? null;
}

export function getSoundSlugForTrack(trackName: string) {
  return soundCollections.find((collection) => collection.title === trackName)?.slug ?? soundCollections[0]!.slug;
}
