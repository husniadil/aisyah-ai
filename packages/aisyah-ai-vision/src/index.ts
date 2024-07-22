import { DescribeInput } from "@packages/shared/types/vision";
import { Hono } from "hono";
import { Vision } from "./vision";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({ message: "Hi, I'm Vision Worker" });
});

app.post("/describe", async (c) => {
  try {
    const input = DescribeInput.parse(await c.req.json());
    const vision = new Vision(c.env);
    const response = await vision.describe(input);
    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({ error: `${error}` }, { status: 400 });
  }
});

export default app;
