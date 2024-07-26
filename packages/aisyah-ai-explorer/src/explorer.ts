import {
  type GetWebContentInput,
  GetWebContentOutput,
  type IExplorer,
  type SearchGoogleInput,
  SearchGoogleOutput,
} from "@packages/shared/types/explorer";

import { fetchWithTimeout } from "@packages/shared/fetcher";

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

  async searchGoogle(input: SearchGoogleInput): Promise<SearchGoogleOutput> {
    console.log("Explorer ~ searchGoogle ~ input:", input);
    try {
      if (!input.query) {
        throw new Error("Query is required.");
      }
      const url = this.createGoogleSearchURL(input.query);

      const response = await fetchWithTimeout(url);
      return SearchGoogleOutput.parse(await response.json());
    } catch (error) {
      console.log("Explorer ~ searchGoogle ~ error:", input, error);
      throw error;
    }
  }

  async getWebContent(input: GetWebContentInput): Promise<GetWebContentOutput> {
    console.log("Explorer ~ getWebContent ~ input:", input);
    if (!input.url) {
      throw new Error("URL is required.");
    }
    try {
      const url = this.createJinaReaderProxyURL(input.url);
      const response = await fetchWithTimeout(url, {
        redirect: "follow",
      });
      if (!response.ok) {
        const message = `Error fetching webpage from ${url}: ${response.statusText}`;
        console.log("Explorer ~ getWebContent ~ message:", message);
        throw new Error(message);
      }
      return GetWebContentOutput.parse({
        content: await response.text(),
      });
    } catch (error) {
      console.log("Explorer ~ getWebContent ~ error:", input, error);
      throw error;
    }
  }
}
