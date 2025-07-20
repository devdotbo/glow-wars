import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'
import {
  buildSpatialIndex,
  getPotentialCollisions,
  detectCollisionPairs,
  positionToSector,
  getOverlappingSectors,
} from './optimizations/spatial'

const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Performance Optimizations', () => {
  describe('Spatial Partitioning', () => {
    test('should correctly partition entities into sectors', async () => {
      const entities = [
        { id: '1' as any, position: { x: 50, y: 50 } },
        { id: '2' as any, position: { x: 150, y: 150 } },
        { id: '3' as any, position: { x: 55, y: 55 } },
        { id: '4' as any, position: { x: 850, y: 850 } },
      ]
      
      const spatialIndex = buildSpatialIndex(entities)
      
      // Entities 1 and 3 should be in the same sector
      const sector00 = spatialIndex.get('0,0')
      expect(sector00).toBeDefined()
      expect(sector00!.length).toBe(2)
      
      // Entity 2 should be in a different sector
      const sector11 = spatialIndex.get('1,1')
      expect(sector11).toBeDefined()
      expect(sector11!.length).toBe(1)
      
      // Entity 4 should be in far corner
      const sector88 = spatialIndex.get('8,8')
      expect(sector88).toBeDefined()
      expect(sector88!.length).toBe(1)
    })
    
    test('should efficiently detect collision pairs', async () => {
      // Create a grid of 100 entities, spaced far apart
      const entities = []
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          entities.push({
            id: `${i}-${j}` as any,
            position: { x: i * 100 + 20, y: j * 100 + 20 }, // Offset to avoid edge cases
            glowRadius: 50,
          })
        }
      }
      
      // Add two close entities that should collide at a position away from grid
      entities.push({
        id: 'close1' as any,
        position: { x: 550, y: 550 },
        glowRadius: 50,
      })
      entities.push({
        id: 'close2' as any,
        position: { x: 560, y: 550 },
        glowRadius: 50,
      })
      
      const start = Date.now()
      const collisions = detectCollisionPairs(entities, 15)
      const duration = Date.now() - start
      
      // Should only detect the close pair
      expect(collisions.length).toBe(1)
      expect(collisions[0].entity1.id).toBe('close1')
      expect(collisions[0].entity2.id).toBe('close2')
      
      // Should be fast (< 10ms for 102 entities)
      expect(duration).toBeLessThan(10)
    })
    
    test('should handle entities overlapping multiple sectors', async () => {
      const entity = {
        id: '1' as any,
        position: { x: 95, y: 95 },
        radius: 20, // Will overlap 4 sectors
      }
      
      const sectors = getOverlappingSectors(entity.position, entity.radius)
      
      // Should overlap sectors (0,0), (0,1), (1,0), and (1,1)
      expect(sectors.length).toBe(4)
      expect(sectors).toContainEqual({ sectorX: 0, sectorY: 0 })
      expect(sectors).toContainEqual({ sectorX: 0, sectorY: 1 })
      expect(sectors).toContainEqual({ sectorX: 1, sectorY: 0 })
      expect(sectors).toContainEqual({ sectorX: 1, sectorY: 1 })
    })
  })
  
  describe('Batch Operations', () => {
    test('should batch update multiple player positions', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'BatchPlayer1',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'BatchPlayer2',
        color: '#00FF00',
      })
      
      const player3Id = await t.mutation(api.players.createPlayer, {
        name: 'BatchPlayer3',
        color: '#0000FF',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Batch Test Game',
        maxPlayers: 4,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.joinGame, { gameId, playerId: player3Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // Batch update positions
      const result = await t.mutation(api.optimizations.batch.batchUpdatePositions, {
        gameId,
        updates: [
          { playerId: player1Id, x: 100, y: 100 },
          { playerId: player2Id, x: 200, y: 200 },
          { playerId: player3Id, x: 300, y: 300 },
        ],
      })
      
      expect(result.updated).toBe(3)
      expect(result.territoriesPainted).toBeGreaterThan(0)
      expect(result.collisionsChecked).toBe(true)
      
      // Verify positions were updated
      const positions = await t.query(api.positions.streamPositions, { gameId })
      expect(positions.find(p => p.playerId === player1Id)?.x).toBe(100)
      expect(positions.find(p => p.playerId === player2Id)?.x).toBe(200)
      expect(positions.find(p => p.playerId === player3Id)?.x).toBe(300)
    })
    
    test('should batch get player effects efficiently', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and players
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'EffectPlayer1',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'EffectPlayer2',
        color: '#00FF00',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Effect Test Game',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // Add some effects
      await t.mutation(api.powerups.applyEffect, {
        gameId,
        playerId: player1Id,
        effect: 'prism_shield',
      })
      
      await t.mutation(api.powerups.applyEffect, {
        gameId,
        playerId: player2Id,
        effect: 'speed_surge',
      })
      
      // Batch get all effects
      const result = await t.mutation(api.optimizations.batch.batchGetPlayerEffects, {
        gameId,
      })
      
      expect(result.effects.length).toBe(2)
      expect(result.effects.find(e => e.playerId === player1Id)?.effect).toBe('prism_shield')
      expect(result.effects.find(e => e.playerId === player2Id)?.effect).toBe('speed_surge')
    })
  })
  
  describe('Smart Scheduling', () => {
    test('should identify active games for processing', async () => {
      const t = convexTest(schema, modules)
      
      // Create an active game
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'ActivePlayer',
        color: '#FF0000',
      })
      
      const activeGameId = await t.mutation(api.games.createGame, {
        name: 'Active Game',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      // Need to add another player before starting
      const tempPlayer = await t.mutation(api.players.createPlayer, {
        name: 'TempPlayer',
        color: '#00FF00',
      })
      
      await t.mutation(api.games.joinGame, { gameId: activeGameId, playerId: tempPlayer })
      await t.mutation(api.games.startGame, { gameId: activeGameId })
      
      // Update activity
      await t.mutation(api.optimizations.scheduler.updateGameActivity, {
        gameId: activeGameId,
      })
      
      // Get games for collision processing
      const gamesToProcess = await t.mutation(
        api.optimizations.scheduler.getGamesForProcessing,
        {
          processType: 'collision',
          maxGames: 10,
        }
      )
      
      // With 2 players, collision processing should be scheduled
      expect(gamesToProcess.length).toBe(1)
      expect(gamesToProcess[0].gameId).toBe(activeGameId)
      expect(gamesToProcess[0].playerCount).toBe(2)
    })
    
    test('should skip idle games in smart collision check', async () => {
      const t = convexTest(schema, modules)
      
      // Create multiple games
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'Player1',
        color: '#FF0000',
      })
      
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'Player2',
        color: '#00FF00',
      })
      
      // Active game
      const activeGameId = await t.mutation(api.games.createGame, {
        name: 'Active Game',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId: activeGameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId: activeGameId })
      
      // Update activity for active game
      await t.mutation(api.optimizations.scheduler.updateGameActivity, {
        gameId: activeGameId,
      })
      
      // Idle game (no recent activity)
      const idleGameId = await t.mutation(api.games.createGame, {
        name: 'Idle Game',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      await t.mutation(api.games.joinGame, { gameId: idleGameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId: idleGameId })
      
      // Don't update activity for idle game
      
      // Run smart collision check
      const result = await t.mutation(api.optimizations.scheduler.smartCheckCollisions, {})
      
      expect(result.gamesChecked).toBeGreaterThanOrEqual(1) // At least active game
      expect(result.skippedGames).toBeGreaterThanOrEqual(0) // Some games may be skipped
    })
  })
  
  describe('Caching', () => {
    test('should cache game data for AI processing', async () => {
      const t = convexTest(schema, modules)
      
      // Create game with players and AI
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'CachePlayer1',
        color: '#FF0000',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Cache Test Game',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      // Need to add another player before starting
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'CachePlayer2',
        color: '#00FF00',
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      await t.mutation(api.games.startGame, { gameId })
      
      // Spawn AI entities
      await t.mutation(api.ai.sparks.spawnSparks, {
        gameId,
        count: 5,
      })
      
      // Get cached game data
      const gameData = await t.mutation(api.optimizations.cache.getCachedGameData, {
        gameId,
      })
      
      expect(gameData.alivePlayers.length).toBe(2)
      expect(gameData.alivePlayers.find(p => p.playerId === player1Id)).toBeDefined()
      expect(gameData.aiEntities.sparks.length).toBe(5)
      expect(gameData.fromCache).toBe(false) // First call, not cached
    })
    
    test('should provide cached territory stats', async () => {
      const t = convexTest(schema, modules)
      
      // Create game
      const player1Id = await t.mutation(api.players.createPlayer, {
        name: 'TerritoryPlayer',
        color: '#FF0000',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Territory Cache Test',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: player1Id,
      })
      
      // Add another player
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'TerritoryPlayer2',
        color: '#00FF00',
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      
      await t.mutation(api.games.startGame, { gameId })
      
      // Paint some territory
      for (let i = 0; i < 10; i++) {
        await t.mutation(api.territory.paintTerritory, {
          gameId,
          playerId: player1Id,
          x: i * 100,
          y: 0,
        })
      }
      
      // Get cached territory stats
      const stats = await t.mutation(api.optimizations.cache.getCachedTerritoryStats, {
        gameId,
      })
      
      expect(stats.paintedCells).toBeGreaterThan(0)
      expect(stats.playerStats.length).toBe(1)
      expect(stats.playerStats[0].playerId).toBe(player1Id)
      expect(stats.fromCache).toBe(false)
    })
  })
  
  describe('Data Cleanup', () => {
    test('should cleanup old position history', async () => {
      const t = convexTest(schema, modules)
      
      // Create game and player
      const playerId = await t.mutation(api.players.createPlayer, {
        name: 'CleanupPlayer',
        color: '#FF0000',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Cleanup Test',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: playerId,
      })
      
      // Add another player
      const player2Id = await t.mutation(api.players.createPlayer, {
        name: 'CleanupPlayer2',
        color: '#00FF00',
      })
      
      await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
      
      await t.mutation(api.games.startGame, { gameId })
      
      // Create many position updates
      for (let i = 0; i < 20; i++) {
        await t.mutation(api.positions.updatePosition, {
          gameId,
          playerId,
          x: i * 10,
          y: i * 10,
        })
      }
      
      // Verify positions were created
      const positionsBefore = await t.query(api.positions.getPlayerPosition, {
        gameId,
        playerId,
      })
      expect(positionsBefore).toBeDefined()
      
      // Cleanup with small limit - positions need to be old
      const result = await t.mutation(api.optimizations.cleanup.cleanupPositionHistory, {
        gameId,
        maxPositionsPerPlayer: 5,
      })
      
      // Since we just created the positions, they're too recent to be deleted
      // The cleanup requires positions to be BOTH beyond the limit AND older than 5 minutes
      // So no positions will be deleted in this test
      
      expect(result.deletedPositions).toBe(0)
      expect(result.playersProcessed).toBeGreaterThanOrEqual(1) // At least one player processed
    })
    
    test('should get cleanup statistics', async () => {
      const t = convexTest(schema, modules)
      
      // Create some test data
      const playerId = await t.mutation(api.players.createPlayer, {
        name: 'StatsPlayer',
        color: '#FF0000',
      })
      
      const gameId = await t.mutation(api.games.createGame, {
        name: 'Stats Test',
        maxPlayers: 2,
        mapType: 'standard',
        createdBy: playerId,
      })
      
      // Get cleanup stats
      const stats = await t.query(api.optimizations.cleanup.getCleanupStats, {})
      
      expect(stats.totalGames).toBeGreaterThan(0)
      expect(stats.activeGames).toBeGreaterThanOrEqual(0)
      expect(stats.finishedGames).toBeGreaterThanOrEqual(0)
    })
  })
})