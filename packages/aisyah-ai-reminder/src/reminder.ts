import { fetchWithTimeout } from "@packages/shared/fetcher";
import {
  type IReminder,
  type RemindInput,
  RemindOutput,
} from "@packages/shared/types/reminder";

interface Env {
  REMINDERS_API_KEY: string;
  REMINDERS_BASE_URL: string;
  REMINDERS_APP_ID: number;
}

export class Reminder implements IReminder {
  private headers: () => Record<string, string>;

  private withData = (data: RemindInput) => {
    const { chatId, reminderPrompt, date, time, timeZone } = data;
    return new URLSearchParams({
      title: chatId,
      notes: reminderPrompt,
      date_tz: date,
      time_tz: time,
      timezone: timeZone,
    });
  };

  private createUrl: (input: RemindInput) => string;

  constructor(env: Env) {
    this.createUrl = (input: RemindInput) =>
      `${env.REMINDERS_BASE_URL}/api/applications/${env.REMINDERS_APP_ID}/reminders/`;
    this.headers = () => ({
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${env.REMINDERS_API_KEY}`,
    });
  }

  async remind(input: RemindInput): Promise<RemindOutput> {
    console.log("Reminder ~ remind ~ input:", input);
    const { chatId, reminderPrompt, date, time, timeZone } = input;
    const url = this.createUrl(input);
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: this.headers(),
        body: this.withData({ chatId, reminderPrompt, timeZone, date, time }),
        redirect: "follow",
      });
      if (!response.ok) {
        const message = `Error setting reminder: ${response.statusText}`;
        console.log("Reminder ~ remind ~ message:", message);
        throw new Error(message);
      }
      return RemindOutput.parse(await response.json());
    } catch (error) {
      console.log("Reminder ~ remind ~ error:", input, error);
      throw error;
    }
  }
}
