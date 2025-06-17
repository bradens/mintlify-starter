import { buildSchema, GraphQLSchema } from "graphql";
import { useEffect, useState } from "react";

export const useSchema = () => {
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  useEffect(() => {
    const getSchema = async () => {
      if (!schema) {
        try {
          const schemaText = await fetch(
            `https://graph.codex.io/schema/latest.graphql`,
          ).then((res) => res.text());


          // Build schema from GraphQL SDL string
          const graphqlSchema = buildSchema(schemaText);
          setSchema(graphqlSchema);
        } catch (error) {
          console.error('Error building schema:', error);
          console.log('Falling back to no schema - GraphiQL will use introspection', error);
          setSchema(null);
        }
      }
    };
    getSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return schema;
}