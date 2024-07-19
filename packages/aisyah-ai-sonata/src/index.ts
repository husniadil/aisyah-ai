import { z } from "zod";
import { Tts } from "./tts";

const requestSchema = z.object({
  text: z.string().describe("The text to be spoken"),
  metadata: z.object({
    chatId: z.string().describe("The chat ID"),
    messageId: z.string().describe("The message ID"),
  }),
});

async function handlePostRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const {
      text,
      metadata: { chatId, messageId },
    } = requestSchema.parse(await request.json());

    const tts = new Tts(env);
    const audioUrl = await tts.speak(text, { chatId, messageId });

    return Response.json({ audioUrl });
  } catch (error) {
    return Response.json({ error: `${error}` }, { status: 400 });
  }
}

export default {
  async fetch(
    request: Request<unknown, IncomingRequestCfProperties<unknown>>,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const { method, url } = request;

    if (method === "GET") {
      return Response.json({ message: "Hi, I'm Sonata Worker" });
    }

    if (method !== "POST") {
      return Response.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    if (new URL(url).pathname !== "/speak") {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    return handlePostRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
