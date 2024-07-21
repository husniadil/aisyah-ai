import {
  getWebContentInputSchema,
  searchGoogleInputSchema,
} from "@packages/shared/types/explorer";
import { Explorer } from "./explorer";

async function handleGoogleSearchRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const input = searchGoogleInputSchema.parse(await request.json());
    const explorer = new Explorer(env);
    const searchResult = await explorer.searchGoogle(input);
    return Response.json(searchResult);
  } catch (error) {
    console.error(error);
    return Response.json({ error: `${error}` }, { status: 400 });
  }
}

async function handleGetWebContentRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const input = getWebContentInputSchema.parse(await request.json());
    const explorer = new Explorer(env);
    const searchResult = await explorer.getWebContent(input);
    return Response.json(searchResult);
  } catch (error) {
    console.error(error);
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
      return Response.json({ message: "Hi, I'm Explorer Worker" });
    }

    if (method !== "POST") {
      return Response.json({ error: "Method Not Allowed" }, { status: 405 });
    }

    if (new URL(url).pathname === "/search-google") {
      return handleGoogleSearchRequest(request, env);
    }
    if (new URL(url).pathname === "/get-web-content") {
      return handleGetWebContentRequest(request, env);
    }
    return Response.json({ error: "Not Found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
