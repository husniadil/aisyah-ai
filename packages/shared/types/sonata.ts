import { z } from "zod";

export const SpeakInput = z.object({
  text: z.string().describe("The text to convert to audio."),
  metadata: z
    .object({
      chatId: z.string().describe("The chat ID."),
      messageId: z.string().describe("The message ID."),
    })
    .describe("The metadata."),
});

export const SpeakOutput = z.object({
  data: z.string().url().optional().describe("The URL of the audio."),
});

export type SpeakInput = z.infer<typeof SpeakInput>;
export type SpeakOutput = z.infer<typeof SpeakOutput>;

export interface ISonata {
  speak(input: SpeakInput): Promise<SpeakOutput>;
}
