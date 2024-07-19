import { OpenAIClient } from "@langchain/openai";

export class Whisper {
  private openAIClient: OpenAIClient;

  constructor(env: { OPENAI_API_KEY: string }) {
    this.openAIClient = new OpenAIClient({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async listen(audioUrl: string) {
    try {
      const transcription = await this.openAIClient.audio.transcriptions.create(
        {
          file: await fetch(audioUrl),
          model: "whisper-1",
        },
      );
      return transcription.text;
    } catch (error) {
      console.error("Failed to transcribe audio:", error);
      return undefined;
    }
  }
}
