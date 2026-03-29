type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();
let requestCounter = 0;

export type LiveShoppingRateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

function cleanupStaleBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function consumeLiveShoppingRateLimit({
  scope,
  userId,
  eventId,
  limit,
  windowMs,
}: {
  scope: string;
  userId: string;
  eventId?: number;
  limit: number;
  windowMs: number;
}): LiveShoppingRateLimitResult {
  const now = Date.now();
  requestCounter += 1;
  if (requestCounter % 200 === 0) {
    cleanupStaleBuckets(now);
  }

  const key = `${scope}:${userId}:${eventId ?? "global"}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const nextBucket: RateLimitBucket = {
      count: 1,
      resetAt: now + windowMs,
    };
    buckets.set(key, nextBucket);
    return {
      ok: true,
      remaining: Math.max(0, limit - nextBucket.count),
      retryAfterMs: 0,
    };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  buckets.set(key, current);
  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterMs: 0,
  };
}

