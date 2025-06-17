# Regenerate GraphQL Documentation Workflow

This GitHub Actions workflow automatically regenerates the GraphQL API documentation by fetching the latest schema from Apollo and running the documentation generation script.

## Setup Requirements

### 1. Apollo API Key

You need to add your Apollo API key as a GitHub secret:

1. Go to your repository's **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `APOLLO_KEY`
4. Value: Your Apollo Studio API key

To get your Apollo API key:
1. Go to [Apollo Studio](https://studio.apollographql.com/)
2. Navigate to your `defined-graph` graph
3. Go to **Settings** → **API Keys**
4. Create a new key with `Read schema` permissions for the `production` variant

### 2. Repository Permissions

Ensure the workflow has permission to push changes:

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

## How to Use

### Manual Trigger

1. Go to the **Actions** tab in your repository
2. Select **Regenerate GraphQL Documentation** workflow
3. Click **Run workflow**
4. Choose the branch (usually `main`) and click **Run workflow**

### Automatic Trigger

The workflow is also configured to run automatically every day at 2 AM UTC. You can modify this schedule in the workflow file:

```yaml
schedule:
  - cron: '0 2 * * *' # Daily at 2 AM UTC
```

## What the Workflow Does

1. **Fetches Latest Schema**: Downloads the latest `supergraph.graphql` from your Apollo `defined-graph@production`
2. **Generates Documentation**: Runs the `generate-graphql-docs.js` script to create:
   - Query documentation pages
   - Mutation documentation pages  
   - Subscription documentation pages
   - Type documentation pages
3. **Updates Navigation**: Automatically updates `docs.json` with the new navigation structure
4. **Commits Changes**: If there are any changes, commits and pushes them with a descriptive message

## Generated Files

The workflow will update/create files in the `apps/docs/api-reference/` directory:
- `queries/*.mdx` - Query documentation
- `mutations/*.mdx` - Mutation documentation  
- `subscriptions/*.mdx` - Subscription documentation
- `types/*.mdx` - Type documentation

It also updates:
- `supergraph.graphql` - The GraphQL schema file
- `apps/docs/docs.json` - Navigation configuration
- `apps/docs/generated-navigation.json` - Navigation reference

## Troubleshooting

### Authentication Errors
- Verify your `APOLLO_KEY` secret is set correctly
- Ensure the API key has the right permissions for the `defined-graph@production`

### Permission Errors  
- Check that the workflow has write permissions in repository settings
- Ensure the `GITHUB_TOKEN` has permission to push to the repository

### Schema Fetch Errors
- Verify the graph name (`defined-graph`) and variant (`production`) are correct
- Check that the graph exists and is accessible with your API key

## Customization

You can customize the workflow by modifying `.github/workflows/regenerate-docs.yml`:

- Change the schedule frequency
- Modify the commit message format
- Add additional steps (like notifications)
- Change the target graph or variant name