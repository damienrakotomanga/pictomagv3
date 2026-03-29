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
  `);

  ensureRuntimeStateSchema(db);

  database = db;
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
