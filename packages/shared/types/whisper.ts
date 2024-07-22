import { z } from "zod";

export const ListenInput = z.object({
  audioUrl: z.string().url().describe("URL of the audio file to transcribe"),
});

export const ListenOutput = z.object({
  data: z.string().describe("The transcription of the audio file"),
});

export type ListenInput = z.infer<typeof ListenInput>;
export type ListenOutput = z.infer<typeof ListenOutput>;

export interface IWhisper {
  listen(input: ListenInput): Promise<ListenOutput>;
}
