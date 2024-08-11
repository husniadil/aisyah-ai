import { DynamicStructuredTool } from "langchain/tools";
import {
  GetCurrentDateTimeInput,
  type GetCurrentDateTimeOutput,
} from "../types/time";

export class CurrentTimeTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: "get_current_date_time",
      description: "Use this tool to get the current date and time.",
      schema: GetCurrentDateTimeInput,
      func: async (input: GetCurrentDateTimeInput) => {
        console.log("CurrentTimeTool ~ input:", input);
        return this.getCurrentDateTime(input);
      },
    });
  }

  getCurrentDateTime(input: GetCurrentDateTimeInput): GetCurrentDateTimeOutput {
    const date = new Date().toLocaleString("id-ID", {
      timeZone: input.timeZone,
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
  }
}
