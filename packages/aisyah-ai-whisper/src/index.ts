import { ListenInput } from "@packages/shared/types/whisper";
import { Hono } from "hono";
import { Whisper } from "./whisper";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({ message: "Hi, I'm Whisper Worker" });
});

app.post("/listen", async (c) => {
  try {
    const input = ListenInput.parse(await c.req.json());
    const whisper = new Whisper(c.env);
    const response = await whisper.listen(input);
    return c.json(response);
  } catch (error) {
    console.log("app.post ~ error:", error);
    return c.json({ error }, { status: 400 });
  }
});

export default app;
