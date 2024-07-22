import { SonataSettings } from "@packages/shared/types/settings";
import { SpeakInput } from "@packages/shared/types/sonata";
import { Hono } from "hono";
import { Sonata } from "./sonata";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({ message: "Hi, I'm Sonata Worker" });
});

app.post("/speak", async (c) => {
  try {
    const input = SpeakInput.parse(await c.req.json());
    const settings = (await c.env.SETTINGS.get(input.metadata.chatId)) || "{}";
    const parsedSettings = SonataSettings.parse(JSON.parse(settings));
    const sonata = new Sonata(c.env, parsedSettings);
    const response = await sonata.speak(input);
    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({ error: `${error}` }, { status: 400 });
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
    const parsedSettings = SonataSettings.parse(settings);
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
