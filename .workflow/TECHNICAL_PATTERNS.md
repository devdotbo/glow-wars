# Technical Patterns

This document captures important technical patterns discovered during Glow Wars development.

## Convex Patterns

### 1. Deployment Directory Structure

**Pattern**: Functions MUST be in root `/convex/` directory

```
✅ CORRECT:
project-root/
├── convex/
│   ├── games.ts
│   ├── players.ts
│   └── schema.ts

❌ WRONG:
project-root/
├── packages/
│   └── convex/
│       └── convex/
│           ├── games.ts
│           └── players.ts
```

**Why**: Convex deployment expects functions in root directory. Package structure can re-export but not contain the actual functions.

### 2. Type Validation Strictness

**Pattern**: Validators must match schema EXACTLY

```typescript
// Schema
games: defineTable({
  timeLimit: v.number(),        // Note: timeLimit, not timeLimitMinutes
  winCondition: v.optional(v.union(
    v.literal("territory"),
    v.literal("elimination"),
    v.literal("time_limit")      // Note: time_limit, not time
  ))
})

// Query return validator MUST match
returns: v.object({
  timeLimit: v.number(),         // ✅ Matches schema
  // timeLimitMinutes: v.number() ❌ Would fail
})
```

**Common Mistakes**:
- Field name mismatches
- Enum value mismatches
- Missing optional fields in validators

### 3. ID Validation

**Pattern**: Use proper table-specific ID validators

```typescript
// ✅ CORRECT
args: {
  gameId: v.id('games'),
  playerId: v.id('players'),
}

// ❌ WRONG - Will cause runtime errors
args: {
  gameId: v.string(),  // Loses type safety
}
```

## React Query + Convex Patterns

### 1. Conditional Queries

**Pattern**: Use `enabled` flag for conditional queries

```typescript
// ✅ CORRECT - Standard React Query pattern
const { data: currentGame } = useQuery({
  ...convexQuery(api.games.getGame, { 
    gameId: gameSession.gameId || '' 
  }),
  enabled: !!gameSession.gameId,  // Only run when gameId exists
})

// ❌ WRONG - Non-standard 'skip' pattern
convexQuery(api.games.getGame, gameId ? { gameId } : 'skip')
```

**Why**: The `enabled` flag is React Query's standard way to conditionally run queries.

### 2. Mutation Patterns

**Pattern**: Use React Query mutations with Convex

```typescript
const createGameMutation = useMutation({
  mutationFn: async (maxPlayers: number) => {
    // Call Convex mutation directly
    const gameId = await convex.mutation(api.games.createGame, {
      name: `${playerName}'s Game`,
      maxPlayers,
    })
    return gameId
  },
  onSuccess: (gameId) => {
    // Update local state
    setGameSession({ gameId, isHost: true })
  },
  onError: (error) => {
    console.error('Game creation failed:', error)
  },
})

// Usage
createGameMutation.mutate(4)
```

### 3. Real-time Updates

**Pattern**: Use refetchInterval for polling

```typescript
const { data: availableGames } = useQuery({
  ...convexQuery(api.games.listAvailableGames, {}),
  refetchInterval: 1000,  // Poll every second
})
```

**Note**: Convex has built-in reactivity, but refetchInterval ensures new games appear quickly in lists.

## CSS/E2E Testing Patterns

### 1. Viewport Constraints

**Pattern**: Avoid pushing content outside viewport

```css
/* ❌ WRONG - Can push content outside viewport */
#root {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ✅ CORRECT - Content stays in viewport */
#root {
  width: 100vw;
  height: 100vh;
}

.menu-container {
  max-height: 90vh;
  overflow-y: auto;
}
```

**Why**: Playwright's default viewport (1280x720) may clip centered content.

### 2. Data Attributes for Testing

**Pattern**: Use data-testid consistently

```tsx
// Component
<button data-testid="create-game-button">
  Create Game
</button>

<div data-game-id={game._id.slice(-8)}>
  {game.name}
</div>

// Test
await page.locator('[data-testid="create-game-button"]').click()
await page.locator(`[data-game-id="${gameId}"]`).click()
```

### 3. ID Format Consistency

**Pattern**: Match display format in tests

```typescript
// If UI shows 8-char ID
<span>Game ID: {gameId.slice(-8)}</span>

// Test should look for 8-char ID
const gameId = fullGameId.slice(-8)
await page.locator(`[data-game-id="${gameId}"]`)
```

## Error Handling Patterns

### 1. Empty String vs Undefined

**Pattern**: Handle empty gameId carefully

```typescript
// Causes ArgumentValidationError if gameId is ""
convexQuery(api.games.getGame, { gameId: gameSession.gameId || '' })

// Better: Use enabled flag
const { data } = useQuery({
  ...convexQuery(api.games.getGame, { gameId: gameSession.gameId! }),
  enabled: !!gameSession.gameId,
})
```

### 2. Type Narrowing

**Pattern**: Narrow types before use

```typescript
// Check existence
if (!gameSession.gameId) {
  return <div>No active game</div>
}

// Now TypeScript knows gameId is defined
const { data: game } = useQuery({
  ...convexQuery(api.games.getGame, { gameId: gameSession.gameId }),
})
```

## Development Patterns

### 1. Logging Commands

**Pattern**: Capture output for debugging

```bash
#!/bin/bash
LOG_DIR=".workflow/logs"
mkdir -p $LOG_DIR
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
pnpm dev 2>&1 | tee "$LOG_DIR/dev-$TIMESTAMP.log"
```

**Usage**: 
- `pnpm dev:logged` for logged development
- Check `.workflow/logs/` for history

### 2. Package Exports

**Pattern**: Re-export from different location

```json
// packages/convex/package.json
{
  "exports": {
    "./_generated/api": "../../convex/_generated/api.js",
    "./_generated/dataModel": "../../convex/_generated/dataModel.d.ts"
  }
}
```

**Why**: Allows package structure while keeping Convex files in root.

## Common Gotchas

1. **Convex IDs are 32 chars** - Display subset for UX
2. **TypeScript strict mode** - Always enable for Convex
3. **React Query enabled** - Not 'skip' string
4. **Viewport testing** - Consider default sizes
5. **Type validators** - Must match schema exactly

These patterns help avoid common issues and maintain consistency.