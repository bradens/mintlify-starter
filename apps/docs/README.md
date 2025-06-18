# GraphQL Documentation Generator

This directory contains scripts to automatically generate documentation from your GraphQL schema and create filtered versions of the schema.

## Scripts

### `generate-graphql-docs.js`
Generates comprehensive API documentation from your GraphQL schema.

**Features:**
- Parses `@category` and `@tag` metadata from field descriptions
- Generates MDX documentation pages for queries, mutations, subscriptions, and types
- Organizes documentation by categories
- Updates `docs.json` navigation automatically
- Supports hiding fields/types with `@hide` or `docs: hide` directives

**Usage:**
```bash
npm run generate-graphql-docs
```

### Integrated Filtered Schema Generation
The script also automatically generates a filtered version of your GraphQL schema that excludes types and fields marked as hidden.

**Features:**
- Removes types with `@hide` or `docs: hide` in descriptions
- Removes fields with `@hide` or `docs: hide` in descriptions
- Removes field arguments with `@hide` or `docs: hide` in descriptions
- Removes enum values with `@hide` or `docs: hide` in descriptions
- Removes types that become empty after field filtering
- Uses the same `cleanDescription` function to ensure consistency
- Outputs to `supergraph-filtered.graphql`

**Usage:**
```bash
npm run generate-graphql-docs  # Generates both docs and filtered schema
npm run generate-filtered-schema  # Alias for the same command
npm run generate-all  # Alias for the same command
```

## Metadata Format

Use the following format in your GraphQL descriptions to add metadata:

```graphql
"""
Returns metadata for a given network supported on Codex.
@tag: new
@category: token
"""
getNetworkStats(networkId: ID!): GetNetworkStatsResponse
```

**Supported metadata:**
- `@category: category-name` - Groups items in documentation navigation
- `@tag: tag-name` - Adds tags to documentation pages
- `@hide` or `docs: hide` - Excludes from public documentation and filtered schema

## File Structure

### Generated Documentation
- `api-reference/queries/*.mdx` - Query documentation
- `api-reference/mutations/*.mdx` - Mutation documentation
- `api-reference/subscriptions/*.mdx` - Subscription documentation
- `api-reference/types/*.mdx` - Type documentation

### Generated Schemas
- `../../supergraph.graphql` - Original complete schema
- `../../supergraph-filtered.graphql` - Public-facing filtered schema

### Configuration
- `docs.json` - Navigation configuration (auto-updated)
- `generated-navigation.json` - Reference file with all generated pages

## GitHub Actions Integration

The documentation is automatically regenerated via GitHub Actions workflow:
- Fetches latest schema from Apollo Studio
- Runs the integrated generation script (docs + filtered schema)
- Commits changes automatically

See `.github/workflows/regenerate-docs.yml` for details.

## Development

### Testing Changes
1. Make changes to the generation scripts
2. Run `npm run generate-all` to test locally
3. Check the generated files and documentation

### Adding New Metadata
To add new metadata types, update both scripts:
1. Add parsing logic in `parseMetadata()` function
2. Add cleaning logic in `cleanDescription()` function
3. Update documentation generation as needed

## Output Examples

### Documentation Pages
Each generated page includes:
- Frontmatter with title, description, and tags
- Type information and return types
- Field/argument documentation with links
- GraphQL schema definition
- Deprecation warnings when applicable

### Filtered Schema
The filtered schema excludes:
- Internal/private types marked with `@hide`
- Development-only fields marked with `docs: hide`
- Empty types after field filtering
- Hidden enum values and arguments

This creates a clean, public-facing API schema suitable for external developers.
