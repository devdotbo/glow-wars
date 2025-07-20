import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const MAP_SIZE = 1000
const GRID_SIZE = 10 // Each territory cell is 10x10 units
const GRID_CELLS = MAP_SIZE / GRID_SIZE // 100 cells per dimension

// Helper function to paint territory (can be called from other mutations)
export async function paintTerritoryHelper(
  ctx: any,
  args: {
    gameId: any,
    playerId: any,
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
      .withIndex('by_game_and_player', (q) =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .unique()
    
    if (!gamePlayer || !gamePlayer.isAlive) {
      throw new Error('Player is not in game or not alive')
    }
    
    // Check if territory cell already exists
    const existingTerritory = await ctx.db
      .query('territory')
      .withIndex('by_game_and_position', (q) =>
        q.eq('gameId', args.gameId).eq('gridX', gridX).eq('gridY', gridY)
      )
      .unique()
    
    if (existingTerritory) {
      // Update existing territory
      await ctx.db.patch(existingTerritory._id, {
        ownerId: args.playerId,
        paintedAt: Date.now(),
      })
      return { gridX, gridY, painted: true }
    } else {
      // Create new territory cell
      await ctx.db.insert('territory', {
        gameId: args.gameId,
        gridX,
        gridY,
        ownerId: args.playerId,
        paintedAt: Date.now(),
      })
      return { gridX, gridY, painted: true }
    }
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
        playerId: playerId as any, // Cast to Id type
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

