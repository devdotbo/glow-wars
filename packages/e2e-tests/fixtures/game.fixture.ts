import { test as base, Page } from '@playwright/test'
import { GamePage } from '../helpers/game-page'
import { ConvexTestHelper } from '../helpers/convex-helper'

export type GameFixtures = {
  gamePage: GamePage
  convexHelper: ConvexTestHelper
  guestPlayer: {
    id: string
    name: string
    color: number
  }
}

export const test = base.extend<GameFixtures>({
  gamePage: async ({ page }, use) => {
    const gamePage = new GamePage(page)
    await use(gamePage)
  },

  convexHelper: async ({ page }, use) => {
    const helper = new ConvexTestHelper(page)
    await use(helper)
  },

  guestPlayer: async ({ page, gamePage }, use) => {
    // Navigate to home page
    await page.goto('/')
    
    // Wait for guest player to be created
    await page.waitForSelector('[data-testid="main-menu"]', { timeout: 10000 })
    
    // Get guest player data from page context
    const guestPlayer = await page.evaluate(() => {
      return (window as any).__guestPlayer
    })
    
    await use(guestPlayer)
  },
})

export { expect } from '@playwright/test'