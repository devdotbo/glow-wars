import { test, expect } from '../fixtures/game.fixture'
import { Page } from '@playwright/test'

test.describe('Game Lobby System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page first
    await page.goto('/')
    
    // Wait for app to load
    await page.waitForLoadState('networkidle')
    
    // Check if we're in a game lobby and leave if necessary
    const inGameLobby = await page.locator('[data-testid="game-id"]').isVisible().catch(() => false)
    if (inGameLobby) {
      // Leave the game
      const leaveButton = page.locator('button:has-text("Leave Game")')
      if (await leaveButton.isVisible()) {
        await leaveButton.click()
        // Wait for main menu to appear
        await page.waitForSelector('[data-testid="main-menu"]', { timeout: 5000 })
      }
    }
  })

  test('should create guest player on first visit', async ({ page, gamePage }) => {
    // Navigate to home page
    await page.goto('/')
    
    // Wait for main menu to be visible
    await page.waitForSelector('[data-testid="main-menu"]', { timeout: 10000 })
    
    // Guest player name should be displayed
    const playerName = await page.textContent('[data-testid="player-preview"]')
    expect(playerName).toBeTruthy()
    expect(playerName).toMatch(/^[A-Z][a-zA-Z]+[0-9]+$/)
    
    // Main menu should be visible
    await expect(page.locator('[data-testid="main-menu"]')).toBeVisible()
  })

  test('should display create game button', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="main-menu"]', { timeout: 10000 })
    
    const createButton = page.locator('[data-testid="create-game-button"]')
    await expect(createButton).toBeVisible()
    await expect(createButton).toHaveText('Create Game')
  })
  
  test('should create a new game', async ({ page, gamePage }) => {
    // Set up console logging
    page.on('console', msg => console.log('Browser console:', msg.type(), msg.text()))
    page.on('pageerror', err => console.error('Page error:', err.message))
    
    // Navigate to home page
    console.log('Navigating to home page...')
    await page.goto('/')
    
    // Debug: Take screenshot after navigation
    await page.screenshot({ path: 'test-results/after-navigation.png' })
    
    // Debug: Log page content
    const pageContent = await page.content()
    console.log('Page HTML length:', pageContent.length)
    console.log('Page title:', await page.title())
    
    // Wait for main menu to be visible
    await page.waitForSelector('[data-testid="main-menu"]', { timeout: 10000 })
    
    // Wait for guest player to be created
    await page.waitForSelector('[data-testid="player-preview"]', { timeout: 10000 })
    
    // Verify player name is displayed
    const playerName = await page.textContent('[data-testid="player-preview"]')
    console.log('Player name displayed:', playerName)
    
    // Set up console error capture
    const consoleLogs: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`)
      }
    })
    page.on('pageerror', err => {
      consoleLogs.push(`ERROR: ${err.message}`)
    })
    
    // Set up network request capture
    const networkRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('convex')) {
        networkRequests.push(`${request.method()} ${request.url()}`)
      }
    })
    
    // Select max players
    await gamePage.maxPlayersSelect.selectOption('4')
    
    // Get button state before click
    const buttonTextBefore = await gamePage.createGameButton.textContent()
    const isDisabledBefore = await gamePage.createGameButton.isDisabled()
    console.log('Button text before:', buttonTextBefore)
    console.log('Button disabled before:', isDisabledBefore)
    
    // Click create game
    await gamePage.createGameButton.click()
    
    // Wait a moment for the mutation to process and state to update
    await page.waitForTimeout(1000)
    
    // Should show game lobby UI (no URL change in single-page app)
    await expect(gamePage.gameIdDisplay).toBeVisible({ timeout: 15000 })
    const gameId = await gamePage.getGameId()
    expect(gameId).toMatch(/^[a-zA-Z0-9]{8}$/)
    
    // Should show 1 player
    await expect(gamePage.playerCount).toContainText('Players: 1 / 4')
  })

  test('should join existing game', async ({ browser, page, gamePage }) => {
    // Host creates game
    await gamePage.createGame(4)
    const gameId = await gamePage.getGameId()
    
    // Second player joins
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const gamePage2 = new (await import('../helpers/game-page')).GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    
    // Should see the game in available games
    await page2.waitForSelector(`[data-game-id="${gameId}"]`, { timeout: 5000 })
    
    // Join the game
    await gamePage2.joinGame(gameId)
    
    // Both players should see updated count
    await expect(gamePage.playerCount).toContainText('Players: 2 / 4')
    await expect(gamePage2.playerCount).toContainText('Players: 2 / 4')
    
    await context2.close()
  })

  test('should allow host to start game with minimum players', async ({ browser, page, gamePage }) => {
    // Host creates game
    await gamePage.createGame(4)
    const gameId = await gamePage.getGameId()
    
    // Start button should be enabled with 1 player (single player mode)
    await expect(gamePage.startGameButton).toBeEnabled()
    await expect(gamePage.startGameButton).toContainText('Start Solo Game')
    
    // Second player joins
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const gamePage2 = new (await import('../helpers/game-page')).GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    await gamePage2.joinGame(gameId)
    
    // Start button should still be enabled for host (now multiplayer)
    await expect(gamePage.startGameButton).toBeEnabled()
    await expect(gamePage.startGameButton).toContainText('Start Game')
    
    // Non-host should see waiting message
    await expect(page2.locator('text=Waiting for host to start...')).toBeVisible()
    
    // Start the game
    await gamePage.startGame()
    
    // Both players should transition to game
    await expect(gamePage.gameCanvas).toBeVisible()
    await expect(gamePage2.gameCanvas).toBeVisible()
    
    await context2.close()
  })

  test('should handle full game correctly', async ({ browser, page, gamePage }) => {
    // Create game with 2 max players
    await gamePage.createGame(2)
    const gameId = await gamePage.getGameId()
    
    // Second player joins
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const gamePage2 = new (await import('../helpers/game-page')).GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    await gamePage2.joinGame(gameId)
    
    // Game should be full
    await expect(gamePage.playerCount).toContainText('Players: 2 / 2')
    
    // Third player tries to join
    const context3 = await browser.newContext()
    const page3 = await context3.newPage()
    
    await page3.goto('/')
    await page3.waitForSelector('[data-testid="main-menu"]')
    
    // Game should not appear in available games (it's full)
    await expect(page3.locator(`[data-game-id="${gameId}"]`)).not.toBeVisible()
    
    await context2.close()
    await context3.close()
  })

  test('should maintain game state across page refresh', async ({ page, gamePage }) => {
    // Create game
    await gamePage.createGame(4)
    const gameId = await gamePage.getGameId()
    
    // Refresh page
    await page.reload()
    
    // Should still be in the same game
    // Note: The app doesn't change URL when in game, so we check for game lobby UI instead
    await expect(gamePage.gameIdDisplay).toBeVisible()
    await expect(gamePage.gameIdDisplay).toContainText(gameId)
    await expect(gamePage.playerCount).toContainText('Players: 1 / 4')
  })

  test('should handle player disconnection', async ({ browser, page, gamePage }) => {
    // Host creates game
    await gamePage.createGame(4)
    const gameId = await gamePage.getGameId()
    
    // Second player joins
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const gamePage2 = new (await import('../helpers/game-page')).GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    await gamePage2.joinGame(gameId)
    
    // Verify 2 players
    await expect(gamePage.playerCount).toContainText('Players: 2 / 4')
    
    // Second player disconnects
    await context2.close()
    
    // Wait a moment for disconnection to register
    await page.waitForTimeout(1000)
    
    // Should show 1 player again
    await expect(gamePage.playerCount).toContainText('Players: 1/4')
  })
})