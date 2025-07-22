# Critical Notes Before Context Compact

## Current State
- **Backend**: Fully functional with single & multiplayer support
- **Frontend**: Connected to backend, but game canvas shows black screen
- **E2E Tests**: 3/8 passing with manual server start

## Key Fixes Applied
1. **Single Player Mode**: 
   - MIN_PLAYERS_TO_START = 1
   - Auto-spawns 8 sparks + 3 creepers
   - Territory win at 40% (vs 60% for multiplayer)
   
2. **Convex Deployment**: 
   - Using `calculating-swan-893` everywhere
   - Functions in root `/convex/` directory
   - Manual playwright config works

## Critical Issues
1. **Game Canvas**: Shows black screen after game starts (no PixiJS installed)
2. **E2E Tests**: Need servers running manually
3. **App Flow**: Transitions to canvas immediately when game has gameId

## Next Steps (Priority Order)
1. Install PixiJS and create basic rendering
2. Fix game display logic (should show lobby until game.status === 'active')
3. Create automated playwright config that works
4. Fix remaining E2E tests

## Commands That Work
```bash
# Start servers manually
npx convex dev
cd packages/web-minimal && pnpm dev

# Run E2E tests
cd packages/e2e-tests
pnpm playwright test --config playwright.config.manual.ts
```

## Key Discovery
The app shows game canvas when `currentGame.status === 'active'` but also needs `gameSession.gameId`. After creating a game, it immediately shows canvas (black screen) instead of staying in lobby.

## Branch Status
Currently on: `fix/simplify-architecture`
Ready to merge after fixing game display issue.