import type * as stream from "node:stream";
import {
  type SupabaseClient,
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";
import { ElevenLabsClient } from "elevenlabs";

interface Env {
  ELEVENLABS_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
}

export class Sonata {
  private readonly elevenLabsClient: ElevenLabsClient;
  private readonly supabaseClient: SupabaseClient;
  private readonly supabaseStorageKey = "telegram";
  private readonly voiceModelId = "eleven_multilingual_v2";
  private readonly voiceName = "Matilda";

  constructor(env: {
    ELEVENLABS_API_KEY: string;
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
  }) {
    this.elevenLabsClient = new ElevenLabsClient({
      apiKey: env.ELEVENLABS_API_KEY,
    });
    this.supabaseClient = createSupabaseClient(
      env.SUPABASE_URL,
      env.SUPABASE_KEY,
    );
  }

  public async speak(
    text: string,
    metadata: { chatId: string; messageId: string },
  ): Promise<string> {
    try {
      const audio = await this.generateAudio(text);
      const uploadPath = `audio/${metadata.chatId}/${metadata.messageId}.mp3`;
      const response = await this.uploadAudio(uploadPath, audio);

      return this.getPublicUrl(response.path);
    } catch (error) {
      console.error("Error generating audio for text with metadata:", {
        text,
        metadata,
        error,
      });
      throw error;
    }
  }

  private generateAudio(text: string): Promise<stream.Readable> {
    return this.elevenLabsClient.generate({
      model_id: this.voiceModelId,
      voice: this.voiceName,
      text: text,
    });
  }

  private async uploadAudio(
    path: string,
    audio: stream.Readable,
  ): Promise<{ path: string }> {
    const response = await this.supabaseClient.storage
      .from(this.supabaseStorageKey)
      .upload(path, audio);

    if (response.error) {
      console.error(
        "Error uploading audio to Supabase storage:",
        response.error,
      );
      throw new Error(response.error.message);
    }

    if (!response.data) {
      const message = `No data returned after uploading audio to Supabase storage for path: ${path}`;
      console.error(message);
      throw new Error(message);
    }

    return response.data;
  }

  private getPublicUrl(path: string): string {
    const {
      data: { publicUrl },
    } = this.supabaseClient.storage
      .from(this.supabaseStorageKey)
      .getPublicUrl(path);

    return publicUrl;
  }
}
