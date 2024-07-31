import { z } from "zod";

export enum AgentPersona {
  "Aisyah Default" = "aisyah-default",
  "Aisyah Jawir" = "aisyah-jawir",
  "Personal Assistant" = "personal-assistant",
}

export const TelegraphSettings = z.object({
  chatHistoryLimit: z
    .nativeEnum({
      "none: 0": 0,
      "short: 10": 10,
      "medium: 20": 20,
      "long: 50": 50,
    })
    .optional()
    .describe("The chat history limit"),
});

export const AgentSettings = z.object({
  persona: z.nativeEnum(AgentPersona).optional().describe("Agent persona"),
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
      temperature: z
        .nativeEnum({
          "[0.0]": 0,
          "[0.1]": 0.1,
          "[0.2]": 0.2,
          "[0.3]": 0.3,
          "[0.4]": 0.4,
          "[0.5]": 0.5,
          "[0.6]": 0.6,
          "[0.7]": 0.7,
          "[0.8]": 0.8,
          "[0.9]": 0.9,
          "[1.0]": 1,
        })
        .optional()
        .describe("The temperature"),
      maxTokens: z
        .nativeEnum({
          "short: 256": 256,
          "medium: 1024": 1024,
          "long: 4096": 4096,
          "very long: 16384": 16384,
        })
        .optional()
        .describe("The maximum tokens"),
      topP: z
        .nativeEnum({
          "[0.0]": 0,
          "[0.1]": 0.1,
          "[0.2]": 0.2,
          "[0.3]": 0.3,
          "[0.4]": 0.4,
          "[0.5]": 0.5,
          "[0.6]": 0.6,
          "[0.7]": 0.7,
          "[0.8]": 0.8,
          "[0.9]": 0.9,
          "[1.0]": 1,
        })
        .optional()
        .describe("The top P"),
      frequencyPenalty: z
        .nativeEnum({
          "[0.0]": 0,
          "[0.1]": 0.1,
          "[0.2]": 0.2,
          "[0.3]": 0.3,
          "[0.4]": 0.4,
          "[0.5]": 0.5,
          "[0.6]": 0.6,
          "[0.7]": 0.7,
          "[0.8]": 0.8,
          "[0.9]": 0.9,
          "[1.0]": 1,
        })
        .optional()
        .describe("The frequency penalty"),
      presencePenalty: z
        .nativeEnum({
          "[0.0]": 0,
          "[0.1]": 0.1,
          "[0.2]": 0.2,
          "[0.3]": 0.3,
          "[0.4]": 0.4,
          "[0.5]": 0.5,
          "[0.6]": 0.6,
          "[0.7]": 0.7,
          "[0.8]": 0.8,
          "[0.9]": 0.9,
          "[1.0]": 1,
        })
        .optional()
        .describe("The presence penalty"),
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

export const Settings = z.object({
  telegraph: TelegraphSettings.describe("The Telegraph settings"),
  agent: AgentSettings.describe("The Agent settings"),
  sonata: SonataSettings.describe("The Sonata settings"),
});

export type TelegraphSettings = z.infer<typeof TelegraphSettings>;
export type AgentSettings = z.infer<typeof AgentSettings>;
export type SonataSettings = z.infer<typeof SonataSettings>;
export type Settings = z.infer<typeof Settings>;

export interface ISettings<
  T extends TelegraphSettings | AgentSettings | SonataSettings,
> {
  getSettings(key: string): Promise<T>;
  setSettings(key: string, settings: T): Promise<void>;
  clearSettings(key: string): Promise<void>;
}
