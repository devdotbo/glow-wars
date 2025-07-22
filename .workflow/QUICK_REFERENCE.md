# Quick Reference - Glow Wars

## 🚀 Start Development
```bash
# Terminal 1 - Backend
npx convex dev

# Terminal 2 - Frontend  
cd packages/web-minimal && pnpm dev

# Terminal 3 - E2E Tests (manual config)
cd packages/e2e-tests
pnpm playwright test --config playwright.config.manual.ts
```

## 🎮 Current State
- **Backend**: ✅ Complete (single & multiplayer)
- **Frontend**: ⚠️ Shows black screen (no PixiJS)
- **E2E Tests**: 3/8 passing

## 🐛 Critical Issues
1. **Black Screen**: App shows canvas immediately, needs PixiJS
2. **Test Config**: playwright.config.ts doesn't work, use manual
3. **Game Flow**: Should stay in lobby until game.status === 'active'

## 🎯 Next Steps
1. `pnpm add pixi.js @pixi/react`
2. Fix App.tsx to stay in lobby until game starts
3. Create basic circle rendering for players

## 🔑 Key Files
- `packages/web-minimal/src/App.tsx` - Game/Menu logic
- `packages/web-minimal/src/game/GlowWarsGame.ts` - Empty game class
- `convex/games.ts` - MIN_PLAYERS_TO_START = 1
- `convex/victory.ts` - 40% territory for single player

## 💡 Single Player
- Starts with 1 player
- Auto-spawns: 8 sparks, 3 creepers
- Territory win: 40% (vs 60% multi)

## 🌐 Convex
- Deployment: `calculating-swan-893`
- Functions in: `/convex/` (root)
- Dashboard: https://dashboard.convex.dev/d/[DEPLOYMENT_ID]

## 🌿 Git
- Branch: `fix/simplify-architecture`
- Changes: Single player mode implemented
- Status: Ready to merge after PixiJS fix