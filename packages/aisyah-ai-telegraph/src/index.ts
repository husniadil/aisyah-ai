import { sendMessage } from "@packages/shared/telegram";
import { AgentTool } from "@packages/shared/tools/agent";
import { TelegraphSettings } from "@packages/shared/types/settings";
import type { Message, Update } from "grammy/types";
import { Telegraph } from "./telegraph";

import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({ message: "Hi, I'm Telegraph Worker" });
});

app.post("/webhooks/telegram/setup", async (c) => {
  const url = `https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${c.req.url.replace("/setup", "")}`;
  return await fetch(url);
});

app.post("/webhooks/reminders-api", async (c) => {
  try {
    const body = (await c.req.json()) as {
      reminders_notified: { title: string }[];
    };
    if (!body.reminders_notified || body.reminders_notified.length === 0) {
      return c.json("No reminders to handle.\n");
    }
    const [chatId, topic] = body.reminders_notified[0].title.split(":");
    if (!chatId || !topic) {
      return c.json("Invalid reminder format.\n");
    }
    const question = `Please make an announcement about this now, respond in your language: ${topic}`;

    const agent = new AgentTool(c.env.AISYAH_AI_AGENT);

    const response = await agent.chat({
      chatId,
      messageId: "0",
      senderId: "0",
      senderName: "",
      message: question,
      chatHistory: [],
    });

    return await sendMessage({
      telegramApiBaseUrl: c.env.TELEGRAM_API_BASE_URL,
      botToken: c.env.TELEGRAM_BOT_TOKEN,
    })({
      chatId,
      text: response.data,
    });
  } catch (error) {
    console.error("Failed to handle reminder:", error);
  }
  return c.json("OK\n");
});

app.mount(
  "/webhooks/telegram",
  async (request, env: Env, ctx: ExecutionContext) => {
    const input = (await request.clone().json()) as {
      message: Message | Update.NonChannel;
    };
    const chatId = input.message.chat.id.toString();
    const settings = (await env.SETTINGS.get(chatId)) || "{}";
    const parsedSettings = TelegraphSettings.parse(JSON.parse(settings));
    const telegraph = new Telegraph(ctx, env, parsedSettings);
    return await telegraph.start(request);
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
