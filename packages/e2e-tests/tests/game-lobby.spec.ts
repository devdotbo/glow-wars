import { test, expect } from '../fixtures/game.fixture'
import { Page } from '@playwright/test'

test.describe('Game Lobby System', () => {
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

  test('should create a new game', async ({ page, gamePage }) => {
    // Click create game
    await gamePage.createGameButton.click()
    
    // Select max players
    await gamePage.maxPlayersSelect.selectOption('4')
    
    // Create the game
    await page.locator('button:has-text("Create")').click()
    
    // Should redirect to game lobby
    await page.waitForURL('**/game/**')
    
    // Game ID should be displayed
    await expect(gamePage.gameIdDisplay).toBeVisible()
    const gameId = await gamePage.getGameId()
    expect(gameId).toMatch(/^[A-Z0-9]{6}$/)
    
    // Should show 1 player
    await expect(gamePage.playerCount).toContainText('Players: 1/4')
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
    await expect(gamePage.playerCount).toContainText('Players: 2/4')
    await expect(gamePage2.playerCount).toContainText('Players: 2/4')
    
    await context2.close()
  })

  test('should allow host to start game with minimum players', async ({ browser, page, gamePage }) => {
    // Host creates game
    await gamePage.createGame(4)
    const gameId = await gamePage.getGameId()
    
    // Start button should be disabled with 1 player
    await expect(gamePage.startGameButton).toBeDisabled()
    
    // Second player joins
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const gamePage2 = new (await import('../helpers/game-page')).GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    await gamePage2.joinGame(gameId)
    
    // Start button should be enabled for host
    await expect(gamePage.startGameButton).toBeEnabled()
    
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
    await expect(gamePage.playerCount).toContainText('Players: 2/2')
    
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
    await page.waitForURL(`**/game/${gameId}`)
    await expect(gamePage.gameIdDisplay).toContainText(gameId)
    await expect(gamePage.playerCount).toContainText('Players: 1/4')
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
    await expect(gamePage.playerCount).toContainText('Players: 2/4')
    
    // Second player disconnects
    await context2.close()
    
    // Wait a moment for disconnection to register
    await page.waitForTimeout(1000)
    
    // Should show 1 player again
    await expect(gamePage.playerCount).toContainText('Players: 1/4')
  })
})