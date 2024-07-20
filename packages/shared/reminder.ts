import { z } from "zod";

interface Env {
  REMINDERS_API_KEY: string;
}

export const reminderInputSchema = z.object({
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

export class Reminder {
  private readonly apiKey: string;
  private readonly baseUrl = "https://reminders-api.com";
  private readonly appID = 919;
  private headers = (token: string): Record<string, string> => ({
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Bearer ${token}`,
  });
  private withData = (data: z.infer<typeof reminderInputSchema>) => {
    const { chatId, title, date, time, timeZone } = data;
    return new URLSearchParams({
      title: `${chatId}:${title}`,
      date_tz: date,
      time_tz: time,
      timezone: timeZone,
    });
  };

  constructor(env: Env) {
    this.apiKey = env.REMINDERS_API_KEY;
  }

  async remind(input: z.infer<typeof reminderInputSchema>): Promise<string> {
    const { chatId, title, date, time, timeZone } = input;
    console.log("Setting reminder with the following data:", input);
    console.log(
      `set_reminder("${chatId}", "${title}", "${timeZone}", "${date}", "${time}")`,
    );
    const url = `${this.baseUrl}/api/applications/${this.appID}/reminders/`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers(this.apiKey),
        body: this.withData({ chatId, title, timeZone, date, time }),
        redirect: "follow",
      });
      if (!response.ok) {
        const message = `Error setting reminder: ${response.statusText}`;
        console.error(message);
        throw new Error(message);
      }
      return "Reminder set successfully!";
    } catch (error) {
      console.error("Error setting reminder:", error);
      throw error;
    }
  }
}
