import { z } from "zod";

export const RemindInput = z.object({
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

export const RemindOutput = z.object({
  id: z.number().int().describe("The ID of the reminder, e.g. 1"),
  user_id: z.number().int().describe("The user ID of the reminder, e.g. 1"),
  application_id: z
    .number()
    .int()
    .describe("The application ID of the reminder, e.g. 1"),
  title: z
    .string()
    .describe("The title of the reminder, e.g. Prepare for the new year party"),
  notes: z
    .string()
    .optional()
    .nullish()
    .describe("The notes of the reminder, e.g. Buy some snacks"),
  timezone: z
    .string()
    .describe("The time zone of the reminder, e.g. Asia/Jakarta"),
  date_tz: z.string().describe("The date of the reminder, e.g. 2024-12-31"),
  time_tz: z.string().describe("The time of the reminder, e.g. 21:00"),
  rrule: z
    .string()
    .nullish()
    .nullable()
    .describe("The recurrence rule of the reminder, e.g. FREQ=DAILY;COUNT=5"),
  notify_in_advance: z
    .number()
    .int()
    .nullish()
    .describe("The number of minutes to notify in advance, e.g. 30"),
  next_tz: z
    .string()
    .describe("The next time of the reminder, e.g. 2024-12-31 21:00:00"),
  next_utc: z
    .string()
    .describe("The next time of the reminder in UTC, e.g. 2024-12-31 14:00:00"),
  snoozed: z
    .number()
    .int()
    .describe("The number of minutes the reminder is snoozed, e.g. 5"),
  created_at: z
    .string()
    .describe(
      "The creation date of the reminder, e.g. 2024-07-22T18:05:13.000000Z",
    ),
  updated_at: z
    .string()
    .describe(
      "The last update date of the reminder, e.g. 2024-07-22T18:05:13.000000Z",
    ),
});

export type RemindInput = z.infer<typeof RemindInput>;
export type RemindOutput = z.infer<typeof RemindOutput>;

export interface IReminder {
  remind(input: RemindInput): Promise<RemindOutput>;
}
