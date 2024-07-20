import type {
  ChatHistory,
  IChatHistory,
} from "@packages/shared/types/chat-history";
import { Redis } from "@upstash/redis/cloudflare";
import { z } from "zod";

interface Env {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  CHAT_HISTORY_LIMIT: number;
}

export class UpstashRedisChatHistory implements IChatHistory {
  private readonly redis: Redis;
  private readonly keyPrefix = "chat_history";
  private readonly limit: number;

  constructor(env: Env) {
    if (env.CHAT_HISTORY_LIMIT <= 0) {
      throw new Error("Limit must be a positive integer");
    }
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    this.limit = env.CHAT_HISTORY_LIMIT;
  }

  public async append(key: string, ...messages: ChatHistory): Promise<void> {
    const fullKey = this.getFullKey(key);
    try {
      const data = await this.get(key);
      data.push(...messages);
      await this.redis.set(fullKey, JSON.stringify(data.slice(-this.limit)));
    } catch (error) {
      console.warn(`Error appending messages to ${key}:`, error);
    }
  }

  public async get(key: string): Promise<ChatHistory> {
    const fullKey = this.getFullKey(key);
    try {
      return (await this.redis.get<ChatHistory>(fullKey)) || [];
    } catch (error) {
      console.warn(`Error getting messages from ${key}:`, error);
      return [];
    }
  }

  public async clear(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      console.warn(`Error clearing messages from ${key}:`, error);
    }
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }
}
