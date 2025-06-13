const fs = require('fs');
const path = require('path');
const { buildSchema, isObjectType, isScalarType, isEnumType, isUnionType, isInputObjectType, isInterfaceType } = require('graphql');

// Helper function to check if a field has "docs: hide" directive
function shouldHideField(field) {
  if (!field.description) return false;
  return field.description.includes('docs: hide');
}

// Helper function to clean description text
function cleanDescription(description) {
  if (!description) return '';
  return description
    .replace(/<br>/g, '\n') // Convert <br> tags to newlines first
    .replace(/&/g, '&amp;') // Escape & first (must be done before other entities)
    .replace(/</g, '&lt;')  // Escape <
    .replace(/>/g, '&gt;')  // Escape >
    .replace(/"/g, '&quot;') // Escape quotes
    .replace(/'/g, '&#39;')  // Escape single quotes
    .replace(/docs: hide/g, '') // Remove docs: hide directive
    .trim();
}

// Helper function to create a slug from a name
function createSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Helper function to format GraphQL type for display
function formatType(type) {
  if (!type) return 'Unknown';

  if (type.kind === 'NON_NULL') {
    return formatType(type.ofType) + '!';
  }
  if (type.kind === 'LIST') {
    return '[' + formatType(type.ofType) + ']';
  }

  // Handle both GraphQL AST types and GraphQL.js types
  if (type.name) {
    return type.name;
  }
  if (type.toString) {
    return type.toString();
  }

  return 'Unknown';
}

// Helper function to create type links
function createTypeLink(typeName) {
  if (!typeName || typeName === 'Unknown') {
    return 'Unknown';
  }

  const builtInTypes = ['String', 'Int', 'Float', 'Boolean', 'ID'];
  if (builtInTypes.includes(typeName)) {
    return typeName;
  }

  // Remove any GraphQL syntax markers
  const cleanTypeName = typeName.replace(/[!\[\]]/g, '');
  const slug = createSlug(cleanTypeName);

  return `[${typeName}](/api-reference/types/${slug})`;
}

// Helper function to format field arguments
function formatArgs(args) {
  if (!args || args.length === 0) return '';

  const argStrings = args
    .filter(arg => !shouldHideField(arg))
    .map(arg => {
      const typeName = formatType(arg.type);
      const defaultValue = arg.defaultValue ? ` = ${arg.defaultValue}` : '';
      return `${arg.name}: ${createTypeLink(typeName)}${defaultValue}`;
    });

  return `(${argStrings.join(', ')})`;
}

// Generate documentation for a query/mutation/subscription
function generateOperationDoc(operation, operationType) {
  const returnType = createTypeLink(formatType(operation.type));
  const description = cleanDescription(operation.description);

  let content = `---
title: "${operation.name}"
description: "${description || `${operationType} operation`}"
---

**Type:** ${operationType}

**Returns:** ${returnType}

`;

  // Add arguments table if there are arguments
  if (operation.args && operation.args.length > 0) {
    const visibleArgs = operation.args.filter(arg => !shouldHideField(arg));

    if (visibleArgs.length > 0) {
      content += `## Arguments for ${operation.name}\n\n`;
      content += `| Name | Description |\n`;
      content += `|------|-------------|\n`;

      visibleArgs.forEach(arg => {
        const typeName = formatType(arg.type);
        const typeLink = createTypeLink(typeName);
        const argDescription = cleanDescription(arg.description) || 'No description provided';
        const defaultValue = arg.defaultValue ? ` (default: ${arg.defaultValue})` : '';

        content += `| \`${arg.name}\` (${typeLink})${defaultValue} | ${argDescription} |\n`;
      });

      content += `\n`;
    }
  }

  return content;
}

// Generate documentation for a type
function generateTypeDoc(type) {
  const description = cleanDescription(type.description);
  const typeKind = type.constructor.name.replace('GraphQL', '').replace('Type', '');

  let content = `---
title: "${type.name}"
description: "${description || `${typeKind} type`}"
---

**Type:** ${createTypeLink(type.name)}

`;

  if (isObjectType(type) || isInputObjectType(type) || isInterfaceType(type)) {
    const fields = Object.values(type.getFields());
    const visibleFields = fields.filter(field => !shouldHideField(field));

    if (visibleFields.length > 0) {
      content += `## Fields\n\n`;
      content += `| Name | Description |\n`;
      content += `|------|-------------|\n`;

      visibleFields.forEach(field => {
        const typeName = formatType(field.type);
        const typeLink = createTypeLink(typeName);
        const fieldDescription = cleanDescription(field.description) || 'No description provided';

        // Handle field arguments if any
        let fieldSignature = `\`${field.name}\``;
        if (field.args && field.args.length > 0) {
          const visibleArgs = field.args.filter(arg => !shouldHideField(arg));
          if (visibleArgs.length > 0) {
            const argStrings = visibleArgs.map(arg => {
              const argType = formatType(arg.type);
              return `${arg.name}: ${createTypeLink(argType)}`;
            });
            fieldSignature += `(${argStrings.join(', ')})`;
          }
        }
        fieldSignature += ` → ${typeLink}`;

        content += `| ${fieldSignature} | ${fieldDescription} |\n`;
      });

      content += `\n`;
    }
  } else if (isEnumType(type)) {
    const values = type.getValues().filter(value => !shouldHideField(value));
    if (values.length > 0) {
      content += `## Values\n\n`;
      content += `| Value | Description |\n`;
      content += `|-------|-------------|\n`;

      values.forEach(value => {
        const valueDescription = cleanDescription(value.description) || 'No description provided';
        content += `| \`${value.name}\` | ${valueDescription} |\n`;
      });

      content += `\n`;
    }
  } else if (isUnionType(type)) {
    const types = type.getTypes();
    content += `## Union Types\n\n`;
    content += `This union can be one of the following types:\n\n`;
    types.forEach(unionType => {
      content += `- ${createTypeLink(unionType.name)}\n`;
    });
    content += `\n`;
  }

  return content;
}

// Main function to generate all documentation
function generateGraphQLDocs() {
  console.log('🚀 Starting GraphQL documentation generation...');

  // Read the GraphQL schema
  const schemaPath = path.join(__dirname, '../../supergraph.graphql');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');

  // Build the schema
  const schema = buildSchema(schemaContent);

  // Get all types
  const typeMap = schema.getTypeMap();

  // Filter out introspection types and categorize
  const queries = [];
  const mutations = [];
  const subscriptions = [];
  const objects = [];
  const enums = [];
  const unions = [];
  const inputs = [];
  const scalars = [];

  // Get root types
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  // Extract operations
  if (queryType) {
    const fields = Object.values(queryType.getFields());
    queries.push(...fields.filter(field => !shouldHideField(field)));
  }

  if (mutationType) {
    const fields = Object.values(mutationType.getFields());
    mutations.push(...fields.filter(field => !shouldHideField(field)));
  }

  if (subscriptionType) {
    const fields = Object.values(subscriptionType.getFields());
    subscriptions.push(...fields.filter(field => !shouldHideField(field)));
  }

  // Categorize all types
  Object.keys(typeMap).forEach(typeName => {
    // Skip introspection types
    if (typeName.startsWith('__')) return;

    const type = typeMap[typeName];

    // Skip root operation types as they're handled separately
    if (type === queryType || type === mutationType || type === subscriptionType) return;

    if (isObjectType(type)) {
      objects.push(type);
    } else if (isEnumType(type)) {
      enums.push(type);
    } else if (isUnionType(type)) {
      unions.push(type);
    } else if (isInputObjectType(type)) {
      inputs.push(type);
    } else if (isScalarType(type)) {
      // Only include custom scalars
      const builtInScalars = ['String', 'Int', 'Float', 'Boolean', 'ID'];
      if (!builtInScalars.includes(typeName)) {
        scalars.push(type);
      }
    }
  });

  // Clean up old categorized directories
  const apiRefDir = path.join(__dirname, 'api-reference');
  const oldDirs = ['objects', 'enums', 'unions', 'inputs', 'scalars'];

  oldDirs.forEach(dir => {
    const dirPath = path.join(apiRefDir, dir);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`🗑️ Removed old directory: ${dir}`);
    }
  });

  // Create directories
  const dirs = ['queries', 'mutations', 'subscriptions', 'types'];

  dirs.forEach(dir => {
    const dirPath = path.join(apiRefDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // Generate query documentation
  console.log(`📝 Generating ${queries.length} query pages...`);
  queries.forEach(query => {
    const content = generateOperationDoc(query, 'Query');
    const filePath = path.join(apiRefDir, 'queries', `${createSlug(query.name)}.mdx`);
    fs.writeFileSync(filePath, content);
  });

  // Generate mutation documentation
  console.log(`📝 Generating ${mutations.length} mutation pages...`);
  mutations.forEach(mutation => {
    const content = generateOperationDoc(mutation, 'Mutation');
    const filePath = path.join(apiRefDir, 'mutations', `${createSlug(mutation.name)}.mdx`);
    fs.writeFileSync(filePath, content);
  });

  // Generate subscription documentation
  console.log(`📝 Generating ${subscriptions.length} subscription pages...`);
  subscriptions.forEach(subscription => {
    const content = generateOperationDoc(subscription, 'Subscription');
    const filePath = path.join(apiRefDir, 'subscriptions', `${createSlug(subscription.name)}.mdx`);
    fs.writeFileSync(filePath, content);
  });

  // Generate type documentation (all types go in the types directory for linking)
  const allTypes = [...objects, ...enums, ...unions, ...inputs, ...scalars];
  console.log(`📝 Generating ${allTypes.length} type pages...`);
  allTypes.forEach(type => {
    const content = generateTypeDoc(type);
    const filePath = path.join(apiRefDir, 'types', `${createSlug(type.name)}.mdx`);
    fs.writeFileSync(filePath, content);
  });

  // Generate navigation structure for docs.json
  console.log('📄 Generating navigation structure...');

  const navigation = {
    queries: queries.map(q => `api-reference/queries/${createSlug(q.name)}`),
    mutations: mutations.map(m => `api-reference/mutations/${createSlug(m.name)}`),
    subscriptions: subscriptions.map(s => `api-reference/subscriptions/${createSlug(s.name)}`),
    types: allTypes.map(t => `api-reference/types/${createSlug(t.name)}`)
  };

  // Write navigation structure to a JSON file for reference
  fs.writeFileSync(
    path.join(__dirname, 'generated-navigation.json'),
    JSON.stringify(navigation, null, 2)
  );

  console.log('✅ GraphQL documentation generation complete!');
  console.log(`Generated:
  - ${queries.length} queries
  - ${mutations.length} mutations
  - ${subscriptions.length} subscriptions
  - ${allTypes.length} types (${objects.length} objects, ${enums.length} enums, ${unions.length} unions, ${inputs.length} inputs, ${scalars.length} scalars)`);

  console.log('\n📋 Next steps:');
  console.log('1. Update your docs.json navigation with the generated pages');
  console.log('2. Check generated-navigation.json for the complete list of pages');
  console.log('3. Run "pnpm dev" to preview your documentation');
}

// Run the generator
generateGraphQLDocs();