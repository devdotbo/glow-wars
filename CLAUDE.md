# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**IMPORTANT**: Always use `pnpm` for package management in this project. Never use `npm` or `yarn`.

## Commands

**Development:**

- `pnpm dev` - Start development servers (Convex backend and Vite frontend)
- `pnpm dev:web` - Start only the Vite development server
- `pnpm dev:convex` - Start only the Convex development server

**Build and Production:**

- `pnpm build` - Build the application and run TypeScript type checking
- `pnpm start` - Start the production server

**Code Quality:**

- `pnpm format` - Format all files with Prettier

**Data Management:**

- `pnpm seed` - Import sample data into the Convex tasks table from sampleData.jsonl
- `pnpm test` - Run tests with Vitest

**E2E Testing:**

- `pnpm test:e2e` - Run all E2E tests (uses default frontend)
- `pnpm test:e2e:ui` - Run E2E tests with Playwright UI mode
- `pnpm test:e2e:minimal` - Run E2E tests against web-minimal frontend
- `pnpm test:e2e:tanstack` - Run E2E tests against web-tanstack frontend
- `pnpm playwright:install` - Install Playwright browsers (run after initial setup)

## Architecture

This is a full-stack TypeScript application using:

- **TanStack Start** with file-based routing for the React frontend
- **Convex** as the backend database and real-time sync engine
- **Clerk** for authentication
- **TanStack Query** integrated with Convex for data fetching

### Key Architectural Patterns

1. **Authentication Flow**:
   - Clerk provides auth via `ClerkProvider` in the root route
   - Protected routes use the `_authed` layout that checks for `userId` in context
   - Convex gets auth tokens from Clerk using the "convex" JWT template

2. **Data Layer Integration**:
   - Convex client is initialized in `router.tsx` with React Query integration
   - The `ConvexQueryClient` bridges Convex and TanStack Query
   - All Convex functions are wrapped with React Query's caching and state management

3. **Routing Structure**:
   - File-based routing with TanStack Router
   - Protected routes under `/_authed/` directory
   - Route context provides `queryClient`, `convexClient`, and `convexQueryClient`

## Convex Guidelines

For comprehensive Convex development guidelines, best practices, and examples, refer to:
**`docs/convex.md`**

This file contains:
- Complete function syntax and validators documentation
- Schema design patterns and best practices
- TypeScript guidelines for Convex
- Query, mutation, and action patterns
- File storage, pagination, and search guidelines
- Full example implementations

Key highlights:
1. **Function Syntax**: Always use the new function syntax with explicit validators
2. **Validators**: Use proper validators for all arguments and return types (e.g., `v.id("tableName")`, `v.string()`)
3. **Indexes**: Name indexes descriptively including all fields (e.g., "by_channel_and_user")
4. **Queries**: Use `withIndex` instead of `filter` for performance
5. **Internal Functions**: Use `internal*` variants for private functions not exposed to clients

## Configuration Requirements

Before running the app, ensure these environment variables are set:

- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `VITE_CONVEX_URL`
- `VITE_CLERK_FRONTEND_API_URL`

Configure the Clerk domain in `convex/auth.config.ts` to match your Clerk JWT template.

## Code Style

- No semicolons (Prettier configured)
- Single quotes for strings
- Trailing commas in multi-line structures
- TypeScript strict mode enabled

## Development Workflow

- Commit changes after each completed step or feature
- Use descriptive commit messages that explain what was changed

## Development Tools

### Convex MCP Server

The project has Convex MCP server configured for development debugging.
Use it to inspect game state, run queries, and manage test data.

**Common uses**:
- Inspect game state: `mcp__convex__tables` and `mcp__convex__data`
- Run queries: `mcp__convex__run` with function names
- Clear test data: `mcp__convex__run` with `testingFunctions.js:clearAll`
- Manage env vars: `mcp__convex__envList`, `envGet`, `envSet`

The MCP server is configured in `.claude/settings.json` and `.mcp.json`.

## Git Commit Guidelines

To ensure clean commits without unintended files:

1. **Always run `git status` before staging files** - Review what files have been modified
2. **Use `git add --dry-run .` to preview what will be added** - This shows what would be staged without actually staging
3. **Review staged files with `git diff --cached` before committing** - Verify the actual changes being committed
4. **Never use `git add .` without checking** - Prefer explicit file paths or use `git add -p` for interactive staging
5. **Stage files individually when unsure** - Better to be explicit than to include unwanted files
6. **Check for unintended files** like:
   - Backup files (`.bk`, `*.bak`, `*.backup`)
   - Temporary files (`*.tmp`, `*.temp`, `*~`)
   - IDE-specific files or directories
   - Generated files that shouldn't be tracked
7. **If you accidentally stage files, use `git restore --staged <file>` to unstage them**

## Glow Wars Workflow Rules

When working on Glow Wars tasks, follow these critical rules:

1. **Start of Session**: ALWAYS read `.workflow/state.json` first to understand current progress
2. **State Updates**: Update `.workflow/state.json` after every meaningful action
3. **Test-Driven**: Write tests first, then implementation (TDD approach)
   - For backend: Write unit tests first using Vitest
   - For frontend: Write E2E tests first using Playwright
   - Run tests frequently during development
4. **Atomic Commits**: Each task completion gets its own commit
   - **IMPORTANT**: Always commit automatically after completing each task
   - Do NOT wait for explicit user request to commit
   - Use descriptive commit messages following the pattern: "feat: [description] (Task N)"
5. **E2E Testing Before Commits**: 
   - Run `pnpm test:e2e:minimal` before committing frontend changes
   - Ensure CI will pass by running tests locally first
   - Add new E2E tests when implementing new features
6. **Progress Tracking**: Update `.workflow/progress.md` with test results and notes
7. **Context Management**: Only load files needed for current task
8. **Session Handoff**: Before ending, update state.json with specific nextAction

**Important Files**:

- `.workflow/state.json` - Current backend task state and progress
- `.workflow/frontend-state.json` - Frontend implementation phases and progress
- `.workflow/progress.md` - Human-readable development log
- `docs/glow-wars-technical-implementation.md` - Backend task specifications
- `docs-front/frontend-implementation-plan.md` - Frontend implementation phases

Never assume previous conversation context. The workflow state files are the single source of truth.
