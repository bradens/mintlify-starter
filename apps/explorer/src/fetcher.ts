import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { createClient } from "graphql-ws";

export type FetcherOptions = {
  url: string;
  subscriptionUrl: string;
  apiKey: string;
}

export const getFetcher = (opts: FetcherOptions) => {
  const { url, subscriptionUrl, apiKey } = opts;
  return createGraphiQLFetcher({
    subscriptionUrl,
    wsClient: createClient({
      url: subscriptionUrl,
      connectionParams: {
        Authorization: apiKey || "",
      }
    }),
    url,
    headers: {
      Authorization: apiKey || "",
    },
  });
}
