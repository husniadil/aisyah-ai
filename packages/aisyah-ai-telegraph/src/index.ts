import { sendMessage } from "@packages/shared/telegram";
import {
  type inputSchema as agentInputSchema,
  outputSchema as agentOutputSchema,
} from "@packages/shared/types/agent";
import type { z } from "zod";
import { Telegraph } from "./telegraph";

const askAgent = async (
  env: Env,
  input: z.infer<typeof agentInputSchema>,
): Promise<string> => {
  const response = await env.AISYAH_AI_AGENT.fetch(
    "https://aisyah-ai-agent.husni-adil-makmur.workers.dev/chat",
    {
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  return agentOutputSchema.parse(await response.json()).response;
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
    const question = `Please remind me in your language about this one: ${topic}`;
    const response = await askAgent(env, {
      chatId,
      messageId: "0",
      senderId: "0",
      senderName: "",
      message: question,
      chatHistory: [],
    });
    return await sendMessage({
      telegramApiBaseUrl: env.TELEGRAM_API_BASE_URL,
      botToken: env.TELEGRAM_BOT_TOKEN,
    })({
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
      const telegraph = new Telegraph(ctx, env);
      return telegraph.start(request);
    }

    if (path === "/webhooks/telegram/setup") {
      const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${request.url.replace("/setup", "")}`;
      return await fetch(url);
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
