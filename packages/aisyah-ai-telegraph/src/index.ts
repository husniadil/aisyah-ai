import { sendMessage } from "@packages/shared/telegram";
import { AgentTool } from "@packages/shared/tools/agent";
import { SonataTool } from "@packages/shared/tools/sonata";
import { TelegraphSettings } from "@packages/shared/types/settings";
import { AuthInput, MessageInput } from "@packages/shared/types/telegram";
import type { Message, Update } from "grammy/types";
import { Telegraph } from "./telegraph";

import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  return c.json({
    message: "Hi, I'm Telegraph Worker",
  });
});

app.post("/webhooks/telegram/setup", async (c) => {
  const url = `https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${c.req.url.replace("/setup", "")}`;
  return await fetch(url);
});

app.post("/webhooks/reminders-api", async (c) => {
  try {
    const body = (await c.req.json()) as {
      reminders_notified: { title: string; notes: string }[];
    };
    if (!body.reminders_notified || body.reminders_notified.length === 0) {
      return c.json("No reminders to handle.\n");
    }
    const { title, notes } = body.reminders_notified[0];
    if (!title || !notes) {
      return c.json("Invalid reminder format.\n");
    }
    const question = `Tolong buatkan himbauan tentang ini sekarang, respon dengan gayamu: ${title}`;

    const agent = new AgentTool(c.env.AISYAH_AI_AGENT);

    const response = await agent.chat({
      chatId: notes,
      messageId: "0",
      senderId: "0",
      senderName: "",
      message: question,
      chatHistory: [],
    });

    const authInput = AuthInput.parse({
      telegramApiBaseUrl: c.env.TELEGRAM_API_BASE_URL,
      botToken: c.env.TELEGRAM_BOT_TOKEN,
    });
    const messageInput = MessageInput.parse({
      chatId: notes,
      text: response.data,
    });
    return await sendMessage(authInput)(messageInput);
  } catch (error) {
    console.error("Failed to handle reminder:", error);
  }
  return c.json("OK\n");
});

app.mount(
  "/webhooks/telegram",
  async (request, env: Env, ctx: ExecutionContext) => {
    try {
      const input = (await request.clone().json()) as {
        message?: Message | Update.NonChannel;
        callback_query?: {
          message?: Message | Update.NonChannel;
        };
      };
      const chatId =
        input.message?.chat.id.toString() ||
        input.callback_query?.message?.chat.id.toString();
      if (!chatId) {
        return new Response();
      }

      const telegraphSettings = TelegraphSettings.parse(
        JSON.parse((await env.SETTINGS.get(chatId)) || "{}"),
      );
      const agentTool = new AgentTool(env.AISYAH_AI_AGENT);
      const agentSettings = await agentTool.getSettings(chatId);
      const sonataTool = new SonataTool(env.AISYAH_AI_SONATA);
      const sonataSettings = await sonataTool.getSettings(chatId);

      const telegraph = new Telegraph(ctx, env, {
        telegraph: telegraphSettings,
        agent: agentSettings,
        sonata: sonataSettings,
      });

      return await telegraph.start(request);
    } catch (error) {
      console.error("Failed to handle telegram webhook:", error);
      return new Response();
    }
  },
);

app.get("/settings/:key", async (c) => {
  const key = c.req.param("key");
  const settings = await c.env.SETTINGS.get(key);
  return c.json(JSON.parse(settings || "{}"));
});

app.post("/settings/:key", async (c) => {
  try {
    const key = c.req.param("key");
    const settings = await c.req.json();
    const parsedSettings = TelegraphSettings.parse(settings);
    await c.env.SETTINGS.put(key, JSON.stringify(parsedSettings));
    return c.json({ message: "Settings saved" });
  } catch (error) {
    console.error(error);
    return c.json({ error }, { status: 400 });
  }
});

app.delete("/settings/:key", async (c) => {
  const key = c.req.param("key");
  await c.env.SETTINGS.delete(key);
  return c.json({ message: "Settings deleted" });
});

export default app;
