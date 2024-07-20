import { z } from "zod";

export const searchGoogleInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("The query to search on Google if any."),
  url: z.string().optional().describe("The URL to fetch the content if any."),
});

export const searchGoogleOutputSchema = z.object({
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

export const getWebContentInputSchema = z.object({
  url: z.string().optional().describe("The URL to fetch the content."),
});

export const getWebContentOutputSchema = z
  .string()
  .optional()
  .describe("The content of the URL.");

export interface IExplorer {
  searchGoogle(
    input: z.infer<typeof searchGoogleInputSchema>,
  ): Promise<z.infer<typeof searchGoogleOutputSchema>>;
  getWebContent(
    input: z.infer<typeof getWebContentInputSchema>,
  ): Promise<z.infer<typeof getWebContentOutputSchema>>;
}
