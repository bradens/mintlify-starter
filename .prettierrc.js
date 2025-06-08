/** @type {import("prettier").Config} */
const config = {
  // Print width - line length that the formatter will wrap on
  printWidth: 100,

  // Tab width - number of spaces per indentation-level
  tabWidth: 2,

  // Use tabs instead of spaces
  useTabs: false,

  // Semicolons - always add semicolons at the end of statements
  semi: true,

  // Quotes - use single quotes instead of double quotes
  singleQuote: true,

  // Quote props - only add quotes around object properties when necessary
  quoteProps: 'as-needed',

  // JSX quotes - use single quotes in JSX
  jsxSingleQuote: true,

  // Trailing commas - use trailing commas where valid in ES5 (objects, arrays, etc.)
  trailingComma: 'es5',

  // Bracket spacing - print spaces between brackets in object literals
  bracketSpacing: true,

  // Bracket same line - put the > of a multi-line JSX element at the end of the last line
  bracketSameLine: false,

  // Arrow function parentheses - include parentheses around a sole arrow function parameter
  arrowParens: 'avoid',

  // Range formatting - format the entire contents of the file
  rangeStart: 0,
  rangeEnd: Infinity,

  // Require pragma - don't require a special comment to format files
  requirePragma: false,

  // Insert pragma - don't insert a special @format comment
  insertPragma: false,

  // Prose wrap - wrap prose as-is (don't change line breaks in markdown)
  proseWrap: 'preserve',

  // HTML whitespace sensitivity - respect existing line breaks in HTML
  htmlWhitespaceSensitivity: 'css',

  // Vue files script and style tags indentation
  vueIndentScriptAndStyle: false,

  // End of line - maintain existing line endings
  endOfLine: 'lf',

  // Embedded language formatting - format code inside template literals
  embeddedLanguageFormatting: 'auto',

  // Single attribute per line in HTML/Vue/JSX
  singleAttributePerLine: false,

  // Plugin-specific options
  plugins: [
    // Add any Prettier plugins here if needed
  ],

  // Override specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        singleQuote: false,
      },
    },
    {
      files: ['*.css', '*.scss', '*.less'],
      options: {
        singleQuote: false,
      },
    },
  ],
};

module.exports = config;
