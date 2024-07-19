import { OpenAI } from "openai";
import { z } from "zod";

interface Env {
  OPENAI_API_KEY: string;
}

export const inputSchema = z.object({
  audioUrl: z.string().url().describe("URL of the audio file to transcribe"),
});

export class Whisper {
  private readonly openAI: OpenAI;

  constructor(env: Env) {
    this.openAI = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async listen(input: z.infer<typeof inputSchema>): Promise<string> {
    const { audioUrl } = input;
    try {
      const transcription = await this.openAI.audio.transcriptions.create({
        file: await fetch(audioUrl),
        model: "whisper-1",
      });
      return transcription.text;
    } catch (error) {
      console.error("Error transcribing audio from URL:", {
        audioUrl,
        error,
      });
      throw error;
    }
  }
}
