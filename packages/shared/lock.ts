import { Redis } from "@upstash/redis/cloudflare";
import type { ILock } from "./types/lock.ts";

interface Env {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}

export class UpstashRedisLock implements ILock {
  private readonly redis: Redis;
  private readonly lockKeyPrefix = "lock";
  private readonly lockTTL: number;

  constructor(env: Env, lockTTL = 5) {
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    this.lockTTL = lockTTL;
  }

  async acquire(lockKey: string): Promise<boolean> {
    const fullKey = this.getFullKey(lockKey);
    while (true) {
      const acquired = await this.redis.set(fullKey, "locked", {
        nx: true,
        px: this.lockTTL,
      });
      if (acquired) return true;
      await this.delay(100); // Retry after 100ms
    }
  }

  async release(lockKey: string): Promise<void> {
    const fullKey = this.getFullKey(lockKey);
    await this.redis.del(fullKey);
  }

  private getFullKey(lockKey: string): string {
    return `${this.lockKeyPrefix}:${lockKey}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
