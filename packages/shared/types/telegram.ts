import { z } from "zod";

export const AuthInput = z.object({
  telegramApiBaseUrl: z.string().describe("The Telegram API base URL."),
  botToken: z.string().describe("The bot token."),
});

export const MessageInput = z.object({
  chatId: z.string().describe("The chat ID."),
  text: z.string().describe("The text to send."),
});

export type AuthInput = z.infer<typeof AuthInput>;
export type MessageInput = z.infer<typeof MessageInput>;
