export const parseOptions = (searchParams: URLSearchParams) => {
  const url = searchParams.get("graph_url") || "https://graph.codex.io/graphql";
  const subscriptionUrl = searchParams.get("subscription_graph_url") || "wss://graph.codex.io/graphql";
  const apiKey = localStorage?.getItem("d-explorer-key")
  const query = searchParams.get("query") || "";
  return { url, subscriptionUrl, apiKey, query };
}