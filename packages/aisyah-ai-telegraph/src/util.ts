import { z } from "zod";

export const ComposeMessageInput = z.object({
  message: z.string().describe("The message."),
  replyType: z.enum(["text", "voice"]).describe("The type of reply."),
});

export const ComposeMessageOutput = z.object({
  chatId: z.string().describe("The chat ID."),
  messageId: z.string().describe("The message ID."),
  senderId: z.string().describe("The sender ID."),
  senderName: z.string().describe("The sender name."),
  message: z.string().describe("The message."),
  chatType: z
    .enum(["private", "group", "supergroup", "channel"])
    .describe("The chat type."),
  replyType: z.enum(["text", "voice"]).describe("The type of reply."),
});

export type ComposeMessageInput = z.infer<typeof ComposeMessageInput>;
export type ComposeMessageOutput = z.infer<typeof ComposeMessageOutput>;
