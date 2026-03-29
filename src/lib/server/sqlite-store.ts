import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

type PreferencesRow = {
  user_id: string;
  marketplace: string;
  live_shopping: string;
  updated_at: number;
};

export type StoredUserAuthMode = "local" | "compat";

export type StoredUserRow = {
  id: string;
  email: string | null;
  password_hash: string | null;
  role: string;
  auth_mode: StoredUserAuthMode;
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
};

export type StoredProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  website_url: string | null;
  created_at: number;
  updated_at: number;
};

export type StoredPostSurface = "reel" | "classic";
export type StoredPostKind = "video" | "photo" | "letter" | "gallery" | "note";
export type StoredPostMediaType = "image" | "video";

export type StoredPostRow = {
  id: number;
  user_id: string;
  surface: StoredPostSurface;
  kind: StoredPostKind;
  title: string;
  body: string;
  track_name: string;
  duration_label: string;
  timelike_count: number;
  comment_count: number;
  share_count: number;
  created_at: number;
  updated_at: number;
  published_at: number;
};

export type StoredPostMediaRow = {
  id: number;
  post_id: number;
  media_type: StoredPostMediaType;
  src: string;
  poster_src: string | null;
  alt_text: string;
  position: number;
  created_at: number;
};

type RuntimeStateRow = {
  user_id: string;
  marketplace_orders: string;
  live_shopping_orders: string;
  live_shopping_inventory: string;
  live_shopping_schedule: string;
  updated_at: number;
};

type LiveRoomStateRow = {
  event_id: number;
  state_json: string;
  updated_at: number;
};

type SessionRow = {
  session_id: string;
  user_id: string;
  created_at: number;
  last_seen_at: number;
};

type ActionIdempotencyRow = {
  user_id: string;
  key: string;
  action: string;
  request_fingerprint: string;
  response_body: string;
  status_code: number;
  created_at: number;
};

type AuditLogRow = {
  id: number;
  user_id: string;
  role: string;
  action_type: string;
  resource_type: string;
  resource_id: string;
  metadata: string;
  created_at: number;
};

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DATABASE_FILE = path.join(DATA_DIRECTORY, "pictomag.db");

let database: DatabaseSync | null = null;

function ensureRuntimeStateSchema(db: DatabaseSync) {
  const columns = db
    .prepare("PRAGMA table_info(user_runtime_state)")
    .all()
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const value = row as Record<string, unknown>;
      return typeof value.name === "string" ? value.name : null;
    })
    .filter((name): name is string => name !== null);

  if (!columns.includes("live_shopping_schedule")) {
    db.exec(
      "ALTER TABLE user_runtime_state ADD COLUMN live_shopping_schedule TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

function ensureDatabase() {
  if (database) {
    return database;
  }

  mkdirSync(DATA_DIRECTORY, { recursive: true });
  const db = new DatabaseSync(DATABASE_FILE);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      marketplace TEXT NOT NULL,
      live_shopping TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_runtime_state (
      user_id TEXT PRIMARY KEY,
      marketplace_orders TEXT NOT NULL,
      live_shopping_orders TEXT NOT NULL,
      live_shopping_inventory TEXT NOT NULL,
      live_shopping_schedule TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT NOT NULL,
      auth_mode TEXT NOT NULL DEFAULT 'compat',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_login_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      website_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      surface TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      track_name TEXT NOT NULL DEFAULT '',
      duration_label TEXT NOT NULL DEFAULT '0:00',
      timelike_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0,
      share_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      published_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      src TEXT NOT NULL,
      poster_src TEXT,
      alt_text TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_room_state (
      event_id INTEGER PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS action_idempotency (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      action TEXT NOT NULL,
      request_fingerprint TEXT NOT NULL,
      response_body TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, key, action)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      action_type TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      metadata TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);
    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_surface ON posts (surface, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media (post_id, position ASC);
  `);

  ensureRuntimeStateSchema(db);

  database = db;
  ensureSeedPosts();
  return db;
}

function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNullableNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function asStoredUserAuthMode(value: unknown): StoredUserAuthMode | null {
  if (value === "local" || value === "compat") {
    return value;
  }

  return null;
}

function asPreferencesRow(value: unknown): PreferencesRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.user_id !== "string" ||
    typeof row.marketplace !== "string" ||
    typeof row.live_shopping !== "string" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    user_id: row.user_id,
    marketplace: row.marketplace,
    live_shopping: row.live_shopping,
    updated_at: row.updated_at,
  };
}

function asRuntimeStateRow(value: unknown): RuntimeStateRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.user_id !== "string" ||
    typeof row.marketplace_orders !== "string" ||
    typeof row.live_shopping_orders !== "string" ||
    typeof row.live_shopping_inventory !== "string" ||
    typeof row.live_shopping_schedule !== "string" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    user_id: row.user_id,
    marketplace_orders: row.marketplace_orders,
    live_shopping_orders: row.live_shopping_orders,
    live_shopping_inventory: row.live_shopping_inventory,
    live_shopping_schedule: row.live_shopping_schedule,
    updated_at: row.updated_at,
  };
}

function asStoredUserRow(value: unknown): StoredUserRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const authMode = asStoredUserAuthMode(row.auth_mode);
  if (
    typeof row.id !== "string" ||
    typeof row.role !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number" ||
    authMode === null
  ) {
    return null;
  }

  return {
    id: row.id,
    email: asNullableString(row.email),
    password_hash: asNullableString(row.password_hash),
    role: row.role,
    auth_mode: authMode,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: asNullableNumber(row.last_login_at),
  };
}

function asStoredProfileRow(value: unknown): StoredProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.user_id !== "string" ||
    typeof row.username !== "string" ||
    typeof row.display_name !== "string" ||
    typeof row.bio !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    avatar_url: asNullableString(row.avatar_url),
    website_url: asNullableString(row.website_url),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function asStoredPostSurface(value: unknown): StoredPostSurface | null {
  if (value === "reel" || value === "classic") {
    return value;
  }

  return null;
}

function asStoredPostKind(value: unknown): StoredPostKind | null {
  if (value === "video" || value === "photo" || value === "letter" || value === "gallery" || value === "note") {
    return value;
  }

  return null;
}

function asStoredPostMediaType(value: unknown): StoredPostMediaType | null {
  if (value === "image" || value === "video") {
    return value;
  }

  return null;
}

function asStoredPostRow(value: unknown): StoredPostRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const surface = asStoredPostSurface(row.surface);
  const kind = asStoredPostKind(row.kind);

  if (
    typeof row.id !== "number" ||
    typeof row.user_id !== "string" ||
    surface === null ||
    kind === null ||
    typeof row.title !== "string" ||
    typeof row.body !== "string" ||
    typeof row.track_name !== "string" ||
    typeof row.duration_label !== "string" ||
    typeof row.timelike_count !== "number" ||
    typeof row.comment_count !== "number" ||
    typeof row.share_count !== "number" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number" ||
    typeof row.published_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    surface,
    kind,
    title: row.title,
    body: row.body,
    track_name: row.track_name,
    duration_label: row.duration_label,
    timelike_count: row.timelike_count,
    comment_count: row.comment_count,
    share_count: row.share_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
  };
}

function asStoredPostMediaRow(value: unknown): StoredPostMediaRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const mediaType = asStoredPostMediaType(row.media_type);
  if (
    typeof row.id !== "number" ||
    typeof row.post_id !== "number" ||
    mediaType === null ||
    typeof row.src !== "string" ||
    typeof row.alt_text !== "string" ||
    typeof row.position !== "number" ||
    typeof row.created_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    post_id: row.post_id,
    media_type: mediaType,
    src: row.src,
    poster_src: asNullableString(row.poster_src),
    alt_text: row.alt_text,
    position: row.position,
    created_at: row.created_at,
  };
}

function asSessionRow(value: unknown): SessionRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.session_id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.last_seen_at !== "number"
  ) {
    return null;
  }

  return {
    session_id: row.session_id,
    user_id: row.user_id,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at,
  };
}

function asLiveRoomStateRow(value: unknown): LiveRoomStateRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.event_id !== "number" ||
    typeof row.state_json !== "string" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    event_id: row.event_id,
    state_json: row.state_json,
    updated_at: row.updated_at,
  };
}

function asActionIdempotencyRow(value: unknown): ActionIdempotencyRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.user_id !== "string" ||
    typeof row.key !== "string" ||
    typeof row.action !== "string" ||
    typeof row.request_fingerprint !== "string" ||
    typeof row.response_body !== "string" ||
    typeof row.status_code !== "number" ||
    typeof row.created_at !== "number"
  ) {
    return null;
  }

  return {
    user_id: row.user_id,
    key: row.key,
    action: row.action,
    request_fingerprint: row.request_fingerprint,
    response_body: row.response_body,
    status_code: row.status_code,
    created_at: row.created_at,
  };
}

function asAuditLogRow(value: unknown): AuditLogRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "number" ||
    typeof row.user_id !== "string" ||
    typeof row.role !== "string" ||
    typeof row.action_type !== "string" ||
    typeof row.resource_type !== "string" ||
    typeof row.resource_id !== "string" ||
    typeof row.metadata !== "string" ||
    typeof row.created_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    role: row.role,
    action_type: row.action_type,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    metadata: row.metadata,
    created_at: row.created_at,
  };
}

function ensureSeedPosts() {
  const db = ensureDatabase();
  const existingCountRow = db.prepare("SELECT COUNT(*) as count FROM posts").get() as { count?: unknown } | undefined;
  const existingCount = typeof existingCountRow?.count === "number" ? existingCountRow.count : 0;

  if (existingCount > 0) {
    return;
  }

  const seedProfiles = [
    {
      userId: "axelbelujon",
      role: "seller",
      username: "axelbelujon",
      displayName: "Axel Belujon",
      bio: "FR French / us international creative director and maker. Building visuals, editorial systems, live concepts and premium product stories across Pictomag.",
      avatarUrl: "/figma-assets/avatar-user.png",
      websiteUrl: "https://www.axelbelujon.com",
    },
    {
      userId: "pictomag.news",
      role: "seller",
      username: "pictomag.news",
      displayName: "Pictomag News",
      bio: "Editorial desk, curation and visual reports for the Pictomag network.",
      avatarUrl: "/figma-assets/avatar-user.png",
      websiteUrl: "https://www.pictomag.app",
    },
    {
      userId: "world.of.tcgp",
      role: "seller",
      username: "world.of.tcgp",
      displayName: "World of TCGP",
      bio: "Trading card culture, motion tests and premium product edits.",
      avatarUrl: "/figma-assets/avatar-post.png",
      websiteUrl: "https://www.pictomag.app",
    },
    {
      userId: "studio.heat",
      role: "seller",
      username: "studio.heat",
      displayName: "Studio Heat",
      bio: "Signals, design notes and editorial experiments around attention.",
      avatarUrl: "/figma-assets/avatar-story.png",
      websiteUrl: "https://www.pictomag.app",
    },
  ] as const;

  for (const profile of seedProfiles) {
    ensureCompatibilityUserWithProfile(profile);
  }

  const now = Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;

  const seedPosts = [
    {
      id: 1,
      userId: "axelbelujon",
      surface: "reel",
      kind: "video",
      title: "Live blaze stage vibes from the crowd and guitar solo...",
      body: "Cut vertical propre avec scene, energie et sensation de live direct.",
      trackName: "Neon Driver - Stage Echo",
      durationLabel: "2:03",
      timelikeCount: 894,
      commentCount: 894,
      shareCount: 894,
      publishedAt: now - 9 * minute,
      media: [
        {
          mediaType: "video",
          src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-2.jpg",
          altText: "Live blaze stage vibes",
        },
      ],
    },
    {
      id: 2,
      userId: "axelbelujon",
      surface: "reel",
      kind: "video",
      title: "Night city ride in cinematic blue tones, smooth motion...",
      body: "Version courte orientee feed pour retenir l attention des le premier plan.",
      trackName: "Riverline - City Pulse",
      durationLabel: "1:41",
      timelikeCount: 942,
      commentCount: 894,
      shareCount: 894,
      publishedAt: now - 16 * minute,
      media: [
        {
          mediaType: "video",
          src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-3.jpg",
          altText: "Night city ride",
        },
      ],
    },
    {
      id: 3,
      userId: "axelbelujon",
      surface: "reel",
      kind: "photo",
      title: "Road trip visuals with dynamic perspective and warm lights...",
      body: "Une photo forte avec vraie lecture immediate pour le feed principal.",
      trackName: "Rondicch - Open Route",
      durationLabel: "0:12",
      timelikeCount: 918,
      commentCount: 746,
      shareCount: 318,
      publishedAt: now - 24 * minute,
      media: [
        {
          mediaType: "image",
          src: "/figma-assets/photo-feed/photo-grid-7.jpg",
          posterSrc: null,
          altText: "Road trip visual",
        },
      ],
    },
    {
      id: 4,
      userId: "world.of.tcgp",
      surface: "reel",
      kind: "video",
      title: "Chromecast motion shot with clean product framing and bright type...",
      body: "Montage produit au rythme plus editorial, pense pour le reel mode.",
      trackName: "Pictomag Session - Chrome Flow",
      durationLabel: "1:54",
      timelikeCount: 981,
      commentCount: 512,
      shareCount: 204,
      publishedAt: now - 31 * minute,
      media: [
        {
          mediaType: "video",
          src: "https://pictomag-news-1.vercel.app/video/video-3.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-4.jpg",
          altText: "Chromecast motion shot",
        },
      ],
    },
    {
      id: 5,
      userId: "pictomag.news",
      surface: "reel",
      kind: "video",
      title: "Editorial cut with dark gradients, depth and subtle motion rhythm...",
      body: "Cut premium destine au flux principal, sans casser la lecture verticale.",
      trackName: "Pictomag Session - Feed Pulse",
      durationLabel: "2:07",
      timelikeCount: 904,
      commentCount: 402,
      shareCount: 199,
      publishedAt: now - 39 * minute,
      media: [
        {
          mediaType: "video",
          src: "https://pictomag-news-1.vercel.app/video/feed-video-2.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-6.jpg",
          altText: "Editorial dark gradient cut",
        },
      ],
    },
    {
      id: 6,
      userId: "world.of.tcgp",
      surface: "reel",
      kind: "video",
      title: "High-contrast promo sequence with premium pacing and glossy transitions...",
      body: "Une mise en scene contrastee et propre pour tester la lecture longue.",
      trackName: "Pictomag Session - Studio Heat",
      durationLabel: "1:48",
      timelikeCount: 1026,
      commentCount: 587,
      shareCount: 244,
      publishedAt: now - 48 * minute,
      media: [
        {
          mediaType: "video",
          src: "https://pictomag-news-1.vercel.app/video/feed-video-3.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-8.jpg",
          altText: "High contrast promo sequence",
        },
      ],
    },
    {
      id: 101,
      userId: "axelbelujon",
      surface: "classic",
      kind: "letter",
      title: "Un feed classique qui donne envie de rester, pas juste de scroller.",
      body: "On veut un espace plus calme pour raconter des idees, poster une lettre, montrer un projet en photos, glisser une video et laisser le TimeLike lire l attention reelle au lieu de compter les reflexes.",
      trackName: "Letter Mode - Quiet Format",
      durationLabel: "0:12",
      timelikeCount: 1284,
      commentCount: 126,
      shareCount: 48,
      publishedAt: now - 18 * minute,
      media: [],
    },
    {
      id: 102,
      userId: "pictomag.news",
      surface: "classic",
      kind: "gallery",
      title: "Moodboard editorial du jour",
      body: "Un carrousel plus premium qu une simple mosaique: grand visuel, details rapproches et caption concise.",
      trackName: "Gallery Notes - Soft Light",
      durationLabel: "0:12",
      timelikeCount: 962,
      commentCount: 84,
      shareCount: 31,
      publishedAt: now - 42 * minute,
      media: [
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-1.jpg", posterSrc: null, altText: "Pola photo collage" },
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-2.jpg", posterSrc: null, altText: "Fashion portrait duo" },
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-3.jpg", posterSrc: null, altText: "Beauty product still life" },
      ],
    },
    {
      id: 103,
      userId: "world.of.tcgp",
      surface: "classic",
      kind: "video",
      title: "Chromecast motion cut",
      body: "Le format classique permet de contextualiser une video avec une intro, une note et un vrai espace de discussion juste dessous.",
      trackName: "Classic Feed - Motion Context",
      durationLabel: "1:18",
      timelikeCount: 2105,
      commentCount: 214,
      shareCount: 76,
      publishedAt: now - hour,
      media: [
        {
          mediaType: "video",
          src: "https://pictomag-news-1.vercel.app/video/feed-video-3.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-4.jpg",
          altText: "Chromecast motion cut",
        },
      ],
    },
    {
      id: 104,
      userId: "studio.heat",
      surface: "classic",
      kind: "note",
      title: "Le TimeLike devient le vrai signal social.",
      body: "Un post peut vivre par le texte, une image seule, une galerie ou une video. Le classement vient du temps d attention offerte, pas d un concours de taps.",
      trackName: "Signal Notes - Studio Heat",
      durationLabel: "0:10",
      timelikeCount: 845,
      commentCount: 59,
      shareCount: 19,
      publishedAt: now - 2 * hour,
      media: [
        {
          mediaType: "image",
          src: "/figma-assets/photo-feed/photo-grid-7.jpg",
          posterSrc: null,
          altText: "Signal notes portrait",
        },
      ],
    },
    {
      id: 105,
      userId: "axelbelujon",
      surface: "classic",
      kind: "gallery",
      title: "Archives photo studio",
      body: "Selection photo du profil. Curation plus calme, orientation mode album.",
      trackName: "Archive Mood - Studio Soft",
      durationLabel: "0:12",
      timelikeCount: 738,
      commentCount: 44,
      shareCount: 18,
      publishedAt: now - 3 * hour,
      media: [
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-1.jpg", posterSrc: null, altText: "Archive collage" },
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-2.jpg", posterSrc: null, altText: "Archive duo" },
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-3.jpg", posterSrc: null, altText: "Archive beauty" },
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-4.jpg", posterSrc: null, altText: "Archive cookies" },
      ],
    },
    {
      id: 106,
      userId: "axelbelujon",
      surface: "classic",
      kind: "gallery",
      title: "Selection editoriale couleurs",
      body: "Une grille plus complete pour l onglet album du profil.",
      trackName: "Editorial Grid - Soft Focus",
      durationLabel: "0:12",
      timelikeCount: 802,
      commentCount: 51,
      shareCount: 22,
      publishedAt: now - 5 * hour,
      media: [
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-5.jpg", posterSrc: null, altText: "Editorial monochrome" },
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-6.jpg", posterSrc: null, altText: "Editorial cover" },
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-7.jpg", posterSrc: null, altText: "Editorial portrait" },
        { mediaType: "image", src: "/figma-assets/photo-feed/photo-grid-8.jpg", posterSrc: null, altText: "Editorial balloons" },
      ],
    },
    {
      id: 107,
      userId: "axelbelujon",
      surface: "classic",
      kind: "video",
      title: "Road trip perspective",
      body: "Version courte pour reach organique, maintenant lue depuis le vrai store.",
      trackName: "Roadtrip Flow - Axel",
      durationLabel: "0:42",
      timelikeCount: 624,
      commentCount: 37,
      shareCount: 14,
      publishedAt: now - 7 * hour,
      media: [
        {
          mediaType: "video",
          src: "https://pictomag-news-1.vercel.app/video/feed-video-1.mp4",
          posterSrc: "/figma-assets/photo-feed/photo-grid-1.jpg",
          altText: "Road trip perspective video",
        },
      ],
    },
    {
      id: 108,
      userId: "axelbelujon",
      surface: "classic",
      kind: "note",
      title: "Signal propre, mise en page stable.",
      body: "Le profil doit lire les vrais posts et non plus un bloc statique fige dans le composant.",
      trackName: "Signal Notes - Axel",
      durationLabel: "0:10",
      timelikeCount: 511,
      commentCount: 22,
      shareCount: 11,
      publishedAt: now - 9 * hour,
      media: [
        {
          mediaType: "image",
          src: "/figma-assets/photo-feed/photo-grid-6.jpg",
          posterSrc: null,
          altText: "Signal propre portrait",
        },
      ],
    },
  ] as const;

  db.exec("BEGIN IMMEDIATE");

  try {
    const insertPostStatement = db.prepare(`
      INSERT INTO posts (
        id,
        user_id,
        surface,
        kind,
        title,
        body,
        track_name,
        duration_label,
        timelike_count,
        comment_count,
        share_count,
        created_at,
        updated_at,
        published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMediaStatement = db.prepare(`
      INSERT INTO post_media (
        post_id,
        media_type,
        src,
        poster_src,
        alt_text,
        position,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const post of seedPosts) {
      insertPostStatement.run(
        post.id,
        post.userId,
        post.surface,
        post.kind,
        post.title,
        post.body,
        post.trackName,
        post.durationLabel,
        post.timelikeCount,
        post.commentCount,
        post.shareCount,
        post.publishedAt,
        post.publishedAt,
        post.publishedAt,
      );

      post.media.forEach((media, index) => {
        insertMediaStatement.run(
          post.id,
          media.mediaType,
          media.src,
          media.posterSrc ?? null,
          media.altText,
          index,
          post.publishedAt,
        );
      });
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getUserPreferencesRow(userId: string) {
  const db = ensureDatabase();
  const row = db.prepare("SELECT user_id, marketplace, live_shopping, updated_at FROM user_preferences WHERE user_id = ?").get(userId);
  return asPreferencesRow(row);
}

export function upsertUserPreferencesRow({
  userId,
  marketplaceJson,
  liveShoppingJson,
}: {
  userId: string;
  marketplaceJson: string;
  liveShoppingJson: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO user_preferences (user_id, marketplace, live_shopping, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id)
    DO UPDATE SET
      marketplace = excluded.marketplace,
      live_shopping = excluded.live_shopping,
      updated_at = excluded.updated_at
  `).run(userId, marketplaceJson, liveShoppingJson, now);
}

export function getUserRuntimeStateRow(userId: string) {
  const db = ensureDatabase();
  const row = db
    .prepare(
      "SELECT user_id, marketplace_orders, live_shopping_orders, live_shopping_inventory, live_shopping_schedule, updated_at FROM user_runtime_state WHERE user_id = ?",
    )
    .get(userId);
  return asRuntimeStateRow(row);
}

export function getUserById(userId: string) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        email,
        password_hash,
        role,
        auth_mode,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE id = ?
    `)
    .get(userId);
  return asStoredUserRow(row);
}

export function getUserByEmail(email: string) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        email,
        password_hash,
        role,
        auth_mode,
        created_at,
        updated_at,
        last_login_at
      FROM users
      WHERE email = ?
    `)
    .get(email);
  return asStoredUserRow(row);
}

export function getProfileByUserId(userId: string) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        user_id,
        username,
        display_name,
        bio,
        avatar_url,
        website_url,
        created_at,
        updated_at
      FROM profiles
      WHERE user_id = ?
    `)
    .get(userId);
  return asStoredProfileRow(row);
}

export function getProfileByUsername(username: string) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        user_id,
        username,
        display_name,
        bio,
        avatar_url,
        website_url,
        created_at,
        updated_at
      FROM profiles
      WHERE username = ?
    `)
    .get(username);
  return asStoredProfileRow(row);
}

export function getPostById(postId: number) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        user_id,
        surface,
        kind,
        title,
        body,
        track_name,
        duration_label,
        timelike_count,
        comment_count,
        share_count,
        created_at,
        updated_at,
        published_at
      FROM posts
      WHERE id = ?
    `)
    .get(postId);
  return asStoredPostRow(row);
}

export function listPostsRows({
  userId,
  surface,
  kinds,
  limit = 50,
}: {
  userId?: string;
  surface?: StoredPostSurface;
  kinds?: StoredPostKind[];
  limit?: number;
}) {
  const db = ensureDatabase();
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (userId) {
    clauses.push("user_id = ?");
    params.push(userId);
  }

  if (surface) {
    clauses.push("surface = ?");
    params.push(surface);
  }

  if (kinds && kinds.length > 0) {
    clauses.push(`kind IN (${kinds.map(() => "?").join(", ")})`);
    params.push(...kinds);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`
      SELECT
        id,
        user_id,
        surface,
        kind,
        title,
        body,
        track_name,
        duration_label,
        timelike_count,
        comment_count,
        share_count,
        created_at,
        updated_at,
        published_at
      FROM posts
      ${whereClause}
      ORDER BY published_at DESC, id DESC
      LIMIT ?
    `)
    .all(...params, normalizedLimit);

  return rows.map((row) => asStoredPostRow(row)).filter((row): row is StoredPostRow => row !== null);
}

export function listPostMediaRowsByPostIds(postIds: number[]) {
  if (postIds.length === 0) {
    return [];
  }

  const db = ensureDatabase();
  const placeholders = postIds.map(() => "?").join(", ");
  const rows = db
    .prepare(`
      SELECT
        id,
        post_id,
        media_type,
        src,
        poster_src,
        alt_text,
        position,
        created_at
      FROM post_media
      WHERE post_id IN (${placeholders})
      ORDER BY post_id ASC, position ASC, id ASC
    `)
    .all(...postIds);

  return rows.map((row) => asStoredPostMediaRow(row)).filter((row): row is StoredPostMediaRow => row !== null);
}

export function countPostsByUserId(userId: string) {
  const db = ensureDatabase();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM posts WHERE user_id = ?")
    .get(userId) as { count?: unknown } | undefined;
  return typeof row?.count === "number" ? row.count : 0;
}

export function createPostWithMedia({
  userId,
  surface,
  kind,
  title,
  body,
  trackName,
  durationLabel,
  timelikeCount = 0,
  commentCount = 0,
  shareCount = 0,
  publishedAt,
  media,
}: {
  userId: string;
  surface: StoredPostSurface;
  kind: StoredPostKind;
  title: string;
  body?: string;
  trackName?: string;
  durationLabel?: string;
  timelikeCount?: number;
  commentCount?: number;
  shareCount?: number;
  publishedAt?: number;
  media: Array<{
    mediaType: StoredPostMediaType;
    src: string;
    posterSrc?: string | null;
    altText?: string;
    position?: number;
  }>;
}) {
  const db = ensureDatabase();
  const now = publishedAt ?? Date.now();

  db.exec("BEGIN IMMEDIATE");

  try {
    const result = db
      .prepare(`
        INSERT INTO posts (
          user_id,
          surface,
          kind,
          title,
          body,
          track_name,
          duration_label,
          timelike_count,
          comment_count,
          share_count,
          created_at,
          updated_at,
          published_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        userId,
        surface,
        kind,
        title,
        body ?? "",
        trackName ?? "",
        durationLabel ?? "0:00",
        timelikeCount,
        commentCount,
        shareCount,
        now,
        now,
        now,
      ) as { lastInsertRowid?: number | bigint };

    const postId = Number(result.lastInsertRowid ?? 0);
    const insertMediaStatement = db.prepare(`
      INSERT INTO post_media (
        post_id,
        media_type,
        src,
        poster_src,
        alt_text,
        position,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    media.forEach((entry, index) => {
      insertMediaStatement.run(
        postId,
        entry.mediaType,
        entry.src,
        entry.posterSrc ?? null,
        entry.altText ?? "",
        typeof entry.position === "number" ? entry.position : index,
        now,
      );
    });

    db.exec("COMMIT");
    return postId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function upsertUserRuntimeStateRow({
  userId,
  marketplaceOrdersJson,
  liveShoppingOrdersJson,
  liveShoppingInventoryJson,
  liveShoppingScheduleJson,
}: {
  userId: string;
  marketplaceOrdersJson: string;
  liveShoppingOrdersJson: string;
  liveShoppingInventoryJson: string;
  liveShoppingScheduleJson: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO user_runtime_state (
      user_id,
      marketplace_orders,
      live_shopping_orders,
      live_shopping_inventory,
      live_shopping_schedule,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id)
    DO UPDATE SET
      marketplace_orders = excluded.marketplace_orders,
      live_shopping_orders = excluded.live_shopping_orders,
      live_shopping_inventory = excluded.live_shopping_inventory,
      live_shopping_schedule = excluded.live_shopping_schedule,
      updated_at = excluded.updated_at
  `).run(
    userId,
    marketplaceOrdersJson,
    liveShoppingOrdersJson,
    liveShoppingInventoryJson,
    liveShoppingScheduleJson,
    now,
  );
}

export function getSessionById(sessionId: string) {
  const db = ensureDatabase();
  const row = db.prepare("SELECT session_id, user_id, created_at, last_seen_at FROM user_sessions WHERE session_id = ?").get(sessionId);
  return asSessionRow(row);
}

export function getLiveRoomStateRow(eventId: number) {
  const db = ensureDatabase();
  const row = db
    .prepare("SELECT event_id, state_json, updated_at FROM live_room_state WHERE event_id = ?")
    .get(eventId);
  return asLiveRoomStateRow(row);
}

export function upsertLiveRoomStateRow({
  eventId,
  stateJson,
}: {
  eventId: number;
  stateJson: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO live_room_state (event_id, state_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(event_id)
    DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `).run(eventId, stateJson, now);
}

export function createSession({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO user_sessions (session_id, user_id, created_at, last_seen_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, userId, now, now);
}

export function createUserWithProfile({
  id,
  email,
  passwordHash,
  role,
  authMode,
  username,
  displayName,
  bio,
  avatarUrl,
  websiteUrl,
}: {
  id: string;
  email: string | null;
  passwordHash: string | null;
  role: string;
  authMode: StoredUserAuthMode;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string | null;
  websiteUrl?: string | null;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare(`
      INSERT INTO users (
        id,
        email,
        password_hash,
        role,
        auth_mode,
        created_at,
        updated_at,
        last_login_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, passwordHash, role, authMode, now, now, null);

    db.prepare(`
      INSERT INTO profiles (
        user_id,
        username,
        display_name,
        bio,
        avatar_url,
        website_url,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      username,
      displayName,
      bio ?? "",
      avatarUrl ?? null,
      websiteUrl ?? null,
      now,
      now,
    );

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    user: getUserById(id),
    profile: getProfileByUserId(id),
  };
}

export function ensureCompatibilityUserWithProfile({
  userId,
  role,
  username,
  displayName,
  bio,
  avatarUrl,
  websiteUrl,
}: {
  userId: string;
  role: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string | null;
  websiteUrl?: string | null;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  const existingUser = getUserById(userId);
  const existingProfile = getProfileByUserId(userId);

  db.exec("BEGIN IMMEDIATE");

  try {
    if (!existingUser) {
      db.prepare(`
        INSERT INTO users (
          id,
          email,
          password_hash,
          role,
          auth_mode,
          created_at,
          updated_at,
          last_login_at
        )
        VALUES (?, NULL, NULL, ?, 'compat', ?, ?, NULL)
      `).run(userId, role, now, now);
    } else if (existingUser.auth_mode === "compat") {
      db.prepare(`
        UPDATE users
        SET role = ?, updated_at = ?
        WHERE id = ?
      `).run(role, now, userId);
    }

    if (!existingProfile) {
      db.prepare(`
        INSERT INTO profiles (
          user_id,
          username,
          display_name,
          bio,
          avatar_url,
          website_url,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        username,
        displayName,
        bio ?? "",
        avatarUrl ?? null,
        websiteUrl ?? null,
        now,
        now,
      );
    } else {
      db.prepare(`
        UPDATE profiles
        SET
          display_name = ?,
          bio = ?,
          avatar_url = ?,
          website_url = ?,
          updated_at = ?
        WHERE user_id = ?
      `).run(
        displayName,
        bio ?? existingProfile.bio,
        avatarUrl ?? existingProfile.avatar_url,
        websiteUrl ?? existingProfile.website_url,
        now,
        userId,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    user: getUserById(userId),
    profile: getProfileByUserId(userId),
  };
}

export function touchSession(sessionId: string) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare("UPDATE user_sessions SET last_seen_at = ? WHERE session_id = ?").run(now, sessionId);
}

export function touchUserLogin(userId: string) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare(`
    UPDATE users
    SET last_login_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, userId);
}

export function getActionIdempotencyRecord({
  userId,
  key,
  action,
}: {
  userId: string;
  key: string;
  action: string;
}) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        user_id,
        key,
        action,
        request_fingerprint,
        response_body,
        status_code,
        created_at
      FROM action_idempotency
      WHERE user_id = ? AND key = ? AND action = ?
    `)
    .get(userId, key, action);
  return asActionIdempotencyRow(row);
}

export function insertActionIdempotencyRecord({
  userId,
  key,
  action,
  requestFingerprint,
  responseBody,
  statusCode,
}: {
  userId: string;
  key: string;
  action: string;
  requestFingerprint: string;
  responseBody: string;
  statusCode: number;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare(`
    INSERT OR IGNORE INTO action_idempotency (
      user_id,
      key,
      action,
      request_fingerprint,
      response_body,
      status_code,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, key, action, requestFingerprint, responseBody, statusCode, now);
}

export function insertAuditLog({
  userId,
  role,
  actionType,
  resourceType,
  resourceId,
  metadata,
}: {
  userId: string;
  role: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  metadata: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO audit_logs (
      user_id,
      role,
      action_type,
      resource_type,
      resource_id,
      metadata,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, role, actionType, resourceType, resourceId, metadata, now);
}

export function listAuditLogs({
  limit,
  userId,
}: {
  limit: number;
  userId?: string;
}) {
  const db = ensureDatabase();
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));

  if (userId) {
    const rows = db
      .prepare(`
        SELECT
          id,
          user_id,
          role,
          action_type,
          resource_type,
          resource_id,
          metadata,
          created_at
        FROM audit_logs
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT ?
      `)
      .all(userId, normalizedLimit);
    return rows.map((row) => asAuditLogRow(row)).filter((row): row is AuditLogRow => row !== null);
  }

  const rows = db
    .prepare(`
      SELECT
        id,
        user_id,
        role,
        action_type,
        resource_type,
        resource_id,
        metadata,
        created_at
      FROM audit_logs
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(normalizedLimit);
  return rows.map((row) => asAuditLogRow(row)).filter((row): row is AuditLogRow => row !== null);
}
