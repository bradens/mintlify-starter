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
function createTypeLink(typeName, typeCategories = null) {
  if (!typeName || typeName === 'Unknown') {
    return 'Unknown';
  }

  const builtInTypes = ['String', 'Int', 'Float', 'Boolean', 'ID'];
  if (builtInTypes.includes(typeName)) {
    return typeName;
  }

  // Remove any GraphQL syntax markers
  const cleanTypeName = typeName.replace(/[!\[\]]/g, '');

  if (typeCategories) {
    // Determine which consolidated page this type belongs to
    if (typeCategories.objects.find(t => t.name === cleanTypeName)) {
      return `[${typeName}](/api-reference/types#${cleanTypeName.toLowerCase()})`;
    } else if (typeCategories.enums.find(t => t.name === cleanTypeName)) {
      return `[${typeName}](/api-reference/enums#${cleanTypeName.toLowerCase()})`;
    } else if (typeCategories.inputs.find(t => t.name === cleanTypeName)) {
      return `[${typeName}](/api-reference/input-objects#${cleanTypeName.toLowerCase()})`;
    } else if (typeCategories.unions.find(t => t.name === cleanTypeName) ||
               typeCategories.interfaces.find(t => t.name === cleanTypeName) ||
               typeCategories.scalars.find(t => t.name === cleanTypeName)) {
      return `[${typeName}](/api-reference/unions-and-interfaces#${cleanTypeName.toLowerCase()})`;
    }
  }

  // Fallback to old behavior if type categorization not available
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
function generateOperationDoc(operation, operationType, typeCategories = null) {
  const returnType = createTypeLink(formatType(operation.type), typeCategories);
  const description = cleanDescription(operation.description);
  const metadata = parseMetadata(operation.description);

  let content = `---
title: "${operation.name}"
description: "${description || `${operationType} operation`}"`;

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

        if (shouldLink && typeCategories) {
          // Determine which consolidated page this type belongs to
          let linkUrl = '';
          if (typeCategories.objects.find(t => t.name === cleanTypeName)) {
            linkUrl = `/api-reference/types#${cleanTypeName.toLowerCase()}`;
          } else if (typeCategories.enums.find(t => t.name === cleanTypeName)) {
            linkUrl = `/api-reference/enums#${cleanTypeName.toLowerCase()}`;
          } else if (typeCategories.inputs.find(t => t.name === cleanTypeName)) {
            linkUrl = `/api-reference/input-objects#${cleanTypeName.toLowerCase()}`;
          } else if (typeCategories.unions.find(t => t.name === cleanTypeName) ||
                     typeCategories.interfaces.find(t => t.name === cleanTypeName) ||
                     typeCategories.scalars.find(t => t.name === cleanTypeName)) {
            linkUrl = `/api-reference/unions-and-interfaces#${cleanTypeName.toLowerCase()}`;
          } else {
            // Fallback to old linking for unknown types
            linkUrl = `/api-reference/types/${createSlug(cleanTypeName)}`;
          }

          content += `<a href="${linkUrl}">
  <ResponseField name="${arg.name}" type="${typeName}"${required ? ' required' : ''}>
    ${argDescription}`;
        } else if (shouldLink) {
          // Fallback to old behavior when typeCategories not available
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

// Generate consolidated documentation for object types
function generateObjectTypesDoc(types) {
  let content = `---
title: "Object Types"
description: "All object types in the GraphQL schema"
noindex: true
---

`;

  types.forEach(type => {
    const description = cleanDescription(type.description);

    content += `## ${type.name}\n\n`;

    if (description) {
      content += `${description}\n\n`;
    }

    // Add deprecation warning for the type itself if deprecated
    if (isDeprecated(type)) {
      content += `<Warning>
  This type is deprecated. ${cleanDescription(getDeprecationReason(type))}
</Warning>

`;
    }

    const fields = Object.values(type.getFields());
    const visibleFields = fields.filter(field => !shouldHideField(field));

    if (visibleFields.length > 0) {
      visibleFields.forEach(field => {
        const typeName = formatType(field.type);
        const required = isFieldRequired(field.type);
        const fieldDescription = cleanDescription(field.description) || 'No description provided';

        content += `<ResponseField name="${field.name}" type="${typeName}"${required ? ' required' : ''}>
  ${fieldDescription}`;

        // Add deprecation warning for the field if deprecated
        if (isDeprecated(field)) {
          content += `\n  \n  <Warning>\n    This field is deprecated. ${cleanDescription(getDeprecationReason(field))}\n  </Warning>`;
        }

        content += `\n</ResponseField>

`;
      });
    }

    // Add GraphQL schema definition
    const schemaDefinition = generateGraphQLSchema(type);
    if (schemaDefinition) {
      content += `\`\`\`graphql \n${schemaDefinition}\n\`\`\`\n\n`;
    }

    content += `---\n\n`;
  });

  return content;
}

// Generate consolidated documentation for enums
function generateEnumsDoc(types) {
  let content = `---
title: "Enums"
description: "All enum types in the GraphQL schema"
noindex: true
---

`;

  types.forEach(type => {
    const description = cleanDescription(type.description);

    content += `## ${type.name}\n\n`;

    if (description) {
      content += `${description}\n\n`;
    }

    // Add deprecation warning for the type itself if deprecated
    if (isDeprecated(type)) {
      content += `<Warning>
  This type is deprecated. ${cleanDescription(getDeprecationReason(type))}
</Warning>

`;
    }

    const values = type.getValues().filter(value => !shouldHideField(value));
    if (values.length > 0) {
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

    // Add GraphQL schema definition
    const schemaDefinition = generateGraphQLSchema(type);
    if (schemaDefinition) {
      content += `\`\`\`graphql \n${schemaDefinition}\n\`\`\`\n\n`;
    }

    content += `---\n\n`;
  });

  return content;
}

// Generate consolidated documentation for input objects
function generateInputObjectsDoc(types) {
  let content = `---
title: "Input Objects"
description: "All input object types in the GraphQL schema"
noindex: true
---

`;

  types.forEach(type => {
    const description = cleanDescription(type.description);

    content += `## ${type.name}\n\n`;

    if (description) {
      content += `${description}\n\n`;
    }

    // Add deprecation warning for the type itself if deprecated
    if (isDeprecated(type)) {
      content += `<Warning>
  This type is deprecated. ${cleanDescription(getDeprecationReason(type))}
</Warning>

`;
    }

    const fields = Object.values(type.getFields());
    const visibleFields = fields.filter(field => !shouldHideField(field));

    if (visibleFields.length > 0) {
      visibleFields.forEach(field => {
        const typeName = formatType(field.type);
        const required = isFieldRequired(field.type);
        const fieldDescription = cleanDescription(field.description) || 'No description provided';

        content += `<ResponseField name="${field.name}" type="${typeName}"${required ? ' required' : ''}>
  ${fieldDescription}`;

        // Add deprecation warning for the field if deprecated
        if (isDeprecated(field)) {
          content += `\n  \n  <Warning>\n    This field is deprecated. ${cleanDescription(getDeprecationReason(field))}\n  </Warning>`;
        }

        content += `\n</ResponseField>

`;
      });
    }

    // Add GraphQL schema definition
    const schemaDefinition = generateGraphQLSchema(type);
    if (schemaDefinition) {
      content += `\`\`\`graphql \n${schemaDefinition}\n\`\`\`\n\n`;
    }

    content += `---\n\n`;
  });

  return content;
}

// Generate consolidated documentation for unions and interfaces
function generateUnionsAndInterfacesDoc(unions, interfaces, scalars) {
  let content = `---
title: "Unions and Interfaces"
description: "All union types, interface types, and custom scalar types in the GraphQL schema"
noindex: true
---

`;

  // Add unions
  if (unions.length > 0) {
    content += `# Union Types\n\n`;

    unions.forEach(type => {
      const description = cleanDescription(type.description);

      content += `### ${type.name}\n\n`;

      if (description) {
        content += `${description}\n\n`;
      }

      // Add deprecation warning for the type itself if deprecated
      if (isDeprecated(type)) {
        content += `<Warning>
  This type is deprecated. ${cleanDescription(getDeprecationReason(type))}
</Warning>

`;
      }

      const unionTypes = type.getTypes();
      content += `This union can be one of the following types:\n\n`;
      unionTypes.forEach(unionType => {
        content += `- ${unionType.name}\n`;
      });
      content += `\n`;

      // Add GraphQL schema definition
      const schemaDefinition = generateGraphQLSchema(type);
      if (schemaDefinition) {
        content += `\`\`\`graphql \n${schemaDefinition}\n\`\`\`\n\n`;
      }

      content += `---\n\n`;
    });
  }

  // Add interfaces
  if (interfaces.length > 0) {
    content += `# Interface Types\n\n`;

    interfaces.forEach(type => {
      const description = cleanDescription(type.description);

      content += `### ${type.name}\n\n`;

      if (description) {
        content += `${description}\n\n`;
      }

      // Add deprecation warning for the type itself if deprecated
      if (isDeprecated(type)) {
        content += `<Warning>
  This type is deprecated. ${cleanDescription(getDeprecationReason(type))}
</Warning>

`;
      }

      const fields = Object.values(type.getFields());
      const visibleFields = fields.filter(field => !shouldHideField(field));

      if (visibleFields.length > 0) {
        visibleFields.forEach(field => {
          const typeName = formatType(field.type);
          const required = isFieldRequired(field.type);
          const fieldDescription = cleanDescription(field.description) || 'No description provided';

          content += `<ResponseField name="${field.name}" type="${typeName}"${required ? ' required' : ''}>
  ${fieldDescription}`;

          // Add deprecation warning for the field if deprecated
          if (isDeprecated(field)) {
            content += `\n  \n  <Warning>\n    This field is deprecated. ${cleanDescription(getDeprecationReason(field))}\n  </Warning>`;
          }

          content += `\n</ResponseField>

`;
        });
      }

      // Add GraphQL schema definition
      const schemaDefinition = generateGraphQLSchema(type);
      if (schemaDefinition) {
        content += `\`\`\`graphql \n${schemaDefinition}\n\`\`\`\n\n`;
      }

      content += `---\n\n`;
    });
  }

  // Add custom scalars
  if (scalars.length > 0) {
    content += `# Custom Scalar Types\n\n`;

    scalars.forEach(type => {
      const description = cleanDescription(type.description);

      content += `### ${type.name}\n\n`;

      if (description) {
        content += `${description}\n\n`;
      } else {
        content += `This is a custom scalar type.\n\n`;
      }

      // Add deprecation warning for the type itself if deprecated
      if (isDeprecated(type)) {
        content += `<Warning>
  This type is deprecated. ${cleanDescription(getDeprecationReason(type))}
</Warning>

`;
      }

      // Add GraphQL schema definition
      const schemaDefinition = generateGraphQLSchema(type);
      if (schemaDefinition) {
        content += `\`\`\`graphql \n${schemaDefinition}\n\`\`\`\n\n`;
      }

      content += `---\n\n`;
    });
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

    // Add consolidated Types group
    if (navigation.types.length > 0) {
      newGroups.push({
        group: 'Types',
        pages: navigation.types.map(typeGroup => typeGroup.path)
      });
    }

    // Update the GraphQL tab groups
    graphqlTab.groups = newGroups;

    writeDocsJson(docsData);

    // Log changes
    const currentOperations = new Set(navigation.operations.map(op => path.basename(op.path)));
    const currentConsolidatedTypes = new Set(navigation.types.map(type => path.basename(type.path)));

    // Log operation changes
    const addedOperations = [...currentOperations].filter(x => !existingPages.operations.has(x));
    const removedOperations = [...existingPages.operations].filter(x => !currentOperations.has(x));

    if (addedOperations.length > 0) {
      console.log(`➕ Added operations: ${addedOperations.join(', ')}`);
    }
    if (removedOperations.length > 0) {
      console.log(`➖ Removed operations: ${removedOperations.join(', ')}`);
    }

    // Log type structure changes
    const totalExistingTypes = existingPages.types.size + existingPages.enums.size + existingPages.inputObjects.size + existingPages.unionsAndInterfaces.size;
    const totalCurrentTypes = currentConsolidatedTypes.size;

    if (totalExistingTypes > 0) {
      console.log(`🔄 Converted ${totalExistingTypes} individual type pages to ${totalCurrentTypes} consolidated pages`);
    } else if (totalCurrentTypes > 0) {
      console.log(`➕ Added ${totalCurrentTypes} consolidated type pages`);
    }

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

    // Log consolidated type information
    if (navigation.types.length > 0) {
      console.log(`  Consolidated Type Pages: ${navigation.types.length} pages`);
      navigation.types.forEach(typeGroup => {
        console.log(`    - ${typeGroup.name}: 1 consolidated page`);
      });
    }

  } catch (error) {
    console.error('❌ Error updating docs.json navigation:', error.message);
  }
}

// Helper function to remove outdated files
function removeOutdatedFiles(currentNavigation, apiRefDir) {
  const docsData = readDocsJson();
  const existingPages = getExistingApiPages(docsData);

  const currentOperations = new Set(currentNavigation.operations.map(op => path.basename(op.path)));

  // For consolidated pages, we need a different approach
  const currentConsolidatedPages = new Set(['index.mdx']); // All consolidated pages use index.mdx

  let removedCount = 0;

  // Remove individual type files (since we now use consolidated pages)
  const typeDirectories = ['types', 'enums', 'input-objects', 'unions-and-interfaces'];

  typeDirectories.forEach(dirName => {
    const dirPath = path.join(apiRefDir, dirName);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(fileName => {
        const filePath = path.join(dirPath, fileName);

        // Keep only index.mdx files for consolidated pages, remove individual type files
        if (fileName !== 'index.mdx' && fileName.endsWith('.mdx')) {
          fs.unlinkSync(filePath);
          removedCount++;
          console.log(`🗑️ Removed individual type file: ${dirName}/${fileName}`);
        }
      });
    }
  });

  // Handle operations (keep existing logic for operations)
  const operationDirectories = ['queries', 'mutations', 'subscriptions'];
  operationDirectories.forEach(dirName => {
    const dirPath = path.join(apiRefDir, dirName);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(fileName => {
        if (fileName.endsWith('.mdx')) {
          const baseName = path.basename(fileName, '.mdx');
          if (!currentOperations.has(baseName)) {
            const filePath = path.join(dirPath, fileName);
            fs.unlinkSync(filePath);
            removedCount++;
            console.log(`🗑️ Removed outdated operation file: ${dirName}/${fileName}`);
          }
        }
      });
    }
  });

  if (removedCount === 0) {
    console.log('✅ No outdated files to remove');
  } else {
    console.log(`🧹 Removed ${removedCount} outdated files`);
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
  const dirs = ['queries', 'mutations', 'subscriptions', 'types', 'enums', 'input-objects', 'unions-and-interfaces'];

  dirs.forEach(dir => {
    const dirPath = path.join(apiRefDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  // Collect all operations with their metadata for categorization
  const allOperations = [];

  // Prepare type categorization for linking
  const typeCategories = { objects, enums, unions, inputs, scalars, interfaces };

  // Generate query documentation and collect metadata
  console.log(`📝 Generating ${queries.length} query pages...`);
  queries.forEach(query => {
    const { content, metadata } = generateOperationDoc(query, 'Query', typeCategories);
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
    const { content, metadata } = generateOperationDoc(mutation, 'Mutation', typeCategories);
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
    const { content, metadata } = generateOperationDoc(subscription, 'Subscription', typeCategories);
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

  // Generate consolidated type documentation
  console.log(`📝 Generating consolidated type pages...`);

  // Generate consolidated pages
  if (objects.length > 0) {
    console.log(`📝 Generating types page with ${objects.length} object types...`);
    const objectTypesContent = generateObjectTypesDoc(objects.sort((a, b) => a.name.localeCompare(b.name)));
    fs.writeFileSync(path.join(apiRefDir, 'types', 'index.mdx'), objectTypesContent);
  }

  if (enums.length > 0) {
    console.log(`📝 Generating enums page with ${enums.length} enum types...`);
    const enumsContent = generateEnumsDoc(enums.sort((a, b) => a.name.localeCompare(b.name)));
    fs.writeFileSync(path.join(apiRefDir, 'enums', 'index.mdx'), enumsContent);
  }

  if (inputs.length > 0) {
    console.log(`📝 Generating input objects page with ${inputs.length} input types...`);
    const inputObjectsContent = generateInputObjectsDoc(inputs.sort((a, b) => a.name.localeCompare(b.name)));
    fs.writeFileSync(path.join(apiRefDir, 'input-objects', 'index.mdx'), inputObjectsContent);
  }

  if (unions.length > 0 || interfaces.length > 0 || scalars.length > 0) {
    console.log(`📝 Generating unions and interfaces page with ${unions.length} unions, ${interfaces.length} interfaces, and ${scalars.length} scalars...`);
    const unionsAndInterfacesContent = generateUnionsAndInterfacesDoc(
      unions.sort((a, b) => a.name.localeCompare(b.name)),
      interfaces.sort((a, b) => a.name.localeCompare(b.name)),
      scalars.sort((a, b) => a.name.localeCompare(b.name))
    );
    fs.writeFileSync(path.join(apiRefDir, 'unions-and-interfaces', 'index.mdx'), unionsAndInterfacesContent);
  }

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
  const consolidatedTypes = [];

    if (objects.length > 0) {
    consolidatedTypes.push({
      name: 'Object Types',
      path: 'api-reference/types/index',
      typeCategory: 'types'
    });
  }

  if (enums.length > 0) {
    consolidatedTypes.push({
      name: 'Enums',
      path: 'api-reference/enums/index',
      typeCategory: 'enums'
    });
  }

  if (inputs.length > 0) {
    consolidatedTypes.push({
      name: 'Input Objects',
      path: 'api-reference/input-objects/index',
      typeCategory: 'inputs'
    });
  }

  if (unions.length > 0 || interfaces.length > 0 || scalars.length > 0) {
    consolidatedTypes.push({
      name: 'Unions and Interfaces',
      path: 'api-reference/unions-and-interfaces/index',
      typeCategory: 'unionsAndInterfaces'
    });
  }

  const currentNavigation = {
    operations: allOperations,
    operationsByCategory,
    types: consolidatedTypes,
    typesByCategory: {
      types: objects.length > 0 ? { 'consolidated': [{ name: 'Object Types', path: 'api-reference/types/index' }] } : {},
      enums: enums.length > 0 ? { 'consolidated': [{ name: 'Enums', path: 'api-reference/enums/index' }] } : {},
      inputs: inputs.length > 0 ? { 'consolidated': [{ name: 'Input Objects', path: 'api-reference/input-objects/index' }] } : {},
      unionsAndInterfaces: (unions.length > 0 || interfaces.length > 0 || scalars.length > 0) ? { 'consolidated': [{ name: 'Unions and Interfaces', path: 'api-reference/unions-and-interfaces/index' }] } : {}
    }
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
  - ${consolidatedTypes.length} consolidated type pages:`);

  consolidatedTypes.forEach(type => {
    let count = 0;
    if (type.typeCategory === 'types') count = objects.length;
    else if (type.typeCategory === 'enums') count = enums.length;
    else if (type.typeCategory === 'inputs') count = inputs.length;
    else if (type.typeCategory === 'unionsAndInterfaces') count = unions.length + interfaces.length + scalars.length;

    console.log(`    - ${type.name}: ${count} types`);
  });

  console.log('\n📋 Updated docs.json with new navigation structure');
  console.log('📄 Check generated-navigation.json for the complete list of pages');

  // Generate filtered schema
  generateFilteredSchema(schema);

  console.log('🚀 Run "pnpm dev" to preview your documentation');
}

// Run the generator
generateGraphQLDocs();