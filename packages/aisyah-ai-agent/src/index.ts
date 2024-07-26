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
