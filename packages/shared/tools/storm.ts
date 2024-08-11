import { DynamicStructuredTool } from "langchain/tools";
import { GetWeatherInput, GetWeatherOutput } from "../types/storm";

export class StormTool extends DynamicStructuredTool {
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
      name: "get_weather",
      schema: GetWeatherInput,
      description: "Useful for predicting weather",
      func: (input: GetWeatherInput) => {
        console.log("StormTool ~ input:", input);
        return this.getWeather(input).then(JSON.stringify);
      },
    });
    this.fetcher = fetcher;
    this.bindUrl = bindUrl;
  }

  async getWeather(input: GetWeatherInput): Promise<GetWeatherOutput> {
    try {
      const response = await this.fetcher.fetch(`${this.bindUrl}/predict`, {
        ...this.postRequestInit,
        body: JSON.stringify(input),
      });
      return GetWeatherOutput.parse(await response.json());
    } catch (error) {
      console.log("StormTool ~ getWeather ~ error:", input, error);
      throw error;
    }
  }
}
