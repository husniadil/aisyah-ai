import { UpstashRedisChatHistory } from "@packages/shared/chat-history";
import { UpstashRedisLock } from "@packages/shared/lock";
import { UpstashRedisRateLimit } from "@packages/shared/rate-limit";
import {
  extractAudioLink,
  getFile,
  getFileUrl,
  isContainingAudioLink,
} from "@packages/shared/telegram";
import { AgentTool } from "@packages/shared/tools/agent";
import { SonataTool } from "@packages/shared/tools/sonata";
import { CurrentTimeTool } from "@packages/shared/tools/time";
import { WhisperTool } from "@packages/shared/tools/whisper";
import type { ChatHistoryList } from "@packages/shared/types/chat-history";
import type { Settings } from "@packages/shared/types/settings";
import { Bot, type Context, webhookCallback } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { SettingsManager } from "./settings";
import { type ComposeMessageInput, ComposeMessageOutput } from "./util";

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
  private agentTool: AgentTool;
  private whisperTool: WhisperTool;
  private sonataTool: SonataTool;
  private currentTimeTool: CurrentTimeTool;

  private bot: Bot;
  private chatHistory: UpstashRedisChatHistory;
  private rateLimit: UpstashRedisRateLimit;
  private lock: UpstashRedisLock;
  private recentInteractions: KVNamespace;
  private settings: Settings;
  private settingsManager: SettingsManager;

  constructor(ctx: ExecutionContext, env: Env, settings: Settings) {
    this.agentTool = new AgentTool(env.AISYAH_AI_AGENT);
    this.whisperTool = new WhisperTool(env.AISYAH_AI_WHISPER);
    this.sonataTool = new SonataTool(env.AISYAH_AI_SONATA);
    this.currentTimeTool = new CurrentTimeTool();

    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
      botInfo: JSON.parse(env.TELEGRAM_BOT_INFO) as UserFromGetMe,
    });
    this.chatHistory = new UpstashRedisChatHistory({
      UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
      CHAT_HISTORY_LIMIT:
        settings.telegraph.chatHistoryLimit || env.CHAT_HISTORY_LIMIT,
    });
    this.rateLimit = new UpstashRedisRateLimit(env);
    this.lock = new UpstashRedisLock(env);
    this.recentInteractions = env.RECENT_INTERACTIONS;
    this.settings = settings;
    this.settingsManager = new SettingsManager(settings);

    this.initializeCommands();
    this.initializeMessageHandlers(ctx);

    this.getFileUrl = getFileUrl({
      telegramApiBaseUrl: env.TELEGRAM_API_BASE_URL,
      botToken: env.TELEGRAM_BOT_TOKEN,
    });
    this.getFile = getFile({
      telegramApiBaseUrl: env.TELEGRAM_API_BASE_URL,
      botToken: env.TELEGRAM_BOT_TOKEN,
    });
  }

  start(request: Request<unknown, CfProperties<unknown>>) {
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
    const isMentioningOtherUsers =
      ctx.message?.entities?.some((entity) => entity.type === "mention") &&
      !mentionsBot;

    return (
      !isFromBot &&
      (isPrivateChat ||
        isReplyToBot ||
        mentionsBot ||
        (isRecentlyInteracted && hasQuestionMark && !isMentioningOtherUsers))
    );
  }

  async handleCommand(ctx: Context, command: string): Promise<void> {
    try {
      await this.handleRateLimit(ctx);
      await this.lock.acquire(ctx.message?.chat?.id.toString() ?? "");
      const response = await this.agentTool.chat({
        chatId: ctx.message?.chat?.id.toString() ?? "",
        messageId: ctx.message?.message_id.toString() ?? "",
        senderId: ctx.message?.from?.id.toString() ?? "",
        senderName: this.getSenderName(ctx),
        message: command,
        chatHistory: [],
      });
      const output = this.composeMessage(ctx, {
        message: response.data,
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
    this.bot.command(
      "help",
      async (ctx) =>
        await this.handleCommand(
          ctx,
          [
            "Tell me with natural response about your available commands:",
            "- /start: Start a conversation with me.",
            "- /description: I will tell you about myself.",
            "- /forget: Forget our conversation history.",
            "- /help: Show available commands.",
            "- /privacy: Reassure me that my data is safe when we chat.",
          ].join("\n"),
        ),
    );
    this.bot.command(
      "privacy",
      async (ctx) =>
        await this.handleCommand(
          ctx,
          "Please reassure me that my data is safe when we chat.",
        ),
    );

    this.bot.command("settings", async (ctx) => {
      const { keyboard } = this.settingsManager.createKeyboard("settings");
      await ctx.reply("⚙️ Settings", { reply_markup: keyboard });
    });

    this.bot.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data;
      if (data === "ㄨ") {
        await ctx.deleteMessage();
        await ctx.answerCallbackQuery();
        return;
      }
      const { keyboard, hasMenu } = this.settingsManager.createKeyboard(data);
      const message = hasMenu ? "⚙️ Settings" : "✅ Settings updated";
      await ctx.editMessageText(message, { reply_markup: keyboard });
      await ctx.answerCallbackQuery({ text: "Settings updated" });
    });
  }

  async handleMessage(ctx: Context): Promise<void> {
    console.log(ctx.message);
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
          timestamp: this.currentTimeTool.getCurrentDateTime({
            timeZone: "Asia/Jakarta",
          }),
        },
      );
      if (!(await this.shouldBotRespond(ctx))) {
        return;
      }
      await ctx.replyWithChatAction("typing");
      await this.trackInteractions(
        ctx.message?.chat?.id.toString() ?? "",
        ctx.message?.from?.id.toString() ?? "",
      );
      const response = await this.agentTool.chat({
        chatId: ctx.message?.chat?.id.toString() ?? "",
        messageId: ctx.message?.message_id.toString() ?? "",
        senderId: ctx.message?.from?.id.toString() ?? "",
        senderName: this.getSenderName(ctx),
        message: userMessage,
        chatHistory: chatHistory.slice(0, -1),
      });

      const output = await this.composeMessageOutputMaybeAudio(
        ctx,
        response.data,
      );
      await this.saveUserMessage(ctx.message?.chat?.id.toString(), {
        message: response.data,
        type: "ai",
        senderName: this.bot.botInfo.first_name,
        timestamp: this.currentTimeTool.getCurrentDateTime({
          timeZone: "Asia/Jakarta",
        }),
      });
      await this.reply(ctx, output);
    } catch (error) {
      console.error(error);
      await ctx.reply(`${(error as Error).message}`);
    } finally {
      await this.lock.release(ctx.message?.from?.id.toString() ?? "");
    }
  }

  private async composeMessageOutputMaybeAudio(
    ctx: Context,
    agentResponse: string,
  ): Promise<ComposeMessageOutput> {
    let output: ComposeMessageOutput;
    if (ctx.message?.voice) {
      try {
        const sonataResponse = await this.sonataTool.speak({
          text: agentResponse,
          metadata: {
            chatId: ctx.message?.chat?.id.toString() ?? "",
            messageId: ctx.message?.message_id.toString() ?? "",
          },
        });
        output = this.composeMessage(ctx, {
          message: sonataResponse.data ?? agentResponse,
          replyType: sonataResponse.data ? "voice" : "text",
        });
      } catch (error) {
        output = this.composeMessage(ctx, {
          message: agentResponse,
          replyType: "text",
        });
      }
    } else if (isContainingAudioLink(agentResponse)) {
      const audioLink = extractAudioLink(agentResponse);
      if (audioLink) {
        try {
          const sonataResponse = await this.sonataTool.speak({
            text: agentResponse,
            metadata: {
              chatId: ctx.message?.chat?.id.toString() ?? "",
              messageId: ctx.message?.message_id.toString() ?? "",
            },
          });
          output = this.composeMessage(ctx, {
            message: sonataResponse.data ?? agentResponse,
            replyType: sonataResponse.data ? "voice" : "text",
          });
        } catch (error) {
          output = this.composeMessage(ctx, {
            message: agentResponse,
            replyType: "text",
          });
        }
      } else {
        output = this.composeMessage(ctx, {
          message: agentResponse,
          replyType: "text",
        });
      }
    } else {
      output = this.composeMessage(ctx, {
        message: agentResponse,
        replyType: "text",
      });
    }
    return output;
  }

  private initializeMessageHandlers(executionContext: ExecutionContext) {
    this.bot.on("message", async (ctx) => {
      if (ctx.message?.chat?.id) {
        executionContext.waitUntil(this.handleMessage(ctx));
      }
    });
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

  private composeMessage(
    ctx: Context,
    input: ComposeMessageInput,
  ): ComposeMessageOutput {
    return ComposeMessageOutput.parse({
      chatId: ctx.message?.chat?.id.toString() ?? "",
      messageId: ctx.message?.message_id.toString() ?? "",
      senderId: ctx.message?.from?.id.toString() ?? "",
      senderName: this.getSenderName(ctx),
      chatType: ctx.message?.chat?.type ?? "private",
      message: input.message,
      replyType: input.replyType,
    });
  }

  async reply(ctx: Context, output: ComposeMessageOutput) {
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
    ...userMessages: ChatHistoryList
  ): Promise<ChatHistoryList> {
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
      const voiceUrl = fileUrls.shift();
      try {
        return voiceUrl
          ? (
              await this.whisperTool.listen({
                audioUrl: voiceUrl,
              })
            ).data
          : "";
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
      const url = fileUrls.shift();
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
