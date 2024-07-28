import { Agent } from "@packages/aisyah-ai-agent/src/agent";
import { ChatInput } from "@packages/shared/types/agent";
import { AgentSettings } from "@packages/shared/types/settings";
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({ message: "Hi, I'm Agent Worker" });
});

app.post("/chat", async (c) => {
  try {
    const input = ChatInput.parse(await c.req.json());
    const settings = (await c.env.SETTINGS.get(input.chatId)) || "{}";
    const parsedSettings = AgentSettings.parse(JSON.parse(settings));
    const agent = new Agent(c.env, parsedSettings, input.senderId);
    const response = await agent.chat(input);
    return c.json(response);
  } catch (error) {
    console.log("app.post ~ error:", error);
    return c.json({ error }, { status: 400 });
  }
});

app.post("/chat/stream", async (c) => {
  const input = ChatInput.parse(await c.req.json());
  const settings = (await c.env.SETTINGS.get(input.chatId)) || "{}";
  const parsedSettings = AgentSettings.parse(JSON.parse(settings));
  const agent = new Agent(c.env, parsedSettings, input.senderId);
  const streamData: string = (await agent.chat(input)).data;
  const chunkSize = 2;
  const delayMs = 10;

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    start(controller) {
      const chunks =
        streamData.match(new RegExp(`.{1,${chunkSize}}`, "g")) || [];
      chunks.forEach((chunk, index) => {
        setTimeout(() => {
          controller.enqueue(encoder.encode(chunk));
          if (index === chunks.length - 1) {
            controller.close();
          }
        }, index * delayMs);
      });
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain" },
  });
});

app.get("/settings/:key", async (c) => {
  const key = c.req.param("key");
  const settings = await c.env.SETTINGS.get(key);
  return c.json(JSON.parse(settings || "{}"));
});

app.post("/settings/:key", async (c) => {
  try {
    const key = c.req.param("key");
    const settings = await c.req.json();
    console.log("app.post ~ key ~ settings:", key, settings);
    const parsedSettings = AgentSettings.parse(settings);
    await c.env.SETTINGS.put(key, JSON.stringify(parsedSettings));
    return c.json({ message: "Settings saved" });
  } catch (error) {
    console.log("app.post ~ error:", error);
    return c.json({ error }, { status: 400 });
  }
});

app.delete("/settings/:key", async (c) => {
  const key = c.req.param("key");
  await c.env.SETTINGS.delete(key);
  return c.json({ message: "Settings deleted" });
});

export default app;
