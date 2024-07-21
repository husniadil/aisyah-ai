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

export const outputSchema = z.object({
  id: z.string().describe("The ID of the reminder, e.g. 1"),
  user_id: z.string().describe("The user ID of the reminder, e.g. 1"),
  name: z.string().describe("The name of the reminder, e.g. My Application"),
  default_reminder_time_tz: z
    .string()
    .describe("The default reminder time of the reminder, e.g. 09:00:00"),
  webhook_url: z
    .string()
    .url()
    .describe(
      "The webhook URL of the reminder, e.g. https://your-site-2.com/callback",
    ),
  created_at: z
    .string()
    .describe("The created date of the reminder, e.g. 2020-12-17 03:23:26"),
  updated_at: z
    .string()
    .describe("The updated date of the reminder, e.g. 2020-12-17 03:23:26"),
});

export interface IReminder {
  remind(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
