import type { inputSchema, outputSchema } from "@packages/shared/types/time";
import type { z } from "zod";

export const getCurrentDateTime = (
  timeZone: z.infer<typeof inputSchema>,
): string => {
  const date = new Date().toLocaleString("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const [day, month, year, time] = date.split(/[\s,\/]+/);
  return `${year}-${month}-${day} ${time}`;
};
