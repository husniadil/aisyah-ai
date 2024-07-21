import { z } from "zod";

export const inputSchema = z
  .string()
  .describe("The time zone of the current date and time.");

export const outputSchema = z.string().describe("The current date and time.");
