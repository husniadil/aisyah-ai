import { DynamicStructuredTool } from "langchain/tools";
import type { ISettings, SonataSettings } from "../types/settings";
import { SpeakInput, SpeakOutput } from "../types/sonata";

export class SonataTool
  extends DynamicStructuredTool
  implements ISettings<SonataSettings>
{
  private readonly fetcher: Fetcher;
  private readonly bindUrl: string;
  private readonly postRequestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  constructor(fetcher: Fetcher, bindUrl: string) {
    super({
      name: "text_to_speech",
      schema: SpeakInput,
      description: "Useful for speaking text",
      func: (input: SpeakInput) => {
        console.log("SonataTool ~ input:", input);
        return this.speak(input).then((output) => output.data);
      },
    });
    this.fetcher = fetcher;
    this.bindUrl = bindUrl;
  }

  async speak(input: SpeakInput): Promise<SpeakOutput> {
    try {
      const response = await this.fetcher.fetch(`${this.bindUrl}/speak`, {
        ...this.postRequestInit,
        body: JSON.stringify(input),
      });
      return SpeakOutput.parse(await response.json());
    } catch (error) {
      console.log("SonataTool ~ speak ~ error:", input, error);
      throw error;
    }
  }

  async getSettings(key: string): Promise<SonataSettings> {
    const response = await this.fetcher.fetch(
      `${this.bindUrl}/settings/${key}`,
    );
    return (await response.json()) as SonataSettings;
  }

  async setSettings(key: string, settings: SonataSettings): Promise<void> {
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
    return await this.fetcher
      .fetch(`${this.bindUrl}/settings/${key}`, {
        method: "DELETE",
      })
      .then(() => undefined);
  }
}
