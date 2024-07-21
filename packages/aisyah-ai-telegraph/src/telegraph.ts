import {
  extractAudioLink,
  getFile,
  getFileUrl,
  isContainingAudioLink,
} from "@packages/shared/telegram";
import { outputSchema as agentOutputSchema } from "@packages/shared/types/agent";
import {
  inputSchema as sonataInputSchema,
  outputSchema as sonataOutputSchema,
} from "@packages/shared/types/sonata";
import { Bot, type Context, webhookCallback } from "grammy";
import { z } from "zod";

const composeMessageInputSchema = z.object({
  message: z.string().describe("The message."),
  replyType: z.enum(["text", "voice"]).describe("The type of reply."),
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
  replyType: z.enum(["text", "voice"]).describe("The type of reply."),
});

interface Env {
  AISYAH_AI_AGENT: Fetcher;
  AISYAH_AI_SONATA: Fetcher;
  TELEGRAM_API_BASE_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_INFO: string;
}

export class Telegraph {
  private aisyahAiAgent: Fetcher;
  private aisyahAiSonata: Fetcher;
  private readonly agentBindUrl =
    "https://aisyah-ai-agent.husni-adil-makmur.workers.dev/chat";
  private readonly sonataBindUrl =
    "https://aisyah-ai-sonata.husni-adil-makmur.workers.dev/speak";

  private bot: Bot;

  private getFileUrl: (filePath?: string) => string | undefined;

  private getFile: (
    fileId?: string,
  ) => Promise<{ result: { file_path: string } } | undefined>;

  private messageMentionsBot(ctx: Context) {
    const botName = this.bot.botInfo.first_name.toLowerCase();
    const botUsername = this.bot.botInfo.username.toLowerCase();
    const messageText = ctx.message?.text?.toLowerCase() || "";

    return messageText.includes(botName) || messageText.includes(botUsername);
  }

  private async shouldBotRespond(ctx: Context) {
    const isFromBot = ctx.message?.from?.id === this.bot.botInfo.id;
    const isPrivateChat = ctx.message?.chat.type === "private";
    const isReplyToBot =
      ctx.message?.reply_to_message?.from?.id === this.bot.botInfo.id;
    const mentionsBot = this.messageMentionsBot(ctx);

    return !isFromBot && (isPrivateChat || isReplyToBot || mentionsBot);
  }

  constructor(env: Env) {
    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
      botInfo: JSON.parse(env.TELEGRAM_BOT_INFO),
    });
    this.aisyahAiAgent = env.AISYAH_AI_AGENT;
    this.aisyahAiSonata = env.AISYAH_AI_SONATA;
    this.initializeCommands();
    this.initializeMessageHandlers();

    this.getFileUrl = getFileUrl({
      telegramApiBaseUrl: env.TELEGRAM_API_BASE_URL,
      botToken: env.TELEGRAM_BOT_TOKEN,
    });
    this.getFile = getFile({
      telegramApiBaseUrl: env.TELEGRAM_API_BASE_URL,
      botToken: env.TELEGRAM_BOT_TOKEN,
    });
  }

  start(request: Request<unknown, IncomingRequestCfProperties<unknown>>) {
    return webhookCallback(this.bot, "cloudflare-mod")(request);
  }

  async handleCommand(ctx: Context, command: string): Promise<void> {
    const output = this.composeMessage(ctx, {
      message: await this.askAgent(ctx, command),
      replyType: "text",
    });
    await this.reply(ctx, output);
  }

  private initializeCommands() {
    this.bot.command("start", (ctx) =>
      this.handleCommand(
        ctx,
        "You are engaging in a conversation with me at the first time. Say hello and introduce yourself and ask me to introduce myself.",
      ),
    );
    this.bot.command("description", (ctx) =>
      this.handleCommand(ctx, "Tell me about yourself."),
    );
    this.bot.command("forget", (ctx) =>
      this.handleCommand(
        ctx,
        "Write this: ----- CHAT HISTORY HAS BEEN DELETED ----- in your language.",
      ),
    );
  }

  async handleTextMessage(ctx: Context): Promise<void> {
    try {
      console.log(ctx.message);
      if (!(await this.shouldBotRespond(ctx))) {
        return;
      }
      await ctx.replyWithChatAction("typing");
      const response = await this.askAgent(ctx, ctx.message?.text ?? "");
      const audioLink = extractAudioLink(response);
      const output = this.composeMessage(ctx, {
        message: audioLink ?? response,
        replyType: audioLink ? "voice" : "text",
      });
      await this.reply(ctx, output);
    } catch (error) {
      console.log(error);
      await ctx.reply(`${error}`);
    }
  }

  async handleVoiceMessage(ctx: Context): Promise<void> {
    try {
      console.log(ctx.message);
      if (!(await this.shouldBotRespond(ctx))) {
        return;
      }
      await ctx.replyWithChatAction("record_voice");
      const fileId = ctx.message?.voice?.file_id;
      const file = await this.getFile(fileId);
      const voiceUrl = this.getFileUrl(file?.result.file_path);
      const caption = ctx.message?.caption;
      const command =
        "Ask Sonata then just directly response with the url of the audio you got from Sonata.";
      const question = [caption, voiceUrl, command].filter(Boolean).join("\n");
      const agentResponse = await this.askAgent(ctx, question);
      const audioLink = extractAudioLink(agentResponse);
      const output = this.composeMessage(ctx, {
        message: audioLink || "Cuaca hari ini cerah ya",
        replyType: audioLink ? "voice" : "text",
      });
      await this.reply(ctx, output);
    } catch (error) {
      console.log(error);
      await ctx.reply(`${error}`);
    }
  }

  async handlePhotoMessage(ctx: Context): Promise<void> {
    try {
      console.log(ctx.message);
      if (!(await this.shouldBotRespond(ctx))) {
        return;
      }
      await ctx.replyWithChatAction("typing");
      const fileId = ctx.message?.photo?.[0]?.file_id;
      const file = await this.getFile(fileId);
      const photoLink = this.getFileUrl(file?.result.file_path);
      const caption = ctx.message?.caption;
      const question = [caption, photoLink].filter(Boolean).join("\n");
      const agentResponse = await this.askAgent(ctx, question);
      const audioLink = extractAudioLink(agentResponse);
      const output = this.composeMessage(ctx, {
        message: audioLink ?? agentResponse,
        replyType: audioLink ? "voice" : "text",
      });
      await this.reply(ctx, output);
    } catch (error) {
      console.log(error);
      await ctx.reply(`${error}`);
    }
  }

  private initializeMessageHandlers() {
    this.bot.on("message:text", this.handleTextMessage.bind(this));
    this.bot.on("message:voice", this.handleVoiceMessage.bind(this));
    this.bot.on("message:photo", this.handlePhotoMessage.bind(this));
  }

  private getSenderName(ctx: Context): string {
    return (
      (
        ctx.message?.from?.first_name ||
        ctx.message?.from?.last_name ||
        ctx.message?.from?.username
      )?.split(" ")[0] || "Unknown"
    );
  }

  private async askAgent(ctx: Context, question: string): Promise<string> {
    const input = {
      chatId: ctx.message?.chat?.id.toString() ?? "",
      messageId: ctx.message?.message_id.toString() ?? "",
      senderId: ctx.message?.from?.id.toString() ?? "",
      senderName: this.getSenderName(ctx),
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
      chatId: ctx.message?.chat?.id.toString() ?? "",
      messageId: ctx.message?.message_id.toString() ?? "",
      senderId: ctx.message?.from?.id.toString() ?? "",
      senderName: this.getSenderName(ctx),
      chatType: ctx.message?.chat?.type ?? "private",
      message: input.message,
      replyType: input.replyType,
    };
  }

  async reply(ctx: Context, output: z.infer<typeof outputSchema>) {
    await ctx.replyWithChatAction(
      output.replyType === "voice" ? "record_voice" : "typing",
    );
    const replyToMessageId = Number.parseInt(output.messageId);
    if (output.replyType === "text") {
      return await ctx.reply(output.message, {
        reply_to_message_id:
          output.chatType === "private" ? undefined : replyToMessageId,
      });
    }
    if (output.replyType === "voice") {
      await ctx.replyWithChatAction("record_voice");
      return await ctx.replyWithAudio(output.message, {
        reply_to_message_id:
          output.chatType === "private" ? undefined : replyToMessageId,
      });
    }
  }
}
