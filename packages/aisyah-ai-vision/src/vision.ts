import {
  type DescribeInput,
  DescribeOutput,
  type IVision,
} from "@packages/shared/types/vision";
import { OpenAI } from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";

interface Env {
  OPENAI_API_KEY: string;
}

export class Vision implements IVision {
  private readonly openAI: OpenAI;
  private readonly chatModel = "gpt-4o-mini";

  constructor(env: Env) {
    this.openAI = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async describe(input: DescribeInput): Promise<DescribeOutput> {
    console.log("Vision ~ describe ~ input:", input);
    try {
      const response = await this.generateDescription(input.imageUrl);
      return DescribeOutput.parse({
        data: this.extractDescription(input.imageUrl, response),
      });
    } catch (error) {
      console.log("Vision ~ describe ~ error:", input, error);
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
      console.log("Vision ~ message:", message);
      throw new Error(message);
    }

    return content;
  }
}
