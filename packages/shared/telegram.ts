import type { z } from "zod";
import type { configSchema, messageSchema } from "./types/telegram";

export const sendMessage =
  (input: z.infer<typeof configSchema>) =>
  async (message: z.infer<typeof messageSchema>): Promise<void> => {
    const url = `${input.telegramApiBaseUrl}/bot${input.botToken}/sendMessage?chat_id=${message.chatId}&text=${encodeURIComponent(message.text)}`;
    await fetch(url);
  };

export const getFileUrl =
  (config: z.infer<typeof configSchema>) => (filePath?: string) => {
    return filePath
      ? `${config.telegramApiBaseUrl}/file/bot${config.botToken}/${filePath}`
      : undefined;
  };

export const getFile =
  (config: z.infer<typeof configSchema>) => async (fileId?: string) => {
    if (!fileId) {
      return undefined;
    }
    try {
      const url = `${config.telegramApiBaseUrl}/bot${config.botToken}/getFile?file_id=${fileId}`;
      const response = await fetch(url);
      return (await response.json()) as { result: { file_path: string } };
    } catch (error) {
      console.error("Failed to get file:", error);
      return undefined;
    }
  };

export const isContainingAudioLink = (text?: string): boolean => {
  const audioLinkRegex = /\/\/\S+\.(mp3|wav|ogg)/g;
  return !!text && audioLinkRegex.test(text);
};

export const extractAudioLink = (text?: string): string | undefined => {
  const audioLinkRegex = /\/\/\S+\.(mp3|wav|ogg)/g;
  const match = text?.match(audioLinkRegex);
  return match ? match[0] : undefined;
};
