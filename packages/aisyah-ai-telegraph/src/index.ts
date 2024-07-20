import { sendMessage } from "@packages/shared/telegram";
import { outputSchema as agentOutputSchema } from "@packages/shared/types/agent";
import { Bot, webhookCallback } from "grammy";
import type { z } from "zod";
import { Telegraph } from "./telegraph";

const askAgent = async (
  env: Env,
  question: string,
): Promise<z.infer<typeof agentOutputSchema>> => {
  const input = {
    chatId: "",
    messageId: "",
    senderId: "",
    senderName: "",
    message: question,
    chatHistory: [],
  };
  const response = await env.AISYAH_AI_AGENT.fetch(
    "https://aisyah-ai-agent.husni-adil-makmur.workers.dev",
    {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  return agentOutputSchema.parse(await response.json());
};

const handleRemindersApi = async (
  request: Request<unknown, IncomingRequestCfProperties<unknown>>,
  env: Env,
  ctx: ExecutionContext,
) => {
  try {
    const body = (await request.json()) as {
      reminders_notified: { title: string }[];
    };
    if (!body.reminders_notified || body.reminders_notified.length === 0) {
      return new Response("No reminders to handle.\n");
    }
    const [chatId, topic] = body.reminders_notified[0].title.split(":");
    if (!chatId || !topic) {
      return new Response("Invalid reminder format.\n");
    }
    const question = `Tolong buatkan himbauan tentang ini sekarang, respon dengan bahasa gaul: ${topic}`;
    const response = await askAgent(env, question);
    return await sendMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId,
      text: response,
    });
  } catch (error) {
    console.error("Failed to handle reminder:", error);
  }
};

export default {
  async fetch(
    request: Request<unknown, IncomingRequestCfProperties<unknown>>,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/webhooks/telegram") {
      const bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
        botInfo: JSON.parse(env.TELEGRAM_BOT_INFO),
      });
      const telegraph = new Telegraph(env);
      bot.command("start", telegraph.handleStartCommand);
      bot.command("description", telegraph.handleDescriptionCommand);
      bot.command("forget", telegraph.handleForgetCommand);
      bot.on("message:new_chat_members:me", telegraph.handleNewChatMembersMe);
      bot.on("message:left_chat_member:me", telegraph.handleLeftChatMemberMe);
      bot.on("message:new_chat_members:me", telegraph.handleNewChatMembers);
      bot.on("message:new_chat_members", telegraph.handleNewChatMembers);
      bot.on("message:left_chat_member", telegraph.handleLeftChatMember);
      bot.on("message:new_chat_photo", telegraph.handleNewChatPhoto);
      bot.on(
        "edited_message:delete_chat_photo",
        telegraph.handleDeleteChatPhoto,
      );
      bot.on("message:delete_chat_photo", telegraph.handleDeleteChatPhoto);
      bot.on("message:new_chat_title", telegraph.handleNewChatTitle);
      bot.on("message:chat_background_set", telegraph.handleChatBackgroundSet);
      bot.on(
        "edited_message:chat_background_set",
        telegraph.handleChatBackgroundSet,
      );
      bot.on("message:pinned_message", telegraph.handlePinnedMessage);
      bot.on("message", telegraph.handleMessage);
      return webhookCallback(bot, "cloudflare-mod")(request);
    }

    if (path === "/webhooks/reminders-api") {
      try {
        await handleRemindersApi(request, env, ctx);
      } catch (error) {
        console.error(error);
      }
      return new Response("OK\n");
    }

    return Response.json({ error: "Not Found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
