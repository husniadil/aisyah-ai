import { outputSchema as agentOutputSchema } from "@packages/shared/types/agent";
import { Bot, type Context, webhookCallback } from "grammy";
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
  message: z.string().describe("The message."),
  chatType: z
    .enum(["private", "group", "supergroup", "channel"])
    .describe("The chat type."),
  replyType: z.enum(["text", "audio"]).describe("The type of reply."),
});

interface Env {
  AISYAH_AI_AGENT: Fetcher;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_INFO: string;
}

export class Telegraph {
  private aisyahAiAgent: Fetcher;
  private readonly agentBindUrl =
    "https://aisyah-ai-agent.husni-adil-makmur.workers.dev/chat";

  private bot: Bot;

  constructor(env: Env) {
    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
      botInfo: JSON.parse(env.TELEGRAM_BOT_INFO),
    });
    this.aisyahAiAgent = env.AISYAH_AI_AGENT;
    this.initializeCommands();
    this.initializeMessageHandlers();
  }

  start(request: Request<unknown, IncomingRequestCfProperties<unknown>>) {
    return webhookCallback(this.bot, "cloudflare-mod")(request);
  }

  private initializeCommands() {
    this.bot.command("start", this.handleStartCommand.bind(this));
    this.bot.command("description", this.handleDescriptionCommand.bind(this));
    this.bot.command("forget", this.handleForgetCommand.bind(this));
  }

  private initializeMessageHandlers() {
    this.bot.on(
      "message:new_chat_members:me",
      this.handleNewChatMembersMe.bind(this),
    );
    this.bot.on(
      "message:left_chat_member:me",
      this.handleLeftChatMemberMe.bind(this),
    );
    this.bot.on(
      "message:new_chat_members:me",
      this.handleNewChatMembers.bind(this),
    );
    this.bot.on(
      "message:new_chat_members",
      this.handleNewChatMembers.bind(this),
    );
    this.bot.on(
      "message:left_chat_member",
      this.handleLeftChatMember.bind(this),
    );
    this.bot.on("message:new_chat_photo", this.handleNewChatPhoto.bind(this));
    this.bot.on(
      "edited_message:delete_chat_photo",
      this.handleDeleteChatPhoto.bind(this),
    );
    this.bot.on(
      "message:delete_chat_photo",
      this.handleDeleteChatPhoto.bind(this),
    );
    this.bot.on("message:new_chat_title", this.handleNewChatTitle.bind(this));
    this.bot.on(
      "message:chat_background_set",
      this.handleChatBackgroundSet.bind(this),
    );
    this.bot.on(
      "edited_message:chat_background_set",
      this.handleChatBackgroundSet.bind(this),
    );
    this.bot.on("message:pinned_message", this.handlePinnedMessage.bind(this));
    this.bot.on("message", this.handleMessage.bind(this));
  }

  private async askAgent(ctx: Context, question: string): Promise<string> {
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
    return agentOutputSchema.parse(await response.json()).response;
  }

  private composeMessage(
    ctx: Context,
    input: z.infer<typeof composeMessageInputSchema>,
  ): z.infer<typeof outputSchema> {
    return {
      chatId: ctx.chat?.id.toString() ?? "",
      messageId: ctx.message?.message_id.toString() ?? "",
      senderId: ctx.from?.id.toString() ?? "",
      senderName:
        (
          ctx.message?.from?.first_name ||
          ctx.message?.from?.last_name ||
          ctx.message?.from?.username
        )?.split(" ")[0] || "Unknown",
      chatType: ctx.chat?.type ?? "private",
      message: input.message,
      replyType: input.replyType,
    };
  }

  async reply(ctx: Context, output: z.infer<typeof outputSchema>) {
    const replyToMessageId = Number.parseInt(output.messageId);
    if (output.replyType === "text") {
      await ctx.replyWithChatAction("typing");
      return await ctx.reply(output.message, {
        reply_to_message_id:
          output.chatType === "private" ? undefined : replyToMessageId,
      });
    }
    if (output.replyType === "audio") {
      await ctx.replyWithChatAction("record_voice");
      return await ctx.replyWithVoice(output.message, {
        reply_to_message_id:
          output.chatType === "private" ? undefined : replyToMessageId,
      });
    }
  }

  async handleStartCommand(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "You are engaging in a conversation with me at the first time. Say hello and introduce yourself and ask me to introduce myself.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleDescriptionCommand(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(ctx, "Tell me about yourself."),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleForgetCommand(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Write this: ----- CHAT HISTORY HAS BEEN DELETED ----- in your language.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleNewChatMembersMe(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(ctx, "Say hello and introduce yourself."),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleLeftChatMemberMe(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(ctx, "Say goodbye warmly."),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleNewChatMembers(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Greet the new chat members warmly and provide any necessary information or guidelines about the chat.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleLeftChatMember(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Acknowledge the member's departure and thank them for their time in the chat.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleNewChatPhoto(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Compliment the new chat photo and ask the group for their thoughts.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleDeleteChatPhoto(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Acknowledge that the chat photo has been removed and invite suggestions for a new one if desired.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleNewChatTitle(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Acknowledge the new chat title and share your enthusiasm for the change.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleChatBackgroundSet(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Comment on the new chat background and ask the group what they think of it.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handlePinnedMessage(ctx: Context): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        "Highlight the pinned message and remind everyone to check it out.",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  async handleMessage(ctx: Context): Promise<void> {
    console.log(ctx.message);
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(
        ctx,
        ctx.message?.text || ctx.message?.caption || "",
      ),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }
}
