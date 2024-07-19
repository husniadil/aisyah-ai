import { OpenAI } from "openai";

export class Whisper {
  private readonly openAI: OpenAI;

  constructor(env: { OPENAI_API_KEY: string }) {
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
      console.error("Failed to transcribe audio:", error);
      throw error;
    }
  }
}
