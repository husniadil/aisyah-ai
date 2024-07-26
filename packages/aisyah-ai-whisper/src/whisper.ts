import { fetchWithTimeout } from "@packages/shared/fetcher";
import {
  type IWhisper,
  type ListenInput,
  ListenOutput,
} from "@packages/shared/types/whisper";
import { OpenAI } from "openai";

interface Env {
  OPENAI_API_KEY: string;
}

export class Whisper implements IWhisper {
  private readonly openAI: OpenAI;

  constructor(env: Env) {
    this.openAI = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async listen(input: ListenInput): Promise<ListenOutput> {
    console.log("Whisper ~ listen ~ input:", input);
    try {
      const transcription = await this.openAI.audio.transcriptions.create({
        file: await fetchWithTimeout(input.audioUrl),
        model: "whisper-1",
      });
      return ListenOutput.parse({
        data: transcription.text,
      });
    } catch (error) {
      console.log("Whisper ~ listen ~ error:", input, error);
      throw error;
    }
  }
}
