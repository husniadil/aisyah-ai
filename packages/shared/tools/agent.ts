import { DynamicStructuredTool } from "langchain/tools";
import { ChatInput, ChatOutput } from "../types/agent";
import type { AgentSettings, ISettings } from "../types/settings";

export class AgentTool
  extends DynamicStructuredTool
  implements ISettings<AgentSettings>
{
  private fetcher: Fetcher;
  private bindUrl: string;
  private readonly postRequestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  constructor(fetcher: Fetcher, bindUrl: string) {
    super({
      name: "ask_agent",
      schema: ChatInput,
      description: "Useful for interacting with the AI agent",
      func: (input: ChatInput) => {
        console.log("AgentTool ~ input:", input);
        return this.chat(input).then((output) => output.data);
      },
    });
    this.fetcher = fetcher;
    this.bindUrl = bindUrl;
  }

  async chat(input: ChatInput): Promise<ChatOutput> {
    const { chatId, messageId, senderId, senderName, message } = input;
    console.log("AgentTool ~ chat ~ input:", {});
    const response = await this.fetcher.fetch(`${this.bindUrl}/chat`, {
      ...this.postRequestInit,
      body: JSON.stringify(input),
    });
    return ChatOutput.parse(await response.json());
  }

  async getSettings(key: string): Promise<AgentSettings> {
    console.log("AgentTool ~ getSettings ~ key:", key);
    const response = await this.fetcher.fetch(
      `${this.bindUrl}/settings/${key}`,
    );
    return (await response.json()) as AgentSettings;
  }

  async setSettings(key: string, settings: AgentSettings): Promise<void> {
    console.log("AgentTool ~ setSettings ~ key ~ settings:", key, settings);
    return await this.fetcher
      .fetch(`${this.bindUrl}/settings/${key}`, {
        ...this.postRequestInit,
        body: JSON.stringify({
          ...settings,
        }),
      })
      .then(() => undefined);
  }

  async clearSettings(key: string): Promise<void> {
    console.log("AgentTool ~ clearSettings ~ key:", key);
    return await this.fetcher
      .fetch(`${this.bindUrl}/settings/${key}`, {
        method: "DELETE",
      })
      .then(() => undefined);
  }
}
