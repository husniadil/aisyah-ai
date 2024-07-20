import { z } from "zod";

export const currentTimeInputSchema = z.object({
  timeZone: z
    .string()
    .optional()
    .default("Asia/Jakarta")
    .describe("The time zone to get the current time, e.g. Asia/Jakarta"),
});

export const getCurrentDateTime = (
  input: z.infer<typeof currentTimeInputSchema>,
): string => {
  const { timeZone } = input;
  const date = new Date();
  const time = date.toLocaleString(["en-US", "id-ID"], {
    timeZone: timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return time;
};
