import { z } from "zod";

export const inputSchema = z.object({
  text: z.string().describe("The text to convert to audio."),
  metadata: z
    .object({
      chatId: z.string().describe("The chat ID."),
      messageId: z.string().describe("The message ID."),
    })
    .describe("The metadata."),
});

export const outputSchema = z.object({
  audioUrl: z.string().url().optional().describe("The URL of the audio."),
});

export interface ISonata {
  speak(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
