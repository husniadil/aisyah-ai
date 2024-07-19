import { Whisper } from "@packages/shared";
import { z } from "zod";

const requestSchema = z.object({
  audioUrl: z.string().url().describe("URL of the audio file to transcribe"),
});

async function handlePostRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const { audioUrl } = requestSchema.parse(await request.json());

    const whisper = new Whisper(env.OPENAI_API_KEY);
    const transcription = await whisper.listen(audioUrl);

    return Response.json({ transcription });
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
      return Response.json({ message: "Hi, I'm Whisper Worker" });
    }

    if (method !== "POST") {
      return Response.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    if (new URL(url).pathname !== "/listen") {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    return handlePostRequest(request, env);
  },
} satisfies ExportedHandler<Env>;
