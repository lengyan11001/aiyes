import Redis from "ioredis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  env.REDIS_URL
    ? globalForRedis.redis ??
      new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      })
    : null;

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}
