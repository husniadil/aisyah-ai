import { z } from "zod";

export const GetWeatherInput = z.object({
  city: z.string().describe("The city name to get the weather"),
  unit: z
    .enum(["metric", "imperial", "standard"])
    .optional()
    .default("metric")
    .describe("The unit of measurement"),
});

export const GetWeatherOutput = z.object({
  coord: z
    .object({
      lon: z.number().optional().describe("The longitude of the city"),
      lat: z.number().optional().describe("The latitude of the city"),
    })
    .optional()
    .describe("The coordinates of the city"),
  weather: z
    .array(
      z
        .object({
          id: z.number().optional().describe("The weather id"),
          main: z.string().optional().describe("The weather main"),
          description: z
            .string()
            .optional()
            .describe("The weather description"),
          icon: z.string().optional().describe("The weather icon"),
        })
        .optional(),
    )
    .optional()
    .describe("The weather condition"),
  base: z.string().optional().describe("The base"),
  main: z
    .object({
      temp: z.number().optional().describe("The temperature"),
      feels_like: z.number().optional().describe("The feels like temperature"),
      temp_min: z.number().optional().describe("The minimum temperature"),
      temp_max: z.number().optional().describe("The maximum temperature"),
      pressure: z.number().optional().describe("The pressure"),
      humidity: z.number().optional().describe("The humidity"),
      sea_level: z.number().optional().describe("The sea level"),
      grnd_level: z.number().optional().describe("The ground level"),
    })
    .optional()
    .describe("The main weather information"),
  visibility: z.number().optional().describe("The visibility"),
  wind: z
    .object({
      speed: z.number().optional().describe("The wind speed"),
      deg: z.number().optional().describe("The wind degree"),
      gust: z.number().optional().describe("The wind gust"),
    })
    .optional()
    .describe("The wind information"),
  clouds: z
    .object({
      all: z.number().optional().describe("The cloudiness"),
    })
    .optional()
    .describe("The cloud information"),
  dt: z.number().optional().describe("The date time"),
  sys: z
    .object({
      country: z.string().optional().describe("The country code"),
      sunrise: z.number().optional().describe("The sunrise"),
      sunset: z.number().optional().describe("The sunset"),
    })
    .optional()
    .describe("The system information"),
  timezone: z.number().optional().describe("The timezone"),
  id: z.number().optional().describe("The city id"),
  name: z.string().optional().describe("The city name"),
  cod: z.number().optional().describe("The cod"),
});

export type GetWeatherInput = z.infer<typeof GetWeatherInput>;
export type GetWeatherOutput = z.infer<typeof GetWeatherOutput>;

export interface IStorm {
  predict(input: GetWeatherInput): Promise<GetWeatherOutput>;
}
