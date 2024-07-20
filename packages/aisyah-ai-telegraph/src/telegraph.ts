import { outputSchema as agentOutputSchema } from "@packages/shared/types/agent";
import type { Context } from "grammy";
import { z } from "zod";

const composeMessageInputSchema = z.object({
  message: z.string().describe("The message."),
  replyType: z.enum(["text", "audio"]).describe("The type of reply."),
});

const outputSchema = z.object({
  chatId: z.string().describe("The chat ID."),
  messageId: z.string().describe("The message ID."),
  senderId: z.string().describe("The sender ID."),
  senderName: z.string().describe("The sender name."),
  replyToMessageId: z.string().describe("The message ID to reply to."),
  message: z.string().describe("The message."),
  replyType: z.enum(["text", "audio"]).describe("The type of reply."),
});

interface Env {
  AISYAH_AI_AGENT: Fetcher;
  TELEGRAM_BOT_TOKEN: string;
}

export class Telegraph {
  private aisyahAiAgent: Fetcher;
  private readonly agentBindUrl =
    "https://aisyah-ai-agent.husni-adil-makmur.workers.dev";

  constructor(env: Env) {
    this.aisyahAiAgent = env.AISYAH_AI_AGENT;
  }

  private async askAgent(
    ctx: Context,
    question: string,
  ): Promise<z.infer<typeof agentOutputSchema>> {
    const input = {
      chatId: ctx.chat?.id.toString() ?? "",
      messageId: ctx.message?.message_id.toString() ?? "",
      senderId: ctx.from?.id.toString() ?? "",
      senderName: ctx.from?.first_name ?? "",
      message: question,
      chatHistory: [],
    };
    const response = await this.aisyahAiAgent.fetch(this.agentBindUrl, {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return agentOutputSchema.parse(await response.json());
  }

  private composeMessage(
    ctx: Context,
    input: z.infer<typeof composeMessageInputSchema>,
  ): z.infer<typeof outputSchema> {
    return {
      chatId: ctx.chat?.id.toString() ?? "",
      messageId: ctx.message?.message_id.toString() ?? "",
      senderId: ctx.from?.id.toString() ?? "",
      senderName: ctx.from?.first_name ?? "",
      message: input.message,
      replyToMessageId: ctx.message?.message_id.toString() ?? "",
      replyType: input.replyType,
    };
  }

  async handleStartCommand(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(ctx, "Welcome the user warmly."),
      replyType: "text",
    });
  }

  async handleDescriptionCommand(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(ctx, "Describe yourself."),
      replyType: "text",
    });
  }

  async handleForgetCommand(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Confirm with the user and then proceed to delete the stored information.",
      ),
      replyType: "text",
    });
  }

  async handleNewChatMembersMe(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(ctx, "Say hello and introduce yourself."),
      replyType: "text",
    });
  }

  async handleLeftChatMemberMe(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(ctx, "Say goodbye warmly."),
      replyType: "text",
    });
  }

  async handleNewChatMembers(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Greet the new chat members warmly and provide any necessary information or guidelines about the chat.",
      ),
      replyType: "text",
    });
  }

  async handleLeftChatMember(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Acknowledge the member's departure and thank them for their time in the chat.",
      ),
      replyType: "text",
    });
  }

  async handleNewChatPhoto(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Compliment the new chat photo and ask the group for their thoughts.",
      ),
      replyType: "text",
    });
  }

  async handleDeleteChatPhoto(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Acknowledge that the chat photo has been removed and invite suggestions for a new one if desired.",
      ),
      replyType: "text",
    });
  }

  async handleNewChatTitle(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Acknowledge the new chat title and share your enthusiasm for the change.",
      ),
      replyType: "text",
    });
  }

  async handleChatBackgroundSet(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Comment on the new chat background and ask the group what they think of it.",
      ),
      replyType: "text",
    });
  }

  async handlePinnedMessage(
    ctx: Context,
  ): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Highlight the pinned message and remind everyone to check it out.",
      ),
      replyType: "text",
    });
  }

  async handleMessage(ctx: Context): Promise<z.infer<typeof outputSchema>> {
    return this.composeMessage(ctx, {
      message: await this.askAgent(ctx, ctx.message?.text ?? ""),
      replyType: "text",
    });
  }
}
