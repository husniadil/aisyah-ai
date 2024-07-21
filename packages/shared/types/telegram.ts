import { z } from "zod";

export const configSchema = z.object({
  telegramApiBaseUrl: z.string().describe("The Telegram API base URL."),
  botToken: z.string().describe("The bot token."),
});

export const messageSchema = z.object({
  chatId: z.string().describe("The chat ID."),
  text: z.string().describe("The text to send."),
});
