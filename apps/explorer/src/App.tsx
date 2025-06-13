import "./App.css";
import { createGraphiQLFetcher } from "@graphiql/toolkit";
import { GraphiQL } from "graphiql";
import "graphiql/graphiql.min.css";
import { useEffect, useState } from "react";
import { explorerPlugin } from "@graphiql/plugin-explorer";
import "@graphiql/plugin-explorer/dist/style.css";
import { createClient } from "graphql-ws";

const explorer = explorerPlugin({
  showAttribution: false,
});

const params = new URLSearchParams(window.location?.search || "");

const url = params.get("graph_url") || "https://graph.defined.fi/graphql";
const subscriptionUrl = params.get("subscription_graph_url") || "wss://realtime-api.defined.fi/graphql";
const query = decodeURIComponent(params.get("query") || "");
const apiKey = localStorage?.getItem("d-explorer-key")

const fetcher = createGraphiQLFetcher({
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockedStorage: any = {
  get() {
    return;
  },
  set() {
    return;
  },
  getItem() {
    return;
  },
  setItem() {
    return;
  },

  clear() {
    return;
  },
  removeItem() {
    return;
  },
};

function App() {
  const [apiKeyFormValue, setApiKeyFormValue] = useState(apiKey);
  const [schema, setSchema] = useState(null);
  useEffect(() => {
    const getSchema = async () => {
      if (!schema) {
        const json = await fetch(
          `https://graph.defined.fi/schema/latest.json`,
        ).then((res) => res.json());
        setSchema(json);
      }
    };
    getSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const full = params.get("full") === "true";
  const plugins = full ? [explorer] : [];

  if (!apiKey) {
    const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      if (!apiKeyFormValue?.length) return
      params.set("key", apiKeyFormValue.trim())
      localStorage.setItem("d-explorer-key", apiKeyFormValue.trim())
      window.location.search = params.toString()
      e.preventDefault();
    }

    return (
      <>
        <form onSubmit={onFormSubmit} className="mt-8 max-w-sm mx-auto">
          <div className="p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400" role="alert">
            <span className="font-medium">Heads up!</span> In order to get started with the explorer, you need to submit your api key here.
          </div>
          <div className="mb-5">
            <label htmlFor="apikey" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your apiKey</label>
            <input onChange={(e) => setApiKeyFormValue(e.target.value)} type="password" id="apikey" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="0abc..." required />
          </div>
          <button type="submit" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Submit</button>
        </form>
      </>
    )
  }
  return (
    <div className={full ? "full" : ""} style={{ flex: 1 }}>
      {schema ? (
        <GraphiQL
          defaultTabs={[]}
          defaultQuery={query}
          query={query}
          storage={mockedStorage}
          defaultEditorToolsVisibility={false}
          schema={schema}
          plugins={plugins}
          fetcher={fetcher}>
          <GraphiQL.Logo>
            <></>
          </GraphiQL.Logo>
          {full ? null : (
            <GraphiQL.Toolbar>
              <></>
            </GraphiQL.Toolbar>
          )}
        </GraphiQL>
      ) : null}
    </div>
  );
}

export default App;
