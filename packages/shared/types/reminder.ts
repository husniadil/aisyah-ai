import { z } from "zod";

export const inputSchema = z.object({
  chatId: z.string().describe("The chatId in chat platform, e.g. 1234567890"),
  title: z
    .string()
    .describe("The title of the reminder, e.g. Prepare for the new year party"),
  date: z.string().describe("The date of the reminder, e.g. 2024-12-31"),
  time: z.string().describe("The time of the reminder, e.g. 21:00"),
  timeZone: z
    .string()
    .optional()
    .default("Asia/Jakarta")
    .describe("The time zone of the reminder, e.g. Asia/Jakarta"),
});

export const outputSchema = z
  .string()
  .describe("The success message of the reminder.");

export interface IReminder {
  remind(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
