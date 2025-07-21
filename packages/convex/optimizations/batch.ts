import { mutation, internalMutation } from '../_generated/server'
import { v } from 'convex/values'
import { Id } from '../_generated/dataModel'
import { MutationCtx } from '../_generated/server'
import { paintTerritoryHelper } from '../territory'
import { checkCollisionsHelper } from '../collision'
import { api } from '../_generated/api'

const GRID_SIZE = 10

// Batch position update interface
interface PositionUpdate {
  playerId: Id<'players'>
  x: number
  y: number
}

// Batch territory cell
interface TerritoryCell {
  gridX: number
  gridY: number
  ownerId: Id<'players'>
}

// Helper to validate position updates
function validatePositionUpdate(update: PositionUpdate, mapSize: number = 1000): boolean {
  return update.x >= 0 && update.x <= mapSize && update.y >= 0 && update.y <= mapSize
}

// Batch update multiple player positions
export const batchUpdatePositions = mutation({
  args: {
    gameId: v.id('games'),
    updates: v.array(v.object({
      playerId: v.id('players'),
      x: v.number(),
      y: v.number(),
    })),
  },
  returns: v.object({
    updated: v.number(),
    territoriesPainted: v.number(),
    collisionsChecked: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify game is active
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') {
      throw new Error('Game is not active')
    }
    
    // Get all game players in one query
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()
    
    // Create lookup map
    const playerMap = new Map(
      gamePlayers.map(gp => [gp.playerId, gp])
    )
    
    let updated = 0
    const territoryUpdates: { playerId: Id<'players'>; x: number; y: number }[] = []
    
    // Update all positions
    for (const update of args.updates) {
      if (!validatePositionUpdate(update)) {
        continue
      }
      
      const gamePlayer = playerMap.get(update.playerId)
      if (!gamePlayer || !gamePlayer.isAlive) {
        continue
      }
      
      // Update position
      await ctx.db.patch(gamePlayer._id, {
        position: { x: update.x, y: update.y },
      })
      
      // Record position history
      await ctx.db.insert('positions', {
        gameId: args.gameId,
        playerId: update.playerId,
        x: update.x,
        y: update.y,
        timestamp: Date.now(),
      })
      
      territoryUpdates.push({
        playerId: update.playerId,
        x: update.x,
        y: update.y,
      })
      
      updated++
    }
    
    // Batch paint territories
    const territoriesPainted = await batchPaintTerritoryHelper(ctx, {
      gameId: args.gameId,
      updates: territoryUpdates,
      gamePlayers: Array.from(playerMap.values()),
    })
    
    // Check collisions once after all updates
    if (updated > 0) {
      await checkCollisionsHelper(ctx, { gameId: args.gameId })
    }
    
    return {
      updated,
      territoriesPainted,
      collisionsChecked: updated > 0,
    }
  },
})

// Helper to batch paint territory
async function batchPaintTerritoryHelper(
  ctx: MutationCtx,
  args: {
    gameId: Id<'games'>
    updates: { playerId: Id<'players'>; x: number; y: number }[]
    gamePlayers: any[]
  }
): Promise<number> {
  // Create player lookup for glow radius
  const playerGlowMap = new Map(
    args.gamePlayers.map(gp => [gp.playerId, gp.glowRadius])
  )
  
  // Calculate all cells to paint
  const cellsToPaint = new Map<string, TerritoryCell>()
  
  for (const update of args.updates) {
    const glowRadius = playerGlowMap.get(update.playerId) || 50
    
    // Calculate paint radius
    let paintRadius = 0
    if (glowRadius >= 50) {
      paintRadius = 2
    } else if (glowRadius >= 30) {
      paintRadius = 1
    }
    
    // Calculate grid position
    const gridX = Math.floor(update.x / GRID_SIZE)
    const gridY = Math.floor(update.y / GRID_SIZE)
    
    // Add all cells in radius
    for (let dx = -paintRadius; dx <= paintRadius; dx++) {
      for (let dy = -paintRadius; dy <= paintRadius; dy++) {
        const cellX = gridX + dx
        const cellY = gridY + dy
        
        // Skip out of bounds
        if (cellX < 0 || cellX >= 100 || cellY < 0 || cellY >= 100) {
          continue
        }
        
        // Skip if outside circular radius
        if (dx * dx + dy * dy > paintRadius * paintRadius) {
          continue
        }
        
        const key = `${cellX},${cellY}`
        cellsToPaint.set(key, {
          gridX: cellX,
          gridY: cellY,
          ownerId: update.playerId,
        })
      }
    }
  }
  
  // Get all existing territory cells for this game
  const existingTerritories = await ctx.db
    .query('territory')
    .withIndex('by_game', q => q.eq('gameId', args.gameId))
    .collect()
  
  // Create lookup for existing territories
  const existingMap = new Map(
    existingTerritories.map(t => [`${t.gridX},${t.gridY}`, t])
  )
  
  // Batch update/insert territories
  let painted = 0
  const paintTime = Date.now()
  
  for (const [key, cell] of cellsToPaint) {
    const existing = existingMap.get(key)
    
    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ownerId: cell.ownerId,
        paintedAt: paintTime,
      })
    } else {
      // Insert new
      await ctx.db.insert('territory', {
        gameId: args.gameId,
        gridX: cell.gridX,
        gridY: cell.gridY,
        ownerId: cell.ownerId,
        paintedAt: paintTime,
      })
    }
    painted++
  }
  
  // Check victory conditions if territories were painted
  if (painted > 0) {
    await ctx.runMutation(api.victory.checkVictoryConditions, {
      gameId: args.gameId,
    })
  }
  
  return painted
}

// Batch get player effects
export const batchGetPlayerEffects = internalMutation({
  args: {
    gameId: v.id('games'),
    effectType: v.optional(v.string()),
  },
  returns: v.object({
    effects: v.array(v.object({
      playerId: v.id('players'),
      effect: v.string(),
      expiresAt: v.number(),
      metadata: v.optional(v.any()),
    })),
  }),
  handler: async (ctx, args) => {
    // Get all effects for the game
    let query = ctx.db
      .query('playerEffects')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .filter(q => q.gt(q.field('expiresAt'), Date.now()))
    
    if (args.effectType) {
      query = query.filter(q => q.eq(q.field('effect'), args.effectType))
    }
    
    const effects = await query.collect()
    
    return {
      effects: effects.map(e => ({
        playerId: e.playerId,
        effect: e.effect,
        expiresAt: e.expiresAt,
        metadata: e.metadata,
      })),
    }
  },
})

// Batch territory query for specific cells
export const batchGetTerritoryCells = internalMutation({
  args: {
    gameId: v.id('games'),
    cells: v.array(v.object({
      gridX: v.number(),
      gridY: v.number(),
    })),
  },
  returns: v.array(v.object({
    gridX: v.number(),
    gridY: v.number(),
    ownerId: v.optional(v.id('players')),
    paintedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    // Get all territories for the game
    const territories = await ctx.db
      .query('territory')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()
    
    // Create lookup map
    const territoryMap = new Map(
      territories.map(t => [`${t.gridX},${t.gridY}`, t])
    )
    
    // Return requested cells
    return args.cells.map(cell => {
      const key = `${cell.gridX},${cell.gridY}`
      const territory = territoryMap.get(key)
      
      return {
        gridX: cell.gridX,
        gridY: cell.gridY,
        ownerId: territory?.ownerId,
        paintedAt: territory?.paintedAt,
      }
    })
  },
})

// Batch update AI entities
export const batchUpdateAIEntities = internalMutation({
  args: {
    updates: v.array(v.object({
      entityId: v.id('aiEntities'),
      position: v.optional(v.object({ x: v.number(), y: v.number() })),
      state: v.optional(v.string()),
      targetId: v.optional(v.id('players')),
      health: v.optional(v.number()),
    })),
  },
  returns: v.object({
    updated: v.number(),
  }),
  handler: async (ctx, args) => {
    let updated = 0
    
    for (const update of args.updates) {
      const patch: any = {}
      
      if (update.position !== undefined) patch.position = update.position
      if (update.state !== undefined) patch.state = update.state
      if ('targetId' in update) {
        // Convex doesn't handle undefined in patches well
        // We need to explicitly set the value, even if it's undefined
        patch.targetId = update.targetId
      }
      if (update.health !== undefined) patch.health = update.health
      
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(update.entityId, patch)
        updated++
      }
    }
    
    return { updated }
  },
})