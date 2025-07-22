# Context Reset Summary - Glow Wars Project

## 🚀 Quick Start
```bash
pnpm dev         # Start all services (Convex + web-minimal)
pnpm dev:logged  # Start with logging to .workflow/logs/
```
- Web-minimal: http://localhost:3001 ✅ (only frontend now)
- Convex Dashboard: [YOUR_CONVEX_DASHBOARD_URL]
- Logs: `.workflow/logs/` directory

## 📊 Current Status
- **Backend**: ✅ Fully deployed, all 10 tasks complete
- **Frontend**: ✅ Single frontend (web-minimal), ~6,800 lines removed
- **E2E Tests**: 3/25 passing (game ID fix may help more)
- **Architecture**: ✅ Simplified - no duplicates, TypeScript enabled
- **Branch**: `fix/simplify-architecture`
- **Next Issue**: "join existing game" test timeout (ID mismatch fixed)

## 🔧 Critical Technical Details

### 1. Project Structure (Simplified!)
```
glow-wars/
├── convex/           # Single backend (all functions here)
├── packages/
│   ├── convex/       # Package wrapper only (re-exports from root)
│   ├── web-minimal/  # Single frontend (no more web-tanstack)
│   ├── shared/       # Shared utilities
│   └── e2e-tests/    # E2E test suite
└── .workflow/        # Dev tools, logs, and documentation
```

### 2. Convex Deployment
```
✅ CORRECT: /convex/games.ts (root directory)
❌ DELETED: /packages/convex/convex/ (duplicate removed)
```
Package now re-exports from root via updated package.json exports.

### 3. React Query Pattern
```typescript
// ✅ CORRECT - Use enabled flag
const { data } = useQuery({
  ...convexQuery(api.games.getGame, { gameId: gameSession.gameId || '' }),
  enabled: !!gameSession.gameId,
})

// ❌ WRONG - Don't use 'skip' string
convexQuery(api.games.getGame, gameId ? { gameId } : 'skip')
```

### 4. Type Validation
- Enum: `time_limit` (NOT `time`)
- Field: `timeLimit` (NOT `timeLimitMinutes`)
- Validators MUST match schema exactly

### 5. CSS Fixes Applied
```css
/* Fixed viewport issues by: */
/* 1. Removing flexbox centering from #root */
/* 2. Adding overflow controls: */
.menu-container {
  max-height: 90vh;
  overflow-y: auto;
}
.game-list {
  max-height: 300px;
  overflow-y: auto;
}
```

## 🐛 Current Issues
1. **Join Game Test**: Times out after 31s
2. **Clerk Auth**: Disabled (missing env vars)
3. **E2E Tests**: 22/25 still failing

## ✅ What's Working
- Guest player creation
- Game creation flow
- React Query integration
- Convex backend (all functions)
- CSS positioning (fixed!)

## 📝 Recent Commits
- `fb00b25` refactor: simplify architecture and remove duplicates
- `c4df736` fix: resolve E2E test failures and improve game state management
- `f5796f5` docs: update all documentation for context reset
- `357f241` docs: add progress notes for E2E test fixes session
- `f9c31c1` fix: resolve E2E test failures and game state issues

## 🎯 Next Steps
1. Debug "join existing game" test:
   ```bash
   pnpm test:e2e:minimal -- --grep "should join existing game"
   ```
2. Fix remaining E2E tests
3. Install PixiJS and begin game rendering

## 🔑 Key Files
- **Tests**: `packages/e2e-tests/tests/game-lobby.spec.ts`
- **UI**: `packages/web-minimal/src/ui/MenuUI.tsx`
- **State**: `packages/web-minimal/src/hooks/useGameState.ts`
- **Backend**: `/convex/games.ts` (root!)

## 💡 Session Learnings
1. CSS positioning affects test reliability
2. Type validation is extremely strict in Convex
3. React Query patterns matter for conditional queries
4. Directory structure is critical for Convex
5. **NEW**: Simplified architecture removes ~6,800 lines of duplicate code
6. **NEW**: Logging infrastructure helps debug issues
7. **NEW**: Game ID format must match between UI and tests (8-char slice)

## 🏗️ Architecture Changes (Jan 22 Evening)
1. **Removed web-tanstack** - Consolidated to single frontend
2. **Removed duplicate Convex** - Deleted packages/convex/convex/
3. **Enabled TypeScript checks** - Removed --typecheck=disable
4. **Added logging scripts** - .workflow/dev-with-logs.sh
5. **Fixed game ID mismatch** - data-game-id uses 8-char slice

---
**Ready to continue!** Architecture is now clean, backend solid, just need to verify E2E tests work with the fixes.