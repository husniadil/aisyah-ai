import { z } from "zod";

export const inputSchema = z.object({
  senderName: z.string().describe("The name of the sender"),
  type: z.enum(["human", "ai"]).describe("The type of the sender"),
  message: z.string().describe("The message sent by the sender"),
});

export const inputArraySchema = z.array(inputSchema);

export type ChatHistory = z.infer<typeof inputArraySchema>;

export interface IChatHistory {
  append(key: string, ...messages: ChatHistory): Promise<void>;
  get(key: string): Promise<ChatHistory>;
  clear(key: string): Promise<void>;
}
