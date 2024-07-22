import {
  GetWebContentInput,
  SearchGoogleInput,
} from "@packages/shared/types/explorer";
import { Hono } from "hono";
import { Explorer } from "./explorer";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.json({ message: "Hi, I'm Explorer Worker" });
});

app.post("/search-google", async (c) => {
  try {
    const input = SearchGoogleInput.parse(await c.req.json());
    const explorer = new Explorer(c.env);
    const response = await explorer.searchGoogle(input);
    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({ error: `${error}` }, { status: 400 });
  }
});

app.post("/get-web-content", async (c) => {
  try {
    const input = GetWebContentInput.parse(await c.req.json());
    const explorer = new Explorer(c.env);
    const response = await explorer.getWebContent(input);
    return c.json(response);
  } catch (error) {
    console.error(error);
    return c.json({ error: `${error}` }, { status: 400 });
  }
});

export default app;
