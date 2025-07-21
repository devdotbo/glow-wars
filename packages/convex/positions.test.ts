import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

// Import modules explicitly for convex-test in edge-runtime
const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Position System', () => {
  test('should update player position with valid coordinates', async () => {
    const t = convexTest(schema, modules)
    
    // Create player and game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'PositionPlayer',
      color: '#FF0000',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Position Test Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    // Start the game (need another player)
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Update position
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId,
      x: 100,
      y: 200,
    })
    
    // Verify position was updated
    const position = await t.query(api.positions.getPlayerPosition, {
      gameId,
      playerId,
    })
    
    expect(position).not.toBeNull()
    expect(position).toMatchObject({
      x: 100,
      y: 200,
    })
    expect(position?.timestamp).toBeDefined()
  })

  test('should validate position boundaries', async () => {
    const t = convexTest(schema, modules)
    
    // Setup game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'BoundaryPlayer',
      color: '#0000FF',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Boundary Test',
      maxPlayers: 2,
      mapType: 'small',
      createdBy: playerId,
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Test out of bounds positions
    await expect(
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId,
        x: -1,
        y: 500,
      })
    ).rejects.toThrow('Position out of bounds')
    
    await expect(
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId,
        x: 500,
        y: 1001,
      })
    ).rejects.toThrow('Position out of bounds')
    
    await expect(
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId,
        x: 1001,
        y: 500,
      })
    ).rejects.toThrow('Position out of bounds')
  })

  test('should not update position for inactive game', async () => {
    const t = convexTest(schema, modules)
    
    // Create waiting game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'InactivePlayer',
      color: '#FF00FF',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Inactive Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    // Try to update position in waiting game
    await expect(
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId,
        x: 100,
        y: 100,
      })
    ).rejects.toThrow('Game is not active')
  })

  test('should not update position for dead player', async () => {
    const t = convexTest(schema, modules)
    
    // Setup game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'DeadPlayer',
      color: '#FFFF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Dead Player Test',
      maxPlayers: 2,
      mapType: 'small',
      createdBy: playerId,
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Mark player as dead
    const gamePlayer = await t.run(async (ctx) => {
      return await ctx.db
        .query('gamePlayers')
        .withIndex('by_game_and_player', (q) =>
          q.eq('gameId', gameId).eq('playerId', playerId)
        )
        .unique()
    })
    
    await t.run(async (ctx) => {
      if (gamePlayer) {
        await ctx.db.patch(gamePlayer._id, { isAlive: false })
      }
    })
    
    // Try to update position
    await expect(
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId,
        x: 100,
        y: 100,
      })
    ).rejects.toThrow('Player is not alive')
  })

  test('should handle concurrent position updates', async () => {
    const t = convexTest(schema, modules)
    
    // Setup game with multiple players
    const players = await Promise.all([
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
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Concurrent Test',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: players[0],
    })
    
    // Join other players
    await t.mutation(api.games.joinGame, { gameId, playerId: players[1] })
    await t.mutation(api.games.joinGame, { gameId, playerId: players[2] })
    await t.mutation(api.games.startGame, { gameId })
    
    // Update positions concurrently
    const updates = await Promise.allSettled([
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: players[0],
        x: 100,
        y: 100,
      }),
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: players[1],
        x: 200,
        y: 200,
      }),
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: players[2],
        x: 300,
        y: 300,
      }),
    ])
    
    // All should succeed
    expect(updates.filter((r) => r.status === 'fulfilled')).toHaveLength(3)
    
    // Verify all positions
    const positions = await t.query(api.positions.streamPositions, { gameId })
    expect(positions).toHaveLength(3)
    expect(positions).toContainEqual(
      expect.objectContaining({
        playerId: players[0],
        x: 100,
        y: 100,
      })
    )
    expect(positions).toContainEqual(
      expect.objectContaining({
        playerId: players[1],
        x: 200,
        y: 200,
      })
    )
    expect(positions).toContainEqual(
      expect.objectContaining({
        playerId: players[2],
        x: 300,
        y: 300,
      })
    )
  })

  test('should stream all player positions in game', async () => {
    const t = convexTest(schema, modules)
    
    // Create game with players
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'StreamPlayer1',
      color: '#FF0000',
    })
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'StreamPlayer2',
      color: '#00FF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Stream Test',
      maxPlayers: 2,
      mapType: 'small',
      createdBy: player1Id,
    })
    
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Update positions
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: 150,
      y: 250,
    })
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: 350,
      y: 450,
    })
    
    // Stream positions
    const positions = await t.query(api.positions.streamPositions, { gameId })
    
    expect(positions).toHaveLength(2)
    expect(positions[0]).toMatchObject({
      playerId: player1Id,
      x: 150,
      y: 250,
      glowRadius: 50,
      isAlive: true,
    })
    expect(positions[1]).toMatchObject({
      playerId: player2Id,
      x: 350,
      y: 450,
      glowRadius: 50,
      isAlive: true,
    })
  })
})