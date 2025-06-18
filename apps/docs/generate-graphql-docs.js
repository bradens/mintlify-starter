const fs = require('fs');
const path = require('path');
const { buildSchema, isObjectType, isScalarType, isEnumType, isUnionType, isInputObjectType, isInterfaceType } = require('graphql');

// Helper function to check if a field has "docs: hide" directive
function shouldHideField(field) {
  if (!field.description) return false;
  return field.description.includes('docs: hide') || field.description.includes('@hide')
}

// Helper function to parse metadata from description
function parseMetadata(description) {
  if (!description) return { category: null, tag: null };

  const metadata = { category: null, tag: null };

  // Look for @category value (can be followed by space, colon, or nothing)
  const categoryMatch = description.match(/@category:?\s*([^\s@\n\r]+)/i);
  if (categoryMatch) {
    metadata.category = categoryMatch[1].trim();
  }

  // Look for @tag value (can be followed by space, colon, or nothing)
  const tagMatch = description.match(/@tag:?\s*([^\s@\n\r]+)/i);
  if (tagMatch) {
    metadata.tag = tagMatch[1].trim();
  }

  return metadata;
}

// Helper function to clean description text
function cleanDescription(description) {
  if (!description) return '';
  return description
    .replace(/<br>/g, '\n') // Convert <br> tags to newlines first
    .replace(/docs: hide/g, '') // Remove docs: hide directive
    .replace(/@hide/g, '') // Remove @hide directive
    .replace(/@category:?\s*[^\s@\n\r]+/gi, '') // Remove @category metadata
    .replace(/@tag:?\s*[^\s@\n\r]+/gi, '') // Remove @tag metadata
    .replace(/</g, '&lt;') // Escape opening angle brackets for MDX
    .replace(/>/g, '&gt;') // Escape closing angle brackets for MDX
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
}

// Helper function to create a slug from a name
function createSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Helper function to format GraphQL type for display
function formatType(type) {
  if (!type) return 'Unknown';

  // Handle GraphQL.js NonNull types
  if (type.constructor && type.constructor.name === 'GraphQLNonNull') {
    return formatType(type.ofType) + '!';
  }

  // Handle GraphQL.js List types
  if (type.constructor && type.constructor.name === 'GraphQLList') {
    return '[' + formatType(type.ofType) + ']';
  }

  // Handle GraphQL AST types (for backward compatibility)
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

// Helper function to check if a field is required (non-null)
function isFieldRequired(type) {
  return type.toString().endsWith('!');
}

// Helper function to check if field/type is deprecated
function isDeprecated(item) {
  return item.isDeprecated === true || (item.deprecationReason && item.deprecationReason.trim() !== '');
}

// Helper function to get deprecation reason
function getDeprecationReason(item) {
  return item.deprecationReason || 'This field is deprecated.';
}

// Helper function to generate GraphQL schema definition for an operation
function generateOperationSchema(operation, operationType) {
  let schemaOutput = '';

  const cleanedDescription = cleanDescription(operation.description);
  const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';
  const deprecation = isDeprecated(operation) ? ` @deprecated(reason: "${getDeprecationReason(operation)}")` : '';

  // Handle operation arguments if any
  let argsString = '';
  if (operation.args && operation.args.length > 0) {
    const visibleArgs = operation.args.filter(arg => !shouldHideField(arg));
    if (visibleArgs.length > 0) {
      const argStrings = visibleArgs.map(arg => {
        const defaultValue = arg.defaultValue !== undefined ? ` = ${JSON.stringify(arg.defaultValue)}` : '';
        return `${arg.name}: ${formatType(arg.type)}${defaultValue}`;
      });
      argsString = `(${argStrings.join(', ')})`;
    }
  }

  schemaOutput += `${description}${operation.name}${argsString}: ${formatType(operation.type)}${deprecation}`;

  return schemaOutput;
}

// Helper function to generate GraphQL schema definition for a type
function generateGraphQLSchema(type) {
  let schemaOutput = '';

  if (isObjectType(type) || isInputObjectType(type) || isInterfaceType(type)) {
    const typeKeyword = isInputObjectType(type) ? 'input' : isInterfaceType(type) ? 'interface' : 'type';
    const cleanedDescription = cleanDescription(type.description);
    const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';

    schemaOutput += `${description}${typeKeyword} ${type.name} {\n`;

    const fields = Object.values(type.getFields());
    const visibleFields = fields.filter(field => !shouldHideField(field));

    visibleFields.forEach(field => {
      const cleanedFieldDescription = cleanDescription(field.description);
      const fieldDescription = cleanedFieldDescription ? `  """${cleanedFieldDescription}"""\n` : '';
      const deprecation = isDeprecated(field) ? ` @deprecated(reason: "${getDeprecationReason(field)}")` : '';

      // Handle field arguments if any
      let argsString = '';
      if (field.args && field.args.length > 0) {
        const visibleArgs = field.args.filter(arg => !shouldHideField(arg));
        if (visibleArgs.length > 0) {
          const argStrings = visibleArgs.map(arg => {
            const defaultValue = arg.defaultValue !== undefined ? ` = ${JSON.stringify(arg.defaultValue)}` : '';
            return `${arg.name}: ${formatType(arg.type)}${defaultValue}`;
          });
          argsString = `(${argStrings.join(', ')})`;
        }
      }

      schemaOutput += `${fieldDescription}  ${field.name}${argsString}: ${formatType(field.type)}${deprecation}\n`;
    });

    schemaOutput += '}';
  } else if (isEnumType(type)) {
    const cleanedDescription = cleanDescription(type.description);
    const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';
    schemaOutput += `${description}enum ${type.name} {\n`;

    const values = type.getValues().filter(value => !shouldHideField(value));
    values.forEach(value => {
      const cleanedValueDescription = cleanDescription(value.description);
      const valueDescription = cleanedValueDescription ? `  """${cleanedValueDescription}"""\n` : '';
      const deprecation = isDeprecated(value) ? ` @deprecated(reason: "${getDeprecationReason(value)}")` : '';
      schemaOutput += `${valueDescription}  ${value.name}${deprecation}\n`;
    });

    schemaOutput += '}';
  } else if (isUnionType(type)) {
    const cleanedDescription = cleanDescription(type.description);
    const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';
    const unionTypes = type.getTypes().map(t => t.name).join(' | ');
    schemaOutput += `${description}union ${type.name} = ${unionTypes}`;
  } else if (isScalarType(type)) {
    const cleanedDescription = cleanDescription(type.description);
    const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';
    schemaOutput += `${description}scalar ${type.name}`;
  }

  return schemaOutput;
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
  const metadata = parseMetadata(operation.description);

  let content = `---
title: "${operation.name}"
description: "${description || `${operationType} operation`}"
keywords: ['${operation.name}']`;

  if (metadata.tag) {
    content += `\ntag: "${metadata.tag}"`;
  }

  content += `\n---

`;

  // Add deprecation warning for the operation if deprecated
  if (isDeprecated(operation)) {
    content += `<Warning>
  This ${operationType.toLowerCase()} is deprecated. ${cleanDescription(getDeprecationReason(operation))}
</Warning>

`;
  }

  content += `**Returns:** ${returnType}

`;

  // Add arguments if there are any
  if (operation.args && operation.args.length > 0) {
    const visibleArgs = operation.args.filter(arg => !shouldHideField(arg));

    if (visibleArgs.length > 0) {
      content += `### Arguments\n\n`;

      visibleArgs.forEach(arg => {
        const typeName = formatType(arg.type);
        const required = isFieldRequired(arg.type);
        const argDescription = cleanDescription(arg.description) || 'No description provided';

        // Check if we need to link to another type
        const cleanTypeName = typeName.replace(/[!\[\]]/g, '');
        const builtInTypes = ['String', 'Int', 'Float', 'Boolean', 'ID'];
        const shouldLink = !builtInTypes.includes(cleanTypeName);

        if (shouldLink) {
          const slug = createSlug(cleanTypeName);
          content += `<a href="/api-reference/types/${slug}">
  <ResponseField name="${arg.name}" type="${typeName}"${required ? ' required' : ''}>
    ${argDescription}`;
        } else {
          content += `<ResponseField name="${arg.name}" type="${typeName}"${required ? ' required' : ''}>
  ${argDescription}`;
        }

        // Add deprecation warning for the argument if deprecated
        if (isDeprecated(arg)) {
          content += `\n    \n    <Warning>\n      This argument is deprecated. ${cleanDescription(getDeprecationReason(arg))}\n    </Warning>`;
        }

        if (shouldLink) {
          content += `\n  </ResponseField>
</a>

`;
        } else {
          content += `\n</ResponseField>

`;
        }
      });
    }
  }

  // Add GraphQL schema definition at the end
  const schemaDefinition = generateOperationSchema(operation, operationType);
  if (schemaDefinition) {
    content += `### Schema\n\n`;
    content += `\n\`\`\`graphql \n${schemaDefinition}\n\`\`\`\n`;
  }

  return { content, metadata };
}

// Generate documentation for a type
function generateTypeDoc(type) {
  const description = cleanDescription(type.description);
  const metadata = parseMetadata(type.description);
  const typeKind = type.constructor.name.replace('GraphQL', '').replace('Type', '');

  let content = `---
title: "${type.name}"
description: "${description || `${typeKind} type`}"
keywords: ['${type.name}']
noindex: true`;

  if (metadata.tag) {
    content += `\ntag: "${metadata.tag}"`;
  }

  content += `\n---

`;

  // Add deprecation warning for the type itself if deprecated
  if (isDeprecated(type)) {
    content += `<Warning>
  This type is deprecated. ${cleanDescription(getDeprecationReason(type))}
</Warning>

`;
  }

  if (isObjectType(type) || isInputObjectType(type) || isInterfaceType(type)) {
    const fields = Object.values(type.getFields());
    const visibleFields = fields.filter(field => !shouldHideField(field));

    if (visibleFields.length > 0) {
      content += `### Fields\n\n`;

      visibleFields.forEach(field => {
        const typeName = formatType(field.type);
        const required = isFieldRequired(field.type);
        const fieldDescription = cleanDescription(field.description) || 'No description provided';

        // Check if we need to link to another type
        const cleanTypeName = typeName.replace(/[!\[\]]/g, '');
        const builtInTypes = ['String', 'Int', 'Float', 'Boolean', 'ID'];
        const shouldLink = !builtInTypes.includes(cleanTypeName);

        if (shouldLink) {
          const slug = createSlug(cleanTypeName);
          content += `<a href="/api-reference/types/${slug}">
  <ResponseField name="${field.name}" type="${typeName}"${required ? ' required' : ''}>
    ${fieldDescription}`;
        } else {
          content += `<ResponseField name="${field.name}" type="${typeName}"${required ? ' required' : ''}>
  ${fieldDescription}`;
        }

        // Add deprecation warning for the field if deprecated
        if (isDeprecated(field)) {
          content += `\n    \n    <Warning>\n      This field is deprecated. ${cleanDescription(getDeprecationReason(field))}\n    </Warning>`;
        }

        if (shouldLink) {
          content += `\n  </ResponseField>
</a>

`;
        } else {
          content += `\n</ResponseField>

`;
        }
      });
    }
  } else if (isEnumType(type)) {
    const values = type.getValues().filter(value => !shouldHideField(value));
    if (values.length > 0) {
      content += `### Values\n\n`;

      values.forEach(value => {
        const valueDescription = cleanDescription(value.description) || 'No description provided';

        content += `<ResponseField name="${value.name}" type="enum">
  ${valueDescription}`;

        // Add deprecation warning for the enum value if deprecated
        if (isDeprecated(value)) {
          content += `\n  \n  <Warning>\n    This value is deprecated. ${cleanDescription(getDeprecationReason(value))}\n  </Warning>`;
        }

        content += `\n</ResponseField>

`;
      });
    }
  } else if (isUnionType(type)) {
    const unionTypes = type.getTypes();
    content += `### Union Types\n\nThis union can be one of the following types:\n\n`;
    unionTypes.forEach(unionType => {
      content += `- ${createTypeLink(unionType.name)}\n`;
    });
    content += `\n`;
  } else if (isScalarType(type)) {
    content += `### Description\n\nThis is a custom scalar type.\n\n`;
  }

  // Add GraphQL schema definition at the end
  const schemaDefinition = generateGraphQLSchema(type);
  if (schemaDefinition) {
    content += `### Schema\n\n`;
    content += `\n\`\`\`graphql \n${schemaDefinition}\n\`\`\`\n`;
  }

  return { content, metadata };
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
    operations: new Set(),
    types: new Set(),
    enums: new Set(),
    inputObjects: new Set(),
    unionsAndInterfaces: new Set()
  };

  try {
    const graphqlTab = docsData.navigation.tabs.find(tab => tab.tab === 'GraphQL Reference');
    if (!graphqlTab) return existing;

    graphqlTab.groups.forEach(group => {
      const groupName = group.group.toLowerCase();

      // Handle operation groups (Queries, Subscriptions, Mutations)
      if (['queries', 'subscriptions', 'mutations'].includes(groupName)) {
        // These groups have sub-categories, so we need to iterate through them
        group.pages.forEach(categoryOrPage => {
          if (typeof categoryOrPage === 'object' && categoryOrPage.group) {
            // This is a category with pages
            categoryOrPage.pages.forEach(pagePath => {
              const fileName = path.basename(pagePath);
              existing.operations.add(fileName);
            });
          } else if (typeof categoryOrPage === 'string') {
            // This is a direct page (shouldn't happen with new structure, but just in case)
            const fileName = path.basename(categoryOrPage);
            existing.operations.add(fileName);
          }
        });
      }
      // Handle type groups (now categorized like operations)
      else if (['types', 'enums', 'input objects', 'unions and interfaces'].includes(groupName)) {
        // These groups now have sub-categories, so we need to iterate through them
        group.pages.forEach(categoryOrPage => {
          if (typeof categoryOrPage === 'object' && categoryOrPage.group) {
            // This is a category with pages
            categoryOrPage.pages.forEach(pagePath => {
              const fileName = path.basename(pagePath);

              if (groupName === 'types') existing.types.add(fileName);
              else if (groupName === 'enums') existing.enums.add(fileName);
              else if (groupName === 'input objects') existing.inputObjects.add(fileName);
              else if (groupName === 'unions and interfaces') existing.unionsAndInterfaces.add(fileName);
            });
          } else if (typeof categoryOrPage === 'string') {
            // This is a direct page (for backward compatibility)
            const fileName = path.basename(categoryOrPage);

            if (groupName === 'types') existing.types.add(fileName);
            else if (groupName === 'enums') existing.enums.add(fileName);
            else if (groupName === 'input objects') existing.inputObjects.add(fileName);
            else if (groupName === 'unions and interfaces') existing.unionsAndInterfaces.add(fileName);
          }
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

    // Separate operations by type for the new structure
    const queriesByCategory = {};
    const subscriptionsByCategory = {};
    const mutationsByCategory = {};

    navigation.operations.forEach(operation => {
      const category = operation.category;

      if (operation.type === 'Query') {
        if (!queriesByCategory[category]) queriesByCategory[category] = [];
        queriesByCategory[category].push(operation);
      } else if (operation.type === 'Subscription') {
        if (!subscriptionsByCategory[category]) subscriptionsByCategory[category] = [];
        subscriptionsByCategory[category].push(operation);
      } else if (operation.type === 'Mutation') {
        if (!mutationsByCategory[category]) mutationsByCategory[category] = [];
        mutationsByCategory[category].push(operation);
      }
    });

    // Create category groups for each operation type
    function createCategoryGroups(operationsByCategory) {
      const categories = Object.keys(operationsByCategory).sort();
      return categories.map(category => {
        const operations = operationsByCategory[category];
        const categoryDisplayName = category.charAt(0).toUpperCase() + category.slice(1);

        return {
          group: categoryDisplayName,
          pages: operations.map(op => op.path)
        };
      });
    }

    // Create the new navigation structure
    const newGroups = [
      {
        group: 'API Documentation',
        pages: ['api-reference/introduction']
      }
    ];

    // Add Queries group with categories
    if (Object.keys(queriesByCategory).length > 0) {
      newGroups.push({
        group: 'Queries',
        pages: createCategoryGroups(queriesByCategory)
      });
    }

    // Add Subscriptions group with categories
    if (Object.keys(subscriptionsByCategory).length > 0) {
      newGroups.push({
        group: 'Subscriptions',
        pages: createCategoryGroups(subscriptionsByCategory)
      });
    }

    // Add Mutations group with categories
    if (Object.keys(mutationsByCategory).length > 0) {
      newGroups.push({
        group: 'Mutations',
        pages: createCategoryGroups(mutationsByCategory)
      });
    }

    // Add type groups (categorized like operations)
    function createTypeCategoryGroups(typesByCategory) {
      const categories = Object.keys(typesByCategory).sort();
      return categories.map(category => {
        const types = typesByCategory[category];
        const categoryDisplayName = category.charAt(0).toUpperCase() + category.slice(1);

        return {
          group: categoryDisplayName,
          pages: types.map(type => type.path)
        };
      });
    }

    // Add Types group with categories
    if (Object.keys(navigation.typesByCategory.types).length > 0) {
      newGroups.push({
        group: 'Types',
        pages: createTypeCategoryGroups(navigation.typesByCategory.types)
      });
    }

    // Add Enums group with categories
    if (Object.keys(navigation.typesByCategory.enums).length > 0) {
      newGroups.push({
        group: 'Enums',
        pages: createTypeCategoryGroups(navigation.typesByCategory.enums)
      });
    }

    // Add Input Objects group with categories
    if (Object.keys(navigation.typesByCategory.inputs).length > 0) {
      newGroups.push({
        group: 'Input Objects',
        pages: createTypeCategoryGroups(navigation.typesByCategory.inputs)
      });
    }

    // Add Unions and Interfaces group with categories
    if (Object.keys(navigation.typesByCategory.unionsAndInterfaces).length > 0) {
      newGroups.push({
        group: 'Unions and Interfaces',
        pages: createTypeCategoryGroups(navigation.typesByCategory.unionsAndInterfaces)
      });
    }

    // Update the GraphQL tab groups
    graphqlTab.groups = newGroups;

    writeDocsJson(docsData);

    // Log changes
    const currentOperations = new Set(navigation.operations.map(op => path.basename(op.path)));
    const currentTypes = new Set(navigation.types.map(type => path.basename(type.path)));
    const currentEnums = new Set(navigation.types.filter(type => type.typeCategory === 'enums').map(type => path.basename(type.path)));
    const currentInputObjects = new Set(navigation.types.filter(type => type.typeCategory === 'inputs').map(type => path.basename(type.path)));
    const currentUnionsAndInterfaces = new Set(navigation.types.filter(type => type.typeCategory === 'unionsAndInterfaces').map(type => path.basename(type.path)));

    // Log added and removed pages
    const changeCategories = [
      { name: 'operations', existing: existingPages.operations, current: currentOperations },
      { name: 'types', existing: existingPages.types, current: currentTypes },
      { name: 'enums', existing: existingPages.enums, current: currentEnums },
      { name: 'input objects', existing: existingPages.inputObjects, current: currentInputObjects },
      { name: 'unions and interfaces', existing: existingPages.unionsAndInterfaces, current: currentUnionsAndInterfaces }
    ];

    changeCategories.forEach(({ name, existing, current }) => {
      const added = [...current].filter(x => !existing.has(x));
      const removed = [...existing].filter(x => !current.has(x));

      if (added.length > 0) {
        console.log(`➕ Added ${name}: ${added.join(', ')}`);
      }
      if (removed.length > 0) {
        console.log(`➖ Removed ${name}: ${removed.join(', ')}`);
      }
    });

    // Log category information by operation type
    console.log(`📁 Generated navigation structure:`);

    if (Object.keys(queriesByCategory).length > 0) {
      console.log(`  Queries: ${Object.keys(queriesByCategory).length} categories`);
      Object.keys(queriesByCategory).sort().forEach(category => {
        const count = queriesByCategory[category].length;
        console.log(`    - ${category}: ${count} queries`);
      });
    }

    if (Object.keys(subscriptionsByCategory).length > 0) {
      console.log(`  Subscriptions: ${Object.keys(subscriptionsByCategory).length} categories`);
      Object.keys(subscriptionsByCategory).sort().forEach(category => {
        const count = subscriptionsByCategory[category].length;
        console.log(`    - ${category}: ${count} subscriptions`);
      });
    }

    if (Object.keys(mutationsByCategory).length > 0) {
      console.log(`  Mutations: ${Object.keys(mutationsByCategory).length} categories`);
      Object.keys(mutationsByCategory).sort().forEach(category => {
        const count = mutationsByCategory[category].length;
        console.log(`    - ${category}: ${count} mutations`);
      });
    }

    // Log type category information
    const typeCategories = ['types', 'enums', 'inputs', 'unionsAndInterfaces'];
    const typeCategoryNames = {
      types: 'Types',
      enums: 'Enums',
      inputs: 'Input Objects',
      unionsAndInterfaces: 'Unions and Interfaces'
    };

    typeCategories.forEach(typeCategory => {
      const categoriesForType = navigation.typesByCategory[typeCategory];
      if (Object.keys(categoriesForType).length > 0) {
        console.log(`  ${typeCategoryNames[typeCategory]}: ${Object.keys(categoriesForType).length} categories`);
        Object.keys(categoriesForType).sort().forEach(category => {
          const count = categoriesForType[category].length;
          console.log(`    - ${category}: ${count} ${typeCategory}`);
        });
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

  const currentOperations = new Set(currentNavigation.operations.map(op => path.basename(op.path)));
  const currentTypes = new Set(currentNavigation.types.map(type => path.basename(type.path)));
  const currentEnums = new Set(currentNavigation.types.filter(type => type.typeCategory === 'enums').map(type => path.basename(type.path)));
  const currentInputObjects = new Set(currentNavigation.types.filter(type => type.typeCategory === 'inputs').map(type => path.basename(type.path)));
  const currentUnionsAndInterfaces = new Set(currentNavigation.types.filter(type => type.typeCategory === 'unionsAndInterfaces').map(type => path.basename(type.path)));

  const currentPages = {
    operations: currentOperations,
    types: currentTypes,
    enums: currentEnums,
    inputObjects: currentInputObjects,
    unionsAndInterfaces: currentUnionsAndInterfaces
  };

  const dirMap = {
    operations: ['queries', 'mutations', 'subscriptions'], // Operations can be in any of these directories
    types: ['types'],
    enums: ['types'],
    inputObjects: ['types'],
    unionsAndInterfaces: ['types']
  };

  let removedCount = 0;

  Object.keys(existingPages).forEach(category => {
    const existing = existingPages[category];
    const current = currentPages[category];
    const dirNames = dirMap[category];

    const toRemove = [...existing].filter(x => !current.has(x));

    toRemove.forEach(fileName => {
      // For operations, check all possible directories
      if (category === 'operations') {
        dirNames.forEach(dirName => {
          const filePath = path.join(apiRefDir, dirName, `${fileName}.mdx`);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            removedCount++;
            console.log(`🗑️ Removed outdated file: ${dirName}/${fileName}.mdx`);
          }
        });
      } else {
        // For types, only check the types directory
        dirNames.forEach(dirName => {
          const filePath = path.join(apiRefDir, dirName, `${fileName}.mdx`);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            removedCount++;
            console.log(`🗑️ Removed outdated file: ${dirName}/${fileName}.mdx`);
          }
        });
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

// Generate filtered schema (excludes @hide and docs: hide types/fields)
function generateFilteredSchema(schema) {
  console.log('\n🔍 Starting filtered schema generation...');

  // Get all types
  const typeMap = schema.getTypeMap();

  // Track which types to keep
  const typesToKeep = new Set();
  const typesToRemove = new Set();

  // Helper function to filter fields from a type
  function filterFields(fields) {
    const filteredFields = {};

    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      if (!shouldHideField(field)) {
        // Also filter arguments if they exist
        if (field.args && field.args.length > 0) {
          const filteredArgs = field.args.filter(arg => !shouldHideField(arg));
          filteredFields[fieldName] = {
            ...field,
            args: filteredArgs
          };
        } else {
          filteredFields[fieldName] = field;
        }
      }
    });

    return filteredFields;
  }

  // Helper function to filter enum values
  function filterEnumValues(values) {
    return values.filter(value => !shouldHideField(value));
  }

  // Helper function to convert GraphQL type to string
  function typeToString(type) {
    if (type.constructor.name === 'GraphQLNonNull') {
      return typeToString(type.ofType) + '!';
    }
    if (type.constructor.name === 'GraphQLList') {
      return '[' + typeToString(type.ofType) + ']';
    }
    return type.name;
  }

  // Helper function to generate type definition for filtered schema
  function generateFilteredTypeDefinition(type, fields) {
    const typeKeyword = isInputObjectType(type) ? 'input' : isInterfaceType(type) ? 'interface' : 'type';
    const cleanedDescription = cleanDescription(type.description);
    const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';

    let definition = `${description}${typeKeyword} ${type.name} {\n`;

    Object.values(fields).forEach(field => {
      const cleanedFieldDescription = cleanDescription(field.description);
      const fieldDescription = cleanedFieldDescription ? `  """${cleanedFieldDescription}"""\n` : '';

      // Handle field arguments
      let argsString = '';
      if (field.args && field.args.length > 0) {
        const visibleArgs = field.args.filter(arg => !shouldHideField(arg));
        if (visibleArgs.length > 0) {
          const argStrings = visibleArgs.map(arg => {
            const defaultValue = arg.defaultValue !== undefined ? ` = ${JSON.stringify(arg.defaultValue)}` : '';
            return `${arg.name}: ${typeToString(arg.type)}${defaultValue}`;
          });
          argsString = `(${argStrings.join(', ')})`;
        }
      }

      definition += `${fieldDescription}  ${field.name}${argsString}: ${typeToString(field.type)}\n`;
    });

    definition += '}\n\n';
    return definition;
  }

  // Helper function to generate enum definition for filtered schema
  function generateFilteredEnumDefinition(type, values) {
    const cleanedDescription = cleanDescription(type.description);
    const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';

    let definition = `${description}enum ${type.name} {\n`;

    values.forEach(value => {
      const cleanedValueDescription = cleanDescription(value.description);
      const valueDescription = cleanedValueDescription ? `  """${cleanedValueDescription}"""\n` : '';
      definition += `${valueDescription}  ${value.name}\n`;
    });

    definition += '}\n\n';
    return definition;
  }

  // Helper function to generate union definition for filtered schema
  function generateFilteredUnionDefinition(type, unionTypes) {
    const cleanedDescription = cleanDescription(type.description);
    const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';
    const typeNames = unionTypes.map(t => t.name).join(' | ');

    return `${description}union ${type.name} = ${typeNames}\n\n`;
  }

  // Helper function to generate scalar definition for filtered schema
  function generateFilteredScalarDefinition(type) {
    const cleanedDescription = cleanDescription(type.description);
    const description = cleanedDescription ? `"""${cleanedDescription}"""\n` : '';

    return `${description}scalar ${type.name}\n\n`;
  }

  // First pass: identify types that should be hidden
  Object.keys(typeMap).forEach(typeName => {
    const type = typeMap[typeName];

    // Skip introspection types
    if (typeName.startsWith('__')) {
      return;
    }

    // Check if the type itself should be hidden
    if (shouldHideField(type)) {
      typesToRemove.add(typeName);
      console.log(`🚫 Hiding type: ${typeName}`);
      return;
    }

    // For object types, check if all fields are hidden (making the type effectively empty)
    if (isObjectType(type) || isInputObjectType(type) || isInterfaceType(type)) {
      const fields = Object.values(type.getFields());
      const visibleFields = fields.filter(field => !shouldHideField(field));

      if (visibleFields.length === 0 && fields.length > 0) {
        typesToRemove.add(typeName);
        console.log(`🚫 Hiding type (no visible fields): ${typeName}`);
        return;
      }
    }

    // For enum types, check if all values are hidden
    if (isEnumType(type)) {
      const values = type.getValues();
      const visibleValues = values.filter(value => !shouldHideField(value));

      if (visibleValues.length === 0 && values.length > 0) {
        typesToRemove.add(typeName);
        console.log(`🚫 Hiding enum (no visible values): ${typeName}`);
        return;
      }
    }

    typesToKeep.add(typeName);
  });

  // Build the filtered schema string manually
  let filteredSchemaContent = '';
  const processedTypes = new Set();

  // Process root types first (Query, Mutation, Subscription)
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  if (queryType && typesToKeep.has(queryType.name)) {
    const fields = filterFields(queryType.getFields());
    if (Object.keys(fields).length > 0) {
      filteredSchemaContent += generateFilteredTypeDefinition(queryType, fields);
      processedTypes.add(queryType.name);
    }
  }

  if (mutationType && typesToKeep.has(mutationType.name)) {
    const fields = filterFields(mutationType.getFields());
    if (Object.keys(fields).length > 0) {
      filteredSchemaContent += generateFilteredTypeDefinition(mutationType, fields);
      processedTypes.add(mutationType.name);
    }
  }

  if (subscriptionType && typesToKeep.has(subscriptionType.name)) {
    const fields = filterFields(subscriptionType.getFields());
    if (Object.keys(fields).length > 0) {
      filteredSchemaContent += generateFilteredTypeDefinition(subscriptionType, fields);
      processedTypes.add(subscriptionType.name);
    }
  }

  // Process remaining types
  typesToKeep.forEach(typeName => {
    if (!processedTypes.has(typeName)) {
      const type = typeMap[typeName];

      if (isObjectType(type) || isInputObjectType(type) || isInterfaceType(type)) {
        const fields = filterFields(type.getFields());
        if (Object.keys(fields).length > 0) {
          filteredSchemaContent += generateFilteredTypeDefinition(type, fields);
        }
      } else if (isEnumType(type)) {
        const values = filterEnumValues(type.getValues());
        if (values.length > 0) {
          filteredSchemaContent += generateFilteredEnumDefinition(type, values);
        }
      } else if (isUnionType(type)) {
        const unionTypes = type.getTypes().filter(t => typesToKeep.has(t.name));
        if (unionTypes.length > 0) {
          filteredSchemaContent += generateFilteredUnionDefinition(type, unionTypes);
        }
      } else if (isScalarType(type)) {
        // Only include custom scalars (not built-in ones)
        const builtInScalars = ['String', 'Int', 'Float', 'Boolean', 'ID'];
        if (!builtInScalars.includes(type.name)) {
          filteredSchemaContent += generateFilteredScalarDefinition(type);
        }
      }
    }
  });

  // Write the filtered schema
  const outputPath = path.join(__dirname, '../../supergraph-filtered.graphql');
  fs.writeFileSync(outputPath, filteredSchemaContent);

  console.log('✅ Filtered schema generation complete!');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`🔢 Removed ${typesToRemove.size} types/fields with @hide or docs: hide`);
  console.log(`✨ Kept ${typesToKeep.size} visible types`);

  // Log removed types for reference
  if (typesToRemove.size > 0) {
    console.log('\n🚫 Removed types:');
    Array.from(typesToRemove).sort().forEach(typeName => {
      console.log(`  - ${typeName}`);
    });
  }
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
      if (type === queryType || type === mutationType || type === subscriptionType) return false;

      // Skip types that should be hidden
      if (shouldHideField(type)) return false;

      return true;
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

  // Collect all operations with their metadata for categorization
  const allOperations = [];

  // Generate query documentation and collect metadata
  console.log(`📝 Generating ${queries.length} query pages...`);
  queries.forEach(query => {
    const { content, metadata } = generateOperationDoc(query, 'Query');
    const filePath = path.join(apiRefDir, 'queries', `${createSlug(query.name)}.mdx`);
    fs.writeFileSync(filePath, content);

    allOperations.push({
      name: query.name,
      slug: createSlug(query.name),
      type: 'Query',
      category: metadata.category || 'uncategorized',
      path: `api-reference/queries/${createSlug(query.name)}`
    });
  });

  // Generate mutation documentation and collect metadata
  console.log(`📝 Generating ${mutations.length} mutation pages...`);
  mutations.forEach(mutation => {
    const { content, metadata } = generateOperationDoc(mutation, 'Mutation');
    const filePath = path.join(apiRefDir, 'mutations', `${createSlug(mutation.name)}.mdx`);
    fs.writeFileSync(filePath, content);

    allOperations.push({
      name: mutation.name,
      slug: createSlug(mutation.name),
      type: 'Mutation',
      category: metadata.category || 'uncategorized',
      path: `api-reference/mutations/${createSlug(mutation.name)}`
    });
  });

  // Generate subscription documentation and collect metadata
  console.log(`📝 Generating ${subscriptions.length} subscription pages...`);
  subscriptions.forEach(subscription => {
    const { content, metadata } = generateOperationDoc(subscription, 'Subscription');
    const filePath = path.join(apiRefDir, 'subscriptions', `${createSlug(subscription.name)}.mdx`);
    fs.writeFileSync(filePath, content);

    allOperations.push({
      name: subscription.name,
      slug: createSlug(subscription.name),
      type: 'Subscription',
      category: metadata.category || 'uncategorized',
      path: `api-reference/subscriptions/${createSlug(subscription.name)}`
    });
  });

  // Generate type documentation (all types go in the types directory for linking)
  const allTypesToGenerate = [...objects, ...enums, ...unions, ...inputs, ...scalars, ...interfaces];
  console.log(`📝 Generating ${allTypesToGenerate.length} type pages...`);

  // Collect all types with their metadata for categorization
  const categorizedTypes = [];

  allTypesToGenerate.forEach(type => {
    const { content, metadata } = generateTypeDoc(type);
    const filePath = path.join(apiRefDir, 'types', `${createSlug(type.name)}.mdx`);
    fs.writeFileSync(filePath, content);

    // Determine type category
    let typeCategory;
    if (isObjectType(type) || isScalarType(type)) {
      typeCategory = 'types';
    } else if (isEnumType(type)) {
      typeCategory = 'enums';
    } else if (isInputObjectType(type)) {
      typeCategory = 'inputs';
    } else if (isUnionType(type) || isInterfaceType(type)) {
      typeCategory = 'unionsAndInterfaces';
    }

    categorizedTypes.push({
      name: type.name,
      slug: createSlug(type.name),
      typeCategory,
      category: metadata.category || 'uncategorized',
      path: `api-reference/types/${createSlug(type.name)}`
    });
  });

  // Group types by their type category and then by metadata category
  const typesByCategory = {
    types: {},
    enums: {},
    inputs: {},
    unionsAndInterfaces: {}
  };

  categorizedTypes.forEach(type => {
    const typeCategory = type.typeCategory;
    const metadataCategory = type.category;

    if (!typesByCategory[typeCategory][metadataCategory]) {
      typesByCategory[typeCategory][metadataCategory] = [];
    }
    typesByCategory[typeCategory][metadataCategory].push(type);
  });

  // Sort types within each category alphabetically
  Object.keys(typesByCategory).forEach(typeCategory => {
    Object.keys(typesByCategory[typeCategory]).forEach(metadataCategory => {
      typesByCategory[typeCategory][metadataCategory].sort((a, b) => a.name.localeCompare(b.name));
    });
  });

  // Group operations by category and sort alphabetically within each category
  const operationsByCategory = {};
  allOperations.forEach(operation => {
    if (!operationsByCategory[operation.category]) {
      operationsByCategory[operation.category] = [];
    }
    operationsByCategory[operation.category].push(operation);
  });

  // Sort operations within each category alphabetically
  Object.keys(operationsByCategory).forEach(category => {
    operationsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Generate current navigation structure
  const currentNavigation = {
    operations: allOperations,
    operationsByCategory,
    types: categorizedTypes,
    typesByCategory,
    objects: objects.map(t => `api-reference/types/${createSlug(t.name)}`),
    enums: enums.map(t => `api-reference/types/${createSlug(t.name)}`),
    unions: unions.map(t => `api-reference/types/${createSlug(t.name)}`),
    inputs: inputs.map(t => `api-reference/types/${createSlug(t.name)}`),
    scalars: scalars.map(t => `api-reference/types/${createSlug(t.name)}`),
    interfaces: interfaces.map(t => `api-reference/types/${createSlug(t.name)}`)
  };

  // Remove outdated files before generating new ones
  removeOutdatedFiles(currentNavigation, apiRefDir);

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

  // Generate filtered schema
  generateFilteredSchema(schema);

  console.log('🚀 Run "pnpm dev" to preview your documentation');
}

// Run the generator
generateGraphQLDocs();