import { RemindInput } from "@packages/shared/types/reminder";
import { Hono } from "hono";
import { Reminder } from "./reminder";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({ message: "Hi, I'm Reminder Worker!" });
});

app.post("/remind", async (c) => {
  try {
    const input = RemindInput.parse(await c.req.json());
    const reminder = new Reminder(c.env);
    const response = await reminder.remind(input);
    console.log("XXX", response);
    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({ error }, { status: 400 });
  }
});

export default app;
