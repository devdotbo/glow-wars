import { test, expect } from '../fixtures/game.fixture'
import { Browser, Page } from '@playwright/test'

test.describe('Multiplayer Synchronization', () => {
  let browser: Browser
  let player1Page: Page
  let player2Page: Page
  let gamePage1: any
  let gamePage2: any

  test.beforeEach(async ({ browser: testBrowser }) => {
    browser = testBrowser
    
    // Set up player 1
    const context1 = await browser.newContext()
    player1Page = await context1.newPage()
    const { GamePage } = await import('../helpers/game-page')
    gamePage1 = new GamePage(player1Page)
    
    // Set up player 2
    const context2 = await browser.newContext()
    player2Page = await context2.newPage()
    gamePage2 = new GamePage(player2Page)
    
    // Both players navigate to home
    await player1Page.goto('/')
    await player2Page.goto('/')
    
    // Wait for both to load
    await player1Page.waitForSelector('[data-testid="main-menu"]')
    await player2Page.waitForSelector('[data-testid="main-menu"]')
  })

  test.afterEach(async () => {
    await player1Page.context().close()
    await player2Page.context().close()
  })

  test('should sync player movements in real-time', async () => {
    // Player 1 creates game
    await gamePage1.createGame(2)
    const gameId = await gamePage1.getGameId()
    
    // Player 2 joins
    await gamePage2.joinGame(gameId)
    
    // Start the game
    await gamePage1.startGame()
    
    // Wait for both players to be in game
    await gamePage1.waitForGameState('playing')
    await gamePage2.waitForGameState('playing')
    
    // Get initial positions
    const player1Id = await player1Page.evaluate(() => (window as any).__guestPlayer.id)
    const player2Id = await player2Page.evaluate(() => (window as any).__guestPlayer.id)
    
    const initialP1onP2 = await gamePage2.getPlayerPosition(player1Id)
    
    // Player 1 moves right
    await gamePage1.movePlayer('right')
    await player1Page.waitForTimeout(100)
    
    // Verify movement on player 2's screen
    const updatedP1onP2 = await gamePage2.getPlayerPosition(player1Id)
    expect(updatedP1onP2.x).toBeGreaterThan(initialP1onP2.x)
    
    // Player 2 moves up
    const initialP2onP1 = await gamePage1.getPlayerPosition(player2Id)
    await gamePage2.movePlayer('up')
    await player2Page.waitForTimeout(100)
    
    // Verify movement on player 1's screen
    const updatedP2onP1 = await gamePage1.getPlayerPosition(player2Id)
    expect(updatedP2onP1.y).toBeLessThan(initialP2onP1.y)
  })

  test('should sync power-up collection', async () => {
    // Set up game
    await gamePage1.createGame(2)
    const gameId = await gamePage1.getGameId()
    await gamePage2.joinGame(gameId)
    await gamePage1.startGame()
    
    // Wait for game to start
    await gamePage1.waitForGameState('playing')
    await gamePage2.waitForGameState('playing')
    
    // Player 1 collects power-up
    await gamePage1.collectPowerUp('speed')
    
    // Wait for sync
    await player1Page.waitForTimeout(200)
    
    // Verify power-up effects visible on both screens
    const player1Id = await player1Page.evaluate(() => (window as any).__guestPlayer.id)
    
    // Check player 1's screen
    const p1PowerUps = await gamePage1.getActivePowerUps()
    expect(p1PowerUps).toContain('speed')
    
    // Check player 2's screen shows player 1 has power-up
    const p1HasPowerUpOnP2 = await player2Page.evaluate((playerId) => {
      const gameEngine = (window as any).gameEngine
      const player = gameEngine.getPlayer(playerId)
      return player && player.activePowerUps.has('speed')
    }, player1Id)
    expect(p1HasPowerUpOnP2).toBe(true)
  })

  test('should handle simultaneous actions', async () => {
    // Set up game
    await gamePage1.createGame(2)
    const gameId = await gamePage1.getGameId()
    await gamePage2.joinGame(gameId)
    await gamePage1.startGame()
    
    // Wait for game to start
    await gamePage1.waitForGameState('playing')
    await gamePage2.waitForGameState('playing')
    
    // Both players move simultaneously
    await Promise.all([
      gamePage1.movePlayer('right'),
      gamePage2.movePlayer('left'),
    ])
    
    // Wait for movements to process
    await player1Page.waitForTimeout(200)
    
    // Verify both movements were processed
    const player1Id = await player1Page.evaluate(() => (window as any).__guestPlayer.id)
    const player2Id = await player2Page.evaluate(() => (window as any).__guestPlayer.id)
    
    const p1Pos = await gamePage1.getPlayerPosition(player1Id)
    const p2Pos = await gamePage1.getPlayerPosition(player2Id)
    
    expect(p1Pos.x).toBeGreaterThan(100) // Moved right from center
    expect(p2Pos.x).toBeLessThan(100) // Moved left from center
  })

  test('should maintain game consistency with network latency', async () => {
    // Add artificial latency to player 2
    await player2Page.context().route('**/convex/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
      await route.continue()
    })
    
    // Set up game
    await gamePage1.createGame(2)
    const gameId = await gamePage1.getGameId()
    await gamePage2.joinGame(gameId)
    await gamePage1.startGame()
    
    // Wait for game to start
    await gamePage1.waitForGameState('playing')
    await gamePage2.waitForGameState('playing')
    
    // Player 1 moves multiple times quickly
    for (let i = 0; i < 5; i++) {
      await gamePage1.movePlayer('right')
      await player1Page.waitForTimeout(50)
    }
    
    // Wait for sync with latency
    await player2Page.waitForTimeout(1000)
    
    // Positions should eventually be consistent
    const player1Id = await player1Page.evaluate(() => (window as any).__guestPlayer.id)
    const p1PosOnP1 = await gamePage1.getPlayerPosition(player1Id)
    const p1PosOnP2 = await gamePage2.getPlayerPosition(player1Id)
    
    // Positions should be approximately equal (within interpolation tolerance)
    expect(Math.abs(p1PosOnP1.x - p1PosOnP2.x)).toBeLessThan(10)
    expect(Math.abs(p1PosOnP1.y - p1PosOnP2.y)).toBeLessThan(10)
  })

  test('should show all players in the game', async () => {
    // Create 4-player game
    await gamePage1.createGame(4)
    const gameId = await gamePage1.getGameId()
    
    // 3 more players join
    const players = [player2Page]
    const gamePages = [gamePage2]
    
    for (let i = 3; i <= 4; i++) {
      const context = await browser.newContext()
      const page = await context.newPage()
      const { GamePage } = await import('../helpers/game-page')
      const gamePage = new GamePage(page)
      
      await page.goto('/')
      await page.waitForSelector('[data-testid="main-menu"]')
      await gamePage.joinGame(gameId)
      
      players.push(page)
      gamePages.push(gamePage)
    }
    
    // Wait for all players to be registered
    await gamePage1.waitForPlayersCount(4)
    
    // Verify all players see each other
    const playersList = await player1Page.locator('[data-testid="player-item"]').count()
    expect(playersList).toBe(4)
    
    // Clean up additional contexts
    for (const page of players.slice(1)) {
      await page.context().close()
    }
  })
})