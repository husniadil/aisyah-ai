/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { generateRandomNumber, generateRandomString } from "@packages/shared";

export default {
  async fetch(
    request: Request<unknown, IncomingRequestCfProperties<unknown>>,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const randomString = generateRandomString(10);
    const randomNumber = generateRandomNumber(5, 10);

    // await env.MY_KV_NAMESPACE.put("Hello", "World");

    const response = {
      message: "Hello World!",
      randomString,
      randomNumber,
      env: {
        ...env,
        // MY_KV_NAMESPACE: await Promise.all(
        // 	(await env.MY_KV_NAMESPACE.list()).keys.map(async (key) => ({
        // 		[key.name]: await env.MY_KV_NAMESPACE.get(key.name),
        // 	})),
        // ),
      },
    };
    return Response.json(response);
  },
} satisfies ExportedHandler<Env>;
