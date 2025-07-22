import { Page, Locator } from '@playwright/test'

export class GamePage {
  constructor(private page: Page) {}

  // Locators
  get mainMenu() {
    return this.page.locator('[data-testid="main-menu"]')
  }

  get createGameButton() {
    return this.page.locator('[data-testid="create-game-button"]')
  }

  get joinGameButton() {
    return this.page.locator('[data-testid="join-game-button"]')
  }

  get startGameButton() {
    return this.page.locator('[data-testid="start-game-button"]')
  }

  get gameCanvas() {
    return this.page.locator('canvas')
  }

  get gameIdDisplay() {
    return this.page.locator('[data-testid="game-id"]')
  }

  get playersList() {
    return this.page.locator('[data-testid="players-list"]')
  }

  get playerCount() {
    return this.page.locator('[data-testid="player-count"]')
  }

  get availableGamesList() {
    return this.page.locator('[data-testid="available-games"]')
  }

  get maxPlayersSelect() {
    return this.page.locator('select[name="maxPlayers"]')
  }

  // Actions
  async createGame(maxPlayers: number = 4) {
    await this.maxPlayersSelect.selectOption(String(maxPlayers))
    await this.createGameButton.click()
    // Wait for game lobby UI to appear
    await this.gameIdDisplay.waitFor({ state: 'visible', timeout: 10000 })
  }

  async joinGame(gameId: string) {
    // Select the game from available games
    await this.availableGamesList.locator(`[data-game-id="${gameId}"]`).click()
    await this.joinGameButton.click()
    // Wait for game lobby UI to appear
    await this.gameIdDisplay.waitFor({ state: 'visible', timeout: 10000 })
  }

  async waitForPlayersCount(count: number) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const element = document.querySelector('[data-testid="player-count"]')
        if (!element) return false
        const text = element.textContent || ''
        const match = text.match(/(\d+)\/\d+/)
        return match && parseInt(match[1]) === expectedCount
      },
      count,
      { timeout: 10000 }
    )
  }

  async startGame() {
    await this.startGameButton.click()
    await this.page.waitForSelector('canvas', { timeout: 10000 })
  }

  async getGameId(): Promise<string> {
    const gameIdText = await this.gameIdDisplay.textContent()
    // Extract just the ID part from "Game ID: XXXXXXXX"
    const match = gameIdText?.match(/Game ID: ([a-zA-Z0-9]+)/)
    return match?.[1] || ''
  }

  async movePlayer(direction: 'up' | 'down' | 'left' | 'right') {
    const keyMap = {
      up: 'ArrowUp',
      down: 'ArrowDown',
      left: 'ArrowLeft',
      right: 'ArrowRight',
    }
    await this.page.keyboard.press(keyMap[direction])
  }

  async getPlayerPosition(playerId: string): Promise<{ x: number; y: number }> {
    return await this.page.evaluate((id) => {
      const gameEngine = (window as any).gameEngine
      if (!gameEngine) throw new Error('Game engine not found')
      const player = gameEngine.getPlayer(id)
      if (!player) throw new Error(`Player ${id} not found`)
      return { x: player.position.x, y: player.position.y }
    }, playerId)
  }

  async waitForGameState(state: 'lobby' | 'playing' | 'ended') {
    await this.page.waitForFunction(
      (expectedState) => {
        return (window as any).gameState === expectedState
      },
      state,
      { timeout: 10000 }
    )
  }

  async collectPowerUp(type: string) {
    await this.page.evaluate((powerUpType) => {
      const gameEngine = (window as any).gameEngine
      if (!gameEngine) throw new Error('Game engine not found')
      gameEngine.collectPowerUp(powerUpType)
    }, type)
  }

  async getActivePowerUps(): Promise<string[]> {
    return await this.page.evaluate(() => {
      const gameEngine = (window as any).gameEngine
      if (!gameEngine) throw new Error('Game engine not found')
      return Array.from(gameEngine.localPlayer.activePowerUps.keys())
    })
  }
}