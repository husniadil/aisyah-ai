import type { outputSchema } from "@packages/shared/types/time";
import type { z } from "zod";

export const getCurrentDateTime = (): z.infer<typeof outputSchema> => {
  return new Date().toISOString();
};
