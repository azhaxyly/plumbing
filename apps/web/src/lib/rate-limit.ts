import Redis from "ioredis";
import { headers } from "next/headers";

// Lua sliding-window rate limiter.
// Atomically removes expired entries, checks count, and conditionally adds new entry.
const LUA_SLIDING_WINDOW = `
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])
local id     = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, now, id)
  redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
  return {1, 0}
end

local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
if oldest[2] then
  return {0, math.ceil((tonumber(oldest[2]) + window - now) / 1000)}
end
return {0, math.ceil(window / 1000)}
`;

export interface RateLimitConfig {
  keyPrefix: string;
  points: number;   // max requests allowed
  duration: number; // window in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds until the window resets
}

async function getRedis() {
  return new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  let redis: Redis | null = null;
  try {
    redis = await getRedis();
    const key = `${config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowMs = config.duration * 1000;
    const id = `${now}-${Math.random().toString(36).slice(2)}`;

    const result = (await redis.eval(
      LUA_SLIDING_WINDOW,
      1,
      key,
      String(now),
      String(windowMs),
      String(config.points),
      id,
    )) as [number, number];

    return result[0] === 1
      ? { allowed: true }
      : { allowed: false, retryAfter: result[1] ?? config.duration };
  } catch {
    // Redis unavailable — fail open so legit requests still go through
    return { allowed: true };
  } finally {
    await redis?.quit().catch(() => {});
  }
}

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const xff = headersList.get("x-forwarded-for");
  return xff
    ? xff.split(",")[0]!.trim()
    : (headersList.get("x-real-ip") ?? "127.0.0.1");
}
