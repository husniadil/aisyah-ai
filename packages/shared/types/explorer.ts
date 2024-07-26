import { z } from "zod";

export const SearchGoogleInput = z.object({
  query: z.string().describe("The query to search on Google if any."),
});

export const SearchGoogleImagesInput = z.object({
  query: z.string().describe("The query to search on Google if any."),
  fileType: z
    .union([z.literal(".jpg"), z.literal(".png"), z.literal(".gif")])
    .describe("The file type to search on Google if any."),
});

export const SearchGoogleOutput = z.object({
  items: z
    .array(
      z.object({
        title: z
          .string()
          .optional()
          .describe("The title of the search result."),
        link: z.string().optional().describe("The link of the search result."),
        snippet: z
          .string()
          .optional()
          .describe("The snippet of the search result."),
        pagemap: z
          .object({
            metatags: z
              .array(
                z.object({
                  "og:title": z
                    .string()
                    .optional()
                    .describe("The ogtitle of the search result."),
                  "og:description": z
                    .string()
                    .optional()
                    .describe("The ogdescription of the search result."),
                  "og:image": z
                    .string()
                    .optional()
                    .describe("The ogimage of the search result."),
                }),
              )
              .optional()
              .describe("The metatags of the search result."),
          })
          .optional()
          .describe("The pagemap of the search result."),
      }),
    )
    .describe("The search results."),
});

export const GetWebContentInput = z.object({
  url: z.string().describe("The URL to fetch the content."),
});

export const GetWebContentOutput = z.object({
  content: z.string().optional().describe("The content of the URL."),
});

export const BrowseWebInput = z.object({
  query: z
    .string()
    .optional()
    .describe("The query to search on Google if any."),
  fileType: z
    .union([z.literal(".jpg"), z.literal(".png"), z.literal(".gif")])
    .optional()
    .describe("For searching image only, specify the file type."),
  url: z.string().optional().describe("The webpage URL to fetch the content."),
});

export const BrowseWebOutput = z.object({
  data: z.string().optional().describe("The content of the URL."),
});

export type SearchGoogleInput = z.infer<typeof SearchGoogleInput>;
export type SearchGoogleOutput = z.infer<typeof SearchGoogleOutput>;
export type SearchGoogleImagesInput = z.infer<typeof SearchGoogleImagesInput>;
export type GetWebContentInput = z.infer<typeof GetWebContentInput>;
export type GetWebContentOutput = z.infer<typeof GetWebContentOutput>;
export type BrowseWebInput = z.infer<typeof BrowseWebInput>;
export type BrowseWebOutput = z.infer<typeof BrowseWebOutput>;

export interface IExplorer {
  searchGoogle(input: SearchGoogleInput): Promise<SearchGoogleOutput>;
  searchGoogleImages(
    input: SearchGoogleImagesInput,
  ): Promise<SearchGoogleOutput>;
  getWebContent(input: GetWebContentInput): Promise<GetWebContentOutput>;
}
