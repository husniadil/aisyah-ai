import { z } from "zod";

export const DescribeInput = z.object({
  imageUrl: z.string().url().describe("The URL of the image to describe."),
});

export const DescribeOutput = z.object({
  data: z.string().describe("The description of the image."),
});

export type DescribeInput = z.infer<typeof DescribeInput>;
export type DescribeOutput = z.infer<typeof DescribeOutput>;

export interface IVision {
  describe(input: DescribeInput): Promise<DescribeOutput>;
}
