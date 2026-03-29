import { randomUUID } from "node:crypto";
import { createClient } from "redis";
import { WebSocketServer, type WebSocket } from "ws";
import { verifyLiveShoppingWsTicket } from "@/lib/server/live-shopping-ws-auth";

export type LiveShoppingRealtimeEvent = {
  type: "live.sync" | "inventory.updated" | "orders.updated" | "system.heartbeat";
  userId: string;
  eventId?: number;
  actorUserId?: string;
  occurredAt: number;
  payload?: Record<string, unknown>;
};

type LiveShoppingRealtimeListener = (event: LiveShoppingRealtimeEvent) => void;
type LiveShoppingWsClient = {
  socket: WebSocket;
  userId: string;
  eventId: number | null;
  isAlive: boolean;
  presenceCleanup: () => void;
};
type LiveShoppingPresenceTransport = "ws" | "sse";
type LiveShoppingPresenceConnection = {
  id: string;
  userId: string;
  eventId: number | null;
  transport: LiveShoppingPresenceTransport;
  connectedAt: number;
};
type LiveShoppingRedisEnvelope = {
  instanceId: string;
  publishedAt: number;
  event: LiveShoppingRealtimeEvent;
};
type LiveShoppingRedisClient = ReturnType<typeof createClient>;
export type LiveShoppingPresenceSnapshot = {
  eventId: number | null;
  totalConnections: number;
  totalUsers: number;
  users: Array<{
    userId: string;
    connections: number;
  }>;
  updatedAt: number;
};

const listeners = new Map<string, LiveShoppingRealtimeListener>();
const wsClients = new Set<LiveShoppingWsClient>();
const presenceConnections = new Map<string, LiveShoppingPresenceConnection>();
const presenceByEventId = new Map<number, Map<string, number>>();
const WS_DEFAULT_PORT = 3011;
const WS_HOST = "127.0.0.1";
const WS_PROTOCOL_VERSION = 1;
const REDIS_CHANNEL = "pictomag:live:events:v1";
const REDIS_BRIDGE_INSTANCE_ID = randomUUID();

let wsServer: WebSocketServer | null = null;
let wsServerInitAttempted = false;
let wsServerDisabledReason: string | null = null;
let wsHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
let redisPublisher: LiveShoppingRedisClient | null = null;
let redisInitPromise: Promise<void> | null = null;
let redisReady = false;
let redisDisabledReason: string | null = null;

function parseLiveEventId(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function resolveWebSocketPort() {
  const parsed = Number.parseInt(process.env.PICTOMAG_LIVE_WS_PORT ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return WS_DEFAULT_PORT;
}

function resolveRedisUrl() {
  const value = process.env.PICTOMAG_LIVE_REDIS_URL ?? process.env.REDIS_URL ?? "";
  return value.trim().length > 0 ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clonePresenceMap(source: Map<string, number>) {
  return new Map<string, number>(source.entries());
}

function buildPresenceSnapshot(eventId: number | null): LiveShoppingPresenceSnapshot {
  const now = Date.now();

  if (eventId !== null) {
    const eventMap = presenceByEventId.get(eventId) ?? new Map<string, number>();
    const users = Array.from(eventMap.entries())
      .map(([userId, connections]) => ({ userId, connections }))
      .sort((left, right) => right.connections - left.connections || left.userId.localeCompare(right.userId));
    const totalConnections = users.reduce((sum, entry) => sum + entry.connections, 0);

    return {
      eventId,
      totalConnections,
      totalUsers: users.length,
      users,
      updatedAt: now,
    };
  }

  const aggregated = new Map<string, number>();
  for (const eventMap of presenceByEventId.values()) {
    for (const [userId, connections] of eventMap.entries()) {
      aggregated.set(userId, (aggregated.get(userId) ?? 0) + connections);
    }
  }

  const users = Array.from(aggregated.entries())
    .map(([userId, connections]) => ({ userId, connections }))
    .sort((left, right) => right.connections - left.connections || left.userId.localeCompare(right.userId));
  const totalConnections = users.reduce((sum, entry) => sum + entry.connections, 0);

  return {
    eventId: null,
    totalConnections,
    totalUsers: users.length,
    users,
    updatedAt: now,
  };
}

function updatePresenceForConnection(
  connection: LiveShoppingPresenceConnection,
  delta: 1 | -1,
) {
  if (connection.eventId === null) {
    return;
  }

  const currentMap = presenceByEventId.get(connection.eventId) ?? new Map<string, number>();
  const nextMap = clonePresenceMap(currentMap);
  const currentCount = nextMap.get(connection.userId) ?? 0;
  const nextCount = currentCount + delta;

  if (nextCount <= 0) {
    nextMap.delete(connection.userId);
  } else {
    nextMap.set(connection.userId, nextCount);
  }

  if (nextMap.size === 0) {
    presenceByEventId.delete(connection.eventId);
  } else {
    presenceByEventId.set(connection.eventId, nextMap);
  }
}

function emitPresenceSync(eventId: number | null) {
  if (eventId === null) {
    return;
  }

  publishLiveShoppingEvent({
    type: "live.sync",
    userId: "__global__",
    eventId,
    payload: {
      action: "presence",
      presence: buildPresenceSnapshot(eventId),
    },
  });
}

export function registerLiveShoppingPresence({
  userId,
  eventId,
  transport,
}: {
  userId: string;
  eventId: number | null;
  transport: LiveShoppingPresenceTransport;
}) {
  const id = randomUUID();
  const connection: LiveShoppingPresenceConnection = {
    id,
    userId,
    eventId,
    transport,
    connectedAt: Date.now(),
  };

  presenceConnections.set(id, connection);
  updatePresenceForConnection(connection, 1);
  emitPresenceSync(eventId);

  let disposed = false;
  return () => {
    if (disposed) {
      return;
    }

    disposed = true;
    const current = presenceConnections.get(id);
    if (!current) {
      return;
    }

    presenceConnections.delete(id);
    updatePresenceForConnection(current, -1);
    emitPresenceSync(current.eventId);
  };
}

export function getLiveShoppingPresenceSnapshot(eventId: number | null) {
  return buildPresenceSnapshot(eventId);
}

function canDeliverEventToClient(client: LiveShoppingWsClient, event: LiveShoppingRealtimeEvent) {
  const isGlobalEvent = event.userId === "__global__";

  if (!isGlobalEvent && client.userId !== event.userId) {
    return false;
  }

  if (client.eventId !== null && event.eventId !== undefined && event.eventId !== client.eventId) {
    return false;
  }

  if (client.eventId === null && isGlobalEvent && typeof event.eventId === "number") {
    return false;
  }

  return true;
}

function pushEventToWsClients(event: LiveShoppingRealtimeEvent) {
  const serialized = JSON.stringify(event);

  for (const client of wsClients) {
    if (client.socket.readyState !== client.socket.OPEN) {
      continue;
    }

    if (!canDeliverEventToClient(client, event)) {
      continue;
    }

    try {
      client.socket.send(serialized);
    } catch {
      // Ignore send errors; connection cleanup happens on close/error.
    }
  }
}

function dispatchEventLocally(event: LiveShoppingRealtimeEvent) {
  pushEventToWsClients(event);

  for (const listener of listeners.values()) {
    listener(event);
  }
}

function publishEventToRedis(event: LiveShoppingRealtimeEvent) {
  if (!redisReady || !redisPublisher) {
    return;
  }

  const envelope: LiveShoppingRedisEnvelope = {
    instanceId: REDIS_BRIDGE_INSTANCE_ID,
    publishedAt: Date.now(),
    event,
  };

  void redisPublisher.publish(REDIS_CHANNEL, JSON.stringify(envelope)).catch((error: unknown) => {
    redisDisabledReason = error instanceof Error ? error.message : "Redis publish error.";
    redisReady = false;
  });
}

function handleRedisMessage(rawValue: string) {
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!isRecord(parsed)) {
      return;
    }

    const instanceId = typeof parsed.instanceId === "string" ? parsed.instanceId : null;
    if (!instanceId || instanceId === REDIS_BRIDGE_INSTANCE_ID) {
      return;
    }

    if (!isRecord(parsed.event)) {
      return;
    }

    const event = parsed.event as LiveShoppingRealtimeEvent;
    if (typeof event.type !== "string" || typeof event.userId !== "string" || typeof event.occurredAt !== "number") {
      return;
    }

    dispatchEventLocally(event);
  } catch {
    // Ignore malformed bridge payload.
  }
}

async function initializeRedisBridge() {
  const url = resolveRedisUrl();
  if (!url) {
    redisDisabledReason = "PICTOMAG_LIVE_REDIS_URL non configure.";
    return;
  }

  const publisher = createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => Math.min(3000, retries * 200),
    },
  });
  const subscriber = publisher.duplicate();

  publisher.on("error", (error) => {
    redisDisabledReason = error.message;
  });
  subscriber.on("error", (error) => {
    redisDisabledReason = error.message;
  });

  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
    await subscriber.subscribe(REDIS_CHANNEL, handleRedisMessage);
    redisPublisher = publisher;
    redisReady = true;
    redisDisabledReason = null;
  } catch (error) {
    redisReady = false;
    redisDisabledReason = error instanceof Error ? error.message : "Redis bridge init failed.";
    try {
      await publisher.quit();
    } catch {
      // ignore shutdown errors
    }
    try {
      await subscriber.quit();
    } catch {
      // ignore shutdown errors
    }
  }
}

function ensureRedisBridge() {
  if (redisInitPromise) {
    return;
  }

  redisInitPromise = initializeRedisBridge();
}

export async function waitForLiveShoppingRedisBridge(timeoutMs = 1_500) {
  ensureRedisBridge();

  if (!redisInitPromise) {
    return;
  }

  await Promise.race([
    redisInitPromise,
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

function removeWsClient(client: LiveShoppingWsClient) {
  client.presenceCleanup();
  wsClients.delete(client);
}

function registerWebSocketConnection(socket: WebSocket, request: import("node:http").IncomingMessage) {
  const baseUrl = new URL(`http://${request.headers.host ?? `${WS_HOST}:${resolveWebSocketPort()}`}`);
  const requestUrl = new URL(request.url ?? "/", baseUrl);
  const ticket = requestUrl.searchParams.get("ticket");
  const requestedEventId = parseLiveEventId(requestUrl.searchParams.get("eventId"));
  const ticketPayload = verifyLiveShoppingWsTicket(ticket);

  if (!ticketPayload) {
    socket.close(4401, "unauthorized");
    return;
  }

  if (requestedEventId !== null && ticketPayload.eventId !== requestedEventId) {
    socket.close(4403, "forbidden");
    return;
  }

  const eventId = requestedEventId ?? ticketPayload.eventId ?? null;
  const userId = ticketPayload.sub;
  const presenceCleanup = registerLiveShoppingPresence({
    userId,
    eventId,
    transport: "ws",
  });
  const client: LiveShoppingWsClient = {
    socket,
    userId,
    eventId,
    isAlive: true,
    presenceCleanup,
  };

  wsClients.add(client);

  socket.send(
    JSON.stringify({
      type: "system.heartbeat",
      userId,
      eventId: eventId ?? undefined,
      occurredAt: Date.now(),
      payload: {
        connected: true,
        transport: "websocket",
        protocolVersion: WS_PROTOCOL_VERSION,
      },
    } satisfies LiveShoppingRealtimeEvent),
  );

  socket.on("pong", () => {
    client.isAlive = true;
  });

  socket.on("close", () => {
    removeWsClient(client);
  });

  socket.on("error", () => {
    removeWsClient(client);
  });
}

function startWsHeartbeat() {
  if (wsHeartbeatTimer) {
    return;
  }

  wsHeartbeatTimer = setInterval(() => {
    for (const client of wsClients) {
      if (client.socket.readyState !== client.socket.OPEN) {
        removeWsClient(client);
        continue;
      }

      if (!client.isAlive) {
        try {
          client.socket.terminate();
        } catch {
          // ignore terminate failures
        }
        removeWsClient(client);
        continue;
      }

      client.isAlive = false;
      try {
        client.socket.ping();
      } catch {
        removeWsClient(client);
      }
    }
  }, 25_000);

  wsHeartbeatTimer.unref?.();
}

export function ensureLiveShoppingWsServer() {
  ensureRedisBridge();

  if (wsServer) {
    return {
      enabled: true as const,
      host: WS_HOST,
      port: resolveWebSocketPort(),
      protocolVersion: WS_PROTOCOL_VERSION,
      disabledReason: null,
    };
  }

  if (wsServerInitAttempted) {
    return {
      enabled: false as const,
      host: WS_HOST,
      port: resolveWebSocketPort(),
      protocolVersion: WS_PROTOCOL_VERSION,
      disabledReason: wsServerDisabledReason ?? "WebSocket indisponible.",
    };
  }

  wsServerInitAttempted = true;
  const port = resolveWebSocketPort();

  try {
    const server = new WebSocketServer({
      host: WS_HOST,
      port,
      path: "/live-shopping/ws",
      maxPayload: 64 * 1024,
      perMessageDeflate: false,
    });

    server.on("connection", (socket, request) => {
      registerWebSocketConnection(socket, request);
    });

    server.on("error", (error) => {
      wsServerDisabledReason = error.message;
    });

    wsServer = server;
    wsServerDisabledReason = null;
    startWsHeartbeat();

    return {
      enabled: true as const,
      host: WS_HOST,
      port,
      protocolVersion: WS_PROTOCOL_VERSION,
      disabledReason: null,
    };
  } catch (error) {
    wsServer = null;
    wsServerDisabledReason =
      error instanceof Error ? error.message : "WebSocket indisponible.";

    return {
      enabled: false as const,
      host: WS_HOST,
      port,
      protocolVersion: WS_PROTOCOL_VERSION,
      disabledReason: wsServerDisabledReason,
    };
  }
}

export function publishLiveShoppingEvent(event: Omit<LiveShoppingRealtimeEvent, "occurredAt">) {
  ensureRedisBridge();

  const enrichedEvent: LiveShoppingRealtimeEvent = {
    ...event,
    occurredAt: Date.now(),
  };

  dispatchEventLocally(enrichedEvent);
  publishEventToRedis(enrichedEvent);
}

export function subscribeLiveShoppingEvents(listener: LiveShoppingRealtimeListener) {
  ensureRedisBridge();

  const id = randomUUID();
  listeners.set(id, listener);

  return () => {
    listeners.delete(id);
  };
}

export function getLiveShoppingRealtimeStatus() {
  return {
    ws: {
      enabled: !!wsServer,
      host: WS_HOST,
      port: resolveWebSocketPort(),
      protocolVersion: WS_PROTOCOL_VERSION,
      disabledReason: wsServerDisabledReason,
    },
    bridge: {
      redisConfigured: !!resolveRedisUrl(),
      redisEnabled: redisReady,
      channel: REDIS_CHANNEL,
      disabledReason: redisDisabledReason,
    },
    presence: {
      global: buildPresenceSnapshot(null),
    },
  };
}

export function formatSseEvent(event: LiveShoppingRealtimeEvent) {
  const lines = [`event: ${event.type}`, `data: ${JSON.stringify(event)}`];
  return `${lines.join("\n")}\n\n`;
}
