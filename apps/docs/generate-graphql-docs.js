const fs = require('fs');
const path = require('path');
const { buildSchema, isObjectType, isScalarType, isEnumType, isUnionType, isInputObjectType, isInterfaceType } = require('graphql');

// Helper function to check if a field has "docs: hide" directive
function shouldHideField(field) {
  if (!field.description) return false;
  return field.description.includes('docs: hide')
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

// Helper function to read existing docs.json
function readDocsJson() {
  const docsJsonPath = path.join(__dirname, 'docs.json');
  try {
    const content = fs.readFileSync(docsJsonPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error reading docs.json:', error.message);
    process.exit(1);
  }
}

// Helper function to write updated docs.json
function writeDocsJson(docsData) {
  const docsJsonPath = path.join(__dirname, 'docs.json');
  try {
    fs.writeFileSync(docsJsonPath, JSON.stringify(docsData, null, 2));
    console.log('✅ Updated docs.json');
  } catch (error) {
    console.error('❌ Error writing docs.json:', error.message);
    process.exit(1);
  }
}

// Helper function to get existing API reference pages from docs.json
function getExistingApiPages(docsData) {
  const existing = {
    queries: new Set(),
    mutations: new Set(),
    subscriptions: new Set(),
    types: new Set(),
    enums: new Set(),
    inputObjects: new Set(),
    unionsAndInterfaces: new Set()
  };

  try {
    const graphqlTab = docsData.navigation.tabs.find(tab => tab.tab === 'GraphQL Reference');
    if (!graphqlTab) return existing;

    const referenceGroup = graphqlTab.groups.find(group => group.group === 'Reference');
    if (!referenceGroup) return existing;

    referenceGroup.pages.forEach(page => {
      if (typeof page === 'object' && page.group) {
        const groupName = page.group.toLowerCase();
        page.pages.forEach(pagePath => {
          const fileName = path.basename(pagePath);

          if (groupName === 'queries') existing.queries.add(fileName);
          else if (groupName === 'mutations') existing.mutations.add(fileName);
          else if (groupName === 'subscriptions') existing.subscriptions.add(fileName);
          else if (groupName === 'types') existing.types.add(fileName);
          else if (groupName === 'enums') existing.enums.add(fileName);
          else if (groupName === 'input objects') existing.inputObjects.add(fileName);
          else if (groupName === 'unions and interfaces') existing.unionsAndInterfaces.add(fileName);
        });
      }
    });
  } catch (error) {
    console.warn('⚠️ Warning: Could not parse existing API pages from docs.json:', error.message);
  }

  return existing;
}

// Helper function to update docs.json with new navigation
function updateDocsJson(navigation) {
  const docsData = readDocsJson();
  const existingPages = getExistingApiPages(docsData);

  try {
    const graphqlTab = docsData.navigation.tabs.find(tab => tab.tab === 'GraphQL Reference');
    if (!graphqlTab) {
      console.error('❌ Could not find GraphQL Reference tab in docs.json');
      return;
    }

    const referenceGroup = graphqlTab.groups.find(group => group.group === 'Reference');
    if (!referenceGroup) {
      console.error('❌ Could not find Reference group in docs.json');
      return;
    }

    // Update the reference group pages
    referenceGroup.pages = [
      {
        group: 'Queries',
        pages: navigation.queries
      },
      {
        group: 'Subscriptions',
        pages: navigation.subscriptions
      },
      {
        group: 'Mutations',
        pages: navigation.mutations
      },
      {
        group: 'Types',
        pages: navigation.types.filter(type => navigation.objects.includes(type) || navigation.scalars.includes(type))
      },
      {
        group: 'Enums',
        pages: navigation.enums
      },
      {
        group: 'Input Objects',
        pages: navigation.inputs
      },
      {
        group: 'Unions and Interfaces',
        pages: navigation.unions.concat(navigation.interfaces)
      }
    ];

    writeDocsJson(docsData);

    // Log changes
    const currentPages = {
      queries: new Set(navigation.queries.map(p => path.basename(p))),
      mutations: new Set(navigation.mutations.map(p => path.basename(p))),
      subscriptions: new Set(navigation.subscriptions.map(p => path.basename(p))),
      types: new Set(navigation.types.map(p => path.basename(p))),
      enums: new Set(navigation.enums.map(p => path.basename(p))),
      inputObjects: new Set(navigation.inputs.map(p => path.basename(p))),
      unionsAndInterfaces: new Set(navigation.unions.concat(navigation.interfaces).map(p => path.basename(p)))
    };

    // Log added and removed pages
    Object.keys(existingPages).forEach(category => {
      const existing = existingPages[category];
      const current = currentPages[category];

      const added = [...current].filter(x => !existing.has(x));
      const removed = [...existing].filter(x => !current.has(x));

      if (added.length > 0) {
        console.log(`➕ Added ${category}: ${added.join(', ')}`);
      }
      if (removed.length > 0) {
        console.log(`➖ Removed ${category}: ${removed.join(', ')}`);
      }
    });

  } catch (error) {
    console.error('❌ Error updating docs.json navigation:', error.message);
  }
}

// Helper function to remove outdated files
function removeOutdatedFiles(currentNavigation, apiRefDir) {
  const docsData = readDocsJson();
  const existingPages = getExistingApiPages(docsData);

  const currentPages = {
    queries: new Set(currentNavigation.queries.map(p => path.basename(p))),
    mutations: new Set(currentNavigation.mutations.map(p => path.basename(p))),
    subscriptions: new Set(currentNavigation.subscriptions.map(p => path.basename(p))),
    types: new Set(currentNavigation.types.map(p => path.basename(p))),
    enums: new Set(currentNavigation.enums.map(p => path.basename(p))),
    inputObjects: new Set(currentNavigation.inputs.map(p => path.basename(p))),
    unionsAndInterfaces: new Set(currentNavigation.unions.concat(currentNavigation.interfaces).map(p => path.basename(p)))
  };

  const dirMap = {
    queries: 'queries',
    mutations: 'mutations',
    subscriptions: 'subscriptions',
    types: 'types',
    enums: 'types',
    inputObjects: 'types',
    unionsAndInterfaces: 'types'
  };

  let removedCount = 0;

  Object.keys(existingPages).forEach(category => {
    const existing = existingPages[category];
    const current = currentPages[category];
    const dirName = dirMap[category];

    const toRemove = [...existing].filter(x => !current.has(x));

    toRemove.forEach(fileName => {
      const filePath = path.join(apiRefDir, dirName, `${fileName}.mdx`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        removedCount++;
        console.log(`🗑️ Removed outdated file: ${dirName}/${fileName}.mdx`);
      }
    });
  });

  if (removedCount === 0) {
    console.log('✅ No outdated files to remove');
  }
}

// Categorize types for better organization
function categorizeTypes(allTypes) {
  const objects = [];
  const enums = [];
  const unions = [];
  const inputs = [];
  const scalars = [];
  const interfaces = [];

  allTypes.forEach(type => {
    if (isObjectType(type)) {
      objects.push(type);
    } else if (isEnumType(type)) {
      enums.push(type);
    } else if (isUnionType(type)) {
      unions.push(type);
    } else if (isInputObjectType(type)) {
      inputs.push(type);
    } else if (isInterfaceType(type)) {
      interfaces.push(type);
    } else if (isScalarType(type)) {
      // Only include custom scalars
      const builtInScalars = ['String', 'Int', 'Float', 'Boolean', 'ID'];
      if (!builtInScalars.includes(type.name)) {
        scalars.push(type);
      }
    }
  });

  return { objects, enums, unions, inputs, scalars, interfaces };
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

  // Get all non-root types
  const allTypes = Object.keys(typeMap)
    .filter(typeName => {
      // Skip any types with double underscores (introspection and custom types)
      if (typeName.includes('__') || typeName === 'Void' || typeName === "JSON") return false;

      const type = typeMap[typeName];
      // Skip root operation types as they're handled separately
      return type !== queryType && type !== mutationType && type !== subscriptionType;
    })
    .map(typeName => typeMap[typeName]);

  const { objects, enums, unions, inputs, scalars, interfaces } = categorizeTypes(allTypes);

  // Create directories
  const apiRefDir = path.join(__dirname, 'api-reference');
  const dirs = ['queries', 'mutations', 'subscriptions', 'types'];

  dirs.forEach(dir => {
    const dirPath = path.join(apiRefDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // Generate current navigation structure
  const currentNavigation = {
    queries: queries.map(q => `api-reference/queries/${createSlug(q.name)}`),
    mutations: mutations.map(m => `api-reference/mutations/${createSlug(m.name)}`),
    subscriptions: subscriptions.map(s => `api-reference/subscriptions/${createSlug(s.name)}`),
    types: [...objects, ...enums, ...unions, ...inputs, ...scalars, ...interfaces].map(t => `api-reference/types/${createSlug(t.name)}`),
    objects: objects.map(t => `api-reference/types/${createSlug(t.name)}`),
    enums: enums.map(t => `api-reference/types/${createSlug(t.name)}`),
    unions: unions.map(t => `api-reference/types/${createSlug(t.name)}`),
    inputs: inputs.map(t => `api-reference/types/${createSlug(t.name)}`),
    scalars: scalars.map(t => `api-reference/types/${createSlug(t.name)}`),
    interfaces: interfaces.map(t => `api-reference/types/${createSlug(t.name)}`)
  };

  // Remove outdated files before generating new ones
  removeOutdatedFiles(currentNavigation, apiRefDir);

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
  const allTypesToGenerate = [...objects, ...enums, ...unions, ...inputs, ...scalars, ...interfaces];
  console.log(`📝 Generating ${allTypesToGenerate.length} type pages...`);
  allTypesToGenerate.forEach(type => {
    const content = generateTypeDoc(type);
    const filePath = path.join(apiRefDir, 'types', `${createSlug(type.name)}.mdx`);
    fs.writeFileSync(filePath, content);
  });

  // Update docs.json with new navigation
  updateDocsJson(currentNavigation);

  // Write navigation structure to a JSON file for reference
  fs.writeFileSync(
    path.join(__dirname, 'generated-navigation.json'),
    JSON.stringify(currentNavigation, null, 2)
  );

  console.log('✅ GraphQL documentation generation complete!');
  console.log(`Generated:
  - ${queries.length} queries
  - ${mutations.length} mutations
  - ${subscriptions.length} subscriptions
  - ${allTypesToGenerate.length} types (${objects.length} objects, ${enums.length} enums, ${unions.length} unions, ${inputs.length} inputs, ${scalars.length} scalars, ${interfaces.length} interfaces)`);

  console.log('\n📋 Updated docs.json with new navigation structure');
  console.log('📄 Check generated-navigation.json for the complete list of pages');
  console.log('🚀 Run "pnpm dev" to preview your documentation');
}

// Run the generator
generateGraphQLDocs();