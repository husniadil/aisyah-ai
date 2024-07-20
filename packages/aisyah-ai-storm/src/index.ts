import { inputSchema } from "/Users/husni/github.com/husniadil/aisyah-ai/packages/shared/types/storm";
import { Storm } from "./storm";

async function handlePostRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const input = inputSchema.parse(await request.json());
    const storm = new Storm(env);
    const prediction = await storm.predict(input);

    return Response.json({ prediction });
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
      return Response.json({ message: "Hi, I'm Storm Worker" });
    }

    if (method !== "POST") {
      return Response.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    if (new URL(url).pathname !== "/predict") {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    return handlePostRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
