import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Collision Detection & Elimination', () => {
  test('should detect player collisions within collision distance', async () => {
    const t = convexTest(schema, modules)

    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'CollisionPlayer1',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'CollisionPlayer2',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Collision Test Game',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: player1Id,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Get initial positions
    const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const p1 = gamePlayers.find(p => p.playerId === player1Id)
    const p2 = gamePlayers.find(p => p.playerId === player2Id)

    // Move players close together
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: p1!.position.x,
      y: p1!.position.y,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: p1!.position.x + 10, // Within collision distance of 15
      y: p1!.position.y,
    })

    const result = await t.mutation(api.collision.checkCollisions, { gameId })

    expect(result.collisions).toBe(1)
  })

  test('should eliminate smaller player on collision', async () => {
    const t = convexTest(schema, modules)

    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'BigPlayer',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'SmallPlayer',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Elimination Test Game',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: player1Id,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Give player 1 more glow (size)
    await t.mutation(api.glow.replenishGlow, { gameId, playerId: player1Id })
    await t.mutation(api.glow.consumeGlow, {
      gameId,
      playerId: player2Id,
      amount: 20,
    })

    // Get initial positions
    const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const p1 = gamePlayers.find(p => p.playerId === player1Id)
    const p2 = gamePlayers.find(p => p.playerId === player2Id)

    // Move players close together
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: p1!.position.x,
      y: p1!.position.y,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: p1!.position.x + 10,
      y: p1!.position.y,
    })

    const result = await t.mutation(api.collision.checkCollisions, { gameId })

    expect(result.eliminations).toBe(1)

    const updatedGamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const eliminatedPlayer = updatedGamePlayers.find(p => p.playerId === player2Id)
    expect(eliminatedPlayer!.isAlive).toBe(false)
  })

  test('should bounce players with similar sizes', async () => {
    const t = convexTest(schema, modules)

    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'Player1',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Bounce Test Game',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: player1Id,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Get initial positions
    const initialGamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const p1Initial = initialGamePlayers.find(p => p.playerId === player1Id)
    const p2Initial = initialGamePlayers.find(p => p.playerId === player2Id)

    // Move players close together
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: p1Initial!.position.x,
      y: p1Initial!.position.y,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: p1Initial!.position.x + 10,
      y: p1Initial!.position.y,
    })

    const result = await t.mutation(api.collision.checkCollisions, { gameId })

    expect(result.bounces).toBe(1)
    expect(result.eliminations).toBe(0)

    // Check that players were bounced apart
    const updatedGamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const p1Updated = updatedGamePlayers.find(p => p.playerId === player1Id)
    const p2Updated = updatedGamePlayers.find(p => p.playerId === player2Id)

    const distance = Math.sqrt(
      Math.pow(p1Updated!.position.x - p2Updated!.position.x, 2) +
      Math.pow(p1Updated!.position.y - p2Updated!.position.y, 2)
    )
    expect(distance).toBeGreaterThan(15) // Should be bounced apart
  })

  test('should handle multiple simultaneous collisions', async () => {
    const t = convexTest(schema, modules)

    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'Player1',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })

    const player3Id = await t.mutation(api.players.createPlayer, {
      name: 'Player3',
      color: '#0000FF',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Multi-Collision Test',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: player1Id,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.joinGame, { gameId, playerId: player3Id })
    await t.mutation(api.games.startGame, { gameId })

    // Get initial positions
    const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const p1 = gamePlayers.find(p => p.playerId === player1Id)
    const p2 = gamePlayers.find(p => p.playerId === player2Id)
    const p3 = gamePlayers.find(p => p.playerId === player3Id)

    // Position all players close together
    const centerX = p1!.position.x
    const centerY = p1!.position.y

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: centerX,
      y: centerY,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: centerX + 10,
      y: centerY,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player3Id,
      x: centerX + 5,
      y: centerY + 10,
    })

    const result = await t.mutation(api.collision.checkCollisions, { gameId })

    expect(result.collisions).toBe(2)
  })

  test('should not detect collisions for dead players', async () => {
    const t = convexTest(schema, modules)

    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'AlivePlayer',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'DeadPlayer',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Dead Player Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: player1Id,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Get initial game players
    const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const gamePlayer2 = gamePlayers.find(p => p.playerId === player2Id)

    // Manually mark player 2 as dead
    await t.db.patch(gamePlayer2!._id, { isAlive: false })

    // Get initial positions
    const p1 = gamePlayers.find(p => p.playerId === player1Id)
    const p2 = gamePlayers.find(p => p.playerId === player2Id)

    // Move players close together
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: p1!.position.x,
      y: p1!.position.y,
    })

    // Try to update dead player position (should fail)
    await expect(
      t.mutation(api.positions.updatePosition, {
        gameId,
        playerId: player2Id,
        x: p1!.position.x + 10,
        y: p1!.position.y,
      })
    ).rejects.toThrow('Player is not alive')

    const result = await t.mutation(api.collision.checkCollisions, { gameId })
    expect(result.collisions).toBe(0)
  })
})