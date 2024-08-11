import { DynamicStructuredTool } from "langchain/tools";
import { RemindInput, RemindOutput } from "../types/reminder";

export class ReminderTool extends DynamicStructuredTool {
  private readonly fetcher: Fetcher;
  private readonly bindUrl: string;
  private readonly postRequestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  constructor(fetcher: Fetcher, bindUrl: string) {
    super({
      name: "set_reminder",
      schema: RemindInput,
      description: "Useful for making reminders",
      func: (input: RemindInput) => {
        console.log("ReminderTool ~ input:", input);
        return this.remind(input).then((_output) => "Reminder set");
      },
    });
    this.fetcher = fetcher;
    this.bindUrl = bindUrl;
  }

  async remind(input: RemindInput): Promise<RemindOutput> {
    console.log("ReminderTool ~ remind ~ input:", input);
    try {
      const response = await this.fetcher.fetch(`${this.bindUrl}/remind`, {
        ...this.postRequestInit,
        body: JSON.stringify(input),
      });
      return RemindOutput.parse(await response.json());
    } catch (error) {
      console.log("ReminderTool ~ remind ~ error:", input, error);
      throw error;
    }
  }
}
