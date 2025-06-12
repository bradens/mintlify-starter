# Codex.io Monorepo

This is a Turborepo monorepo containing the Codex.io platform applications and packages.

## Apps

- **dashboard** (`apps/dashboard`): Main dashboard application for API key management, usage statistics, and billing
- **docs** (`apps/docs`): Documentation website for the Codex.io API

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start all apps in development mode
pnpm dev

# Start specific app
pnpm dev:dashboard  # Dashboard app on port 3001
pnpm dev:docs       # Docs app on port 3002

# Or use turbo directly
turbo dev --filter=@codex/dashboard
turbo dev --filter=@codex/docs

# With AWS Profile
AWS_PROFILE=your-profile pnpm dev
AWS_PROFILE=your-profile pnpm dev:dashboard
```

### Building

```bash
# Build all apps
pnpm build

# Build specific app
turbo build --filter=@codex/dashboard
turbo build --filter=@codex/docs
```

### Testing

```bash
# Run tests for all apps
pnpm test

# Run tests for specific app
turbo test --filter=@codex/dashboard
```

### Linting & Formatting

```bash
# Lint all apps
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type check
pnpm type-check

# Run all checks
pnpm check-all

# Fix all issues
pnpm fix-all
```

## Apps Overview

### Dashboard (`@codex/dashboard`)

The main dashboard application built with Next.js 15, featuring:

- **Authentication**: NextAuth.js with multiple providers
- **API Key Management**: Create, manage, and monitor API keys
- **Usage Statistics**: Real-time usage analytics and metrics
- **Billing**: Stripe integration for subscription management
- **UI Components**: Radix UI with Tailwind CSS
- **Database**: DynamoDB with AWS SDK
- **Testing**: Jest with React Testing Library

**Tech Stack:**
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- NextAuth.js
- AWS SDK (DynamoDB, Cognito)
- Stripe
- Radix UI
- React Hook Form with Zod validation
- Recharts for analytics

### Docs (`@codex/docs`)

The documentation website built with Next.js 15, featuring:

- **API Documentation**: Complete API reference
- **Guides**: Integration guides and tutorials
- **Examples**: Code examples and use cases
- **Clean Design**: Modern, responsive documentation layout

**Tech Stack:**
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Lucide React icons

## Project Structure

```
apps/
├── dashboard/          # Main dashboard application
│   ├── app/           # Next.js app router pages
│   ├── components/    # React components
│   ├── contexts/      # React contexts
│   ├── lib/          # Utility functions and services
│   ├── types/        # TypeScript type definitions
│   └── di/           # Dependency injection setup
├── docs/             # Documentation website
│   ├── app/          # Next.js app router pages
│   ├── components/   # React components
│   └── public/       # Static assets
packages/             # Shared packages (future)
```

## Scripts

### Root Scripts

- `pnpm dev` - Start all apps in development
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all apps
- `pnpm test` - Test all apps
- `pnpm clean` - Clean all build artifacts
- `pnpm reset` - Clean and reinstall dependencies

### App-Specific Scripts

- `pnpm dev:dashboard` - Start dashboard app
- `pnpm dev:docs` - Start docs app
- `turbo [command] --filter=@codex/[app]` - Run command for specific app

## Environment Variables

### AWS Configuration

The monorepo is configured to pass the `AWS_PROFILE` environment variable to all application processes. You can set it when running commands:

```bash
# Set AWS profile for all commands
export AWS_PROFILE=your-profile-name

# Or set it per command
AWS_PROFILE=your-profile-name pnpm dev
AWS_PROFILE=production pnpm build
```

### Dashboard App

Create `apps/dashboard/.env.local`:

```env
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-here
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-secret-here
STRIPE_SECRET_KEY=your-stripe-key-here
# ... other environment variables
```

**Note**: When using `AWS_PROFILE`, you typically don't need to set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your `.env.local` as these will be pulled from your AWS credentials file.

**AWS Profile Setup Examples:**
```bash
# Development profile
AWS_PROFILE=codex-dev pnpm dev:dashboard

# Production build
AWS_PROFILE=codex-prod pnpm build

# Running tests with specific profile
AWS_PROFILE=codex-test pnpm test

# Set profile for entire session
export AWS_PROFILE=codex-dev
pnpm dev  # Will use codex-dev profile
```

### Docs App

No specific environment variables required for basic setup.

## Deployment

### Dashboard

The dashboard app can be deployed to any platform that supports Next.js:

- Vercel
- Netlify
- AWS Amplify
- Docker

### Docs

The docs app can be deployed as a static site or server-side rendered:

- Vercel
- Netlify
- GitHub Pages (static)
- AWS S3 + CloudFront

## Contributing

1. Create a new branch for your feature
2. Make changes in the appropriate app directory
3. Run `pnpm check-all` to ensure code quality
4. Submit a pull request

## Architecture

This monorepo uses:

- **Turborepo** for build orchestration and caching
- **pnpm** for package management with workspaces
- **TypeScript** for type safety across all apps
- **ESLint** and **Prettier** for code quality
- **Shared configurations** for consistent tooling

## Performance

Turborepo provides:

- **Incremental builds** - Only rebuild what changed
- **Parallel execution** - Run tasks across apps simultaneously
- **Smart caching** - Cache build outputs locally and remotely
- **Task orchestration** - Manage dependencies between tasks

## Troubleshooting

### Common Issues

1. **Build failures**: Check that all environment variables are set
2. **Port conflicts**: Dashboard runs on 3001, docs on 3002
3. **Dependency issues**: Run `pnpm reset` to clean and reinstall
4. **Cache issues**: Run `turbo clean` to clear Turborepo cache

### Debugging

```bash
# Verbose turbo output
turbo [command] --verbose

# Run single app in isolation
cd apps/dashboard && pnpm dev

# Check dependency graph
turbo build --dry-run
```

For more help, check the individual app README files or contact the development team.