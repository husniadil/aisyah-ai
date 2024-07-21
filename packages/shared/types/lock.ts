import { z } from "zod";

export const keyInputSchema = z.string().describe("The key to acquire.");

export interface ILock {
  acquire(key: z.infer<typeof keyInputSchema>): Promise<boolean>;
  release(key: z.infer<typeof keyInputSchema>): Promise<void>;
}
