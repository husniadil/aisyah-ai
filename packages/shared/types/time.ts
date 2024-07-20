import { z } from "zod";

export const inputSchema = z.object({
  timeZone: z
    .string()
    .optional()
    .default("Asia/Jakarta")
    .describe("The time zone to get the current time, e.g. Asia/Jakarta"),
});

export const outputSchema = z.string().describe("The current date and time.");

export interface ITime {
  getCurrentDateTime(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
