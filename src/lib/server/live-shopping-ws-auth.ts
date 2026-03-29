import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizePreferenceUserId } from "@/lib/server/preferences-store";
import { normalizeAuthRole, type AuthRole } from "@/lib/server/auth-user";

const WS_TICKET_VERSION = "ws-v1";
const WS_TICKET_DEFAULT_TTL_SECONDS = 90;

export type LiveShoppingWsTicketPayload = {
  version: typeof WS_TICKET_VERSION;
  sub: string;
  role: AuthRole;
  eventId: number | null;
  iat: number;
  exp: number;
};

function getWsTicketSecret() {
  return (
    process.env.PICTOMAG_LIVE_WS_SECRET ??
    process.env.PICTOMAG_AUTH_SECRET ??
    "pictomag-live-ws-dev-secret-change-me"
  );
}

function resolveWsTicketTtlSeconds() {
  const parsed = Number.parseInt(process.env.PICTOMAG_LIVE_WS_TTL_SECONDS ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0 && parsed <= 3600) {
    return parsed;
  }

  return WS_TICKET_DEFAULT_TTL_SECONDS;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signTicketPayload(encodedPayload: string) {
  return createHmac("sha256", getWsTicketSecret()).update(encodedPayload).digest("base64url");
}

export function createLiveShoppingWsTicket({
  userId,
  role,
  eventId,
}: {
  userId: string;
  role: AuthRole;
  eventId: number | null;
}) {
  const nowSeconds = Math.trunc(Date.now() / 1000);
  const payload: LiveShoppingWsTicketPayload = {
    version: WS_TICKET_VERSION,
    sub: normalizePreferenceUserId(userId),
    role: normalizeAuthRole(role),
    eventId: typeof eventId === "number" && Number.isFinite(eventId) && eventId > 0 ? Math.trunc(eventId) : null,
    iat: nowSeconds,
    exp: nowSeconds + resolveWsTicketTtlSeconds(),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signTicketPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyLiveShoppingWsTicket(ticket: string | null | undefined): LiveShoppingWsTicketPayload | null {
  if (!ticket || typeof ticket !== "string") {
    return null;
  }

  const [encodedPayload, signature] = ticket.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signTicketPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  try {
    const rawPayload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<LiveShoppingWsTicketPayload>;

    if (
      rawPayload.version !== WS_TICKET_VERSION ||
      typeof rawPayload.sub !== "string" ||
      typeof rawPayload.role !== "string" ||
      typeof rawPayload.iat !== "number" ||
      typeof rawPayload.exp !== "number"
    ) {
      return null;
    }

    const eventId =
      typeof rawPayload.eventId === "number" && Number.isFinite(rawPayload.eventId) && rawPayload.eventId > 0
        ? Math.trunc(rawPayload.eventId)
        : null;

    const nowSeconds = Math.trunc(Date.now() / 1000);
    if (rawPayload.exp <= nowSeconds) {
      return null;
    }

    return {
      version: WS_TICKET_VERSION,
      sub: normalizePreferenceUserId(rawPayload.sub),
      role: normalizeAuthRole(rawPayload.role),
      eventId,
      iat: rawPayload.iat,
      exp: rawPayload.exp,
    };
  } catch {
    return null;
  }
}

