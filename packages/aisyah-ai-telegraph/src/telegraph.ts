import type { ExecutionContext } from "@cloudflare/workers-types";
import { UpstashRedisChatHistory } from "@packages/shared/chat-history";
import { UpstashRedisLock } from "@packages/shared/lock";
import { UpstashRedisRateLimit } from "@packages/shared/rate-limit";
import { getFile, getFileUrl } from "@packages/shared/telegram";
import { AgentTool } from "@packages/shared/tools/agent";
import { SonataTool } from "@packages/shared/tools/sonata";
import { CurrentTimeTool } from "@packages/shared/tools/time";
import { WhisperTool } from "@packages/shared/tools/whisper";
import type { ChatHistoryList } from "@packages/shared/types/chat-history";
import type { Settings } from "@packages/shared/types/settings";
import { extractAudioLink, extractPhotoLink } from "@packages/shared/utils";
import { Bot, type Context, webhookCallback } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { createKeyboard } from "./inline-keyboard";
import {
  type ComposeMessageInput,
  ComposeMessageOutput,
} from "./message-output";
import { SettingsManager } from "./settings";

interface Env {
  CLOUDFLARE_SUBDOMAIN: string;
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
  SETTINGS: KVNamespace<string>;
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
  private settingsManager: SettingsManager;

  constructor(ctx: ExecutionContext, env: Env, settings: Settings) {
    this.agentTool = new AgentTool(
      env.AISYAH_AI_AGENT,
      `https://aisyah-ai-agent.${env.CLOUDFLARE_SUBDOMAIN}`,
    );
    this.whisperTool = new WhisperTool(
      env.AISYAH_AI_WHISPER,
      `https://aisyah-ai-whisper.${env.CLOUDFLARE_SUBDOMAIN}`,
    );
    this.sonataTool = new SonataTool(
      env.AISYAH_AI_SONATA,
      `https://aisyah-ai-sonata.${env.CLOUDFLARE_SUBDOMAIN}`,
    );
    this.currentTimeTool = new CurrentTimeTool();

    this.bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
      botInfo: JSON.parse(env.TELEGRAM_BOT_INFO) as UserFromGetMe,
    });
    this.chatHistory = new UpstashRedisChatHistory({
      UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
      CHAT_HISTORY_LIMIT:
        settings.telegraph.chatHistoryLimit ?? env.CHAT_HISTORY_LIMIT,
    });
    this.rateLimit = new UpstashRedisRateLimit(env);
    this.lock = new UpstashRedisLock(env);
    this.recentInteractions = env.RECENT_INTERACTIONS;
    this.settingsManager = new SettingsManager(env, settings);

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

  private messageMentionsBot(ctx: Context, userMessage: string) {
    const botName = this.bot.botInfo.first_name.toLowerCase();
    const botUsername = this.bot.botInfo.username.toLowerCase();
    const messageText = userMessage.toLowerCase() || "";

    return messageText.includes(botName) || messageText.includes(botUsername);
  }

  private async shouldBotRespond(ctx: Context, userMessage: string) {
    const isFromBot = ctx.message?.from?.id === this.bot.botInfo.id;
    const isPrivateChat = ctx.message?.chat.type === "private";
    const isReplyToBot =
      ctx.message?.reply_to_message?.from?.id === this.bot.botInfo.id;
    const mentionsBot = this.messageMentionsBot(ctx, userMessage);
    const isRecentlyInteracted = await this.isRecentlyInteracted(
      ctx.message?.chat?.id.toString() ?? "",
      ctx.message?.from?.id.toString() ?? "",
    );
    const hasQuestionMark = ctx.message?.text?.includes("?");
    const isMentioningOtherUsers =
      (ctx.message?.entities?.some((entity) => entity.type === "mention") ??
        false) &&
      !mentionsBot;

    return (
      !isFromBot &&
      (isPrivateChat ||
        isReplyToBot ||
        mentionsBot ||
        (isRecentlyInteracted && hasQuestionMark && !isMentioningOtherUsers))
    );
  }

  private async handleCommand(ctx: Context, command: string): Promise<void> {
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
      console.log("Telegraph ~ handleCommand ~ error:", command, error);
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
        await this.handleCommand(ctx, "Let me know what you can do for me."),
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
      const { keyboard } = createKeyboard(
        "settings",
        this.settingsManager.getCurrentSettings(),
      );
      await ctx.reply("⚙️ Settings", {
        reply_markup: keyboard,
      });
    });

    this.bot.on("callback_query:data", async (ctx) => {
      console.log(ctx.callbackQuery);
      const data = ctx.callbackQuery.data;
      if (data === "ㄨ") {
        await ctx.deleteMessage();
        await ctx.answerCallbackQuery();
        return;
      }
      const { keyboard, hasMenu } = createKeyboard(
        data,
        this.settingsManager.getCurrentSettings(),
      );
      if (hasMenu) {
        const message = "⚙️ Settings";
        await ctx.editMessageText(message, { reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
      }
      try {
        const chatId = ctx.callbackQuery.message?.chat.id.toString() ?? "";
        await this.settingsManager.saveSetting(chatId, data);
        const message = "✅ Settings updated";
        await ctx.editMessageText(message, { reply_markup: keyboard });
        await ctx.answerCallbackQuery({ text: "Settings updated" });
      } catch (error) {
        console.log(
          "Telegraph ~ this.bot.on:callback_query:data ~ error:",
          error,
        );
        await ctx.answerCallbackQuery({ text: "Failed to update settings" });
      }
    });
  }

  private async handleMessage(ctx: Context): Promise<void> {
    console.log("Telegraph ~ handleMessage ~ ctx.message:", ctx.message);
    try {
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
      if (!(await this.shouldBotRespond(ctx, userMessage))) {
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
      const output = await this.composeMessageOutput(ctx, response.data);
      await this.reply(ctx, output);
      await this.saveUserMessage(ctx.message?.chat?.id.toString(), {
        message: response.data,
        type: "ai",
        senderName: this.bot.botInfo.first_name,
        timestamp: this.currentTimeTool.getCurrentDateTime({
          timeZone: "Asia/Jakarta",
        }),
      });
    } catch (error) {
      console.log("Telegraph ~ handleMessage ~ error:", error);
      await ctx.reply(`${(error as Error).message}`);
    } finally {
      await this.lock.release(ctx.message?.from?.id.toString() ?? "");
    }
  }

  private async composeMessageOutput(
    ctx: Context,
    agentResponse: string,
  ): Promise<ComposeMessageOutput> {
    const chatId = ctx.message?.chat?.id.toString() ?? "";
    const messageId = ctx.message?.message_id.toString() ?? "";
    const audioLink = extractAudioLink(agentResponse);
    const photoLink = extractPhotoLink(agentResponse);
    if (photoLink) {
      return this.composeMessage(ctx, {
        message: photoLink,
        replyType: "photo",
      });
    }
    if (ctx.message?.voice || audioLink) {
      try {
        const sonataResponse = await this.sonataTool.speak({
          text: agentResponse,
          metadata: { chatId, messageId },
        });
        const replyType = sonataResponse.data ? "voice" : "text";
        return this.composeMessage(ctx, {
          message: sonataResponse.data || agentResponse,
          replyType,
        });
      } catch {
        return this.composeMessage(ctx, {
          message: agentResponse,
          replyType: "text",
        });
      }
    }
    return this.composeMessage(ctx, {
      message: agentResponse,
      replyType: "text",
    });
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
    console.log("Telegraph ~ reply ~ output.message:", output.message);
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
      return await ctx.replyWithVoice(output.message, {
        reply_to_message_id:
          output.chatType === "private" ? undefined : replyToMessageId,
      });
    }
    if (output.replyType === "photo") {
      await ctx.replyWithChatAction("upload_photo");
      return await ctx.replyWithPhoto(output.message, {
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

    try {
      if (ctx.message?.voice || ctx.message?.reply_to_message?.voice) {
        const voiceUrl = fileUrls.pop();
        return voiceUrl
          ? (await this.whisperTool.listen({ audioUrl: voiceUrl })).data
          : "";
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

      if (ctx.message?.sticker) return ctx.message.sticker.emoji || "";
      if (ctx.message?.location)
        return `Location: ${ctx.message.location.latitude}, ${ctx.message.location.longitude}`;
      if (ctx.message?.venue) return `Venue: ${ctx.message.venue.title}`;
      if (ctx.message?.contact)
        return `Contact: ${ctx.message.contact.phone_number}`;
      if (ctx.message?.video || ctx.message?.animation)
        return ctx.message.caption || "";

      if (ctx.message?.poll) {
        const question = ctx.message.poll.question || "";
        const options =
          ctx.message.poll.options
            ?.map((option) => `[${option.text}]`)
            .join(", ") || "";
        return `Polling\nQuestion: ${question}\nOptions: ${options}`;
      }

      return ctx.message?.text || "";
    } catch (error) {
      return "Error: I can't listen to this voice message.";
    }
  }

  private async trackInteractions(
    chatId: string,
    senderId: string,
  ): Promise<void> {
    const key = `${chatId}:${senderId}`;
    await this.recentInteractions.put(key, "", { expirationTtl: 5 * 60 });
  }

  private async isRecentlyInteracted(
    chatId: string,
    senderId: string,
  ): Promise<boolean> {
    const key = `${chatId}:${senderId}`;
    return this.recentInteractions.get(key) !== null;
  }
}
