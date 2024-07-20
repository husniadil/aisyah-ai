import type {
  IReminder,
  inputSchema,
  outputSchema,
} from "@packages/shared/types/reminder";
import type { z } from "zod";

interface Env {
  REMINDERS_API_KEY: string;
}

export class Reminder implements IReminder {
  private readonly apiKey: string;
  private readonly baseUrl = "https://reminders-api.com";
  private readonly appID = 919;

  private headers = (token: string): Record<string, string> => ({
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Bearer ${token}`,
  });

  private withData = (data: z.infer<typeof inputSchema>) => {
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

  async remind(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>> {
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
