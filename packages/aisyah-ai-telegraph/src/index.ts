import { fetchWithTimeout } from "@packages/shared/fetcher";
import { sendMessage } from "@packages/shared/telegram";
import { AgentTool } from "@packages/shared/tools/agent";
import { SonataTool } from "@packages/shared/tools/sonata";
import { Settings, TelegraphSettings } from "@packages/shared/types/settings";
import { AuthInput, MessageInput } from "@packages/shared/types/telegram";
import type { Message, Update } from "grammy/types";
import { Telegraph } from "./telegraph";

import { Hono } from "hono";

const getSettings = async (env: Env, chatId: string) => {
  const telegraphSettings = TelegraphSettings.parse(
    JSON.parse((await env.SETTINGS.get(chatId)) || "{}"),
  );
  const agentTool = new AgentTool(
    env.AISYAH_AI_AGENT,
    `https://aisyah-ai-agent.${env.CLOUDFLARE_SUBDOMAIN}`,
  );
  const agentSettings = await agentTool.getSettings(chatId);
  const sonataTool = new SonataTool(
    env.AISYAH_AI_SONATA,
    `https://aisyah-ai-sonata.${env.CLOUDFLARE_SUBDOMAIN}`,
  );
  const sonataSettings = await sonataTool.getSettings(chatId);
  return {
    telegraph: telegraphSettings,
    agent: agentSettings,
    sonata: sonataSettings,
  };
};

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  return c.json({
    message: "Hi, I'm Telegraph Worker",
  });
});

app.post("/webhooks/telegram/setup", async (c) => {
  const url = `https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${c.req.url.replace("/setup", "")}`;
  await fetchWithTimeout(url);
  return c.json({ message: "Webhook setup done" });
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

    const authInput = AuthInput.parse({
      telegramApiBaseUrl: c.env.TELEGRAM_API_BASE_URL,
      botToken: c.env.TELEGRAM_BOT_TOKEN,
    });
    const messageInput = MessageInput.parse({
      chatId: title,
      text: notes,
    });
    return await sendMessage(authInput)(messageInput);
  } catch (error) {
    console.log("app.post ~ error:", error);
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

      const telegraph = new Telegraph(ctx, env, await getSettings(env, chatId));
      return await telegraph.start(request);
    } catch (error) {
      console.log("error:", error);
      return new Response();
    }
  },
);

app.get("/settings/:key", async (c) => {
  const key = c.req.param("key");
  const settings = await getSettings(c.env, key);
  return c.json(settings);
});

app.post("/settings/:key", async (c) => {
  try {
    const key = c.req.param("key");

    const settings = Settings.parse(await c.req.json());
    if (settings.telegraph) {
      await c.env.SETTINGS.put(key, JSON.stringify(settings.telegraph));
    }

    if (settings.agent) {
      const agentTool = new AgentTool(
        c.env.AISYAH_AI_AGENT,
        `https://aisyah-ai-agent.${c.env.CLOUDFLARE_SUBDOMAIN}`,
      );
      await agentTool.setSettings(key, settings.agent);
    }

    if (settings.sonata) {
      const sonataTool = new SonataTool(
        c.env.AISYAH_AI_SONATA,
        `https://aisyah-ai-sonata.${c.env.CLOUDFLARE_SUBDOMAIN}`,
      );
      await sonataTool.setSettings(key, settings.sonata);
    }

    return c.json({ message: "Settings saved" });
  } catch (error) {
    console.log("app.post ~ error:", error);
    return c.json({ error }, { status: 400 });
  }
});

app.delete("/settings/:key", async (c) => {
  const key = c.req.param("key");
  await c.env.SETTINGS.delete(key);
  const agentTool = new AgentTool(
    c.env.AISYAH_AI_AGENT,
    `https://aisyah-ai-agent.${c.env.CLOUDFLARE_SUBDOMAIN}`,
  );
  await agentTool.clearSettings(key);
  const sonataTool = new SonataTool(
    c.env.AISYAH_AI_SONATA,
    `https://aisyah-ai-sonata.${c.env.CLOUDFLARE_SUBDOMAIN}`,
  );
  await sonataTool.clearSettings(key);
  return c.json({ message: "Settings deleted" });
});

export default app;
