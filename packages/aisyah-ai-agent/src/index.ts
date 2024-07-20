import { Agent } from "@packages/aisyah-ai-agent/src/agent";
import { inputSchema } from "@packages/shared/types/agent";

async function handlePostRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const input = inputSchema.parse(await request.json());
    const { senderId } = input;
    const agent = new Agent(env, senderId);
    const response = await agent.chat(input);

    return Response.json({ response });
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
      return Response.json({ message: "Hi, I'm Aisyah!" });
    }

    if (method !== "POST") {
      return Response.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    if (new URL(url).pathname !== "/chat") {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    return handlePostRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
