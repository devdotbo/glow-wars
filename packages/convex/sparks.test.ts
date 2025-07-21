import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Spark AI System', () => {
  test('should spawn sparks at game start', async () => {
    const t = convexTest(schema, modules)
    
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'SparkTestPlayer',
      color: '#FF0000',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Spark Test Game',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    const sparkIds = await t.mutation(api.ai.sparks.spawnSparks, {
      gameId,
      count: 5,
    })
    
    expect(sparkIds).toHaveLength(5)
    
    const entities = await t.query(api.ai.entities.getEntities, {
      gameId,
      type: 'spark',
    })
    
    expect(entities).toHaveLength(5)
    entities.forEach(entity => {
      expect(entity.type).toBe('spark')
      expect(entity.state).toBe('wander')
      expect(entity.health).toBe(10)
      expect(entity.position.x).toBeGreaterThanOrEqual(50)
      expect(entity.position.x).toBeLessThanOrEqual(950)
      expect(entity.position.y).toBeGreaterThanOrEqual(50)
      expect(entity.position.y).toBeLessThanOrEqual(950)
    })
  })

  test('should implement wander movement pattern', async () => {
    const t = convexTest(schema, modules)
    
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'WanderTestPlayer',
      color: '#FF0000',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Wander Test Game',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Move players away from where we'll spawn the spark
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId,
      x: 100,
      y: 100,
    })
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player2Id,
      x: 900,
      y: 900,
    })
    
    const sparkId = await t.mutation(api.ai.entities.spawnEntity, {
      gameId,
      type: 'spark',
      position: { x: 500, y: 500 },
    })
    
    const initialEntity = await t.query(api.ai.entities.getEntities, { gameId })
    const initialPosition = initialEntity[0].position
    
    await t.mutation(api.ai.sparks.updateSparkBehavior, { gameId })
    
    const updatedEntity = await t.query(api.ai.entities.getEntities, { gameId })
    const newPosition = updatedEntity[0].position
    
    expect(newPosition.x).not.toBe(initialPosition.x)
    expect(newPosition.y).not.toBe(initialPosition.y)
    
    const distance = Math.sqrt(
      Math.pow(newPosition.x - initialPosition.x, 2) +
      Math.pow(newPosition.y - initialPosition.y, 2)
    )
    
    expect(distance).toBeCloseTo(2, 1)
    expect(updatedEntity[0].state).toBe('wander')
  })

  test('should detect players within radius and transition to flee state', async () => {
    const t = convexTest(schema, modules)
    
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'DetectionTestPlayer',
      color: '#FF0000',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Detection Test Game',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    const sparkId = await t.mutation(api.ai.entities.spawnEntity, {
      gameId,
      type: 'spark',
      position: { x: 500, y: 500 },
    })
    
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId,
      x: 530,
      y: 500,
    })
    
    await t.mutation(api.ai.sparks.updateSparkBehavior, { gameId })
    
    const entities = await t.query(api.ai.entities.getEntities, { gameId })
    const spark = entities[0]
    
    expect(spark.state).toBe('flee')
    expect(spark.targetId).toBe(playerId)
    
    expect(spark.position.x).toBeLessThan(500)
  })

  test('should transition from flee to wander when player moves away', async () => {
    const t = convexTest(schema, modules)
    
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'StateTransitionPlayer',
      color: '#FF0000',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'State Transition Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    const sparkId = await t.mutation(api.ai.entities.spawnEntity, {
      gameId,
      type: 'spark',
      position: { x: 500, y: 500 },
    })
    
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId,
      x: 530,
      y: 500,
    })
    
    await t.mutation(api.ai.sparks.updateSparkBehavior, { gameId })
    
    let entities = await t.query(api.ai.entities.getEntities, { gameId })
    expect(entities[0].state).toBe('flee')
    
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId,
      x: 700,
      y: 700,
    })
    
    await t.mutation(api.ai.sparks.updateSparkBehavior, { gameId })
    
    entities = await t.query(api.ai.entities.getEntities, { gameId })
    expect(entities[0].state).toBe('wander')
    expect(entities[0].targetId).toBeUndefined()
  })

  test('should allow players to consume sparks for glow bonus', async () => {
    const t = convexTest(schema, modules)
    
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'ConsumeTestPlayer',
      color: '#FF0000',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Consume Test Game',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    const sparkId = await t.mutation(api.ai.entities.spawnEntity, {
      gameId,
      type: 'spark',
      position: { x: 500, y: 500 },
    })
    
    const gamePlayers = await t.run(async (ctx) => {
      return await ctx.db
        .query('gamePlayers')
        .withIndex('by_game_and_player', q =>
          q.eq('gameId', gameId).eq('playerId', playerId)
        )
        .unique()
    })
    const initialGlow = gamePlayers?.glowRadius || 50
    
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId,
      x: 502,
      y: 502,
    })
    
    const result = await t.mutation(api.ai.sparks.updateSparkBehavior, { gameId })
    
    expect(result.consumed).toBe(1)
    
    const entities = await t.query(api.ai.entities.getEntities, { gameId })
    expect(entities).toHaveLength(0)
    
    const gamePlayerAfter = await t.run(async (ctx) => {
      return await ctx.db
        .query('gamePlayers')
        .withIndex('by_game_and_player', q =>
          q.eq('gameId', gameId).eq('playerId', playerId)
        )
        .unique()
    })
    expect(gamePlayerAfter?.glowRadius).toBe(initialGlow + 5)
  })
})