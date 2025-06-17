import "./App.css";
import { GraphiQL } from "graphiql";
import "graphiql/style.css";
import "@graphiql/plugin-explorer/style.css";
import { useSchema } from "./useSchema";
import { parseOptions } from "./options";
import { getFetcher } from "./fetcher";
import { ApiKeyForm } from "./ApiKeyForm";
import { ShareButton } from "./ShareButton";
import { useState, useCallback } from "react";

const params = new URLSearchParams(window.location?.search || "");

const { url, subscriptionUrl, apiKey } = parseOptions(params);

function App() {
  const fetcher = getFetcher({ url, subscriptionUrl, apiKey: apiKey || "" });
  const schema = useSchema();
  const [currentQuery, setCurrentQuery] = useState(params.get("query") || "");

  // Callback to track query changes
  const handleEditQuery = useCallback((query: string) => {
    setCurrentQuery(query);
  }, []);

  if (!apiKey) {
    return <ApiKeyForm />
  }

  return (
    <div style={{ flex: 1, position: "relative" }}>
      {schema ? (
        <>
          <GraphiQL
            schema={schema}
            fetcher={fetcher}
            defaultQuery={params.get("query") || undefined}
            onEditQuery={handleEditQuery}
          />
          <div style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <ShareButton query={currentQuery} />
          </div>
        </>
      ) : null}
    </div>
  );
}

export default App;
