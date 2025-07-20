import { convexTest } from 'convex-test'
import { describe, test, expect } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

// Import modules explicitly for convex-test in edge-runtime
const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Player Management', () => {
  test('should create a player with valid data', async () => {
    const t = convexTest(schema, modules)
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'TestPlayer',
      color: '#FF5733',
    })

    expect(playerId).toBeDefined()

    // Verify player was created with correct data
    const player = await t.query(api.players.getPlayer, { playerId })
    expect(player).not.toBeNull()
    expect(player).toMatchObject({
      name: 'TestPlayer',
      color: '#FF5733',
    })
    expect(player?.createdAt).toBeDefined()
  })

  test('should retrieve a player by ID', async () => {
    const t = convexTest(schema, modules)
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'RetrievePlayer',
      color: '#00FF00',
    })

    const retrievedPlayer = await t.query(api.players.getPlayer, { playerId })
    expect(retrievedPlayer).toMatchObject({
      _id: playerId,
      name: 'RetrievePlayer',
      color: '#00FF00',
    })
  })

  test('should list all players', async () => {
    const t = convexTest(schema, modules)
    
    // Create multiple players
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'Player1',
      color: '#FF0000',
    })
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })

    const players = await t.query(api.players.listPlayers)
    expect(players).toHaveLength(2)
    expect(players.map(p => p._id)).toContain(player1Id)
    expect(players.map(p => p._id)).toContain(player2Id)
  })

  test('should validate hex color format', async () => {
    const t = convexTest(schema, modules)
    
    // Invalid color formats
    await expect(
      t.mutation(api.players.createPlayer, {
        name: 'InvalidColor1',
        color: 'red',
      })
    ).rejects.toThrow('Invalid hex color format')

    await expect(
      t.mutation(api.players.createPlayer, {
        name: 'InvalidColor2',
        color: '#FF',
      })
    ).rejects.toThrow('Invalid hex color format')

    await expect(
      t.mutation(api.players.createPlayer, {
        name: 'InvalidColor3',
        color: '#GGGGGG',
      })
    ).rejects.toThrow('Invalid hex color format')
  })

  test('should handle duplicate player names', async () => {
    const t = convexTest(schema, modules)
    
    // Create first player
    await t.mutation(api.players.createPlayer, {
      name: 'DuplicateName',
      color: '#FF0000',
    })

    // Try to create second player with same name
    await expect(
      t.mutation(api.players.createPlayer, {
        name: 'DuplicateName',
        color: '#00FF00',
      })
    ).rejects.toThrow('Player name already exists')
  })

  test('should handle concurrent player creation', async () => {
    const t = convexTest(schema, modules)
    
    // Create players concurrently
    const results = await Promise.allSettled([
      t.mutation(api.players.createPlayer, {
        name: 'ConcurrentPlayer1',
        color: '#FF0000',
      }),
      t.mutation(api.players.createPlayer, {
        name: 'ConcurrentPlayer2',
        color: '#00FF00',
      }),
      t.mutation(api.players.createPlayer, {
        name: 'ConcurrentPlayer3',
        color: '#0000FF',
      }),
    ])

    // All should succeed
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(3)

    // Verify all players were created
    const players = await t.query(api.players.listPlayers)
    expect(players).toHaveLength(3)
  })
})