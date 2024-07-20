import type { z } from "zod";
import type { inputSchema, outputSchema } from "./types/telegram";

export const sendMessage = async (
  input: z.infer<typeof inputSchema>,
): Promise<z.infer<typeof outputSchema>> => {
  const url = `https://api.telegram.org/bot${input.botToken}/sendMessage?chat_id=${input.chatId}&text=${encodeURIComponent(input.text)}`;
  await fetch(url);
};
