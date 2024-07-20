import { z } from "zod";

export const inputSchema = z.object({
  key: z.string().describe("The key to check the rate limit."),
});

export const outputSchema = z
  .boolean()
  .describe("Whether the key is rate limited.");

export interface IRateLimit {
  isRateLimited(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
