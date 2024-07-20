import type { inputSchema } from "@packages/shared/types/time";
import type { z } from "zod";

export const getCurrentDateTime = (
  input: z.infer<typeof inputSchema>,
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
