import { z } from "zod";

export const inputSchema = z.object({
  audioUrl: z.string().url().describe("URL of the audio file to transcribe"),
});

export const outputSchema = z.object({
  text: z.string().describe("The transcription of the audio file"),
});

export interface IWhisper {
  listen(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
