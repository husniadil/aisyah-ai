import { DynamicStructuredTool } from "langchain/tools";
import { fetchWithTimeout } from "../fetcher";
import {
  BrowseWebInput,
  BrowseWebOutput,
  GetWebContentOutput,
  SearchGoogleOutput,
} from "../types/explorer";
import { extractPhotoLink } from "../utils";

export class ExplorerTool extends DynamicStructuredTool {
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
      name: "browse_web",
      schema: BrowseWebInput,
      description: "Useful for exploring the web",
      func: (input: BrowseWebInput) => {
        console.log("ExplorerTool ~ input:", input);
        return this.searchGoogleAndGetWebContentInput(input).then(
          (output) => output.data,
        );
      },
    });
    this.fetcher = fetcher;
    this.bindUrl = bindUrl;
  }

  async searchGoogleAndGetWebContentInput(
    input: BrowseWebInput,
  ): Promise<BrowseWebOutput> {
    try {
      const searchResult: SearchGoogleOutput = {
        items: [],
      };
      if (input.fileType) {
        const response = await this.fetcher.fetch(
          `${this.bindUrl}/search-google-images`,
          {
            ...this.postRequestInit,
            body: JSON.stringify({
              query: input.query,
              fileType: input.fileType,
            }),
          },
        );
        const parsedResponse = SearchGoogleOutput.parse(await response.json());
        for (const item of parsedResponse.items) {
          searchResult.items.push(item);
        }
        const image = extractPhotoLink(
          searchResult.items.shift()?.pagemap?.metatags?.shift()?.["og:image"],
        );
        const imageExists = image
          ? (await fetchWithTimeout(image, { method: "HEAD" })).ok
          : false;

        return BrowseWebOutput.parse({
          data: imageExists ? image : null,
        });
      }

      if (input.query) {
        const response = await this.fetcher.fetch(
          `${this.bindUrl}/search-google`,
          {
            ...this.postRequestInit,
            body: JSON.stringify({ query: input.query }),
          },
        );
        const parsedResponse = SearchGoogleOutput.parse(await response.json());
        for (const item of parsedResponse.items) {
          searchResult.items.push(item);
        }
      }
      if (input.url) {
        searchResult.items.push({
          link: input.url,
        });
      }

      const contents = await Promise.all(
        searchResult.items.map(async (item) => {
          const response = await this.fetcher.fetch(
            `${this.bindUrl}/get-web-content`,
            {
              ...this.postRequestInit,
              body: JSON.stringify({ url: item.link }),
            },
          );
          const content = GetWebContentOutput.parse(
            await response.json(),
          ).content;
          return {
            title:
              item.title || item.pagemap?.metatags?.[0]?.["og:title"] || "",
            link: item.link,
            snippet:
              item.snippet ||
              item.pagemap?.metatags?.[0]?.["og:description"] ||
              "",
            content,
          };
        }),
      );
      const finalResult = contents
        .map(
          (item) =>
            `${item.title}\n${item.link}\n${item.snippet}\n${item.content}`,
        )
        .join("\n\n");
      if (finalResult.length > 4096) {
        return BrowseWebOutput.parse({
          data: finalResult.slice(0, 4096),
        });
      }
      return BrowseWebOutput.parse({
        data: finalResult,
      });
    } catch (error) {
      console.log("ExplorerTool ~ error:", input, error);
      throw error;
    }
  }
}
