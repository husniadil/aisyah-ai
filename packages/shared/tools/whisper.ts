import { DynamicStructuredTool } from "langchain/tools";
import { ListenInput, ListenOutput } from "../types/whisper";

export class WhisperTool extends DynamicStructuredTool {
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
      name: "speech_to_test",
      schema: ListenInput,
      description: "Useful for listening to audio",
      func: (input: ListenInput) => {
        console.log("WhisperTool ~ input:", input);
        return this.listen(input).then((output) => output.data);
      },
    });
    this.fetcher = fetcher;
    this.bindUrl = bindUrl;
  }

  async listen(input: ListenInput): Promise<ListenOutput> {
    try {
      const response = await this.fetcher.fetch(`${this.bindUrl}/listen`, {
        ...this.postRequestInit,
        body: JSON.stringify(input),
      });
      return ListenOutput.parse(await response.json());
    } catch (error) {
      console.log("WhisperTool ~ listen ~ error:", input, error);
      throw error;
    }
  }
}
