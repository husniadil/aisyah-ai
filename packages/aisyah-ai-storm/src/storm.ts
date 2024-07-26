import { fetchWithTimeout } from "@packages/shared/fetcher";
import {
  type GetWeatherInput,
  GetWeatherOutput,
  type IStorm,
} from "@packages/shared/types/storm";

interface Env {
  OPEN_WEATHER_MAP_API_KEY: string;
  OPEN_WEATHER_MAP_BASE_URL: string;
}

export class Storm implements IStorm {
  private createUrl: (input: GetWeatherInput) => string;

  constructor(env: Env) {
    this.createUrl = (input: GetWeatherInput) =>
      `${env.OPEN_WEATHER_MAP_BASE_URL}/data/2.5/weather?q=${input.city}&appid=${env.OPEN_WEATHER_MAP_API_KEY}&units=${input.unit}`;
  }

  async predict(input: GetWeatherInput): Promise<GetWeatherOutput> {
    console.log("Storm ~ predict ~ input:", input);
    const { city, unit } = input;
    const url = this.createUrl(input);
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        const message = `Failed to fetch weather data for city: ${city} with unit: ${unit}`;
        console.log("Storm ~ predict ~ message:", message);
        throw new Error(message);
      }
      return GetWeatherOutput.parse(await response.json());
    } catch (error) {
      console.log("Storm ~ predict ~ error:", input, error);
      throw error;
    }
  }
}
