import { test, expect } from '../fixtures/game.fixture'

test.describe('Complete Game Flow', () => {
  test('should play a complete single-player practice game', async ({ page, gamePage }) => {
    // Start from main menu
    await expect(page.locator('h1')).toContainText('Glow Wars')
    
    // Create a practice game (single player)
    await page.locator('button:has-text("Practice")').click()
    
    // Should go directly to game
    await page.waitForURL('**/practice')
    await expect(gamePage.gameCanvas).toBeVisible()
    
    // Verify game elements
    await expect(page.locator('[data-testid="score"]')).toBeVisible()
    await expect(page.locator('[data-testid="timer"]')).toBeVisible()
    
    // Test basic movement
    const initialPos = await gamePage.getPlayerPosition('player')
    await gamePage.movePlayer('right')
    await page.waitForTimeout(100)
    const newPos = await gamePage.getPlayerPosition('player')
    expect(newPos.x).toBeGreaterThan(initialPos.x)
    
    // Test power-up collection
    await gamePage.collectPowerUp('speed')
    const powerUps = await gamePage.getActivePowerUps()
    expect(powerUps).toContain('speed')
  })

  test('should complete full multiplayer game flow', async ({ browser, page, gamePage }) => {
    // 1. Start from main menu
    await expect(page.locator('h1')).toContainText('Glow Wars')
    
    // 2. Create multiplayer game
    await gamePage.createGame(2)
    const gameId = await gamePage.getGameId()
    
    // 3. Second player joins
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const { GamePage } = await import('../helpers/game-page')
    const gamePage2 = new GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    await gamePage2.joinGame(gameId)
    
    // 4. Start the game
    await gamePage.startGame()
    
    // 5. Both players see game canvas
    await expect(gamePage.gameCanvas).toBeVisible()
    await expect(gamePage2.gameCanvas).toBeVisible()
    
    // 6. Play for a bit
    // Player 1 moves and paints territory
    for (let i = 0; i < 5; i++) {
      await gamePage.movePlayer('right')
      await page.waitForTimeout(100)
      await gamePage.movePlayer('down')
      await page.waitForTimeout(100)
    }
    
    // Player 2 moves in different direction
    for (let i = 0; i < 5; i++) {
      await gamePage2.movePlayer('left')
      await page2.waitForTimeout(100)
      await gamePage2.movePlayer('up')
      await page2.waitForTimeout(100)
    }
    
    // 7. Check territory is being painted
    const territory = await page.evaluate(() => {
      const gameEngine = (window as any).gameEngine
      return gameEngine.getTerritoryPercentages()
    })
    expect(territory.player1).toBeGreaterThan(0)
    expect(territory.player2).toBeGreaterThan(0)
    
    // 8. Simulate game end (for testing, trigger victory condition)
    await page.evaluate(() => {
      const gameEngine = (window as any).gameEngine
      gameEngine.endGame('player1')
    })
    
    // 9. Victory screen should appear
    await expect(page.locator('[data-testid="victory-screen"]')).toBeVisible()
    await expect(page.locator('[data-testid="winner-name"]')).toBeVisible()
    await expect(page.locator('button:has-text("Play Again")')).toBeVisible()
    
    // 10. Play again
    await page.locator('button:has-text("Play Again")').click()
    
    // Should return to lobby with same players
    await expect(gamePage.playerCount).toContainText('Players: 2/2')
    
    await context2.close()
  })

  test('should handle game with AI entities', async ({ page, gamePage }) => {
    // Create game with AI
    await gamePage.createGameButton.click()
    await gamePage.maxPlayersSelect.selectOption('2')
    await page.locator('input[name="enableAI"]').check()
    await page.locator('button:has-text("Create")').click()
    
    // Wait for game to load
    await page.waitForURL('**/game/**')
    
    // Start solo (AI entities should spawn)
    await gamePage.startGame()
    
    // Verify AI entities are present
    const aiEntities = await page.evaluate(() => {
      const gameEngine = (window as any).gameEngine
      return {
        sparks: gameEngine.entities.filter((e: any) => e.type === 'spark').length,
        creepers: gameEngine.entities.filter((e: any) => e.type === 'creeper').length,
        moths: gameEngine.entities.filter((e: any) => e.type === 'moth').length,
      }
    })
    
    expect(aiEntities.sparks).toBeGreaterThan(0)
    expect(aiEntities.creepers).toBeGreaterThan(0)
    expect(aiEntities.moths).toBeGreaterThan(0)
  })

  test('should save and resume game state', async ({ page, gamePage }) => {
    // Create game
    await gamePage.createGame(4)
    const gameId = await gamePage.getGameId()
    
    // Get initial state
    const initialPlayers = await page.locator('[data-testid="player-item"]').count()
    
    // Navigate away
    await page.goto('/')
    
    // Navigate back using game ID
    await page.goto(`/game/${gameId}`)
    
    // Game state should be preserved
    await expect(gamePage.gameIdDisplay).toContainText(gameId)
    const resumedPlayers = await page.locator('[data-testid="player-item"]').count()
    expect(resumedPlayers).toBe(initialPlayers)
  })

  test('should handle network disconnection gracefully', async ({ page, gamePage, context }) => {
    // Create game
    await gamePage.createGame(2)
    
    // Simulate network disconnection
    await context.setOffline(true)
    
    // Should show connection lost message
    await expect(page.locator('[data-testid="connection-lost"]')).toBeVisible({ timeout: 5000 })
    
    // Restore connection
    await context.setOffline(false)
    
    // Should reconnect automatically
    await expect(page.locator('[data-testid="connection-lost"]')).not.toBeVisible({ timeout: 10000 })
    
    // Game should still be functional
    await expect(gamePage.playerCount).toBeVisible()
  })

  test('should track game statistics', async ({ browser, page, gamePage }) => {
    // Play a quick game
    await gamePage.createGame(2)
    const gameId = await gamePage.getGameId()
    
    // Second player joins
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    const { GamePage } = await import('../helpers/game-page')
    const gamePage2 = new GamePage(page2)
    
    await page2.goto('/')
    await page2.waitForSelector('[data-testid="main-menu"]')
    await gamePage2.joinGame(gameId)
    
    // Start and play
    await gamePage.startGame()
    
    // Perform some actions
    await gamePage.movePlayer('right')
    await gamePage.collectPowerUp('speed')
    await gamePage2.movePlayer('left')
    
    // End game
    await page.evaluate(() => {
      const gameEngine = (window as any).gameEngine
      gameEngine.endGame('player1')
    })
    
    // Check statistics
    await expect(page.locator('[data-testid="game-stats"]')).toBeVisible()
    await expect(page.locator('[data-testid="stat-territory"]')).toBeVisible()
    await expect(page.locator('[data-testid="stat-powerups"]')).toBeVisible()
    await expect(page.locator('[data-testid="stat-score"]')).toBeVisible()
    
    await context2.close()
  })
})