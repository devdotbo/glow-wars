import { Page } from '@playwright/test'

export class ConvexTestHelper {
  constructor(private page: Page) {}

  async waitForConvexConnection() {
    await this.page.waitForFunction(
      () => {
        const convexClient = (window as any).__convexClient
        return convexClient && convexClient.connectionState() === 'ready'
      },
      { timeout: 15000 }
    )
  }

  async waitForSubscription(functionName: string) {
    await this.page.waitForFunction(
      (funcName) => {
        const subscriptions = (window as any).__convexSubscriptions || new Set()
        return subscriptions.has(funcName)
      },
      functionName,
      { timeout: 5000 }
    )
  }

  async mockConvexFunction(functionName: string, mockData: any) {
    await this.page.evaluate(({ funcName, data }) => {
      // Store original function
      const convexClient = (window as any).__convexClient
      if (!convexClient) throw new Error('Convex client not found')
      
      const originalMocks = (window as any).__convexMocks || {}
      originalMocks[funcName] = data
      ;(window as any).__convexMocks = originalMocks
    }, { funcName: functionName, data: mockData })
  }

  async clearConvexMocks() {
    await this.page.evaluate(() => {
      ;(window as any).__convexMocks = {}
    })
  }

  async getConvexState(tableName: string): Promise<any[]> {
    return await this.page.evaluate((table) => {
      const convexClient = (window as any).__convexClient
      if (!convexClient) throw new Error('Convex client not found')
      
      // This is a simplified version - in real implementation you'd use proper queries
      const state = (window as any).__convexState || {}
      return state[table] || []
    }, tableName)
  }

  async waitForMutation(mutationName: string) {
    await this.page.waitForFunction(
      (mutation) => {
        const mutations = (window as any).__convexMutations || []
        return mutations.includes(mutation)
      },
      mutationName,
      { timeout: 5000 }
    )
  }
}