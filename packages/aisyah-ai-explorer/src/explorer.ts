import {
  type IExplorer,
  type getWebContentInputSchema,
  getWebContentOutputSchema,
  type searchGoogleInputSchema,
  searchGoogleOutputSchema,
} from "@packages/shared/types/explorer";
import type { z } from "zod";

interface Env {
  GOOGLE_SEARCH_API_KEY: string;
  GOOGLE_SEARCH_ENGINE_ID: string;
  GOOGLE_SEARCH_API_BASE_URL: string;
  JINA_READER_PROXY_BASE_URL: string;
}

export class Explorer implements IExplorer {
  private createGoogleSearchURL: (query: string) => string;
  private createJinaReaderProxyURL: (url: string) => string;

  constructor(env: Env) {
    this.createGoogleSearchURL = (query: string) => {
      return `${env.GOOGLE_SEARCH_API_BASE_URL}?q=${query}&key=${env.GOOGLE_SEARCH_API_KEY}&cx=${env.GOOGLE_SEARCH_ENGINE_ID}&num=2`;
    };
    this.createJinaReaderProxyURL = (url: string) =>
      `${env.JINA_READER_PROXY_BASE_URL}/${url}`;
  }

  async searchGoogle(
    input: z.infer<typeof searchGoogleInputSchema>,
  ): Promise<z.infer<typeof searchGoogleOutputSchema>> {
    try {
      const { query } = input;
      if (!query) {
        throw new Error("Query is required.");
      }
      const url = this.createGoogleSearchURL(query);

      const response = await fetch(url);
      return searchGoogleOutputSchema.parse(await response.json());
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getWebContent(
    input: z.infer<typeof getWebContentInputSchema>,
  ): Promise<z.infer<typeof getWebContentOutputSchema>> {
    if (!input.url) {
      throw new Error("URL is required.");
    }
    try {
      const url = this.createJinaReaderProxyURL(input.url);
      const response = await fetch(url, {
        redirect: "follow",
      });
      if (!response.ok) {
        const message = `Error fetching webpage from ${url}: ${response.statusText}`;
        console.error(message);
        throw new Error(message);
      }
      return getWebContentOutputSchema.parse(await response.text());
    } catch (error) {
      console.error(`Error fetching webpage from ${input.url}:`, error);
      throw error;
    }
  }
}
