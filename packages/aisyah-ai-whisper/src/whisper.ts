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
    console.log("Transcribing audio from URL with the following input:", input);

    const { audioUrl } = input;
    try {
      const transcription = await this.openAI.audio.transcriptions.create({
        file: await fetch(audioUrl),
        model: "whisper-1",
      });
      return ListenOutput.parse({
        data: transcription.text,
      });
    } catch (error) {
      console.error("Error transcribing audio from URL:", {
        audioUrl,
        error,
      });
      throw error;
    }
  }
}
