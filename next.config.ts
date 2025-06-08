import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Experimental features for better performance
  experimental: {
    // Enable server components caching
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },

  // Webpack configuration for AWS SDK and company libraries
  webpack: (config, { isServer, webpack }) => {
    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push(
      /Module not found.*@sentry/,
      /Module not found.*@keyv/,
      /Can't resolve.*@sentry/,
      /Can't resolve.*@keyv/,
      /Critical dependency.*@sentry/,
      /Critical dependency.*keyv/,
      /ReactCurrentDispatcher/
    );

    // Handle AWS SDK v3 modules properly
    if (!isServer) {
      // Mark AWS SDK as external for client-side to reduce bundle size
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        util: false,
        events: false,
        buffer: false,
        child_process: false,
        cluster: false,
        dgram: false,
        dns: false,
        readline: false,
        repl: false,
        vm: false,
        inspector: false,
        async_hooks: false,
        perf_hooks: false,
        http2: false,
        v8: false,
        console: false,
        "@sentry/serverless": false,
        "@sentry/node": false,
        "@sentry-internal/tracing": false,
        "@sentry/core": false,
        "@sentry/integrations": false,
        "@sentry/types": false,
        "@sentry/utils": false,
      };

      // Add externals for server-side packages to prevent client bundling
      config.externals = config.externals || [];
      config.externals.push(
        // Express and web server packages
        'express',
        'express-rate-limit',
        'helmet',
        'cors',
        'body-parser',
        'cookie-parser',
        'morgan',
        'compression',
        // Database packages
        'mongoose',
        'redis',
        'ioredis',
        'pg',
        'mysql2',
        'sqlite3',
        // Company libraries
        '@company-z/api-management-library',
        '@company-z/crypto-data',
        '@company-z/subgraph-library',
        // DI container
        'inversify',
        'reflect-metadata',
        // Sentry packages
        '@sentry/serverless',
        '@sentry/node',
        '@sentry/core',
        '@sentry/integrations',
        '@sentry-internal/tracing',
        // AWS SDK packages
        '@aws-sdk/client-cognito-identity-provider',
        '@aws-sdk/client-dynamodb',
        '@smithy/node-http-handler',
        // Other server-side packages
        'mime',
        'etag',
        'send',
        'destroy',
        'strtok3',
        '@opensearch-project/opensearch',
        '@apollo/federation-internals',
        '@keyv/redis',
        // Node.js built-ins that might be imported
        /^(fs|net|tls|crypto|stream|url|zlib|http|https|assert|os|path|util|events|buffer|child_process|cluster|dgram|dns|readline|repl|vm|inspector|async_hooks|perf_hooks|http2|v8|console)$/
      );
    }

    // Optimize @company-z libraries
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules\/@company-z/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    // Ignore problematic modules that aren't needed in browser
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(aws-crt|@aws-sdk\/signature-v4-crt)$/,
      })
    );

    return config;
  },

  // Server-only packages that should not be bundled for client
  serverExternalPackages: [
    '@aws-sdk/client-cognito-identity-provider',
    '@aws-sdk/client-dynamodb',
    '@smithy/node-http-handler',
    '@company-z/api-management-library',
    '@company-z/crypto-data',
    '@company-z/subgraph-library',
    'inversify',
    'reflect-metadata',
    '@sentry/serverless',
    '@sentry/node',
    '@sentry/core',
    '@sentry/integrations',
    '@sentry-internal/tracing',
    '@keyv/redis',
    // Express and related server-side packages
    'express',
    'express-rate-limit',
    'helmet',
    'cors',
    'body-parser',
    'cookie-parser',
    'morgan',
    'compression',
    // Database and server utilities
    'mongoose',
    'redis',
    'ioredis',
    'pg',
    'mysql2',
    'sqlite3',
    // Other server-side packages that appeared in errors
    'mime',
    'etag',
    'send',
    'destroy',
    'strtok3',
    '@opensearch-project/opensearch',
    '@apollo/federation-internals',
    // Node.js built-in modules that might be imported
    'fs',
    'path',
    'os',
    'crypto',
    'net',
    'tls',
    'http',
    'https',
    'stream',
    'url',
    'zlib',
    'util',
    'events',
    'buffer',
    'assert',
    'child_process',
    'cluster',
    'dgram',
    'dns',
    'readline',
    'repl',
    'vm',
    'inspector',
    'async_hooks',
    'perf_hooks',
    'http2',
    'v8',
    'console',
  ],

  // Environment variables that should be available to the client
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Image optimization settings
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Output configuration
  output: 'standalone',

  // Enable minification and compression
  compress: true,
  poweredByHeader: false,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
