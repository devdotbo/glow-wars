# Glow Wars - Quick Start Guide for Next Session

## 🚀 Immediate Actions

### 1. Start Development Servers
```bash
pnpm dev
```
- Web-minimal: http://localhost:3001 ✅ (working)
- Web-tanstack: http://localhost:3000 ⚠️ (has errors)
- Convex: [YOUR_CONVEX_DASHBOARD_URL]

### 2. Current Issue to Fix
**E2E Test: Join Existing Game Timeout**
- Test times out after 31 seconds
- File: `packages/e2e-tests/tests/game-lobby.spec.ts`
- Issue: "should join existing game" test

```bash
# Run single test to debug:
pnpm test:e2e:minimal -- --grep "should join existing game"
```

### 3. Recent Fixes Applied
1. **CSS Positioning Fix** - Removed flexbox centering from #root, added overflow controls
2. **React Query Fix** - Use `enabled` flag, not 'skip' string for conditional queries
3. **Type Validation Fix** - Fixed enum: `time_limit` not `time`, field: `timeLimit` not `timeLimitMinutes`

## 📁 Key Files

### Frontend (where issue likely is)
- `packages/web-minimal/src/ui/MenuUI.tsx` - Component
- `packages/web-minimal/src/ui/MenuUI.css` - Styles
- `packages/web-minimal/src/hooks/useGameState.ts` - State logic

### Backend (working fine)
- `convex/games.ts` - Game mutations
- `convex/players.ts` - Player management
- `convex/types.ts` - Shared types

### Tests
- `packages/e2e-tests/tests/game-lobby.spec.ts` - Failing test

## ✅ What's Working
- Convex backend fully deployed
- All game functions available
- Guest player creation
- React Query integration (fixed)
- Game creation flow
- 3/25 E2E tests passing

## ❌ What's Not Working
- Join existing game test (timeout)
- 22/25 E2E tests failing
- web-tanstack frontend (not priority)

## 🎯 Next Steps After Fix
1. Run full E2E test suite
2. Fix any remaining test failures
3. Begin PixiJS integration (Phase 1)
4. Install PixiJS dependencies

## 💡 Key Insights from Last Session
- Convex functions MUST be in root `/convex/` directory
- Use `convex.mutation()` not `convexMutation` (doesn't exist)
- TypeScript typechecks are crucial - always enable
- E2E tests caught real UI issues

## 🔧 Useful Commands
```bash
# Convex
npx convex dev --once          # Deploy functions
npx convex function-spec       # List available functions

# Testing
pnpm test:e2e:minimal         # Run E2E tests
pnpm test:e2e:ui             # Run with UI mode

# Development
pnpm dev:minimal             # Just the working frontend
```

## 📝 Last Git Commits
- "docs: add progress notes for E2E test fixes session"
- "fix: resolve E2E test failures and game state issues"

---
**Ready to continue!** Start by debugging the "join existing game" test timeout.