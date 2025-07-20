import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

// Import modules explicitly for convex-test in edge-runtime
const modules = (import.meta as any).glob('./**/*.{js,ts}', {
  eager: false,
})

describe('Territory System', () => {
  test('should paint territory at player position', async () => {
    const t = convexTest(schema, modules)
    
    // Create player and game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'TerritoryPlayer',
      color: '#FF0000',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Territory Test Game',
      maxPlayers: 4,
      mapType: 'standard',
      createdBy: playerId,
    })
    
    // Start the game
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'Player2',
      color: '#00FF00',
    })
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Paint territory
    const result = await t.mutation(api.territory.paintTerritory, {
      gameId,
      playerId,
      x: 155,
      y: 255,
    })
    
    // Expected grid coordinates for position (155, 255) with grid size 10
    expect(result).toMatchObject({
      gridX: 15,
      gridY: 25,
      painted: true,
    })
    // With initial glow radius of 50, should paint 13 cells (radius 2)
    expect(result.cellsPainted).toBe(13)
    
    // Verify territory was created
    const territoryMap = await t.query(api.territory.getTerritoryMap, { gameId })
    expect(territoryMap).toHaveLength(13) // Should match cellsPainted
    // Check that the center cell (15, 25) was painted
    const centerCell = territoryMap.find(t => t.gridX === 15 && t.gridY === 25)
    expect(centerCell).toBeDefined()
    expect(centerCell!.ownerId).toBe(playerId)
  })

  test('should overwrite existing territory', async () => {
    const t = convexTest(schema, modules)
    
    // Create players and game
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'OverwritePlayer1',
      color: '#FF0000',
    })
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'OverwritePlayer2',
      color: '#00FF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Overwrite Test',
      maxPlayers: 2,
      mapType: 'small',
      createdBy: player1Id,
    })
    
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Player 1 paints territory
    await t.mutation(api.territory.paintTerritory, {
      gameId,
      playerId: player1Id,
      x: 100,
      y: 100,
    })
    
    // Get initial painted time
    const territory1 = await t.query(api.territory.getTerritoryMap, { gameId })
    const firstPaintTime = territory1[0].paintedAt
    
    // Wait a bit to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10))
    
    // Player 2 overwrites the same territory
    await t.mutation(api.territory.paintTerritory, {
      gameId,
      playerId: player2Id,
      x: 105, // Same grid cell (10, 10)
      y: 105,
    })
    
    // Verify territory was overwritten
    const territory2 = await t.query(api.territory.getTerritoryMap, { gameId })
    // With glow radius painting, multiple cells are painted
    expect(territory2.length).toBeGreaterThan(1)
    // Check that the center cell (10, 10) belongs to player2
    const centerCell = territory2.find(t => t.gridX === 10 && t.gridY === 10)
    expect(centerCell).toBeDefined()
    expect(centerCell!.ownerId).toBe(player2Id)
    expect(territory2[0].paintedAt).toBeGreaterThan(firstPaintTime)
  })

  test('should calculate territory ownership percentages', async () => {
    const t = convexTest(schema, modules)
    
    // Create players and game
    const player1Id = await t.mutation(api.players.createPlayer, {
      name: 'StatsPlayer1',
      color: '#FF0000',
    })
    const player2Id = await t.mutation(api.players.createPlayer, {
      name: 'StatsPlayer2',
      color: '#00FF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Stats Test',
      maxPlayers: 2,
      mapType: 'small',
      createdBy: player1Id,
    })
    
    await t.mutation(api.games.joinGame, { gameId, playerId: player2Id })
    await t.mutation(api.games.startGame, { gameId })
    
    // Paint some territory for player 1
    await t.mutation(api.territory.paintTerritory, {
      gameId,
      playerId: player1Id,
      x: 10,
      y: 10,
    })
    await t.mutation(api.territory.paintTerritory, {
      gameId,
      playerId: player1Id,
      x: 20,
      y: 20,
    })
    await t.mutation(api.territory.paintTerritory, {
      gameId,
      playerId: player1Id,
      x: 30,
      y: 30,
    })
    
    // Paint some territory for player 2
    await t.mutation(api.territory.paintTerritory, {
      gameId,
      playerId: player2Id,
      x: 40,
      y: 40,
    })
    await t.mutation(api.territory.paintTerritory, {
      gameId,
      playerId: player2Id,
      x: 50,
      y: 50,
    })
    
    // Get territory stats
    const stats = await t.query(api.territory.calculateTerritoryStats, { gameId })
    
    expect(stats).toMatchObject({
      totalCells: 10000, // 100x100 grid
    })
    // With glow radius painting, more cells are painted
    expect(stats.paintedCells).toBeGreaterThan(5)
    
    // Check player percentages
    expect(stats.playerStats).toHaveLength(2)
    // Players should have painted multiple cells due to glow radius
    const player1Stats = stats.playerStats.find(s => s.playerId === player1Id)
    const player2Stats = stats.playerStats.find(s => s.playerId === player2Id)
    expect(player1Stats!.cellCount).toBeGreaterThan(2)
    expect(player2Stats!.cellCount).toBeGreaterThan(1)
  })

  test('should automatically paint territory when position updates', async () => {
    const t = convexTest(schema, modules)
    
    // Create player and game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'AutoPaintPlayer',
      color: '#FF00FF',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Auto Paint Test',
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
    
    // Update position (should automatically paint territory)
    await t.mutation(api.positions.updatePosition, {
      gameId,
      playerId,
      x: 75,
      y: 85,
    })
    
    // Verify territory was painted
    const territoryMap = await t.query(api.territory.getTerritoryMap, { gameId })
    // With glow radius painting, multiple cells are painted
    expect(territoryMap.length).toBeGreaterThan(1)
    // Check that the center cell (7, 8) was painted
    const centerCell = territoryMap.find(t => t.gridX === 7 && t.gridY === 8)
    expect(centerCell).toBeDefined()
    expect(centerCell!.ownerId).toBe(playerId)
  })

  test('should handle concurrent territory painting', async () => {
    const t = convexTest(schema, modules)
    
    // Create multiple players
    const players = await Promise.all([
      t.mutation(api.players.createPlayer, {
        name: 'ConcurrentTerritoryPlayer1',
        color: '#FF0000',
      }),
      t.mutation(api.players.createPlayer, {
        name: 'ConcurrentTerritoryPlayer2',
        color: '#00FF00',
      }),
      t.mutation(api.players.createPlayer, {
        name: 'ConcurrentTerritoryPlayer3',
        color: '#0000FF',
      }),
    ])
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Concurrent Territory Test',
      maxPlayers: 3,
      mapType: 'standard',
      createdBy: players[0],
    })
    
    await t.mutation(api.games.joinGame, { gameId, playerId: players[1] })
    await t.mutation(api.games.joinGame, { gameId, playerId: players[2] })
    await t.mutation(api.games.startGame, { gameId })
    
    // Paint territory concurrently at different positions
    const paintResults = await Promise.allSettled([
      t.mutation(api.territory.paintTerritory, {
        gameId,
        playerId: players[0],
        x: 100,
        y: 100,
      }),
      t.mutation(api.territory.paintTerritory, {
        gameId,
        playerId: players[1],
        x: 200,
        y: 200,
      }),
      t.mutation(api.territory.paintTerritory, {
        gameId,
        playerId: players[2],
        x: 300,
        y: 300,
      }),
    ])
    
    // All should succeed
    expect(paintResults.filter((r) => r.status === 'fulfilled')).toHaveLength(3)
    
    // Verify all territories were painted
    const territoryMap = await t.query(api.territory.getTerritoryMap, { gameId })
    // With glow radius painting, many more cells are painted
    expect(territoryMap.length).toBeGreaterThan(3)
    
    const gridPositions = territoryMap.map((t) => `${t.gridX},${t.gridY}`)
    // Check that center positions were painted
    expect(gridPositions).toContain('10,10')
    expect(gridPositions).toContain('20,20')
    expect(gridPositions).toContain('30,30')
  })

  test('should validate grid boundaries', async () => {
    const t = convexTest(schema, modules)
    
    // Create player and game
    const playerId = await t.mutation(api.players.createPlayer, {
      name: 'BoundaryTerritoryPlayer',
      color: '#FFFF00',
    })
    
    const gameId = await t.mutation(api.games.createGame, {
      name: 'Territory Boundary Test',
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
    
    // Position that would result in out-of-bounds grid coordinates
    await expect(
      t.mutation(api.territory.paintTerritory, {
        gameId,
        playerId,
        x: 1001, // Would be gridX = 100, which is out of bounds
        y: 500,
      })
    ).rejects.toThrow('Grid position out of bounds')
  })
})