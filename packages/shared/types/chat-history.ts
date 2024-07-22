import { z } from "zod";

export const ChatHistory = z.object({
  senderName: z.string().describe("The name of the sender"),
  type: z.enum(["human", "ai"]).describe("The type of the sender"),
  message: z.string().describe("The message sent by the sender"),
  timestamp: z.string().describe("The timestamp of the message"),
});

export const ChatHistoryList = z.array(ChatHistory);

export const ChatHistoryKeyInput = z
  .string()
  .describe("The key to store the chat history");

export type ChatHistory = z.infer<typeof ChatHistory>;
export type ChatHistoryList = z.infer<typeof ChatHistoryList>;
export type ChatHistoryKeyInput = z.infer<typeof ChatHistoryKeyInput>;

export interface IChatHistory {
  append(
    key: ChatHistoryKeyInput,
    ...messages: ChatHistoryList
  ): Promise<ChatHistoryList>;
  get(key: ChatHistoryKeyInput): Promise<ChatHistoryList>;
  clear(key: ChatHistoryKeyInput): Promise<ChatHistoryList>;
}
