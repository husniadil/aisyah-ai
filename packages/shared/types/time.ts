import { z } from "zod";

export const outputSchema = z.string().describe("The current date and time.");
