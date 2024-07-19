import { OpenAI } from "openai";

interface Env {
  OPENAI_API_KEY: string;
}

export class Whisper {
  private readonly openAI: OpenAI;

  constructor(env: Env) {
    this.openAI = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async listen(audioUrl: string) {
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
