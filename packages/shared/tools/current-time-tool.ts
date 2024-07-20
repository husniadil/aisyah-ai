import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { getCurrentDateTime } from "../time";

const schema = z.object({
  timeZone: z
    .string()
    .optional()
    .default("Asia/Jakarta")
    .describe("The time zone to get the current time, e.g. Asia/Jakarta"),
});

export class CurrentTimeTool extends DynamicStructuredTool {
  constructor() {
    super({
      name: "get_current_date_time",
      description: "Use this tool to get the current date and time.",
      schema: schema,
      func: async ({ timeZone }) => {
        console.log("get_current_date_time");
        return getCurrentDateTime(timeZone);
      },
    });
  }
}
