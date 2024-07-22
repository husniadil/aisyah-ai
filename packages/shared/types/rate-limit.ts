import { z } from "zod";

export const IsRateLimitKeyInput = z.string().describe("The key to check.");

export const IsRateLimitOutput = z
  .boolean()
  .describe("Whether the key is rate limited.");

export type IsRateLimitKeyInput = z.infer<typeof IsRateLimitKeyInput>;
export type IsRateLimitOutput = z.infer<typeof IsRateLimitOutput>;

export interface IRateLimit {
  isRateLimited(key: IsRateLimitKeyInput): Promise<IsRateLimitOutput>;
}
