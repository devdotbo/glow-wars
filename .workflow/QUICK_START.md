# Glow Wars - Quick Start Guide for Next Session

## 🚀 Immediate Actions

### 1. Start Development Servers
```bash
pnpm dev
```
- Web-minimal: http://localhost:3001 ✅ (working)
- Web-tanstack: http://localhost:3000 ⚠️ (has errors)
- Convex: https://dashboard.convex.dev/d/calculating-swan-893

### 2. Current Issue to Fix
**E2E Test Button Position Bug**
- Button appears at y: -64 (outside viewport)
- File: `packages/web-minimal/src/ui/MenuUI.css`
- Test: `packages/e2e-tests/tests/game-lobby.spec.ts`

```bash
# Run single test to debug:
pnpm test:e2e:minimal -- --grep "should create a new game"
```

### 3. Debug Steps
1. Check CSS positioning in MenuUI
2. Verify Playwright viewport size (1280x720)
3. Look for absolute positioning issues
4. Test in browser DevTools at same viewport size

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
- React Query integration
- 2/25 E2E tests passing

## ❌ What's Not Working
- Create Game button positioning in tests
- 23/25 E2E tests failing
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

## 📝 Last Git Commit
"fix: deploy Convex functions to root directory with TypeScript fixes"

---
**Ready to continue!** Start by fixing the button positioning issue.