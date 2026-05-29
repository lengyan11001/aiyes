import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "./redis";

const points = 60;
const duration = 60;

const limiter = redis
  ? new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: "aiyes_rl",
      points,
      duration,
    })
  : new RateLimiterMemory({ points, duration });

export async function consumeRateLimit(key: string, cost = 1) {
  try {
    await limiter.consume(key, cost);
    return { ok: true as const };
  } catch (error) {
    const retryAfter =
      typeof error === "object" && error && "msBeforeNext" in error
        ? Math.ceil(Number((error as { msBeforeNext: number }).msBeforeNext) / 1000)
        : duration;
    return { ok: false as const, retryAfter };
  }
}
