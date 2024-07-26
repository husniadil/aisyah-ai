import { Redis } from "@upstash/redis/cloudflare";
import {
  type ChatHistoryKeyInput,
  ChatHistoryList,
  type IChatHistory,
} from "./types/chat-history";

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
    this.redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    this.limit = env.CHAT_HISTORY_LIMIT < 2 ? 2 : env.CHAT_HISTORY_LIMIT;
  }

  async append(
    key: ChatHistoryKeyInput,
    ...messages: ChatHistoryList
  ): Promise<ChatHistoryList> {
    const fullKey = this.getFullKey(key);
    try {
      const data = await this.get(key);
      data.push(...messages);
      const truncatedData = data.slice(-this.limit);
      await this.redis.set(fullKey, JSON.stringify(truncatedData));
      return truncatedData;
    } catch (error) {
      console.log("UpstashRedisChatHistory ~ error:", key, error);
    }
    return ChatHistoryList.parse(messages);
  }

  async get(key: ChatHistoryKeyInput): Promise<ChatHistoryList> {
    const fullKey = this.getFullKey(key);
    try {
      return (await this.redis.get<ChatHistoryList>(fullKey)) || [];
    } catch (error) {
      console.log("UpstashRedisChatHistory ~ get ~ error:", key, error);
      return [];
    }
  }

  async clear(key: ChatHistoryKeyInput): Promise<ChatHistoryList> {
    const fullKey = this.getFullKey(key);
    try {
      await this.redis.del(fullKey);
    } catch (error) {
      console.log("UpstashRedisChatHistory ~ clear ~ error:", key, error);
    }
    return [];
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }
}
