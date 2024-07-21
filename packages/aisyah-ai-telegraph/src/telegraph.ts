import { UpstashRedisChatHistory } from "@packages/shared/chat-history";
import { UpstashRedisLock } from "@packages/shared/lock";
import { UpstashRedisRateLimit } from "@packages/shared/rate-limit";
import {
  extractAudioLink,
  getFile,
  getFileUrl,
  isContainingAudioLink,
} from "@packages/shared/telegram";
import { getCurrentDateTime } from "@packages/shared/time";
import {
  type inputSchema as agentInputSchema,
  outputSchema as agentOutputSchema,
} from "@packages/shared/types/agent";
import type { chatHistoryArraySchema } from "@packages/shared/types/chat-history";
import {
  type inputSchema as sonataInputSchema,
  outputSchema as sonataOutputSchema,
} from "@packages/shared/types/sonata";
import {
  type inputSchema as whisperInputSchema,
  outputSchema as whisperOutputSchema,
} from "@packages/shared/types/whisper";
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
  AISYAH_AI_WHISPER: Fetcher;
  AISYAH_AI_SONATA: Fetcher;
  TELEGRAM_API_BASE_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_INFO: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  CHAT_HISTORY_LIMIT: number;
  RECENT_INTERACTIONS: KVNamespace;
}

export class Telegraph {
  private agent: Fetcher;
  private whisper: Fetcher;
  private sonata: Fetcher;
  private readonly agentBindUrl =
    "https://aisyah-ai-agent.husni-adil-makmur.workers.dev/chat";
  private readonly whisperBindUrl =
    "https://aisyah-ai-whisper.husni-adil-makmur.workers.dev/listen";
  private readonly sonataBindUrl =
    "https://aisyah-ai-sonata.husni-adil-makmur.workers.dev/speak";

  private bot: Bot;
  private chatHistory: UpstashRedisChatHistory;
  private rateLimit: UpstashRedisRateLimit;
  private lock: UpstashRedisLock;
  private ctx: ExecutionContext;
  private recentInteractions: KVNamespace;

  constructor(ctx: ExecutionContext, env: Env) {
    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
      botInfo: JSON.parse(env.TELEGRAM_BOT_INFO),
    });
    this.agent = env.AISYAH_AI_AGENT;
    this.whisper = env.AISYAH_AI_WHISPER;
    this.sonata = env.AISYAH_AI_SONATA;

    this.recentInteractions = env.RECENT_INTERACTIONS;
    this.chatHistory = new UpstashRedisChatHistory(env);
    this.lock = new UpstashRedisLock(env);
    this.rateLimit = new UpstashRedisRateLimit(env);
    this.ctx = ctx;

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
    const isRecentlyInteracted = await this.isRecentlyInteracted(
      ctx.message?.chat?.id.toString() ?? "",
      ctx.message?.from?.id.toString() ?? "",
    );
    const hasQuestionMark = ctx.message?.text?.includes("?");

    return (
      !isFromBot &&
      (isPrivateChat ||
        isReplyToBot ||
        mentionsBot ||
        (isRecentlyInteracted && hasQuestionMark))
    );
  }

  async handleCommand(ctx: Context, command: string): Promise<void> {
    try {
      await this.handleRateLimit(ctx);
      await this.lock.acquire(ctx.message?.chat?.id.toString() ?? "");
      const output = this.composeOutputMessage(ctx, {
        message: await this.askAgent(ctx, command),
        replyType: "text",
      });
      await this.reply(ctx, output);
    } catch (error) {
      console.error(error);
      await ctx.reply(`${(error as Error).message}`);
    } finally {
      await this.lock.release(ctx.message?.from?.id.toString() ?? "");
    }
  }

  private initializeCommands() {
    this.bot.command(
      "start",
      async (ctx) =>
        await this.handleCommand(
          ctx,
          "You are engaging in a conversation with me at the first time. Say hello and introduce yourself and ask me to introduce myself.",
        ),
    );
    this.bot.command(
      "description",
      async (ctx) => await this.handleCommand(ctx, "Tell me about yourself."),
    );
    this.bot.command("forget", async (ctx) => {
      if (ctx.message?.chat?.id) {
        this.chatHistory.clear(ctx.message?.chat?.id.toString());
      }
      return await ctx.reply("----- 👌 💬 ❌ 👍 -----");
    });
  }

  async handleMessage(ctx: Context): Promise<void> {
    try {
      console.log("Handling message:", ctx.message);

      await this.handleRateLimit(ctx);
      await this.lock.acquire(ctx.message?.chat?.id.toString() ?? "");

      const userMessage = await this.constructUserMessage(ctx);
      const chatHistory = await this.saveUserMessage(
        ctx.message?.chat?.id.toString(),
        {
          message: userMessage,
          type: "human",
          senderName: this.getSenderName(ctx),
          timestamp: getCurrentDateTime("Asia/Jakarta"),
        },
      );
      if (!(await this.shouldBotRespond(ctx))) {
        return;
      }
      await this.trackInteractions(
        ctx.message?.chat?.id.toString() ?? "",
        ctx.message?.from?.id.toString() ?? "",
      );
      const response = await this.askAgent(
        ctx,
        userMessage,
        chatHistory.slice(0, -1),
      );

      let output: z.infer<typeof outputSchema>;
      if (ctx.message?.voice) {
        try {
          const sonataResponse = await this.askSonata(ctx, response);
          output = this.composeOutputMessage(ctx, {
            message: sonataResponse ?? response,
            replyType: sonataResponse ? "voice" : "text",
          });
        } catch (error) {
          output = this.composeOutputMessage(ctx, {
            message: response,
            replyType: "text",
          });
        }
      } else if (isContainingAudioLink(response)) {
        const audioLink = extractAudioLink(response);
        if (audioLink) {
          try {
            const sonataResponse = await this.askSonata(ctx, audioLink);
            output = this.composeOutputMessage(ctx, {
              message: sonataResponse ?? response,
              replyType: sonataResponse ? "voice" : "text",
            });
          } catch (error) {
            output = this.composeOutputMessage(ctx, {
              message: response,
              replyType: "text",
            });
          }
        } else {
          output = this.composeOutputMessage(ctx, {
            message: response,
            replyType: "text",
          });
        }
      } else {
        output = this.composeOutputMessage(ctx, {
          message: response,
          replyType: "text",
        });
      }

      await this.saveUserMessage(ctx.message?.chat?.id.toString(), {
        message: response,
        type: "ai",
        senderName: this.bot.botInfo.first_name,
        timestamp: getCurrentDateTime("Asia/Jakarta"),
      });
      await this.reply(ctx, output);
    } catch (error) {
      console.error(error);
      await ctx.reply(`${(error as Error).message}`);
    } finally {
      await this.lock.release(ctx.message?.from?.id.toString() ?? "");
    }
  }

  private initializeMessageHandlers() {
    this.bot.on("message", async (ctx) =>
      this.ctx.waitUntil(this.handleMessage(ctx)),
    );
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

  private async askAgent(
    ctx: Context,
    question: string,
    chatHistory: z.infer<typeof chatHistoryArraySchema> = [],
  ) {
    const input: z.infer<typeof agentInputSchema> = {
      chatId: ctx.message?.chat?.id.toString() ?? "",
      messageId: ctx.message?.message_id.toString() ?? "",
      senderId: ctx.message?.from?.id.toString() ?? "",
      senderName: this.getSenderName(ctx),
      message: question,
      chatHistory: chatHistory,
    };
    const response = await this.agent.fetch(this.agentBindUrl, {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return agentOutputSchema.parse(await response.json()).response;
  }

  private async askWhisper(question: string) {
    const input: z.infer<typeof whisperInputSchema> = {
      audioUrl: question,
    };
    const response = await this.whisper.fetch(this.whisperBindUrl, {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return whisperOutputSchema.parse(await response.json()).text;
  }

  private async askSonata(ctx: Context, question: string) {
    const input: z.infer<typeof sonataInputSchema> = {
      text: question,
      metadata: {
        chatId: ctx.message?.chat?.id.toString() ?? "",
        messageId: ctx.message?.message_id.toString() ?? "",
      },
    };
    const response = await this.sonata.fetch(this.sonataBindUrl, {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return sonataOutputSchema.parse(await response.json()).audioUrl;
  }

  private composeOutputMessage(
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

  private async saveUserMessage(
    chatId: string | undefined,
    ...userMessages: z.infer<typeof chatHistoryArraySchema>
  ): Promise<z.infer<typeof chatHistoryArraySchema>> {
    if (!chatId) {
      return [];
    }
    return this.chatHistory.append(chatId, ...userMessages);
  }

  private async handleRateLimit(ctx: Context) {
    if (
      await this.rateLimit.isRateLimited(ctx.message?.from?.id.toString() ?? "")
    ) {
      throw new Error("Hari ini kamu uda banyak chat sama aku, besok lagi ya!");
    }
  }

  private async extractFileUrls(ctx: Context) {
    const files: string[] = [];
    if (ctx.message?.photo) {
      files.push(...ctx.message.photo.map((photo) => photo.file_id));
    }
    if (ctx.message?.reply_to_message?.photo) {
      files.push(
        ...ctx.message.reply_to_message.photo.map((photo) => photo.file_id),
      );
    }
    if (ctx.message?.voice) {
      files.push(ctx.message.voice.file_id);
    }
    if (ctx.message?.reply_to_message?.voice) {
      files.push(ctx.message.reply_to_message.voice.file_id);
    }
    if (ctx.message?.audio) {
      files.push(ctx.message.audio.file_id);
    }
    if (ctx.message?.reply_to_message?.audio) {
      files.push(ctx.message.reply_to_message.audio.file_id);
    }
    const fileUrlPromises = files.map(async (fileId) => {
      const file = await this.getFile(fileId);
      return this.getFileUrl(file?.result.file_path);
    });

    const fileUrls = await Promise.all(fileUrlPromises);
    return fileUrls.filter((url) => url !== undefined);
  }

  private async constructUserMessage(ctx: Context) {
    const fileUrls = await this.extractFileUrls(ctx);
    if (ctx.message?.voice || ctx.message?.reply_to_message?.voice) {
      const voiceUrl = fileUrls.pop();
      try {
        return voiceUrl ? await this.askWhisper(voiceUrl) : "";
      } catch (error) {
        return "Error: I can't listen to this voice message.";
      }
    }
    if (
      ctx.message?.audio ||
      ctx.message?.photo ||
      ctx.message?.reply_to_message?.photo ||
      ctx.message?.reply_to_message?.audio
    ) {
      const url = fileUrls.pop();
      return [ctx.message?.caption, url].filter(Boolean).join("\n");
    }
    if (ctx.message?.sticker) {
      return ctx.message?.sticker.emoji || "";
    }
    if (ctx.message?.location) {
      return `Location: ${ctx.message?.location.latitude}, ${ctx.message?.location.longitude}`;
    }
    if (ctx.message?.venue) {
      return `Venue: ${ctx.message?.venue.title}`;
    }
    if (ctx.message?.contact) {
      return `Contact: ${ctx.message?.contact.phone_number}`;
    }
    if (ctx.message?.video) {
      return ctx.message?.caption || "";
    }
    if (ctx.message?.animation) {
      return ctx.message?.caption || "";
    }
    if (ctx.message?.poll) {
      const question = ctx.message?.poll.question || "";
      const options =
        ctx.message?.poll.options
          ?.map((option) => `[${option.text}]`)
          .join(", ") || "";
      return ["Polling", `Question: ${question}`, `Options: ${options}`]
        .filter(Boolean)
        .join("\n");
    }
    return ctx.message?.text || "";
  }

  async trackInteractions(chatId: string, senderId: string): Promise<void> {
    const key = `${chatId}:${senderId}`;
    await this.recentInteractions.put(key, "", { expirationTtl: 5 * 60 });
  }

  async isRecentlyInteracted(
    chatId: string,
    senderId: string,
  ): Promise<boolean> {
    const key = `${chatId}:${senderId}`;
    return this.recentInteractions.get(key) !== null;
  }
}
