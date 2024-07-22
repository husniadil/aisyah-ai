import { Hono } from "hono";
import { GetWeatherInput } from "/Users/husni/github.com/husniadil/aisyah-ai/packages/shared/types/storm";
import { Storm } from "./storm";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({ message: "Hi, I'm Storm Worker" });
});

app.post("/predict", async (c) => {
  try {
    const input = GetWeatherInput.parse(await c.req.json());
    const storm = new Storm(c.env);
    const response = await storm.predict(input);
    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({ error: `${error}` }, { status: 400 });
  }
});

export default app;
