import { z } from "zod";

export const inputSchema = z.object({
  botToken: z.string().describe("The bot token."),
  chatId: z.string().describe("The chat ID."),
  text: z.string().describe("The text to send."),
});

export const outputSchema = z.void();
