import type * as stream from "node:stream";
import type {
  ISonata,
  inputSchema,
  outputSchema,
} from "@packages/shared/types/sonata";
import {
  type SupabaseClient,
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";
import { ElevenLabsClient } from "elevenlabs";
import type { z } from "zod";

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

  constructor(env: Env) {
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
        voice: env.ELEVENLABS_VOICE_NAME,
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

  async speak(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>> {
    console.log("Generating audio for text with the following input:", input);

    const { text, metadata } = input;
    const { chatId, messageId } = metadata;
    try {
      const uploadPath = `audio/${chatId}/${messageId}.mp3`;
      const audioUrl = await this.getPublicUrl(uploadPath).catch(
        (_error) => undefined,
      );
      if (audioUrl) {
        return {
          audioUrl,
        };
      }

      const audio = await this.generateAudio(text);
      const response = await this.uploadAudio(uploadPath, audio);
      return {
        audioUrl: await this.getPublicUrl(response.path),
      };
    } catch (error) {
      console.error("Error generating audio for text with metadata:", {
        text,
        metadata,
        error,
      });
      throw error;
    }
  }
}
