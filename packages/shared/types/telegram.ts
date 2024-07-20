import { z } from "zod";

const inputSchema = z.object({
  botToken: z.string().describe("The bot token."),
  chatId: z.string().describe("The chat ID."),
  text: z.string().describe("The text to send."),
});

const outputSchema = z.void().describe("The void promise.");

export interface ITelegram {
  sendMessage(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
