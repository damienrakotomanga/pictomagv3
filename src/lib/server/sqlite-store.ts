import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  liveShoppingEvents,
  type LiveShoppingEvent,
} from "@/lib/live-shopping-data";
import {
  liveShoppingInventorySeed,
  normalizeLiveInventoryProduct,
} from "@/lib/live-shopping-inventory";
import {
  liveShoppingScheduleSeed,
  normalizeLiveShoppingScheduledLive,
} from "@/lib/live-shopping-schedule";
import { getMarketplaceGigSlug, seedOrders, serviceGigs } from "@/lib/marketplace-data";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";

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

export type StoredGigStatus = "active" | "pending" | "modification" | "draft" | "denied" | "paused";

export type StoredGigRow = {
  id: number;
  seller_user_id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  cover: string;
  price_from: number;
  delivery_label: string;
  response_label: string;
  timelike_trust: number;
  completed_orders: number;
  queue_size: number;
  status: StoredGigStatus;
  packages_json: string;
  deliverables_json: string;
  tags_json: string;
  created_at: number;
  updated_at: number;
  published_at: number;
};

export type StoredOrderSource = "marketplace" | "live-shopping";

export type StoredOrderRow = {
  id: number;
  gig_id: number;
  buyer_user_id: string;
  seller_user_id: string;
  source: StoredOrderSource;
  package_id: string;
  title: string;
  budget: number;
  quantity: number;
  due_date: string;
  stage_index: number;
  last_update: string;
  payment_released: number;
  timelike_trust: number;
  brief: string;
  notes_json: string;
  live_session_event_id: number | null;
  live_item_id: string | null;
  created_at: number;
  updated_at: number;
};

export type StoredLiveSessionRow = {
  event_id: number;
  owner_user_id: string;
  slug: string;
  title: string;
  category_id: string;
  live_state: string;
  media_provider: string | null;
  media_room_name: string | null;
  media_stream_id: string | null;
  media_status: string | null;
  publish_mode: string | null;
  current_lot_id: string | null;
  auction_status: string | null;
  auction_ends_at: number | null;
  started_at: number | null;
  ended_at: number | null;
  payload_json: string;
  created_at: number;
  updated_at: number;
};

export type StoredLiveInventoryRow = {
  id: string;
  owner_user_id: string;
  title: string;
  category_id: string;
  status: string;
  reserve_for_live: number;
  live_slug: string | null;
  gig_id: number | null;
  live_session_event_id: number | null;
  lot_order: number | null;
  payload_json: string;
  created_at: number;
  updated_at: number;
};

export type StoredLiveMediaStreamRow = {
  id: string;
  live_session_event_id: number;
  provider: string;
  room_name: string;
  ingest_protocol: string;
  provider_stream_id: string | null;
  publisher_identity: string | null;
  playback_hint: string | null;
  state: string;
  created_at: number;
  updated_at: number;
};

export type StoredLiveBidEventRow = {
  id: number;
  live_session_event_id: number;
  lot_id: string;
  bidder_user_id: string;
  amount: number;
  max_proxy_amount: number | null;
  status: string;
  created_at: number;
};

export type StoredLiveScheduleRow = {
  id: string;
  owner_user_id: string;
  live_state: string;
  live_slug: string | null;
  payload_json: string;
  created_at: number;
  updated_at: number;
};

export type StoredConversationRow = {
  id: number;
  participant_a_user_id: string;
  participant_b_user_id: string;
  created_at: number;
  updated_at: number;
};

export type StoredMessageRow = {
  id: number;
  conversation_id: number;
  sender_user_id: string;
  body: string;
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

function getLiveShoppingOwnerUserIdFromEvent(event: Pick<LiveShoppingEvent, "handle" | "seller">) {
  const candidate = typeof event.handle === "string" ? event.handle.replace(/^@/, "").trim() : "";
  return normalizePreferenceUserId(candidate || event.seller);
}

export function getLiveInventoryStorageId({
  ownerUserId,
  liveSlug,
  productId,
}: {
  ownerUserId: string;
  liveSlug: string | null;
  productId: string;
}) {
  return `${normalizePreferenceUserId(ownerUserId)}::${liveSlug ?? "inventory"}::${productId}`;
}

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

function listTableColumns(db: DatabaseSync, tableName: string) {
  return db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }

      const value = row as Record<string, unknown>;
      return typeof value.name === "string" ? value.name : null;
    })
    .filter((name): name is string => name !== null);
}

function ensureOrdersSchema(db: DatabaseSync) {
  const columns = listTableColumns(db, "orders");

  if (!columns.includes("source")) {
    db.exec("ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'marketplace'");
  }

  if (!columns.includes("quantity")) {
    db.exec("ALTER TABLE orders ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1");
  }

  if (!columns.includes("live_session_event_id")) {
    db.exec("ALTER TABLE orders ADD COLUMN live_session_event_id INTEGER");
  }

  if (!columns.includes("live_item_id")) {
    db.exec("ALTER TABLE orders ADD COLUMN live_item_id TEXT");
  }
}

function ensureLiveStreamingPhase5Schema(db: DatabaseSync) {
  const liveSessionColumns = listTableColumns(db, "live_sessions");

  if (!liveSessionColumns.includes("media_provider")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN media_provider TEXT");
  }

  if (!liveSessionColumns.includes("media_room_name")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN media_room_name TEXT");
  }

  if (!liveSessionColumns.includes("media_stream_id")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN media_stream_id TEXT");
  }

  if (!liveSessionColumns.includes("media_status")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN media_status TEXT");
  }

  if (!liveSessionColumns.includes("publish_mode")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN publish_mode TEXT");
  }

  if (!liveSessionColumns.includes("current_lot_id")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN current_lot_id TEXT");
  }

  if (!liveSessionColumns.includes("auction_status")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN auction_status TEXT");
  }

  if (!liveSessionColumns.includes("auction_ends_at")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN auction_ends_at INTEGER");
  }

  if (!liveSessionColumns.includes("started_at")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN started_at INTEGER");
  }

  if (!liveSessionColumns.includes("ended_at")) {
    db.exec("ALTER TABLE live_sessions ADD COLUMN ended_at INTEGER");
  }

  const liveInventoryColumns = listTableColumns(db, "live_inventory_products");

  if (!liveInventoryColumns.includes("gig_id")) {
    db.exec("ALTER TABLE live_inventory_products ADD COLUMN gig_id INTEGER");
  }

  if (!liveInventoryColumns.includes("live_session_event_id")) {
    db.exec("ALTER TABLE live_inventory_products ADD COLUMN live_session_event_id INTEGER");
  }

  if (!liveInventoryColumns.includes("lot_order")) {
    db.exec("ALTER TABLE live_inventory_products ADD COLUMN lot_order INTEGER");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_live_sessions_auction_state ON live_sessions (auction_status, auction_ends_at);
    CREATE INDEX IF NOT EXISTS idx_live_inventory_gig_id ON live_inventory_products (gig_id);
    CREATE INDEX IF NOT EXISTS idx_live_inventory_event_id ON live_inventory_products (live_session_event_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_media_streams_event_id ON live_media_streams (live_session_event_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_bid_events_event_lot ON live_bid_events (live_session_event_id, lot_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_bid_events_bidder ON live_bid_events (bidder_user_id, created_at DESC);
  `);
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

    CREATE TABLE IF NOT EXISTS gigs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_user_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      cover TEXT NOT NULL,
      price_from INTEGER NOT NULL DEFAULT 0,
      delivery_label TEXT NOT NULL DEFAULT '',
      response_label TEXT NOT NULL DEFAULT '',
      timelike_trust INTEGER NOT NULL DEFAULT 0,
      completed_orders INTEGER NOT NULL DEFAULT 0,
      queue_size INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      packages_json TEXT NOT NULL,
      deliverables_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      published_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gig_id INTEGER NOT NULL,
      buyer_user_id TEXT NOT NULL,
      seller_user_id TEXT NOT NULL,
      package_id TEXT NOT NULL,
      title TEXT NOT NULL,
      budget INTEGER NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL,
      stage_index INTEGER NOT NULL DEFAULT 0,
      last_update TEXT NOT NULL DEFAULT '',
      payment_released INTEGER NOT NULL DEFAULT 0,
      timelike_trust INTEGER NOT NULL DEFAULT 0,
      brief TEXT NOT NULL DEFAULT '',
      notes_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      event_id INTEGER PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL,
      live_state TEXT NOT NULL,
      media_provider TEXT,
      media_room_name TEXT,
      media_stream_id TEXT,
      media_status TEXT,
      publish_mode TEXT,
      current_lot_id TEXT,
      auction_status TEXT,
      auction_ends_at INTEGER,
      started_at INTEGER,
      ended_at INTEGER,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_inventory_products (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL,
      status TEXT NOT NULL,
      reserve_for_live INTEGER NOT NULL DEFAULT 0,
      live_slug TEXT,
      gig_id INTEGER,
      live_session_event_id INTEGER,
      lot_order INTEGER,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_schedule_entries (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      live_state TEXT NOT NULL,
      live_slug TEXT,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_a_user_id TEXT NOT NULL,
      participant_b_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (participant_a_user_id, participant_b_user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_user_id TEXT NOT NULL,
      body TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS live_media_streams (
      id TEXT PRIMARY KEY,
      live_session_event_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      room_name TEXT NOT NULL,
      ingest_protocol TEXT NOT NULL,
      provider_stream_id TEXT,
      publisher_identity TEXT,
      playback_hint TEXT,
      state TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_bid_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      live_session_event_id INTEGER NOT NULL,
      lot_id TEXT NOT NULL,
      bidder_user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      max_proxy_amount INTEGER,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL
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
    CREATE INDEX IF NOT EXISTS idx_gigs_seller_user_id ON gigs (seller_user_id, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs (category, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs (status, published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_buyer_user_id ON orders (buyer_user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_seller_user_id ON orders (seller_user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_gig_id ON orders (gig_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_sessions_owner_user_id ON live_sessions (owner_user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_sessions_slug ON live_sessions (slug);
    CREATE INDEX IF NOT EXISTS idx_live_inventory_owner_user_id ON live_inventory_products (owner_user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_inventory_live_slug ON live_inventory_products (live_slug, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_schedule_owner_user_id ON live_schedule_entries (owner_user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_live_schedule_live_slug ON live_schedule_entries (live_slug, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversations_participant_a ON conversations (participant_a_user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversations_participant_b ON conversations (participant_b_user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id, created_at ASC);
  `);

  ensureRuntimeStateSchema(db);
  ensureOrdersSchema(db);
  ensureLiveStreamingPhase5Schema(db);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_source ON orders (source, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_live_session_event_id ON orders (live_session_event_id, updated_at DESC);
  `);

  database = db;
  ensureSeedPosts();
  ensureSeedMarketplace();
  ensureSeedLiveShopping();
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

function asStoredGigStatus(value: unknown): StoredGigStatus | null {
  if (
    value === "active" ||
    value === "pending" ||
    value === "modification" ||
    value === "draft" ||
    value === "denied" ||
    value === "paused"
  ) {
    return value;
  }

  return null;
}

function asStoredGigRow(value: unknown): StoredGigRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const status = asStoredGigStatus(row.status);
  if (
    typeof row.id !== "number" ||
    typeof row.seller_user_id !== "string" ||
    typeof row.slug !== "string" ||
    typeof row.title !== "string" ||
    typeof row.subtitle !== "string" ||
    typeof row.category !== "string" ||
    typeof row.cover !== "string" ||
    typeof row.price_from !== "number" ||
    typeof row.delivery_label !== "string" ||
    typeof row.response_label !== "string" ||
    typeof row.timelike_trust !== "number" ||
    typeof row.completed_orders !== "number" ||
    typeof row.queue_size !== "number" ||
    status === null ||
    typeof row.packages_json !== "string" ||
    typeof row.deliverables_json !== "string" ||
    typeof row.tags_json !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number" ||
    typeof row.published_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    seller_user_id: row.seller_user_id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    cover: row.cover,
    price_from: row.price_from,
    delivery_label: row.delivery_label,
    response_label: row.response_label,
    timelike_trust: row.timelike_trust,
    completed_orders: row.completed_orders,
    queue_size: row.queue_size,
    status,
    packages_json: row.packages_json,
    deliverables_json: row.deliverables_json,
    tags_json: row.tags_json,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
  };
}

function asStoredOrderSource(value: unknown): StoredOrderSource | null {
  if (value === "marketplace" || value === "live-shopping") {
    return value;
  }

  return null;
}

function asStoredOrderRow(value: unknown): StoredOrderRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const source = asStoredOrderSource(row.source ?? "marketplace");
  if (
    typeof row.id !== "number" ||
    typeof row.gig_id !== "number" ||
    typeof row.buyer_user_id !== "string" ||
    typeof row.seller_user_id !== "string" ||
    source === null ||
    typeof row.package_id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.budget !== "number" ||
    typeof row.quantity !== "number" ||
    typeof row.due_date !== "string" ||
    typeof row.stage_index !== "number" ||
    typeof row.last_update !== "string" ||
    typeof row.payment_released !== "number" ||
    typeof row.timelike_trust !== "number" ||
    typeof row.brief !== "string" ||
    typeof row.notes_json !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    gig_id: row.gig_id,
    buyer_user_id: row.buyer_user_id,
    seller_user_id: row.seller_user_id,
    source,
    package_id: row.package_id,
    title: row.title,
    budget: row.budget,
    quantity: Math.max(1, Math.trunc(row.quantity)),
    due_date: row.due_date,
    stage_index: row.stage_index,
    last_update: row.last_update,
    payment_released: row.payment_released,
    timelike_trust: row.timelike_trust,
    brief: row.brief,
    notes_json: row.notes_json,
    live_session_event_id: asNullableNumber(row.live_session_event_id),
    live_item_id: asNullableString(row.live_item_id),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function asStoredLiveSessionRow(value: unknown): StoredLiveSessionRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.event_id !== "number" ||
    typeof row.owner_user_id !== "string" ||
    typeof row.slug !== "string" ||
    typeof row.title !== "string" ||
    typeof row.category_id !== "string" ||
    typeof row.live_state !== "string" ||
    typeof row.payload_json !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    event_id: row.event_id,
    owner_user_id: row.owner_user_id,
    slug: row.slug,
    title: row.title,
    category_id: row.category_id,
    live_state: row.live_state,
    media_provider: asNullableString(row.media_provider),
    media_room_name: asNullableString(row.media_room_name),
    media_stream_id: asNullableString(row.media_stream_id),
    media_status: asNullableString(row.media_status),
    publish_mode: asNullableString(row.publish_mode),
    current_lot_id: asNullableString(row.current_lot_id),
    auction_status: asNullableString(row.auction_status),
    auction_ends_at: asNullableNumber(row.auction_ends_at),
    started_at: asNullableNumber(row.started_at),
    ended_at: asNullableNumber(row.ended_at),
    payload_json: row.payload_json,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function asStoredLiveInventoryRow(value: unknown): StoredLiveInventoryRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.owner_user_id !== "string" ||
    typeof row.title !== "string" ||
    typeof row.category_id !== "string" ||
    typeof row.status !== "string" ||
    typeof row.reserve_for_live !== "number" ||
    typeof row.payload_json !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    title: row.title,
    category_id: row.category_id,
    status: row.status,
    reserve_for_live: row.reserve_for_live,
    live_slug: asNullableString(row.live_slug),
    gig_id: asNullableNumber(row.gig_id),
    live_session_event_id: asNullableNumber(row.live_session_event_id),
    lot_order: asNullableNumber(row.lot_order),
    payload_json: row.payload_json,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function asStoredLiveMediaStreamRow(value: unknown): StoredLiveMediaStreamRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.live_session_event_id !== "number" ||
    typeof row.provider !== "string" ||
    typeof row.room_name !== "string" ||
    typeof row.ingest_protocol !== "string" ||
    typeof row.state !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    live_session_event_id: row.live_session_event_id,
    provider: row.provider,
    room_name: row.room_name,
    ingest_protocol: row.ingest_protocol,
    provider_stream_id: asNullableString(row.provider_stream_id),
    publisher_identity: asNullableString(row.publisher_identity),
    playback_hint: asNullableString(row.playback_hint),
    state: row.state,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function asStoredLiveBidEventRow(value: unknown): StoredLiveBidEventRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "number" ||
    typeof row.live_session_event_id !== "number" ||
    typeof row.lot_id !== "string" ||
    typeof row.bidder_user_id !== "string" ||
    typeof row.amount !== "number" ||
    typeof row.status !== "string" ||
    typeof row.created_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    live_session_event_id: row.live_session_event_id,
    lot_id: row.lot_id,
    bidder_user_id: row.bidder_user_id,
    amount: row.amount,
    max_proxy_amount: asNullableNumber(row.max_proxy_amount),
    status: row.status,
    created_at: row.created_at,
  };
}

function asStoredLiveScheduleRow(value: unknown): StoredLiveScheduleRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.owner_user_id !== "string" ||
    typeof row.live_state !== "string" ||
    typeof row.payload_json !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    live_state: row.live_state,
    live_slug: asNullableString(row.live_slug),
    payload_json: row.payload_json,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildLiveLotGigSlug(event: Pick<LiveShoppingEvent, "slug">, lotId: string) {
  return `live-${event.slug}-${normalizePreferenceUserId(lotId)}`.slice(0, 200);
}

function ensureLiveLotGigRow(
  db: DatabaseSync,
  {
    event,
    ownerUserId,
    lotId,
    title,
    subtitle,
    category,
    cover,
    priceFrom,
    deliveryLabel,
    tags,
  }: {
    event: Pick<LiveShoppingEvent, "slug" | "title">;
    ownerUserId: string;
    lotId: string;
    title: string;
    subtitle: string;
    category: string;
    cover: string;
    priceFrom: number;
    deliveryLabel: string;
    tags: string[];
  },
) {
  const slug = buildLiveLotGigSlug(event, lotId);
  const existing = getGigRowBySlug(slug);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const result = db
    .prepare(`
      INSERT INTO gigs (
        seller_user_id,
        slug,
        title,
        subtitle,
        category,
        cover,
        price_from,
        delivery_label,
        response_label,
        timelike_trust,
        completed_orders,
        queue_size,
        status,
        packages_json,
        deliverables_json,
        tags_json,
        created_at,
        updated_at,
        published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      slug,
      title,
      subtitle,
      category,
      cover,
      Math.max(1, priceFrom),
      deliveryLabel,
      "Live instantane",
      96,
      0,
      0,
      "active",
      JSON.stringify([
        {
          id: "live",
          name: "Lot live",
          price: Math.max(1, priceFrom),
          deliveryDays: 3,
          revisions: "0 revision",
          description: subtitle,
          features: [event.title, "Commande issue du live", deliveryLabel],
          recommended: true,
        },
      ]),
      JSON.stringify(["Lot reserve pendant le live"]),
      JSON.stringify(tags.slice(0, 6)),
      now,
      now,
      now,
    ) as { lastInsertRowid?: number | bigint };

  const gigId = Number(result.lastInsertRowid ?? 0);
  return gigId > 0 ? getGigRowById(gigId) : null;
}

function asStoredConversationRow(value: unknown): StoredConversationRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "number" ||
    typeof row.participant_a_user_id !== "string" ||
    typeof row.participant_b_user_id !== "string" ||
    typeof row.created_at !== "number" ||
    typeof row.updated_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    participant_a_user_id: row.participant_a_user_id,
    participant_b_user_id: row.participant_b_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function asStoredMessageRow(value: unknown): StoredMessageRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "number" ||
    typeof row.conversation_id !== "number" ||
    typeof row.sender_user_id !== "string" ||
    typeof row.body !== "string" ||
    typeof row.created_at !== "number"
  ) {
    return null;
  }

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_user_id: row.sender_user_id,
    body: row.body,
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

function ensureSeedMarketplace() {
  const db = ensureDatabase();
  const existingGigCountRow = db.prepare("SELECT COUNT(*) as count FROM gigs").get() as { count?: unknown } | undefined;
  const existingOrderCountRow = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count?: unknown } | undefined;
  const existingGigCount = typeof existingGigCountRow?.count === "number" ? existingGigCountRow.count : 0;
  const existingOrderCount = typeof existingOrderCountRow?.count === "number" ? existingOrderCountRow.count : 0;

  const sellerProfiles = [
    {
      userId: "axelbelujon",
      role: "seller",
      username: "axelbelujon",
      displayName: "Axel Belujon Studio",
      bio: "Direction visuelle, pages premium, systems et handoff propre pour les services Pictomag.",
      avatarUrl: "/figma-assets/avatar-post.png",
      websiteUrl: "https://www.axelbelujon.com",
    },
    {
      userId: "studio.heat",
      role: "seller",
      username: "studio.heat",
      displayName: "Studio Heat",
      bio: "Motion systems, hooks, pacing et execution propre pour shorts et ads.",
      avatarUrl: "/figma-assets/avatar-story.png",
      websiteUrl: "https://www.pictomag.app",
    },
    {
      userId: "pictomag.news",
      role: "seller",
      username: "pictomag.news",
      displayName: "Pictomag News Lab",
      bio: "Brand clarity, service pages et offre plus lisible pour les equipes produit.",
      avatarUrl: "/figma-assets/avatar-user.png",
      websiteUrl: "https://www.pictomag.app",
    },
    {
      userId: "neondriver",
      role: "seller",
      username: "neondriver",
      displayName: "Neon Driver Audio",
      bio: "Audio identity, signatures sonores et loops propres pour produit et campagnes.",
      avatarUrl: "/figma-assets/avatar-post.png",
      websiteUrl: "https://www.pictomag.app",
    },
  ] as const;

  const buyerProfiles = [
    {
      userId: "aurora-labs",
      role: "buyer",
      username: "aurora.labs",
      displayName: "Aurora Labs",
      bio: "Client marketplace seed.",
      avatarUrl: "/figma-assets/avatar-user.png",
    },
    {
      userId: "chrome-lab",
      role: "buyer",
      username: "chrome.lab",
      displayName: "Chrome Lab",
      bio: "Client marketplace seed.",
      avatarUrl: "/figma-assets/avatar-user.png",
    },
    {
      userId: "northlight",
      role: "buyer",
      username: "northlight",
      displayName: "Northlight",
      bio: "Client marketplace seed.",
      avatarUrl: "/figma-assets/avatar-user.png",
    },
  ] as const;

  for (const profile of [...sellerProfiles, ...buyerProfiles]) {
    ensureCompatibilityUserWithProfile(profile);
  }

  if (existingGigCount === 0) {
    const now = Date.now();
    const statusByGigId: Record<number, StoredGigStatus> = {
      1: "active",
      2: "active",
      3: "pending",
      4: "paused",
    };
    const sellerUserIdByHandle: Record<string, string> = {
      "@axelbelujon": "axelbelujon",
      "@studio.heat": "studio.heat",
      "@pictomag.news": "pictomag.news",
      "@neondriver": "neondriver",
    };
    const insertGigStatement = db.prepare(`
      INSERT INTO gigs (
        id,
        seller_user_id,
        slug,
        title,
        subtitle,
        category,
        cover,
        price_from,
        delivery_label,
        response_label,
        timelike_trust,
        completed_orders,
        queue_size,
        status,
        packages_json,
        deliverables_json,
        tags_json,
        created_at,
        updated_at,
        published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN IMMEDIATE");
    try {
      for (const gig of serviceGigs) {
        insertGigStatement.run(
          gig.id,
          sellerUserIdByHandle[gig.handle] ?? gig.handle.replace(/^@/, ""),
          getMarketplaceGigSlug(gig),
          gig.title,
          gig.subtitle,
          gig.category,
          gig.cover,
          gig.priceFrom,
          gig.deliveryLabel,
          gig.responseLabel,
          gig.timelikeTrust,
          gig.completedOrders,
          gig.queueSize,
          statusByGigId[gig.id] ?? "active",
          JSON.stringify(gig.packages),
          JSON.stringify(gig.deliverables),
          JSON.stringify(gig.tags),
          now - gig.id * 1_000,
          now - gig.id * 1_000,
          now - gig.id * 1_000,
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  if (existingOrderCount === 0) {
    const now = Date.now();
    const buyerUserIdByClient: Record<string, string> = {
      "Aurora Labs": "aurora-labs",
      "Chrome Lab": "chrome-lab",
      Northlight: "northlight",
    };
    const insertOrderStatement = db.prepare(`
      INSERT INTO orders (
        id,
        gig_id,
        buyer_user_id,
        seller_user_id,
        package_id,
        title,
        budget,
        due_date,
        stage_index,
        last_update,
        payment_released,
        timelike_trust,
        brief,
        notes_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.exec("BEGIN IMMEDIATE");
    try {
      for (const order of seedOrders) {
        const gig = serviceGigs.find((item) => item.id === order.gigId);
        const packageId = gig?.packages.find((pkg) => pkg.price === order.budget)?.id ?? gig?.packages[0]?.id ?? "starter";
        insertOrderStatement.run(
          order.id,
          order.gigId,
          buyerUserIdByClient[order.client] ?? `buyer-${order.id}`,
          gig?.handle.replace(/^@/, "") ?? order.seller.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          packageId,
          order.title,
          order.budget,
          order.dueDate,
          order.stageIndex,
          order.lastUpdate,
          order.paymentReleased ? 1 : 0,
          order.timelikeTrust,
          order.brief,
          JSON.stringify(order.notes),
          now - order.id,
          now - order.id,
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
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

function ensureSeedLiveShopping() {
  const db = ensureDatabase();
  const defaultOwnerUserId = "axelbelujon";

  const sellerProfiles = Array.from(
    new Map(
      liveShoppingEvents.map((event) => {
        const ownerUserId = getLiveShoppingOwnerUserIdFromEvent(event);
        return [
          ownerUserId,
          {
            userId: ownerUserId,
            role: "seller",
            username: ownerUserId,
            displayName: event.seller,
            bio: `${event.category} en direct sur Pictomag.`,
            avatarUrl: event.avatar,
            websiteUrl: "https://www.pictomag.app",
          },
        ] as const;
      }),
    ).values(),
  );

  for (const profile of sellerProfiles) {
    ensureCompatibilityUserWithProfile(profile);
  }

  ensureCompatibilityUserWithProfile({
    userId: defaultOwnerUserId,
    role: "seller",
    username: defaultOwnerUserId,
    displayName: "Axel Belujon",
    bio: "Owner profile pour les ecrans inventaire et planning live.",
    avatarUrl: "/figma-assets/avatar-post.png",
    websiteUrl: "https://www.axelbelujon.com",
  });

  const upsertLiveInventoryStatement = db.prepare(`
    INSERT INTO live_inventory_products (
      id,
      owner_user_id,
      title,
      category_id,
      status,
      reserve_for_live,
      live_slug,
      gig_id,
      live_session_event_id,
      lot_order,
      payload_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      title = excluded.title,
      category_id = excluded.category_id,
      status = excluded.status,
      reserve_for_live = excluded.reserve_for_live,
      live_slug = excluded.live_slug,
      gig_id = excluded.gig_id,
      live_session_event_id = excluded.live_session_event_id,
      lot_order = excluded.lot_order,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `);

  const upsertLiveScheduleStatement = db.prepare(`
    INSERT INTO live_schedule_entries (
      id,
      owner_user_id,
      live_state,
      live_slug,
      payload_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      live_state = excluded.live_state,
      live_slug = excluded.live_slug,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `);

  db.exec("BEGIN IMMEDIATE");

  try {
    for (const event of liveShoppingEvents) {
      const ownerUserId = getLiveShoppingOwnerUserIdFromEvent(event);

      upsertLiveSessionRow({
        eventId: event.id,
        ownerUserId,
        slug: event.slug,
        title: event.title,
        categoryId: event.categoryId,
        liveState: event.status === "live" ? "live" : "scheduled",
        payloadJson: JSON.stringify(event),
      });

      for (const [lotIndex, lot] of event.items.entries()) {
        const normalizedProduct = normalizeLiveInventoryProduct({
          id: lot.id,
          title: lot.title,
          categoryId: event.categoryId,
          categoryLabel: event.category,
          description: lot.subtitle,
          quantity: Math.max(0, lot.stock),
          price: lot.price,
          status: lot.stock > 0 ? "active" : "inactive",
          mode: lot.mode,
          currentBid: lot.currentBid ?? null,
          bidIncrement: lot.bidIncrement ?? null,
          reserveForLive: true,
          liveSlug: event.slug,
          flashSale: false,
          acceptOffers: lot.mode === "fixed",
          cover: lot.cover,
          deliveryProfile: lot.delivery,
          dangerousGoods: "Pas de matieres dangereuses",
          costPerItem: String(Math.max(1, Math.round(lot.price * 0.65))),
          sku: `${event.id}-${lot.id}`.slice(0, 80),
          createdAt: Date.now() - event.id * 1_000,
        });
        const gig = ensureLiveLotGigRow(db, {
          event,
          ownerUserId,
          lotId: lot.id,
          title: normalizedProduct.title,
          subtitle: normalizedProduct.description || event.subtitle,
          category: event.category,
          cover: normalizedProduct.cover,
          priceFrom: normalizedProduct.price,
          deliveryLabel: normalizedProduct.deliveryProfile || "48h",
          tags: event.tags,
        });
        const normalizedProductWithGig = normalizeLiveInventoryProduct({
          ...normalizedProduct,
          gigId: gig?.id ?? null,
          liveSessionEventId: event.id,
          lotOrder: lotIndex,
        });

        upsertLiveInventoryStatement.run(
          getLiveInventoryStorageId({
            ownerUserId,
            liveSlug: event.slug,
            productId: lot.id,
          }),
          ownerUserId,
          normalizedProductWithGig.title,
          normalizedProductWithGig.categoryId,
          normalizedProductWithGig.status,
          normalizedProductWithGig.reserveForLive ? 1 : 0,
          normalizedProductWithGig.liveSlug ?? null,
          normalizedProductWithGig.gigId ?? null,
          normalizedProductWithGig.liveSessionEventId ?? event.id,
          normalizedProductWithGig.lotOrder ?? lotIndex,
          JSON.stringify(normalizedProductWithGig),
          normalizedProductWithGig.createdAt,
          Date.now(),
        );
      }
    }

    for (const item of liveShoppingInventorySeed) {
      const normalizedItem = normalizeLiveInventoryProduct(item);
      upsertLiveInventoryStatement.run(
        getLiveInventoryStorageId({
          ownerUserId: defaultOwnerUserId,
          liveSlug: normalizedItem.liveSlug,
          productId: normalizedItem.id,
        }),
        defaultOwnerUserId,
        normalizedItem.title,
        normalizedItem.categoryId,
        normalizedItem.status,
        normalizedItem.reserveForLive ? 1 : 0,
        normalizedItem.liveSlug ?? null,
        normalizedItem.gigId ?? null,
        normalizedItem.liveSessionEventId ?? null,
        normalizedItem.lotOrder ?? null,
        JSON.stringify(normalizedItem),
        normalizedItem.createdAt,
        Date.now(),
      );
    }

    for (const item of liveShoppingScheduleSeed) {
      const normalizedItem = normalizeLiveShoppingScheduledLive(item);
      const ownerUserId =
        normalizedItem.liveSessionSlug && getLiveSessionRowBySlug(normalizedItem.liveSessionSlug)
          ? getLiveSessionRowBySlug(normalizedItem.liveSessionSlug)?.owner_user_id ?? defaultOwnerUserId
          : defaultOwnerUserId;

      upsertLiveScheduleStatement.run(
        normalizedItem.id,
        ownerUserId,
        normalizedItem.liveState,
        normalizedItem.liveSessionSlug ?? null,
        JSON.stringify(normalizedItem),
        normalizedItem.createdAt,
        Date.now(),
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getGigRowById(gigId: number) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        seller_user_id,
        slug,
        title,
        subtitle,
        category,
        cover,
        price_from,
        delivery_label,
        response_label,
        timelike_trust,
        completed_orders,
        queue_size,
        status,
        packages_json,
        deliverables_json,
        tags_json,
        created_at,
        updated_at,
        published_at
      FROM gigs
      WHERE id = ?
    `)
    .get(gigId);
  return asStoredGigRow(row);
}

export function getGigRowBySlug(slug: string) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        seller_user_id,
        slug,
        title,
        subtitle,
        category,
        cover,
        price_from,
        delivery_label,
        response_label,
        timelike_trust,
        completed_orders,
        queue_size,
        status,
        packages_json,
        deliverables_json,
        tags_json,
        created_at,
        updated_at,
        published_at
      FROM gigs
      WHERE slug = ?
    `)
    .get(slug);
  return asStoredGigRow(row);
}

export function listGigRows({
  sellerUserId,
  statuses,
  limit = 80,
}: {
  sellerUserId?: string;
  statuses?: StoredGigStatus[];
  limit?: number;
}) {
  const db = ensureDatabase();
  const normalizedLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (sellerUserId) {
    clauses.push("seller_user_id = ?");
    params.push(sellerUserId);
  }

  if (statuses && statuses.length > 0) {
    clauses.push(`status IN (${statuses.map(() => "?").join(", ")})`);
    params.push(...statuses);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`
      SELECT
        id,
        seller_user_id,
        slug,
        title,
        subtitle,
        category,
        cover,
        price_from,
        delivery_label,
        response_label,
        timelike_trust,
        completed_orders,
        queue_size,
        status,
        packages_json,
        deliverables_json,
        tags_json,
        created_at,
        updated_at,
        published_at
      FROM gigs
      ${whereClause}
      ORDER BY published_at DESC, id DESC
      LIMIT ?
    `)
    .all(...params, normalizedLimit);

  return rows.map((row) => asStoredGigRow(row)).filter((row): row is StoredGigRow => row !== null);
}

export function createGigRow({
  sellerUserId,
  slugOverride,
  title,
  subtitle,
  category,
  cover,
  priceFrom,
  deliveryLabel,
  responseLabel,
  timelikeTrust,
  completedOrders,
  queueSize,
  status,
  packagesJson,
  deliverablesJson,
  tagsJson,
}: {
  sellerUserId: string;
  slugOverride?: string;
  title: string;
  subtitle: string;
  category: string;
  cover: string;
  priceFrom: number;
  deliveryLabel: string;
  responseLabel: string;
  timelikeTrust: number;
  completedOrders: number;
  queueSize: number;
  status: StoredGigStatus;
  packagesJson: string;
  deliverablesJson: string;
  tagsJson: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  db.exec("BEGIN IMMEDIATE");

  try {
    const result = db
      .prepare(`
        INSERT INTO gigs (
          seller_user_id,
          slug,
          title,
          subtitle,
          category,
          cover,
          price_from,
          delivery_label,
          response_label,
          timelike_trust,
          completed_orders,
          queue_size,
          status,
          packages_json,
          deliverables_json,
          tags_json,
          created_at,
          updated_at,
          published_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        sellerUserId,
        slugOverride ?? `draft-${Date.now()}`,
        title,
        subtitle,
        category,
        cover,
        priceFrom,
        deliveryLabel,
        responseLabel,
        timelikeTrust,
        completedOrders,
        queueSize,
        status,
        packagesJson,
        deliverablesJson,
        tagsJson,
        now,
        now,
        now,
      ) as { lastInsertRowid?: number | bigint };

    const gigId = Number(result.lastInsertRowid ?? 0);
    const slug = slugOverride ?? getMarketplaceGigSlug({ id: gigId, title });

    db.prepare(`
      UPDATE gigs
      SET slug = ?, updated_at = ?
      WHERE id = ?
    `).run(slug, now, gigId);

    db.exec("COMMIT");
    return getGigRowById(gigId);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getOrderRowById(orderId: number) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        gig_id,
        buyer_user_id,
        seller_user_id,
        source,
        package_id,
        title,
        budget,
        quantity,
        due_date,
        stage_index,
        last_update,
        payment_released,
        timelike_trust,
        brief,
        notes_json,
        live_session_event_id,
        live_item_id,
        created_at,
        updated_at
      FROM orders
      WHERE id = ?
    `)
    .get(orderId);
  return asStoredOrderRow(row);
}

export function listOrderRowsForUser(
  userId: string,
  options?: {
    source?: StoredOrderSource;
  },
) {
  const db = ensureDatabase();
  const queryBase = `
      SELECT
        id,
        gig_id,
        buyer_user_id,
        seller_user_id,
        source,
        package_id,
        title,
        budget,
        quantity,
        due_date,
        stage_index,
        last_update,
        payment_released,
        timelike_trust,
        brief,
        notes_json,
        live_session_event_id,
        live_item_id,
        created_at,
        updated_at
      FROM orders
      WHERE (buyer_user_id = ? OR seller_user_id = ?)
    `;
  const rows =
    options?.source
      ? db
          .prepare(
            `${queryBase}
             AND source = ?
             ORDER BY updated_at DESC, id DESC`,
          )
          .all(userId, userId, options.source)
      : db
          .prepare(
            `${queryBase}
             ORDER BY updated_at DESC, id DESC`,
          )
          .all(userId, userId);

  return rows.map((row) => asStoredOrderRow(row)).filter((row): row is StoredOrderRow => row !== null);
}

export function listOrderRowsForLiveSessionEvent(eventId: number) {
  const db = ensureDatabase();
  const rows = db
    .prepare(`
      SELECT
        id,
        gig_id,
        buyer_user_id,
        seller_user_id,
        source,
        package_id,
        title,
        budget,
        quantity,
        due_date,
        stage_index,
        last_update,
        payment_released,
        timelike_trust,
        brief,
        notes_json,
        live_session_event_id,
        live_item_id,
        created_at,
        updated_at
      FROM orders
      WHERE source = 'live-shopping' AND live_session_event_id = ?
      ORDER BY updated_at DESC, id DESC
    `)
    .all(eventId);

  return rows.map((row) => asStoredOrderRow(row)).filter((row): row is StoredOrderRow => row !== null);
}

export function createOrderRow({
  gigId,
  buyerUserId,
  sellerUserId,
  source,
  packageId,
  title,
  budget,
  quantity,
  dueDate,
  stageIndex,
  lastUpdate,
  paymentReleased,
  timelikeTrust,
  brief,
  notesJson,
  liveSessionEventId,
  liveItemId,
}: {
  gigId: number;
  buyerUserId: string;
  sellerUserId: string;
  source?: StoredOrderSource;
  packageId: string;
  title: string;
  budget: number;
  quantity?: number;
  dueDate: string;
  stageIndex: number;
  lastUpdate: string;
  paymentReleased: boolean;
  timelikeTrust: number;
  brief: string;
  notesJson: string;
  liveSessionEventId?: number | null;
  liveItemId?: string | null;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  const result = db
    .prepare(`
      INSERT INTO orders (
        gig_id,
        buyer_user_id,
        seller_user_id,
        source,
        package_id,
        title,
        budget,
        quantity,
        due_date,
        stage_index,
        last_update,
        payment_released,
        timelike_trust,
        brief,
        notes_json,
        live_session_event_id,
        live_item_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      gigId,
      buyerUserId,
      sellerUserId,
      source ?? "marketplace",
      packageId,
      title,
      budget,
      Math.max(1, Math.trunc(quantity ?? 1)),
      dueDate,
      stageIndex,
      lastUpdate,
      paymentReleased ? 1 : 0,
      timelikeTrust,
      brief,
      notesJson,
      liveSessionEventId ?? null,
      liveItemId ?? null,
      now,
      now,
    ) as { lastInsertRowid?: number | bigint };

  return getOrderRowById(Number(result.lastInsertRowid ?? 0));
}

export function updateOrderRowStage({
  orderId,
  stageIndex,
  lastUpdate,
  notesJson,
}: {
  orderId: number;
  stageIndex: number;
  lastUpdate: string;
  notesJson?: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  if (notesJson) {
    db.prepare(`
      UPDATE orders
      SET stage_index = ?, last_update = ?, notes_json = ?, updated_at = ?
      WHERE id = ?
    `).run(stageIndex, lastUpdate, notesJson, now, orderId);
  } else {
    db.prepare(`
      UPDATE orders
      SET stage_index = ?, last_update = ?, updated_at = ?
      WHERE id = ?
    `).run(stageIndex, lastUpdate, now, orderId);
  }
  return getOrderRowById(orderId);
}

export function updateOrderRowPaymentReleased({
  orderId,
  paymentReleased,
  lastUpdate,
}: {
  orderId: number;
  paymentReleased: boolean;
  lastUpdate?: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  db.prepare(`
    UPDATE orders
    SET payment_released = ?, last_update = COALESCE(?, last_update), updated_at = ?
    WHERE id = ?
  `).run(paymentReleased ? 1 : 0, lastUpdate ?? null, now, orderId);
  return getOrderRowById(orderId);
}

export function getLiveSessionRowByEventId(eventId: number) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        event_id,
        owner_user_id,
        slug,
        title,
        category_id,
        live_state,
        media_provider,
        media_room_name,
        media_stream_id,
        media_status,
        publish_mode,
        current_lot_id,
        auction_status,
        auction_ends_at,
        started_at,
        ended_at,
        payload_json,
        created_at,
        updated_at
      FROM live_sessions
      WHERE event_id = ?
    `)
    .get(eventId);
  return asStoredLiveSessionRow(row);
}

export function getLiveSessionRowBySlug(slug: string) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        event_id,
        owner_user_id,
        slug,
        title,
        category_id,
        live_state,
        media_provider,
        media_room_name,
        media_stream_id,
        media_status,
        publish_mode,
        current_lot_id,
        auction_status,
        auction_ends_at,
        started_at,
        ended_at,
        payload_json,
        created_at,
        updated_at
      FROM live_sessions
      WHERE slug = ?
    `)
    .get(slug);
  return asStoredLiveSessionRow(row);
}

export function listLiveSessionRows({
  ownerUserId,
  liveState,
  limit,
}: {
  ownerUserId?: string;
  liveState?: string;
  limit?: number;
}) {
  const db = ensureDatabase();
  const normalizedLimit = limit ? Math.max(1, Math.min(200, Math.trunc(limit))) : null;

  let query = `
    SELECT
      event_id,
      owner_user_id,
      slug,
      title,
      category_id,
      live_state,
      media_provider,
      media_room_name,
      media_stream_id,
      media_status,
      publish_mode,
      current_lot_id,
      auction_status,
      auction_ends_at,
      started_at,
      ended_at,
      payload_json,
      created_at,
      updated_at
    FROM live_sessions
    WHERE 1 = 1
  `;
  const params: Array<string | number> = [];

  if (ownerUserId) {
    query += " AND owner_user_id = ?";
    params.push(ownerUserId);
  }

  if (liveState) {
    query += " AND live_state = ?";
    params.push(liveState);
  }

  query += " ORDER BY updated_at DESC, event_id DESC";

  if (normalizedLimit) {
    query += " LIMIT ?";
    params.push(normalizedLimit);
  }

  const rows = db.prepare(query).all(...params);
  return rows.map((row) => asStoredLiveSessionRow(row)).filter((row): row is StoredLiveSessionRow => row !== null);
}

export function upsertLiveSessionRow({
  eventId,
  ownerUserId,
  slug,
  title,
  categoryId,
  liveState,
  mediaProvider,
  mediaRoomName,
  mediaStreamId,
  mediaStatus,
  publishMode,
  currentLotId,
  auctionStatus,
  auctionEndsAt,
  startedAt,
  endedAt,
  payloadJson,
}: {
  eventId: number;
  ownerUserId: string;
  slug: string;
  title: string;
  categoryId: string;
  liveState: string;
  mediaProvider?: string | null;
  mediaRoomName?: string | null;
  mediaStreamId?: string | null;
  mediaStatus?: string | null;
  publishMode?: string | null;
  currentLotId?: string | null;
  auctionStatus?: string | null;
  auctionEndsAt?: number | null;
  startedAt?: number | null;
  endedAt?: number | null;
  payloadJson: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.prepare(`
    INSERT INTO live_sessions (
      event_id,
      owner_user_id,
      slug,
      title,
      category_id,
      live_state,
      media_provider,
      media_room_name,
      media_stream_id,
      media_status,
      publish_mode,
      current_lot_id,
      auction_status,
      auction_ends_at,
      started_at,
      ended_at,
      payload_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id)
    DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      slug = excluded.slug,
      title = excluded.title,
      category_id = excluded.category_id,
      live_state = excluded.live_state,
      media_provider = COALESCE(excluded.media_provider, live_sessions.media_provider),
      media_room_name = COALESCE(excluded.media_room_name, live_sessions.media_room_name),
      media_stream_id = COALESCE(excluded.media_stream_id, live_sessions.media_stream_id),
      media_status = COALESCE(excluded.media_status, live_sessions.media_status),
      publish_mode = COALESCE(excluded.publish_mode, live_sessions.publish_mode),
      current_lot_id = COALESCE(excluded.current_lot_id, live_sessions.current_lot_id),
      auction_status = COALESCE(excluded.auction_status, live_sessions.auction_status),
      auction_ends_at = COALESCE(excluded.auction_ends_at, live_sessions.auction_ends_at),
      started_at = COALESCE(excluded.started_at, live_sessions.started_at),
      ended_at = COALESCE(excluded.ended_at, live_sessions.ended_at),
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `).run(
    eventId,
    ownerUserId,
    slug,
    title,
    categoryId,
    liveState,
    mediaProvider ?? null,
    mediaRoomName ?? null,
    mediaStreamId ?? null,
    mediaStatus ?? null,
    publishMode ?? null,
    currentLotId ?? null,
    auctionStatus ?? null,
    auctionEndsAt ?? null,
    startedAt ?? null,
    endedAt ?? null,
    payloadJson,
    now,
    now,
  );

  return getLiveSessionRowByEventId(eventId);
}

export function listLiveInventoryRows({
  ownerUserId,
  liveSlug,
  limit,
}: {
  ownerUserId?: string;
  liveSlug?: string;
  limit?: number;
}) {
  const db = ensureDatabase();
  const normalizedLimit = limit ? Math.max(1, Math.min(500, Math.trunc(limit))) : null;
  let query = `
    SELECT
      id,
      owner_user_id,
      title,
      category_id,
      status,
      reserve_for_live,
      live_slug,
      gig_id,
      live_session_event_id,
      lot_order,
      payload_json,
      created_at,
      updated_at
    FROM live_inventory_products
    WHERE 1 = 1
  `;
  const params: Array<string | number> = [];

  if (ownerUserId) {
    query += " AND owner_user_id = ?";
    params.push(ownerUserId);
  }

  if (liveSlug) {
    query += " AND live_slug = ?";
    params.push(liveSlug);
  }

  query += " ORDER BY updated_at DESC, created_at DESC";

  if (normalizedLimit) {
    query += " LIMIT ?";
    params.push(normalizedLimit);
  }

  const rows = db.prepare(query).all(...params);
  return rows.map((row) => asStoredLiveInventoryRow(row)).filter((row): row is StoredLiveInventoryRow => row !== null);
}

export function getLiveInventoryRowById(id: string) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        owner_user_id,
      title,
      category_id,
      status,
      reserve_for_live,
      live_slug,
      gig_id,
      live_session_event_id,
      lot_order,
      payload_json,
      created_at,
      updated_at
    FROM live_inventory_products
      WHERE id = ?
    `)
    .get(id);
  return asStoredLiveInventoryRow(row);
}

export function replaceLiveInventoryRowsForOwner({
  ownerUserId,
  inventory,
}: {
  ownerUserId: string;
  inventory: Array<{
    id: string;
    title: string;
    categoryId: string;
    status: string;
    reserveForLive: boolean;
    liveSlug: string | null;
    gigId?: number | null;
    liveSessionEventId?: number | null;
    lotOrder?: number | null;
    payloadJson: string;
    createdAt?: number;
  }>;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare("DELETE FROM live_inventory_products WHERE owner_user_id = ?").run(ownerUserId);

    const insertStatement = db.prepare(`
      INSERT INTO live_inventory_products (
        id,
        owner_user_id,
        title,
        category_id,
        status,
        reserve_for_live,
        live_slug,
        gig_id,
        live_session_event_id,
        lot_order,
        payload_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of inventory) {
      insertStatement.run(
        item.id,
        ownerUserId,
        item.title,
        item.categoryId,
        item.status,
        item.reserveForLive ? 1 : 0,
        item.liveSlug ?? null,
        item.gigId ?? null,
        item.liveSessionEventId ?? null,
        item.lotOrder ?? null,
        item.payloadJson,
        item.createdAt ?? now,
        now,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return listLiveInventoryRows({ ownerUserId });
}

export function updateLiveSessionControlRow({
  eventId,
  liveState,
  mediaProvider,
  mediaRoomName,
  mediaStreamId,
  mediaStatus,
  publishMode,
  currentLotId,
  auctionStatus,
  auctionEndsAt,
  startedAt,
  endedAt,
}: {
  eventId: number;
  liveState?: string | null;
  mediaProvider?: string | null;
  mediaRoomName?: string | null;
  mediaStreamId?: string | null;
  mediaStatus?: string | null;
  publishMode?: string | null;
  currentLotId?: string | null;
  auctionStatus?: string | null;
  auctionEndsAt?: number | null;
  startedAt?: number | null;
  endedAt?: number | null;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  const assignments: string[] = ["updated_at = ?"];
  const params: Array<string | number | null> = [now];

  if (liveState !== undefined) {
    assignments.push("live_state = ?");
    params.push(liveState);
  }

  if (mediaProvider !== undefined) {
    assignments.push("media_provider = ?");
    params.push(mediaProvider);
  }

  if (mediaRoomName !== undefined) {
    assignments.push("media_room_name = ?");
    params.push(mediaRoomName);
  }

  if (mediaStreamId !== undefined) {
    assignments.push("media_stream_id = ?");
    params.push(mediaStreamId);
  }

  if (mediaStatus !== undefined) {
    assignments.push("media_status = ?");
    params.push(mediaStatus);
  }

  if (publishMode !== undefined) {
    assignments.push("publish_mode = ?");
    params.push(publishMode);
  }

  if (currentLotId !== undefined) {
    assignments.push("current_lot_id = ?");
    params.push(currentLotId);
  }

  if (auctionStatus !== undefined) {
    assignments.push("auction_status = ?");
    params.push(auctionStatus);
  }

  if (auctionEndsAt !== undefined) {
    assignments.push("auction_ends_at = ?");
    params.push(auctionEndsAt);
  }

  if (startedAt !== undefined) {
    assignments.push("started_at = ?");
    params.push(startedAt);
  }

  if (endedAt !== undefined) {
    assignments.push("ended_at = ?");
    params.push(endedAt);
  }

  if (assignments.length === 1) {
    return getLiveSessionRowByEventId(eventId);
  }

  params.push(eventId);
  db.prepare(`
    UPDATE live_sessions
    SET ${assignments.join(", ")}
    WHERE event_id = ?
  `).run(...params);

  return getLiveSessionRowByEventId(eventId);
}

export function upsertLiveMediaStreamRow({
  id,
  liveSessionEventId,
  provider,
  roomName,
  ingestProtocol,
  providerStreamId,
  publisherIdentity,
  playbackHint,
  state,
}: {
  id: string;
  liveSessionEventId: number;
  provider: string;
  roomName: string;
  ingestProtocol: string;
  providerStreamId?: string | null;
  publisherIdentity?: string | null;
  playbackHint?: string | null;
  state: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  db.prepare(`
    INSERT INTO live_media_streams (
      id,
      live_session_event_id,
      provider,
      room_name,
      ingest_protocol,
      provider_stream_id,
      publisher_identity,
      playback_hint,
      state,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET
      live_session_event_id = excluded.live_session_event_id,
      provider = excluded.provider,
      room_name = excluded.room_name,
      ingest_protocol = excluded.ingest_protocol,
      provider_stream_id = excluded.provider_stream_id,
      publisher_identity = excluded.publisher_identity,
      playback_hint = excluded.playback_hint,
      state = excluded.state,
      updated_at = excluded.updated_at
  `).run(
    id,
    liveSessionEventId,
    provider,
    roomName,
    ingestProtocol,
    providerStreamId ?? null,
    publisherIdentity ?? null,
    playbackHint ?? null,
    state,
    now,
    now,
  );

  const row = db
    .prepare(`
      SELECT
        id,
        live_session_event_id,
        provider,
        room_name,
        ingest_protocol,
        provider_stream_id,
        publisher_identity,
        playback_hint,
        state,
        created_at,
        updated_at
      FROM live_media_streams
      WHERE id = ?
    `)
    .get(id);

  return asStoredLiveMediaStreamRow(row);
}

export function listLiveMediaStreamRowsForSession(eventId: number) {
  const db = ensureDatabase();
  const rows = db
    .prepare(`
      SELECT
        id,
        live_session_event_id,
        provider,
        room_name,
        ingest_protocol,
        provider_stream_id,
        publisher_identity,
        playback_hint,
        state,
        created_at,
        updated_at
      FROM live_media_streams
      WHERE live_session_event_id = ?
      ORDER BY updated_at DESC, created_at DESC
    `)
    .all(eventId);

  return rows
    .map((row) => asStoredLiveMediaStreamRow(row))
    .filter((row): row is StoredLiveMediaStreamRow => row !== null);
}

export function insertLiveBidEventRow({
  liveSessionEventId,
  lotId,
  bidderUserId,
  amount,
  maxProxyAmount,
  status,
}: {
  liveSessionEventId: number;
  lotId: string;
  bidderUserId: string;
  amount: number;
  maxProxyAmount?: number | null;
  status: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  const result = db
    .prepare(`
      INSERT INTO live_bid_events (
        live_session_event_id,
        lot_id,
        bidder_user_id,
        amount,
        max_proxy_amount,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      liveSessionEventId,
      lotId,
      bidderUserId,
      amount,
      maxProxyAmount ?? null,
      status,
      now,
    ) as { lastInsertRowid?: number | bigint };

  const row = db
    .prepare(`
      SELECT
        id,
        live_session_event_id,
        lot_id,
        bidder_user_id,
        amount,
        max_proxy_amount,
        status,
        created_at
      FROM live_bid_events
      WHERE id = ?
    `)
    .get(Number(result.lastInsertRowid ?? 0));

  return asStoredLiveBidEventRow(row);
}

export function listLiveBidEventRows({
  liveSessionEventId,
  lotId,
  limit,
}: {
  liveSessionEventId: number;
  lotId?: string;
  limit?: number;
}) {
  const db = ensureDatabase();
  const normalizedLimit = limit ? Math.max(1, Math.min(500, Math.trunc(limit))) : 100;
  let query = `
    SELECT
      id,
      live_session_event_id,
      lot_id,
      bidder_user_id,
      amount,
      max_proxy_amount,
      status,
      created_at
    FROM live_bid_events
    WHERE live_session_event_id = ?
  `;
  const params: Array<string | number> = [liveSessionEventId];

  if (lotId) {
    query += " AND lot_id = ?";
    params.push(lotId);
  }

  query += " ORDER BY created_at DESC, id DESC LIMIT ?";
  params.push(normalizedLimit);

  const rows = db.prepare(query).all(...params);
  return rows
    .map((row) => asStoredLiveBidEventRow(row))
    .filter((row): row is StoredLiveBidEventRow => row !== null);
}

export function listLiveScheduleRows({
  ownerUserId,
  liveSlug,
  limit,
}: {
  ownerUserId?: string;
  liveSlug?: string;
  limit?: number;
}) {
  const db = ensureDatabase();
  const normalizedLimit = limit ? Math.max(1, Math.min(500, Math.trunc(limit))) : null;
  let query = `
    SELECT
      id,
      owner_user_id,
      live_state,
      live_slug,
      payload_json,
      created_at,
      updated_at
    FROM live_schedule_entries
    WHERE 1 = 1
  `;
  const params: Array<string | number> = [];

  if (ownerUserId) {
    query += " AND owner_user_id = ?";
    params.push(ownerUserId);
  }

  if (liveSlug) {
    query += " AND live_slug = ?";
    params.push(liveSlug);
  }

  query += " ORDER BY updated_at DESC, created_at DESC";

  if (normalizedLimit) {
    query += " LIMIT ?";
    params.push(normalizedLimit);
  }

  const rows = db.prepare(query).all(...params);
  return rows.map((row) => asStoredLiveScheduleRow(row)).filter((row): row is StoredLiveScheduleRow => row !== null);
}

export function replaceLiveScheduleRowsForOwner({
  ownerUserId,
  schedule,
}: {
  ownerUserId: string;
  schedule: Array<{
    id: string;
    liveState: string;
    liveSlug: string | null;
    payloadJson: string;
    createdAt?: number;
  }>;
}) {
  const db = ensureDatabase();
  const now = Date.now();

  db.exec("BEGIN IMMEDIATE");

  try {
    db.prepare("DELETE FROM live_schedule_entries WHERE owner_user_id = ?").run(ownerUserId);

    const insertStatement = db.prepare(`
      INSERT INTO live_schedule_entries (
        id,
        owner_user_id,
        live_state,
        live_slug,
        payload_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of schedule) {
      insertStatement.run(
        item.id,
        ownerUserId,
        item.liveState,
        item.liveSlug ?? null,
        item.payloadJson,
        item.createdAt ?? now,
        now,
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return listLiveScheduleRows({ ownerUserId });
}

export function getConversationRowById(conversationId: number) {
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        participant_a_user_id,
        participant_b_user_id,
        created_at,
        updated_at
      FROM conversations
      WHERE id = ?
    `)
    .get(conversationId);
  return asStoredConversationRow(row);
}

export function findConversationBetweenUsers(userA: string, userB: string) {
  const [participantA, participantB] = [userA, userB].sort((left, right) => left.localeCompare(right));
  const db = ensureDatabase();
  const row = db
    .prepare(`
      SELECT
        id,
        participant_a_user_id,
        participant_b_user_id,
        created_at,
        updated_at
      FROM conversations
      WHERE participant_a_user_id = ? AND participant_b_user_id = ?
    `)
    .get(participantA, participantB);
  return asStoredConversationRow(row);
}

export function listConversationRowsForUser(userId: string) {
  const db = ensureDatabase();
  const rows = db
    .prepare(`
      SELECT
        id,
        participant_a_user_id,
        participant_b_user_id,
        created_at,
        updated_at
      FROM conversations
      WHERE participant_a_user_id = ? OR participant_b_user_id = ?
      ORDER BY updated_at DESC, id DESC
    `)
    .all(userId, userId);

  return rows.map((row) => asStoredConversationRow(row)).filter((row): row is StoredConversationRow => row !== null);
}

export function createConversationRow({
  participantAUserId,
  participantBUserId,
}: {
  participantAUserId: string;
  participantBUserId: string;
}) {
  const [participantA, participantB] = [participantAUserId, participantBUserId].sort((left, right) => left.localeCompare(right));
  const existingConversation = findConversationBetweenUsers(participantA, participantB);
  if (existingConversation) {
    return existingConversation;
  }

  const db = ensureDatabase();
  const now = Date.now();
  const result = db
    .prepare(`
      INSERT INTO conversations (
        participant_a_user_id,
        participant_b_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?)
    `)
    .run(participantA, participantB, now, now) as { lastInsertRowid?: number | bigint };

  return getConversationRowById(Number(result.lastInsertRowid ?? 0));
}

export function listMessageRowsByConversationId({
  conversationId,
  limit = 200,
}: {
  conversationId: number;
  limit?: number;
}) {
  const db = ensureDatabase();
  const normalizedLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
  const rows = db
    .prepare(`
      SELECT
        id,
        conversation_id,
        sender_user_id,
        body,
        created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC, id ASC
      LIMIT ?
    `)
    .all(conversationId, normalizedLimit);

  return rows.map((row) => asStoredMessageRow(row)).filter((row): row is StoredMessageRow => row !== null);
}

export function createMessageRow({
  conversationId,
  senderUserId,
  body,
}: {
  conversationId: number;
  senderUserId: string;
  body: string;
}) {
  const db = ensureDatabase();
  const now = Date.now();
  const result = db
    .prepare(`
      INSERT INTO messages (
        conversation_id,
        sender_user_id,
        body,
        created_at
      )
      VALUES (?, ?, ?, ?)
    `)
    .run(conversationId, senderUserId, body, now) as { lastInsertRowid?: number | bigint };

  db.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `).run(now, conversationId);

  return listMessageRowsByConversationId({ conversationId }).find((message) => message.id === Number(result.lastInsertRowid ?? 0)) ?? null;
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
