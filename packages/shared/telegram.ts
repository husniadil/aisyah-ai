import { fetchWithTimeout } from "./fetcher";
import type { AuthInput, MessageInput } from "./types/telegram";

export const sendMessage =
  (input: AuthInput) =>
  async (message: MessageInput): Promise<void> => {
    const url = `${input.telegramApiBaseUrl}/bot${input.botToken}/sendMessage?chat_id=${message.chatId}&text=${encodeURIComponent(message.text)}`;
    await fetchWithTimeout(url);
  };

export const getFileUrl = (config: AuthInput) => (filePath?: string) => {
  return filePath
    ? `${config.telegramApiBaseUrl}/file/bot${config.botToken}/${filePath}`
    : undefined;
};

export const getFile = (config: AuthInput) => async (fileId?: string) => {
  if (!fileId) {
    return undefined;
  }
  try {
    const url = `${config.telegramApiBaseUrl}/bot${config.botToken}/getFile?file_id=${fileId}`;
    const response = await fetchWithTimeout(url);
    return (await response.json()) as { result: { file_path: string } };
  } catch (error) {
    console.log("getFile ~ error:", fileId, error);
    return undefined;
  }
};
