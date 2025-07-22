# Glow Wars E2E Tests

End-to-end tests for the Glow Wars game using Playwright.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Install Playwright browsers:
```bash
pnpm playwright:install
```

## Running Tests

### All Tests
```bash
pnpm test
```

### Specific Test Suite
```bash
pnpm test:lobby     # Game lobby tests
pnpm test:visual    # Visual regression tests
```

### Test Modes
```bash
pnpm test:ui        # Run with Playwright UI
pnpm test:debug     # Debug mode
pnpm test:headed    # Run in headed browser
pnpm test:ci        # CI mode with HTML reporter
```

### Target Frontend
```bash
pnpm test:minimal   # Test web-minimal frontend (default)
```

## Test Structure

```
tests/
├── game-lobby.spec.ts    # Lobby system: create/join games
├── multiplayer.spec.ts   # Real-time synchronization
├── game-flow.spec.ts     # Complete game scenarios
└── visual.spec.ts        # Visual regression tests
```

## Writing Tests

### Use the Game Fixture
```typescript
import { test, expect } from '../fixtures/game.fixture'

test('should create game', async ({ gamePage }) => {
  await gamePage.createGame(4)
  const gameId = await gamePage.getGameId()
  expect(gameId).toMatch(/^[A-Z0-9]{6}$/)
})
```

### Test Multiple Players
```typescript
test('multiplayer test', async ({ browser }) => {
  const context2 = await browser.newContext()
  const page2 = await context2.newPage()
  // ... test with multiple players
  await context2.close()
})
```

## CI/CD Integration

Tests automatically run on:
- Pull requests
- Pushes to main branch
- Can be triggered manually

## Debugging

1. **VS Code**: Install Playwright extension for debugging
2. **Traces**: Failed tests save traces in `test-results/`
3. **Screenshots**: Available on failure in `test-results/`
4. **Videos**: Saved for failed tests

## Best Practices

1. **Isolation**: Each test should be independent
2. **Selectors**: Use `data-testid` attributes
3. **Waits**: Use Playwright's auto-waiting, avoid fixed timeouts
4. **Cleanup**: Close contexts in afterEach/afterAll
5. **Parallelization**: Tests run in parallel by default