import { z } from "zod";

export const LockKeyInput = z.string().describe("The key to acquire.");

export const AcquireOutput = z.boolean().describe("Whether the key is locked.");

export type LockKeyInput = z.infer<typeof LockKeyInput>;
export type AcquireOutput = z.infer<typeof AcquireOutput>;

export interface ILock {
  acquire(key: LockKeyInput): Promise<AcquireOutput>;
  release(key: LockKeyInput): Promise<void>;
}
