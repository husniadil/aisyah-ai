import type * as stream from "node:stream";
import type { SonataSettings } from "@packages/shared/types/settings";
import {
  type ISonata,
  type SpeakInput,
  SpeakOutput,
} from "@packages/shared/types/sonata";
import {
  type SupabaseClient,
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";
import { ElevenLabsClient } from "elevenlabs";

interface Env {
  ELEVENLABS_API_KEY: string;
  ELEVENLABS_VOICE_MODEL_ID: string;
  ELEVENLABS_VOICE_NAME: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SUPABASE_STORAGE_KEY: string;
}

export class Sonata implements ISonata {
  private readonly elevenLabsClient: ElevenLabsClient;
  private readonly supabaseClient: SupabaseClient;

  private generateAudio: (text: string) => Promise<stream.Readable>;

  private uploadAudio: (
    path: string,
    audio: stream.Readable,
  ) => Promise<{ path: string }>;

  private getPublicUrl: (path: string) => Promise<string | undefined>;

  constructor(env: Env, settings: SonataSettings) {
    this.elevenLabsClient = new ElevenLabsClient({
      apiKey: env.ELEVENLABS_API_KEY,
    });
    this.supabaseClient = createSupabaseClient(
      env.SUPABASE_URL,
      env.SUPABASE_KEY,
    );

    this.generateAudio = async (text: string) =>
      await this.elevenLabsClient.generate({
        model_id: env.ELEVENLABS_VOICE_MODEL_ID,
        voice: settings.voice || env.ELEVENLABS_VOICE_NAME,
        text: text,
      });

    this.uploadAudio = async (
      path: string,
      audio: stream.Readable,
    ): Promise<{ path: string }> => {
      const response = await this.supabaseClient.storage
        .from(env.SUPABASE_STORAGE_KEY)
        .upload(path, audio);

      if (response.error) {
        console.log("Sonata ~ constructor ~ response.error:", response.error);
        throw new Error(response.error.message);
      }

      if (!response.data) {
        const message = `No data returned after uploading audio to Supabase storage for path: ${path}`;
        console.log("Sonata ~ constructor ~ message:", message);
        throw new Error(message);
      }

      return response.data;
    };

    this.getPublicUrl = async (path: string): Promise<string | undefined> => {
      return await this.supabaseClient.storage
        .from(env.SUPABASE_STORAGE_KEY)
        .createSignedUrl(path, 60, {
          download: "voice.mp3",
        })
        .then((response) => response.data?.signedUrl);
    };
  }

  async speak(input: SpeakInput): Promise<SpeakOutput> {
    console.log("Sonata ~ speak ~ input:", input);
    const { text, metadata } = input;
    const { chatId, messageId } = metadata;
    try {
      const uploadPath = `audio/${chatId}/${messageId}.mp3`;
      const audioUrl = await this.getPublicUrl(uploadPath).catch(
        (_error) => undefined,
      );
      if (audioUrl) {
        return SpeakOutput.parse({
          data: audioUrl,
        });
      }

      const audio = await this.generateAudio(text);
      const response = await this.uploadAudio(uploadPath, audio);
      return SpeakOutput.parse({
        data: await this.getPublicUrl(response.path),
      });
    } catch (error) {
      console.log("Error generating audio for text with metadata:", {
        text,
        metadata,
        error,
      });
      throw error;
    }
  }
}
