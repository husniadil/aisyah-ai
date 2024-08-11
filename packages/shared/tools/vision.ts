import { DynamicStructuredTool } from "langchain/tools";
import { DescribeInput, DescribeOutput } from "../types/vision";

export class VisionTool extends DynamicStructuredTool {
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
      name: "describe_image",
      schema: DescribeInput,
      description: "Useful for describing images",
      func: (input: DescribeInput) => {
        console.log("VisionTool ~ input:", input);
        return this.describe(input).then((output) => output.data);
      },
    });
    this.fetcher = fetcher;
    this.bindUrl = bindUrl;
  }

  async describe(input: DescribeInput): Promise<DescribeOutput> {
    try {
      const response = await this.fetcher.fetch(`${this.bindUrl}/describe`, {
        ...this.postRequestInit,
        body: JSON.stringify(input),
      });
      return DescribeOutput.parse(await response.json());
    } catch (error) {
      console.log("VisionTool ~ describe ~ error:", input, error);
      throw error;
    }
  }
}
