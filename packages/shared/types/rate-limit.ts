import { z } from "zod";

export const keyInputSchema = z.string().describe("The key to check.");

export const outputSchema = z
  .boolean()
  .describe("Whether the key is rate limited.");

export interface IRateLimit {
  isRateLimited(
    key: z.infer<typeof keyInputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
