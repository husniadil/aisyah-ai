import { ChatHistoryList } from "@packages/shared/types/chat-history";
import { z } from "zod";

export const ChatInput = z.object({
  chatId: z.string().describe("The ID of the chat"),
  messageId: z.string().describe("The ID of the message"),
  senderId: z.string().describe("The ID of the sender"),
  senderName: z.string().describe("The name of the sender"),
  message: z.string().describe("The message sent by the sender"),
  chatHistory: ChatHistoryList.describe("The chat history"),
});

export const ChatOutput = z.object({
  data: z.string().describe("The response from the agent"),
});

export type ChatInput = z.infer<typeof ChatInput>;
export type ChatOutput = z.infer<typeof ChatOutput>;

export interface IAgent {
  chat(input: ChatInput): Promise<ChatOutput>;
}
