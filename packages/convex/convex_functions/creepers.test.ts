import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Shadow Creepers AI', () => {
  test('should spawn in unpainted areas', async () => {
    const t = convexTest(schema, modules)

    // Create players and game
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'CreeperTestPlayer1',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'CreeperTestPlayer2',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Creeper Test Game',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: player1Id,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Paint some territory to create contrast
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId: player1Id,
      x: 100,
      y: 100,
    })

    // Spawn creepers
    const creepers = await t.mutation(api.ai.creepers.spawnCreepers, {
      gameId,
      count: 5,
    })

    expect(creepers).toHaveLength(5)

    // Verify all creepers spawned in unpainted areas
    const entities = await t.query(api.ai.entities.getEntities, {
      gameId,
      type: 'creeper',
    })

    // Get painted territories
    const territories = await t.query(api.territory.getTerritoryMap, { gameId })
    const paintedCells = new Set(
      territories.map(t => `${Math.floor(t.gridX)},${Math.floor(t.gridY)}`)
    )

    // Check each creeper is in unpainted area
    for (const creeper of entities) {
      const gridX = Math.floor(creeper.position.x / 10)
      const gridY = Math.floor(creeper.position.y / 10)
      const cellKey = `${gridX},${gridY}`
      
      expect(paintedCells.has(cellKey)).toBe(false)
    }
  })

  test('should patrol dark territories', async () => {
    const t = convexTest(schema, modules)

    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'PatrolTestPlayer',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Patrol Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Spawn a creeper
    const [creeperId] = await t.mutation(api.ai.creepers.spawnCreepers, {
      gameId,
      count: 1,
    })

    // Get initial position
    const initialEntity = await t.query(api.ai.entities.getEntities, {
      gameId,
      type: 'creeper',
    })
    const initialPos = initialEntity[0].position

    // Update creeper behavior (should patrol)
    await t.mutation(api.ai.creepers.updateCreeperBehavior, { gameId })

    // Get updated position
    const updatedEntity = await t.query(api.ai.entities.getEntities, {
      gameId,
      type: 'creeper',
    })
    const updatedPos = updatedEntity[0].position

    // Verify creeper moved (patrol behavior)
    expect(updatedEntity[0].state).toBe('patrol')
    expect(
      updatedPos.x !== initialPos.x || updatedPos.y !== initialPos.y
    ).toBe(true)

    // Verify still in unpainted area
    const territories = await t.query(api.territory.getTerritoryMap, { gameId })
    const paintedCells = new Set(
      territories.map(t => `${Math.floor(t.gridX)},${Math.floor(t.gridY)}`)
    )
    
    const gridX = Math.floor(updatedPos.x / 10)
    const gridY = Math.floor(updatedPos.y / 10)
    expect(paintedCells.has(`${gridX},${gridY}`)).toBe(false)
  })

  test('should chase players in darkness', async () => {
    const t = convexTest(schema, modules)

    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'HuntTestPlayer',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Hunt Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Position player in unpainted area (far from spawn)
    // Note: updatePosition automatically paints territory, so we need to move player manually
    const gamePlayers = await t.query(api.games.getGamePlayers, { gameId })
    const gamePlayer = gamePlayers.find(p => p.playerId === playerId)
    
    if (!gamePlayer) throw new Error('Player not found')
    
    await t.run(async ctx => {
      await ctx.db.patch(gamePlayer._id, { 
        position: { x: 500, y: 500 } 
      })
    })

    // Spawn creeper near player (within detection range)
    await t.mutation(api.ai.creepers.spawnCreepers, {
      gameId,
      count: 1,
      nearPosition: { x: 450, y: 450 },
    })

    // Update creeper behavior
    await t.mutation(api.ai.creepers.updateCreeperBehavior, { gameId })

    // Check creeper state
    const entities = await t.query(api.ai.entities.getEntities, {
      gameId,
      type: 'creeper',
    })

    expect(entities[0].state).toBe('hunt')
    expect(entities[0].targetId).toBe(playerId)
  })

  test('should return to darkness behavior', async () => {
    const t = convexTest(schema, modules)

    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'ReturnTestPlayer',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Return Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Paint a large area
    for (let x = 0; x <= 100; x += 10) {
      for (let y = 0; y <= 100; y += 10) {
        await t.mutation(api.positions.updatePosition, {
          gameId,
          playerId,
          x,
          y,
        })
      }
    }

    // Spawn creeper in unpainted area
    const [creeperId] = await t.mutation(api.ai.creepers.spawnCreepers, {
      gameId,
      count: 1,
    })

    // Manually move creeper to painted area
    await t.mutation(api.ai.entities.updateEntityPosition, {
      entityId: creeperId,
      position: { x: 50, y: 50 },
      state: 'patrol',
    })

    // Update behavior - should trigger return state
    await t.mutation(api.ai.creepers.updateCreeperBehavior, { gameId })

    const entities = await t.query(api.ai.entities.getEntities, {
      gameId,
      type: 'creeper',
    })

    expect(entities[0].state).toBe('return')
  })

  test('should damage players on contact', async () => {
    const t = convexTest(schema, modules)

    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'DamageTestPlayer',
      color: '#FF0000',
    })

    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })

    const gameId = await t.mutation(api.games.createGame, {
      name: 'Damage Test',
      maxPlayers: 2,
      mapType: 'standard',
      createdBy: playerId,
    })

    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })

    // Get initial player glow
    const initialPlayers = await t.query(api.games.getGamePlayers, { gameId })
    const initialGlow = initialPlayers.find(p => p.playerId === playerId)!.glowRadius

    // Position player in unpainted area manually to avoid painting
    const gamePlayersBeforeMove = await t.query(api.games.getGamePlayers, { gameId })
    const gamePlayerBeforeMove = gamePlayersBeforeMove.find(p => p.playerId === playerId)
    
    if (!gamePlayerBeforeMove) throw new Error('Player not found')
    
    await t.run(async ctx => {
      await ctx.db.patch(gamePlayerBeforeMove._id, { 
        position: { x: 500, y: 500 } 
      })
    })

    // Spawn creeper at exact same position for guaranteed contact
    const [creeperId] = await t.mutation(api.ai.creepers.spawnCreepers, {
      gameId,
      count: 1,
      nearPosition: { x: 500, y: 500 },
    })
    
    // Force creeper to exact player position to ensure contact
    await t.run(async ctx => {
      await ctx.db.patch(creeperId, { 
        position: { x: 500, y: 500 } 
      })
    })

    // Update creeper behavior (should damage player)
    const result = await t.mutation(api.ai.creepers.updateCreeperBehavior, { gameId })

    expect(result.playersHit).toBe(1)

    // Check player glow reduced
    const updatedPlayers = await t.query(api.games.getGamePlayers, { gameId })
    const updatedGlow = updatedPlayers.find(p => p.playerId === playerId)!.glowRadius

    expect(updatedGlow).toBe(initialGlow - 10)
  })
})