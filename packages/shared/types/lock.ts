export interface ILock {
  acquire(key: string): Promise<boolean>;
  release(key: string): Promise<void>;
}
