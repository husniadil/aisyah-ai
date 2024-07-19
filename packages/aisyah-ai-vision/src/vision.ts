import { OpenAI } from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";

interface Env {
  OPENAI_API_KEY: string;
}

export class Vision {
  private readonly openAI: OpenAI;
  private readonly chatModel = "gpt-4o-mini";

  constructor(env: Env) {
    this.openAI = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  public async describe(imageUrl: string): Promise<string> {
    try {
      const response = await this.generateDescription(imageUrl);
      return this.extractDescription(imageUrl, response);
    } catch (error) {
      console.error("Error generating description for image:", {
        imageUrl,
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
