import type { z } from "zod";
import type {
  IStorm,
  inputSchema,
  outputSchema,
} from "/Users/husni/github.com/husniadil/aisyah-ai/packages/shared/types/storm";

interface Env {
  OPEN_WEATHER_MAP_API_KEY: string;
  OPEN_WEATHER_MAP_BASE_URL: string;
}

export class Storm implements IStorm {
  private createUrl: (input: z.infer<typeof inputSchema>) => string;

  constructor(env: Env) {
    this.createUrl = (input: z.infer<typeof inputSchema>) =>
      `${env.OPEN_WEATHER_MAP_BASE_URL}/data/2.5/weather?q=${input.city}&appid=${env.OPEN_WEATHER_MAP_API_KEY}&units=${input.unit}`;
  }

  async predict(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>> {
    const { city, unit } = input;
    const url = this.createUrl(input);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const message = `Failed to fetch weather data for city: ${city} with unit: ${unit}`;
        console.error(message);
        throw new Error(message);
      }
      return (await response.json()) as z.infer<typeof outputSchema>;
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
      throw error;
    }
  }
}
