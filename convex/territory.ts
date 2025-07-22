import { mutation, query, MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { api, internal } from './_generated/api'
import { batchGetTerritoryCells } from './optimizations/batch'
import { GameId, PlayerId, GameMutationCtx } from './types'

const MAP_SIZE = 1000
const GRID_SIZE = 10 // Each territory cell is 10x10 units
const GRID_CELLS = MAP_SIZE / GRID_SIZE // 100 cells per dimension

// Helper function to paint territory (can be called from other mutations)
export async function paintTerritoryHelper(
  ctx: GameMutationCtx,
  args: {
    gameId: GameId,
    playerId: PlayerId,
    x: number,
    y: number,
  }
) {
    // Convert position to grid coordinates
    const gridX = Math.floor(args.x / GRID_SIZE)
    const gridY = Math.floor(args.y / GRID_SIZE)
    
    // Validate grid boundaries
    if (gridX < 0 || gridX >= GRID_CELLS || gridY < 0 || gridY >= GRID_CELLS) {
      throw new Error('Grid position out of bounds')
    }
    
    // Get game and verify it's active
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }
    
    // Verify player is in game and alive
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', (q: any) =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .unique()
    
    if (!gamePlayer || !gamePlayer.isAlive) {
      throw new Error('Player is not in game or not alive')
    }
    
    // Calculate painting radius based on glow
    const glowRadius = gamePlayer.glowRadius
    let paintRadius = 0
    
    if (glowRadius >= 50) {
      paintRadius = 2
    } else if (glowRadius >= 30) {
      paintRadius = 1
    } else {
      paintRadius = 0
    }
    
    // Calculate all cells to paint first
    const cellsToPaint = []
    
    // Paint cells in radius around position
    for (let dx = -paintRadius; dx <= paintRadius; dx++) {
      for (let dy = -paintRadius; dy <= paintRadius; dy++) {
        const cellX = gridX + dx
        const cellY = gridY + dy
        
        // Skip cells outside grid bounds
        if (cellX < 0 || cellX >= GRID_CELLS || cellY < 0 || cellY >= GRID_CELLS) {
          continue
        }
        
        // Check if within circular radius
        if (dx * dx + dy * dy > paintRadius * paintRadius) {
          continue
        }
        
        cellsToPaint.push({ gridX: cellX, gridY: cellY })
      }
    }
    
    // Batch fetch existing territories
    const existingTerritories = await ctx.db
      .query('territory')
      .withIndex('by_game', (q: any) => q.eq('gameId', args.gameId))
      .collect()
    
    // Create lookup map
    const territoryMap = new Map(
      existingTerritories.map((t: any) => [`${t.gridX},${t.gridY}`, t])
    )
    
    const paintTime = Date.now()
    const paintedCells = []
    
    // Batch update/insert territories
    for (const cell of cellsToPaint) {
      const key = `${cell.gridX},${cell.gridY}`
      const existing = territoryMap.get(key)
      
      if (existing) {
        // Update existing territory
        await ctx.db.patch(existing._id, {
          ownerId: args.playerId,
          paintedAt: paintTime,
        })
      } else {
        // Create new territory cell
        await ctx.db.insert('territory', {
          gameId: args.gameId,
          gridX: cell.gridX,
          gridY: cell.gridY,
          ownerId: args.playerId,
          paintedAt: paintTime,
        })
      }
      
      paintedCells.push(cell)
    }
    
    // Check for territory victory if cells were painted
    if (paintedCells.length > 0) {
      await ctx.runMutation(internal.victory.checkVictoryConditions, {
        gameId: args.gameId,
      })
    }
    
    return { gridX, gridY, painted: true, cellsPainted: paintedCells.length }
}

export const paintTerritory = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    x: v.number(),
    y: v.number(),
  },
  returns: v.object({
    gridX: v.number(),
    gridY: v.number(),
    painted: v.boolean(),
  }),
  handler: async (ctx, args) => {
    return await paintTerritoryHelper(ctx, args)
  },
})

export const getTerritoryMap = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.array(
    v.object({
      gridX: v.number(),
      gridY: v.number(),
      ownerId: v.optional(v.id('players')),
      paintedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all territory cells for the game
    const territories = await ctx.db
      .query('territory')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
    
    return territories.map((t) => ({
      gridX: t.gridX,
      gridY: t.gridY,
      ownerId: t.ownerId,
      paintedAt: t.paintedAt,
    }))
  },
})

export const calculateTerritoryStats = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.object({
    totalCells: v.number(),
    paintedCells: v.number(),
    playerStats: v.array(
      v.object({
        playerId: v.id('players'),
        cellCount: v.number(),
        percentage: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get all territory cells for the game
    const territories = await ctx.db
      .query('territory')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
    
    // Calculate total possible cells
    const totalCells = GRID_CELLS * GRID_CELLS
    const paintedCells = territories.length
    
    // Count cells per player
    const playerCounts = new Map<string, number>()
    territories.forEach((t) => {
      if (t.ownerId) {
        const count = playerCounts.get(t.ownerId) || 0
        playerCounts.set(t.ownerId, count + 1)
      }
    })
    
    // Convert to array with percentages
    const playerStats = Array.from(playerCounts.entries()).map(
      ([playerId, cellCount]) => ({
        playerId: playerId as PlayerId,
        cellCount,
        percentage: (cellCount / totalCells) * 100,
      })
    )
    
    // Sort by cell count descending
    playerStats.sort((a, b) => b.cellCount - a.cellCount)
    
    return {
      totalCells,
      paintedCells,
      playerStats,
    }
  },
})

