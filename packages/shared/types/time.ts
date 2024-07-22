import { z } from "zod";

export const GetCurrentDateTimeInput = z.object({
  timeZone: z.string().describe("The time zone of the current date and time."),
});

export const GetCurrentDateTimeOutput = z
  .string()
  .describe("The current date and time.");

export type GetCurrentDateTimeInput = z.infer<typeof GetCurrentDateTimeInput>;
export type GetCurrentDateTimeOutput = z.infer<typeof GetCurrentDateTimeOutput>;
