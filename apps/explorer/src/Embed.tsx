import "./Embed.css";
import { GraphiQL } from "graphiql";
import "graphiql/style.css";
import "@graphiql/plugin-explorer/style.css";
import { useSchema } from "./useSchema";
import { getFetcher } from "./fetcher";
import { parseOptions } from "./options";
import { mockedStorage } from "./mockedStorage";
import { ApiKeyForm } from "./ApiKeyForm";
import { parse, print } from "graphql";

const params = new URLSearchParams(window.location?.search || "");

function App() {
  const schema = useSchema()

  const { query, url, subscriptionUrl, apiKey } = parseOptions(params);
  const fetcher = getFetcher({ url, subscriptionUrl, apiKey: apiKey || "" });

  if (!apiKey) {
    return <ApiKeyForm />
  }

  const parsedQuery = print(parse(query))

  return (
    <div style={{ flex: 1 }}>
      {schema ? (
        <GraphiQL
          storage={mockedStorage}
          query={parsedQuery}
          schema={schema}
          fetcher={fetcher}
        />
      ) : null}
    </div>
  );
}

export default App;
