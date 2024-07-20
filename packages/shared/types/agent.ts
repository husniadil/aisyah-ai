import { chatHistoryArraySchema } from "@packages/shared/types/chat-history";
import { z } from "zod";

export const inputSchema = z.object({
  chatId: z.string().describe("The ID of the chat"),
  messageId: z.string().describe("The ID of the message"),
  senderId: z.string().describe("The ID of the sender"),
  senderName: z.string().describe("The name of the sender"),
  message: z.string().describe("The message sent by the sender"),
  chatHistory: chatHistoryArraySchema.describe("The chat history"),
});

export const outputSchema = z.object({
  response: z.string().describe("The response from the agent"),
});

export interface IAgent {
  chat(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
