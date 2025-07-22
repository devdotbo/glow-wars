# Context Reset Summary - Glow Wars Project

## 🚀 Quick Start
```bash
pnpm dev  # Start all services (Convex + frontends)
```
- Web-minimal: http://localhost:3001 ✅
- Convex Dashboard: [YOUR_CONVEX_DASHBOARD_URL]

## 📊 Current Status
- **Backend**: ✅ Fully deployed, all 10 tasks complete
- **E2E Tests**: 3/25 passing
- **Next Issue**: "join existing game" test timeout

## 🔧 Critical Technical Details

### 1. Convex Deployment
```
✅ CORRECT: /convex/games.ts (root directory)
❌ WRONG: /packages/convex/convex/games.ts
```
**MUST** copy functions to root `/convex/` for deployment to work!

### 2. React Query Pattern
```typescript
// ✅ CORRECT - Use enabled flag
const { data } = useQuery({
  ...convexQuery(api.games.getGame, { gameId: gameSession.gameId || '' }),
  enabled: !!gameSession.gameId,
})

// ❌ WRONG - Don't use 'skip' string
convexQuery(api.games.getGame, gameId ? { gameId } : 'skip')
```

### 3. Type Validation
- Enum: `time_limit` (NOT `time`)
- Field: `timeLimit` (NOT `timeLimitMinutes`)
- Validators MUST match schema exactly

### 4. CSS Fixes Applied
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

---
**Ready to continue!** The backend is solid, UI basics work, just need to fix remaining E2E tests before moving to PixiJS game rendering.