import { z } from "zod";

export const chatHistorySchema = z.object({
  senderName: z.string().describe("The name of the sender"),
  type: z.enum(["human", "ai"]).describe("The type of the sender"),
  message: z.string().describe("The message sent by the sender"),
});

export const chatHistoryArraySchema = z.array(chatHistorySchema);

export const keyInputSchema = z
  .string()
  .describe("The key to store the chat history");

export interface IChatHistory {
  append(
    key: z.infer<typeof keyInputSchema>,
    ...messages: z.infer<typeof chatHistoryArraySchema>
  ): Promise<z.infer<typeof chatHistoryArraySchema>>;
  get(
    key: z.infer<typeof keyInputSchema>,
  ): Promise<z.infer<typeof chatHistoryArraySchema>>;
  clear(
    key: z.infer<typeof keyInputSchema>,
  ): Promise<z.infer<typeof chatHistoryArraySchema>>;
}
