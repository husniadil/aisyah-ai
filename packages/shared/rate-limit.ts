import type {
  IRateLimit,
  keyInputSchema,
  outputSchema,
} from "@packages/shared/types/rate-limit";
import { Redis } from "@upstash/redis/cloudflare";
import type { z } from "zod";

interface Env {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

export class UpstashRedisRateLimit implements IRateLimit {
  private readonly redis: Redis;
  private readonly keyPrefix = "rate_limit";
  private readonly limit: number;

  constructor(env: Env, limit = 100) {
    if (limit <= 0) {
      throw new Error("Limit must be a positive integer");
    }
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    this.limit = limit;
  }

  async isRateLimited(
    key: z.infer<typeof keyInputSchema>,
  ): Promise<z.infer<typeof outputSchema>> {
    const fullKey = this.getFullKey(key);
    try {
      const value = await this.redis.get<number>(fullKey);
      if (value) {
        return await this.handleExistingKey(fullKey, value);
      }
    } catch (error) {
      console.warn(`Error checking rate limit for ${key}:`, error);
      return false;
    }
    await this.initializeKey(fullKey);
    return false;
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private async handleExistingKey(
    fullKey: string,
    count: number,
  ): Promise<boolean> {
    if (count >= this.limit) {
      return true;
    }
    await this.redis.incr(fullKey);
    return false;
  }

  private async initializeKey(fullKey: string): Promise<void> {
    const now = new Date();
    const endOfDay = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
      ),
    );
    const secondsUntilEndOfDay = Math.floor(
      (endOfDay.getTime() - now.getTime()) / 1000,
    );
    await this.redis
      .multi()
      .incr(fullKey)
      .expire(fullKey, secondsUntilEndOfDay)
      .exec();
  }
}
