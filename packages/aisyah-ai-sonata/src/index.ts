import { Sonata, inputSchema } from "./sonata";

async function handlePostRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const input = inputSchema.parse(await request.json());
    const sonata = new Sonata(env);
    const audioUrl = await sonata.speak(input);

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
