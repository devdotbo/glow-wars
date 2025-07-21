import { test, expect } from '../fixtures/game.fixture'

test.describe('Visual Regression Tests', () => {
  test('main menu appearance', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Wait for animations to settle
    await page.waitForTimeout(500)
    
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('game creation dialog', async ({ page, gamePage }) => {
    await gamePage.createGameButton.click()
    
    // Wait for dialog to fully render
    await page.waitForSelector('select[name="maxPlayers"]')
    
    await expect(page.locator('[data-testid="create-game-dialog"]')).toHaveScreenshot(
      'create-game-dialog.png'
    )
  })

  test('game lobby with single player', async ({ page, gamePage }) => {
    await gamePage.createGame(4)
    
    // Wait for lobby to fully load
    await page.waitForSelector('[data-testid="game-id"]')
    await page.waitForTimeout(500)
    
    await expect(page.locator('[data-testid="game-lobby"]')).toHaveScreenshot(
      'game-lobby-single.png'
    )
  })

  test('game lobby with multiple players', async ({ browser, page, gamePage }) => {
    // Create game
    await gamePage.createGame(4)
    const gameId = await gamePage.getGameId()
    
    // Add second player
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const { GamePage } = await import('../helpers/game-page')
    const gamePage2 = new GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    await gamePage2.joinGame(gameId)
    
    // Wait for player list to update
    await gamePage.waitForPlayersCount(2)
    await page.waitForTimeout(500)
    
    await expect(page.locator('[data-testid="game-lobby"]')).toHaveScreenshot(
      'game-lobby-multiple.png',
      {
        mask: [page.locator('[data-testid="game-id"]')], // Mask dynamic game ID
      }
    )
    
    await context2.close()
  })

  test('game canvas initial state', async ({ browser, page, gamePage }) => {
    // Set up 2-player game
    await gamePage.createGame(2)
    const gameId = await gamePage.getGameId()
    
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const { GamePage } = await import('../helpers/game-page')
    const gamePage2 = new GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    await gamePage2.joinGame(gameId)
    
    // Start game
    await gamePage.startGame()
    
    // Wait for canvas to render
    await page.waitForSelector('canvas')
    await page.waitForTimeout(1000) // Let initial render complete
    
    await expect(page.locator('[data-testid="game-container"]')).toHaveScreenshot(
      'game-canvas-initial.png',
      {
        mask: [
          page.locator('[data-testid="timer"]'), // Mask timer
          page.locator('[data-testid="score"]'), // Mask scores
        ],
      }
    )
    
    await context2.close()
  })

  test('responsive design - mobile', async ({ page, gamePage }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('main-menu-mobile.png', {
      fullPage: true,
    })
    
    // Test game lobby on mobile
    await gamePage.createGame(4)
    await page.waitForTimeout(500)
    
    await expect(page).toHaveScreenshot('game-lobby-mobile.png', {
      fullPage: true,
    })
  })

  test('responsive design - tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('main-menu-tablet.png', {
      fullPage: true,
    })
  })

  test('error states', async ({ page }) => {
    // Simulate network error
    await page.route('**/convex/**', route => route.abort())
    
    await page.goto('/')
    
    // Wait for error message
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 })
    
    await expect(page.locator('[data-testid="error-container"]')).toHaveScreenshot(
      'error-state.png'
    )
  })

  test('loading states', async ({ page }) => {
    // Delay convex responses to capture loading state
    await page.route('**/convex/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
    
    await page.goto('/')
    
    // Capture loading state
    await expect(page.locator('[data-testid="loading-container"]')).toHaveScreenshot(
      'loading-state.png'
    )
  })
})