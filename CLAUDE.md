# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**

- `npm run dev` - Start development servers (Convex backend and Vite frontend)
- `npm run dev:web` - Start only the Vite development server
- `npm run dev:convex` - Start only the Convex development server

**Build and Production:**

- `npm run build` - Build the application and run TypeScript type checking
- `npm run start` - Start the production server

**Code Quality:**

- `npm run format` - Format all files with Prettier

**Data Management:**

- `npm run seed` - Import sample data into the Convex tasks table from sampleData.jsonl

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

The project follows specific Convex patterns (from `.cursor/rules/convex_rules.mdc`):

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
4. **Atomic Commits**: Each task completion gets its own commit
5. **Progress Tracking**: Update `.workflow/progress.md` with test results and notes
6. **Context Management**: Only load files needed for current task
7. **Session Handoff**: Before ending, update state.json with specific nextAction

**Important Files**:

- `.workflow/state.json` - Current task state and progress
- `.workflow/progress.md` - Human-readable development log
- `docs/glow-wars-technical-implementation.md` - Task specifications

Never assume previous conversation context. The workflow state files are the single source of truth.
