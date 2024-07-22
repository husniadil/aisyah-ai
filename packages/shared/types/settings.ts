import { z } from "zod";

export const TelegraphSettings = z.object({
  chatHistoryLimit: z
    .number()
    .int()
    .optional()
    .describe("The chat history limit"),
});

export const AgentSettings = z.object({
  systemPrompt: z.string().optional().describe("The system prompt"),
  llm: z
    .object({
      model: z
        .union([
          z.literal("gpt-3.5-turbo"),
          z.literal("gpt-4o-mini"),
          z.literal("gpt-4o"),
        ])
        .optional()
        .default("gpt-4o-mini")
        .describe("The model"),
      temperature: z.number().optional().describe("The temperature"),
      maxTokens: z.number().optional().describe("The maximum tokens"),
      topP: z.number().optional().describe("The top P"),
      frequencyPenalty: z.number().optional().describe("The frequency penalty"),
      presencePenalty: z.number().optional().describe("The presence penalty"),
    })
    .optional()
    .describe("The LLM settings"),
});

export const SonataSettings = z.object({
  voice: z
    .union([
      z.literal("Brian"),
      z.literal("Alice"),
      z.literal("Bill"),
      z.literal("Callum"),
      z.literal("Charlie"),
      z.literal("Charlotte"),
      z.literal("Chris"),
      z.literal("Daniel"),
      z.literal("Eric"),
      z.literal("George"),
      z.literal("Jessica"),
      z.literal("Laura"),
      z.literal("Liam"),
      z.literal("Lily"),
      z.literal("Matilda"),
      z.literal("Sarah"),
      z.literal("Will"),
    ])
    .optional()
    .describe("The voice"),
});

export type TelegraphSettings = z.infer<typeof TelegraphSettings>;
export type AgentSettings = z.infer<typeof AgentSettings>;
export type SonataSettings = z.infer<typeof SonataSettings>;

export interface ISettings<
  T extends TelegraphSettings | AgentSettings | SonataSettings,
> {
  getSettings(key: string): Promise<T>;
  setSettings(key: string, settings: T): Promise<void>;
  clearSettings(key: string): Promise<void>;
}
