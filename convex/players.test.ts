import { describe, test, expect, afterEach, beforeAll } from 'vitest'
import { ConvexClient } from 'convex/browser'
import { api } from './_generated/api'

// Get Convex URL from environment
const convexUrl = process.env.VITE_CONVEX_URL || 'http://localhost:3210'
const testClient = new ConvexClient(convexUrl)

async function clearTestData() {
  await testClient.mutation(api.testingFunctions.clearAll, {})
}

describe('Player Management', () => {
  beforeAll(async () => {
    await clearTestData()
  })

  afterEach(async () => {
    await clearTestData()
  })

  test('should create a player with valid data', async () => {
    const playerId = await testClient.mutation(api.players.createPlayer, {
      name: 'TestPlayer',
      color: '#FF5733',
    })

    expect(playerId).toBeDefined()
    expect(typeof playerId).toBe('string')
  })

  test('should retrieve a player by ID', async () => {
    const playerId = await testClient.mutation(api.players.createPlayer, {
      name: 'TestPlayer',
      color: '#00FF00',
    })

    const player = await testClient.query(api.players.getPlayer, {
      playerId,
    })

    expect(player).toBeDefined()
    expect(player?.name).toBe('TestPlayer')
    expect(player?.color).toBe('#00FF00')
    expect(player?.createdAt).toBeGreaterThan(0)
  })

  test('should list all players', async () => {
    // Create multiple players
    await testClient.mutation(api.players.createPlayer, {
      name: 'Player1',
      color: '#FF0000',
    })
    await testClient.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await testClient.mutation(api.players.createPlayer, {
      name: 'Player3',
      color: '#0000FF',
    })

    const players = await testClient.query(api.players.listPlayers, {})

    expect(players).toHaveLength(3)
    expect(players.map((p) => p.name).sort()).toEqual([
      'Player1',
      'Player2',
      'Player3',
    ])
  })

  test('should reject invalid hex color format', async () => {
    await expect(
      testClient.mutation(api.players.createPlayer, {
        name: 'InvalidColorPlayer',
        color: 'red', // Invalid format
      }),
    ).rejects.toThrow('Invalid hex color format')

    await expect(
      testClient.mutation(api.players.createPlayer, {
        name: 'InvalidColorPlayer',
        color: '#FF', // Too short
      }),
    ).rejects.toThrow('Invalid hex color format')

    await expect(
      testClient.mutation(api.players.createPlayer, {
        name: 'InvalidColorPlayer',
        color: '#GGGGGG', // Invalid characters
      }),
    ).rejects.toThrow('Invalid hex color format')
  })

  test('should reject duplicate player names', async () => {
    await testClient.mutation(api.players.createPlayer, {
      name: 'UniquePlayer',
      color: '#FF5733',
    })

    await expect(
      testClient.mutation(api.players.createPlayer, {
        name: 'UniquePlayer', // Same name
        color: '#00FF00',
      }),
    ).rejects.toThrow('Player name already exists')
  })

  test('should handle concurrent player creation', async () => {
    const promises = Array.from({ length: 5 }, (_, i) =>
      testClient.mutation(api.players.createPlayer, {
        name: `ConcurrentPlayer${i}`,
        color: '#FF5733',
      }),
    )

    const playerIds = await Promise.all(promises)
    const uniqueIds = new Set(playerIds)

    expect(uniqueIds.size).toBe(5)

    const players = await testClient.query(api.players.listPlayers, {})
    expect(players).toHaveLength(5)
  })
})
