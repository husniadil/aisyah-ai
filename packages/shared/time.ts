import type { outputSchema } from "@packages/shared/types/time";
import type { z } from "zod";

export const getCurrentDateTime = (
  timezone: string,
): z.infer<typeof outputSchema> => {
  const date = new Date();

  const pad = (num: number) => num.toString().padStart(2, "0");

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const [
    { value: day },
    ,
    { value: month },
    ,
    { value: year },
    ,
    { value: hour },
    ,
    { value: minute },
    ,
    { value: second },
  ] = formatter.formatToParts(date);

  const offset = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const sign = offset > 0 ? "-" : "+";
  const formattedOffset = `${sign}${pad(offsetHours)}${pad(offsetMinutes)}`;

  return `${year}-${month}-${day} ${hour}:${minute}:${second} ${formattedOffset}`;
};
