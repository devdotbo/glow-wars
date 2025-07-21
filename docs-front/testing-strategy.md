# Glow Wars Frontend Testing Strategy

## Overview

This document outlines the comprehensive testing approach for the Glow Wars frontend, covering unit tests, integration tests, visual regression tests, performance tests, and end-to-end tests.

> **Note**: E2E testing infrastructure has been implemented in `packages/e2e-tests`. See the [Current Implementation](#current-implementation) section for details.

## Testing Stack

- **Unit Tests**: Vitest
- **Component Tests**: Vitest + React Testing Library
- **Visual Tests**: Playwright + Percy
- **E2E Tests**: Playwright ✅ (Implemented)
- **Performance**: Lighthouse CI + Custom benchmarks
- **Mocking**: MSW (Mock Service Worker)

## Current Implementation

### E2E Testing Infrastructure (Completed)

The E2E testing infrastructure has been fully implemented in `packages/e2e-tests` with the following features:

#### Architecture
- **Location**: `packages/e2e-tests/` as a separate package in the monorepo
- **Configuration**: Full Playwright setup with multi-frontend support
- **CI/CD**: GitHub Actions workflow for automated testing

#### Test Suites Implemented

1. **Game Lobby Tests** (`tests/game-lobby.spec.ts`)
   - Guest player creation
   - Game creation and configuration
   - Join game functionality
   - Player limits and disconnection

2. **Multiplayer Tests** (`tests/multiplayer.spec.ts`)
   - Real-time synchronization
   - Position updates
   - Territory painting sync
   - Multiple player interactions

3. **Visual Regression Tests** (`tests/visual.spec.ts`)
   - Main menu screenshots
   - Game states visual testing
   - Multiple viewport sizes
   - Victory/defeat screens

4. **Game Flow Tests** (`tests/game-flow.spec.ts`)
   - Complete game scenarios
   - Practice mode
   - Power-up collection
   - Victory conditions
   - Network resilience

#### Running E2E Tests

```bash
# Install Playwright browsers (first time only)
pnpm playwright:install

# Run all E2E tests
pnpm test:e2e

# Run with UI mode for debugging
pnpm test:e2e:ui

# Test specific frontend
pnpm test:e2e:minimal   # web-minimal frontend
pnpm test:e2e:tanstack  # web-tanstack frontend
```

#### Multi-Frontend Support

The E2E tests support testing multiple frontend implementations:

```typescript
// Set via environment variable
FRONTEND=minimal pnpm test:e2e  # Test web-minimal
FRONTEND=tanstack pnpm test:e2e # Test web-tanstack
```

#### CI/CD Integration

GitHub Actions workflow runs E2E tests automatically:
- On push to main branch
- On pull requests
- Separate jobs for each frontend
- Artifact uploads for failed tests

## Test Categories

### 1. Unit Tests

#### Game Logic Testing

```typescript
// app/game/__tests__/entities/Player.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { Player } from '~/game/entities/Player'
import { Texture } from 'pixi.js'

describe('Player Entity', () => {
  let player: Player
  let mockTexture: Texture

  beforeEach(() => {
    mockTexture = new Texture()
    player = new Player({
      id: 'player1',
      texture: mockTexture,
      color: 0x00ff00,
      position: { x: 100, y: 100 },
    })
  })

  describe('movement', () => {
    it('should update position based on velocity', () => {
      player.velocity = { x: 10, y: 5 }
      player.update(1) // 1 second
      
      expect(player.position.x).toBe(110)
      expect(player.position.y).toBe(105)
    })

    it('should respect max speed', () => {
      player.velocity = { x: 1000, y: 1000 }
      player.update(1)
      
      const speed = Math.sqrt(
        player.velocity.x ** 2 + player.velocity.y ** 2
      )
      expect(speed).toBeLessThanOrEqual(player.maxSpeed)
    })

    it('should handle boundary collisions', () => {
      player.position = { x: -10, y: -10 }
      player.update(0.1)
      
      expect(player.position.x).toBeGreaterThanOrEqual(0)
      expect(player.position.y).toBeGreaterThanOrEqual(0)
    })
  })

  describe('power-ups', () => {
    it('should apply speed boost', () => {
      const originalSpeed = player.maxSpeed
      player.applyPowerUp('speed', 5000)
      
      expect(player.maxSpeed).toBe(originalSpeed * 1.5)
      expect(player.activePowerUps.has('speed')).toBe(true)
    })

    it('should remove expired power-ups', () => {
      player.applyPowerUp('shield', 100)
      player.update(0.2) // 200ms later
      
      expect(player.activePowerUps.has('shield')).toBe(false)
    })
  })
})
```

#### Systems Testing

```typescript
// app/game/__tests__/systems/CollisionSystem.test.ts
import { describe, it, expect } from 'vitest'
import { CollisionSystem } from '~/game/systems/CollisionSystem'
import { Entity } from '~/game/entities/Entity'

describe('CollisionSystem', () => {
  let system: CollisionSystem
  
  beforeEach(() => {
    system = new CollisionSystem()
  })

  it('should detect overlapping entities', () => {
    const entity1 = new Entity({ x: 0, y: 0, radius: 10 })
    const entity2 = new Entity({ x: 15, y: 0, radius: 10 })
    
    const collision = system.checkCollision(entity1, entity2)
    expect(collision).toBeTruthy()
    expect(collision.overlap).toBe(5)
  })

  it('should use spatial partitioning for performance', () => {
    const entities: Entity[] = []
    
    // Create 1000 entities
    for (let i = 0; i < 1000; i++) {
      entities.push(new Entity({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        radius: 5,
      }))
    }
    
    const start = performance.now()
    const collisions = system.findAllCollisions(entities)
    const elapsed = performance.now() - start
    
    // Should process 1000 entities in under 10ms
    expect(elapsed).toBeLessThan(10)
  })
})
```

### 2. Component Tests

#### React Component Testing

```typescript
// app/components/game/__tests__/GameCanvas.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { GameCanvas } from '~/components/game/GameCanvas'
import * as PIXI from 'pixi.js'

vi.mock('pixi.js', () => ({
  Application: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    canvas: document.createElement('canvas'),
    ticker: { add: vi.fn(), remove: vi.fn() },
    stage: {},
    destroy: vi.fn(),
  })),
}))

describe('GameCanvas', () => {
  it('should initialize PixiJS application', async () => {
    const onReady = vi.fn()
    const { container } = render(
      <GameCanvas gameId="test-game" onReady={onReady} />
    )
    
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled()
    })
    
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    const { getByText } = render(
      <GameCanvas gameId="test-game" />
    )
    
    expect(getByText('Initializing game engine...')).toBeInTheDocument()
  })

  it('should handle initialization errors', async () => {
    vi.mocked(PIXI.Application).mockImplementationOnce(() => {
      throw new Error('WebGL not supported')
    })
    
    const { getByText } = render(
      <GameCanvas gameId="test-game" />
    )
    
    await waitFor(() => {
      expect(getByText(/Error: WebGL not supported/)).toBeInTheDocument()
    })
  })
})
```

#### UI Component Testing

```typescript
// app/components/game/__tests__/HUD.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HUD } from '~/components/game/HUD'

describe('HUD', () => {
  const mockPlayers = [
    { id: '1', name: 'Player 1', color: 0x00ff00, score: 100, territory: 45 },
    { id: '2', name: 'Player 2', color: 0xff0000, score: 80, territory: 30 },
  ]

  it('should display all player scores', () => {
    const { getByText } = render(
      <HUD players={mockPlayers} timeRemaining={120} />
    )
    
    expect(getByText('Player 1')).toBeInTheDocument()
    expect(getByText('100')).toBeInTheDocument()
    expect(getByText('45%')).toBeInTheDocument()
  })

  it('should format time correctly', () => {
    const { getByText } = render(
      <HUD players={mockPlayers} timeRemaining={90} />
    )
    
    expect(getByText('1:30')).toBeInTheDocument()
  })

  it('should show warning state for low time', () => {
    const { container } = render(
      <HUD players={mockPlayers} timeRemaining={25} />
    )
    
    const timer = container.querySelector('.timer-warning')
    expect(timer).toHaveClass('animate-pulse')
  })
})
```

### 3. Visual Regression Tests

#### Playwright Visual Tests

```typescript
// tests/visual/game-states.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Game Visual States', () => {
  test('main menu appearance', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('game lobby with players', async ({ page }) => {
    await page.goto('/game/test-lobby')
    
    // Wait for players to load
    await page.waitForSelector('.player-list')
    
    await expect(page.locator('.game-lobby')).toHaveScreenshot(
      'game-lobby.png'
    )
  })

  test('active gameplay', async ({ page }) => {
    await page.goto('/game/test-game')
    
    // Wait for game to start
    await page.waitForSelector('canvas')
    await page.waitForTimeout(1000) // Let animations settle
    
    await expect(page.locator('.game-container')).toHaveScreenshot(
      'active-game.png',
      {
        mask: [page.locator('.timer')], // Mask dynamic elements
      }
    )
  })

  test('victory screen', async ({ page }) => {
    await page.goto('/game/test-game?state=victory')
    
    await expect(page.locator('.victory-screen')).toHaveScreenshot(
      'victory-screen.png',
      {
        animations: 'disabled',
      }
    )
  })
})
```

#### Percy Integration

```typescript
// tests/visual/percy.spec.ts
import { test } from '@playwright/test'
import percySnapshot from '@percy/playwright'

test.describe('Percy Visual Tests', () => {
  test('game UI components', async ({ page }) => {
    await page.goto('/styleguide')
    
    // Capture all UI states
    await percySnapshot(page, 'UI Components - Default')
    
    // Dark mode
    await page.click('[data-testid="theme-toggle"]')
    await percySnapshot(page, 'UI Components - Dark Mode')
    
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await percySnapshot(page, 'UI Components - Mobile')
  })

  test('game effects', async ({ page }) => {
    await page.goto('/effects-preview')
    
    // Capture each effect
    const effects = ['glow', 'particles', 'shield', 'phase-shift']
    
    for (const effect of effects) {
      await page.click(`[data-effect="${effect}"]`)
      await page.waitForTimeout(500)
      await percySnapshot(page, `Effect - ${effect}`)
    }
  })
})
```

### 4. Performance Tests

#### Rendering Performance

```typescript
// tests/performance/rendering.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Rendering Performance', () => {
  test('should maintain 60 FPS during gameplay', async ({ page }) => {
    await page.goto('/game/test-game')
    
    // Start performance measurement
    await page.evaluate(() => {
      window.fpsHistory = []
      let lastTime = performance.now()
      
      function measureFPS() {
        const currentTime = performance.now()
        const fps = 1000 / (currentTime - lastTime)
        window.fpsHistory.push(fps)
        lastTime = currentTime
        
        if (window.fpsHistory.length < 600) { // 10 seconds
          requestAnimationFrame(measureFPS)
        }
      }
      
      requestAnimationFrame(measureFPS)
    })
    
    // Simulate gameplay
    await page.waitForTimeout(10000)
    
    // Analyze FPS
    const stats = await page.evaluate(() => {
      const fps = window.fpsHistory
      const avg = fps.reduce((a, b) => a + b) / fps.length
      const min = Math.min(...fps)
      
      return { avg, min, drops: fps.filter(f => f < 55).length }
    })
    
    expect(stats.avg).toBeGreaterThan(58)
    expect(stats.min).toBeGreaterThan(45)
    expect(stats.drops).toBeLessThan(10) // Less than 10 frame drops
  })

  test('memory usage should stay stable', async ({ page }) => {
    await page.goto('/game/test-game')
    
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Play for 5 minutes
    await page.waitForTimeout(5 * 60 * 1000)
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Memory should not increase by more than 50MB
    const increase = (finalMemory - initialMemory) / 1024 / 1024
    expect(increase).toBeLessThan(50)
  })
})
```

#### Load Time Performance

```typescript
// tests/performance/load-time.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Load Time Performance', () => {
  test('should load game within 3 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/game/test-game', {
      waitUntil: 'networkidle',
    })
    
    // Wait for game to be playable
    await page.waitForSelector('canvas')
    await page.waitForFunction(() => {
      return window.gameState === 'ready'
    })
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000)
  })

  test('should lazy load non-critical assets', async ({ page }) => {
    const assetRequests: string[] = []
    
    page.on('request', (request) => {
      if (request.url().includes('/assets/')) {
        assetRequests.push(request.url())
      }
    })
    
    await page.goto('/game/test-game')
    
    // Critical assets should load immediately
    const criticalAssets = assetRequests.filter(url => 
      url.includes('sprites') || url.includes('ui')
    )
    expect(criticalAssets.length).toBeGreaterThan(0)
    
    // Effects should load later
    const effectAssets = assetRequests.filter(url =>
      url.includes('effects')
    )
    expect(effectAssets.length).toBe(0)
    
    // Trigger effect loading
    await page.click('[data-testid="power-up"]')
    await page.waitForTimeout(100)
    
    const newEffectAssets = assetRequests.filter(url =>
      url.includes('effects')
    )
    expect(newEffectAssets.length).toBeGreaterThan(0)
  })
})
```

### 5. End-to-End Tests

#### Full Game Flow

```typescript
// tests/e2e/game-flow.spec.ts
import { test, expect } from '@playwright/test'
import { mockConvexData } from './helpers/mock-convex'

test.describe('Complete Game Flow', () => {
  test('should play a complete game', async ({ page, context }) => {
    // Mock Convex responses
    await mockConvexData(context, {
      games: { create: { id: 'test-game-123' } },
      players: { join: { id: 'player-1' } },
    })
    
    // 1. Start from main menu
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Glow Wars')
    
    // 2. Click play
    await page.click('button:has-text("Play Now")')
    
    // 3. Wait for lobby
    await page.waitForURL('**/lobby/**')
    await expect(page.locator('.game-code')).toBeVisible()
    
    // 4. Start game (as host)
    await page.click('button:has-text("Start Game")')
    
    // 5. Wait for game to load
    await page.waitForURL('**/game/**')
    await page.waitForSelector('canvas')
    
    // 6. Play the game
    // Move player using keyboard
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(1000)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(1000)
    
    // 7. Collect power-up
    await page.evaluate(() => {
      // Simulate power-up collection
      window.gameEngine.collectPowerUp('speed')
    })
    
    // Verify power-up indicator
    await expect(page.locator('.power-up-active')).toBeVisible()
    
    // 8. Wait for game to end
    await page.waitForSelector('.victory-screen', {
      timeout: 60000, // 1 minute game
    })
    
    // 9. Verify victory screen
    await expect(page.locator('.winner-name')).toBeVisible()
    await expect(page.locator('button:has-text("Play Again")')).toBeVisible()
  })
})
```

#### Multiplayer Synchronization

```typescript
// tests/e2e/multiplayer.spec.ts
import { test, expect, Page } from '@playwright/test'

test.describe('Multiplayer Synchronization', () => {
  let player1: Page
  let player2: Page

  test.beforeEach(async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    player1 = await context1.newPage()
    player2 = await context2.newPage()
  })

  test('should sync player movements', async () => {
    // Both players join same game
    const gameCode = 'TEST123'
    
    await player1.goto(`/join/${gameCode}`)
    await player2.goto(`/join/${gameCode}`)
    
    // Wait for both to be in game
    await Promise.all([
      player1.waitForSelector('canvas'),
      player2.waitForSelector('canvas'),
    ])
    
    // Player 1 moves
    await player1.keyboard.press('ArrowRight')
    await player1.waitForTimeout(100)
    
    // Verify movement on player 2's screen
    const player1PositionOnP2Screen = await player2.evaluate(() => {
      return window.gameEngine.getPlayer('player-1').position
    })
    
    expect(player1PositionOnP2Screen.x).toBeGreaterThan(100)
  })

  test('should handle network latency', async () => {
    // Simulate network delay
    await player1.context().route('**/api/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 200))
      await route.continue()
    })
    
    // Test position interpolation
    await player1.keyboard.press('ArrowRight')
    
    // Should show smooth movement despite latency
    const positions = await player2.evaluate(() => {
      const positions: number[] = []
      let count = 0
      
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          positions.push(window.gameEngine.getPlayer('player-1').position.x)
          count++
          
          if (count >= 10) {
            clearInterval(interval)
            resolve(positions)
          }
        }, 50)
      })
    })
    
    // Verify smooth interpolation
    for (let i = 1; i < positions.length; i++) {
      const delta = positions[i] - positions[i - 1]
      expect(delta).toBeGreaterThan(0) // Moving right
      expect(delta).toBeLessThan(20) // Smooth movement
    }
  })
})
```

### 6. Accessibility Tests

```typescript
// tests/a11y/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Accessibility', () => {
  test('main menu should be accessible', async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
    await checkA11y(page)
  })

  test('game UI should support keyboard navigation', async ({ page }) => {
    await page.goto('/game/test-game')
    
    // Tab through UI elements
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute(
      'data-testid',
      'pause-button'
    )
    
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute(
      'data-testid',
      'settings-button'
    )
  })

  test('should support screen readers', async ({ page }) => {
    await page.goto('/game/test-game')
    
    // Check ARIA labels
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveAttribute('aria-label', 'Glow Wars game canvas')
    
    const scores = page.locator('.score-display')
    await expect(scores).toHaveAttribute('aria-live', 'polite')
  })

  test('colorblind mode should work', async ({ page }) => {
    await page.goto('/settings')
    
    // Enable colorblind mode
    await page.selectOption('#colorblind-mode', 'deuteranopia')
    
    // Navigate to game
    await page.goto('/game/test-game')
    
    // Verify filter is applied
    const filterApplied = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      return window.getComputedStyle(canvas!).filter !== 'none'
    })
    
    expect(filterApplied).toBe(true)
  })
})
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/frontend-tests.yml
name: Frontend Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run unit tests
        run: pnpm test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps
      
      - name: Run visual tests
        run: pnpm test:visual
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diff
          path: tests/visual/**/*.png

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build app
        run: pnpm build
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/game/test
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

## Test Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './app'),
    },
  },
})
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

## Best Practices

1. **Test Pyramid**: More unit tests, fewer E2E tests
2. **Test Isolation**: Each test should be independent
3. **Mock External Dependencies**: Use MSW for API mocking
4. **Visual Testing**: Capture key states, mask dynamic content
5. **Performance Budgets**: Set and enforce performance limits
6. **Accessibility First**: Include a11y tests in every PR
7. **Continuous Monitoring**: Track test metrics over time
8. **Documentation**: Keep test scenarios documented