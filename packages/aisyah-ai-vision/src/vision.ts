import { OpenAI } from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { z } from "zod";

interface Env {
  OPENAI_API_KEY: string;
}

export const inputSchema = z.object({
  imageUrl: z.string().url().describe("The URL of the image to describe."),
});

export class Vision {
  private readonly openAI: OpenAI;
  private readonly chatModel = "gpt-4o-mini";

  constructor(env: Env) {
    this.openAI = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  public async describe(input: z.infer<typeof inputSchema>): Promise<string> {
    const { imageUrl } = input;
    try {
      const response = await this.generateDescription(imageUrl);
      return this.extractDescription(imageUrl, response);
    } catch (error) {
      console.error("Error generating description for image:", {
        imageUrl: imageUrl,
        error,
      });
      throw error;
    }
  }

  private async generateDescription(imageUrl: string) {
    return this.openAI.chat.completions.create({
      model: this.chatModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });
  }

  private extractDescription(
    imageUrl: string,
    response: ChatCompletion,
  ): string {
    const choices = response.choices?.[0];
    const content = choices?.message?.content;

    if (!content) {
      const message = `Failed to generate description for image: ${imageUrl}`;
      console.error(message);
      throw new Error(message);
    }

    return content;
  }
}
