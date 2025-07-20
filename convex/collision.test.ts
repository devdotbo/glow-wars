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

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: 100,
      y: 100,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: 110,
      y: 100,
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

    const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const bigPlayer = gamePlayers.find(p => p.playerId === player1Id)
    const smallPlayer = gamePlayers.find(p => p.playerId === player2Id)

    if (!bigPlayer || !smallPlayer) throw new Error('Players not found')

    await t.mutation(api.glow.consumeGlow, {
      gameId,
      playerId: player2Id,
      amount: 30,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: 100,
      y: 100,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: 110,
      y: 100,
    })

    const initialBigPlayerGlow = 50
    const result = await t.mutation(api.collision.checkCollisions, { gameId })

    expect(result.eliminations).toBe(1)

    const updatedGamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const updatedBigPlayer = updatedGamePlayers.find(p => p.playerId === player1Id)
    const updatedSmallPlayer = updatedGamePlayers.find(p => p.playerId === player2Id)

    expect(updatedSmallPlayer?.isAlive).toBe(false)
    expect(updatedBigPlayer?.isAlive).toBe(true)
    expect(updatedBigPlayer?.glowRadius).toBeGreaterThan(initialBigPlayerGlow)
    expect(updatedBigPlayer?.score).toBe(1)
  })

  test('should bounce players with similar sizes', async () => {
    const t = convexTest(schema, modules)

    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'EqualPlayer1',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'EqualPlayer2',
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

    const initialX1 = 100
    const initialY1 = 100
    const initialX2 = 110
    const initialY2 = 100

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: initialX1,
      y: initialY1,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: initialX2,
      y: initialY2,
    })

    const result = await t.mutation(api.collision.checkCollisions, { gameId })

    expect(result.bounces).toBe(1)
    expect(result.eliminations).toBe(0)

    const updatedGamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const updatedPlayer1 = updatedGamePlayers.find(p => p.playerId === player1Id)
    const updatedPlayer2 = updatedGamePlayers.find(p => p.playerId === player2Id)

    expect(updatedPlayer1?.isAlive).toBe(true)
    expect(updatedPlayer2?.isAlive).toBe(true)

    expect(updatedPlayer1?.position.x).toBeLessThan(initialX1)
    expect(updatedPlayer2?.position.x).toBeGreaterThan(initialX2)
  })

  test('should handle multiple simultaneous collisions', async () => {
    const t = convexTest(schema, modules)

    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'CenterPlayer',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'LeftPlayer',
      color: '#00FF00',
    })

    const player3Id = await t.mutation(api.players.createPlayer, {
      name: 'RightPlayer',
      color: '#0000FF',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Multi Collision Test',
      maxPlayers: 3,
      mapType: 'standard',
      createdBy: player1Id,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.joinGame, { gameId, playerId: player3Id })
    await t.mutation(api.games.startGame, { gameId })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: 100,
      y: 100,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: 90,
      y: 100,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player3Id,
      x: 110,
      y: 100,
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

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: 100,
      y: 100,
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: 200,
      y: 200,
    })

    const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const deadPlayer = gamePlayers.find(p => p.playerId === player2Id)
    if (!deadPlayer) throw new Error('Player not found')

    await t.run(async ctx => {
      await ctx.db.patch(deadPlayer._id, { isAlive: false })
    })

    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: 105,
      y: 100,
    })

    const result = await t.mutation(api.collision.checkCollisions, { gameId })

    expect(result.collisions).toBe(0)
  })
})