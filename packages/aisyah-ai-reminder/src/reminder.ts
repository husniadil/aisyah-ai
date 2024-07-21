import type {
  IReminder,
  inputSchema,
  outputSchema,
} from "@packages/shared/types/reminder";
import type { z } from "zod";

interface Env {
  REMINDERS_API_KEY: string;
  REMINDERS_BASE_URL: string;
  REMINDERS_APP_ID: number;
}

export class Reminder implements IReminder {
  private headers: () => Record<string, string>;

  private withData = (data: z.infer<typeof inputSchema>) => {
    const { chatId, title, date, time, timeZone } = data;
    return new URLSearchParams({
      title: `${chatId}:${title}`,
      date_tz: date,
      time_tz: time,
      timezone: timeZone,
    });
  };

  private createUrl: (input: z.infer<typeof inputSchema>) => string;

  constructor(env: Env) {
    this.createUrl = (input: z.infer<typeof inputSchema>) =>
      `${env.REMINDERS_BASE_URL}/api/applications/${env.REMINDERS_APP_ID}/reminders/`;
    this.headers = () => ({
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${env.REMINDERS_API_KEY}`,
    });
  }

  async remind(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>> {
    const { chatId, title, date, time, timeZone } = input;
    console.log("Setting reminder with the following data:", input);
    console.log(
      `set_reminder("${chatId}", "${title}", "${timeZone}", "${date}", "${time}")`,
    );
    const url = this.createUrl(input);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.headers(),
        body: this.withData({ chatId, title, timeZone, date, time }),
        redirect: "follow",
      });
      if (!response.ok) {
        const message = `Error setting reminder: ${response.statusText}`;
        console.error(message);
        throw new Error(message);
      }
      return await response.json();
    } catch (error) {
      console.error("Error setting reminder:", error);
      throw error;
    }
  }
}
