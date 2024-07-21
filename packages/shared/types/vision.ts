import { z } from "zod";

export const inputSchema = z.object({
  imageUrl: z.string().url().describe("The URL of the image to describe."),
});

export const outputSchema = z.object({
  description: z.string().describe("The description of the image."),
});

export interface IVision {
  describe(
    input: z.infer<typeof inputSchema>,
  ): Promise<z.infer<typeof outputSchema>>;
}
