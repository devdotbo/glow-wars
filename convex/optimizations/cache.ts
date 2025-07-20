import { internalMutation, query } from '../_generated/server'
import { v } from 'convex/values'
import { Id } from '../_generated/dataModel'
import { api } from '../_generated/api'

// Cache TTL values
const EFFECT_CACHE_TTL = 2000 // 2 seconds for player effects
const TERRITORY_STATS_CACHE_TTL = 5000 // 5 seconds for territory stats
const PLAYER_DATA_CACHE_TTL = 1000 // 1 second for player data

// In-memory cache interfaces
interface CachedPlayerEffects {
  gameId: Id<'games'>
  timestamp: number
  effects: Map<Id<'players'>, Set<string>>
  detailedEffects: Map<Id<'players'>, Array<{
    effect: string
    expiresAt: number
    metadata?: any
  }>>
}

interface CachedTerritoryStats {
  gameId: Id<'games'>
  timestamp: number
  totalCells: number
  paintedCells: number
  playerStats: Map<Id<'players'>, {
    cellCount: number
    percentage: number
  }>
}

interface CachedGameData {
  gameId: Id<'games'>
  timestamp: number
  alivePlayers: Array<{
    playerId: Id<'players'>
    position: { x: number; y: number }
    glowRadius: number
  }>
  aiEntities: Map<string, Array<{
    id: Id<'aiEntities'>
    position: { x: number; y: number }
    state: string
  }>>
}

// Get cached player effects with automatic refresh
export const getCachedPlayerEffects = internalMutation({
  args: {
    gameId: v.id('games'),
    forceRefresh: v.optional(v.boolean()),
  },
  returns: v.object({
    effects: v.array(v.object({
      playerId: v.id('players'),
      effects: v.array(v.string()),
    })),
    fromCache: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // In a real implementation, we'd use a proper caching solution
    // For now, we'll fetch fresh data but structure it for easy caching
    
    const now = Date.now()
    const effects = await ctx.db
      .query('playerEffects')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .filter(q => q.gt(q.field('expiresAt'), now))
      .collect()
    
    // Group effects by player
    const playerEffectsMap = new Map<Id<'players'>, Set<string>>()
    
    for (const effect of effects) {
      const playerEffects = playerEffectsMap.get(effect.playerId) || new Set()
      playerEffects.add(effect.effect)
      playerEffectsMap.set(effect.playerId, playerEffects)
    }
    
    // Convert to array format
    const result = Array.from(playerEffectsMap.entries()).map(([playerId, effectSet]) => ({
      playerId,
      effects: Array.from(effectSet),
    }))
    
    return {
      effects: result,
      fromCache: false, // In production, this would check cache first
    }
  },
})

// Get specific player effect quickly
export const hasPlayerEffect = internalMutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    effect: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Quick check for specific effect
    const effect = await ctx.db
      .query('playerEffects')
      .withIndex('by_game_and_player', q =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .filter(q => q.eq(q.field('effect'), args.effect))
      .filter(q => q.gt(q.field('expiresAt'), Date.now()))
      .first()
    
    return effect !== null
  },
})

// Get cached territory stats with incremental updates
export const getCachedTerritoryStats = internalMutation({
  args: {
    gameId: v.id('games'),
    recentChanges: v.optional(v.array(v.object({
      gridX: v.number(),
      gridY: v.number(),
      oldOwner: v.optional(v.id('players')),
      newOwner: v.id('players'),
    }))),
  },
  returns: v.object({
    totalCells: v.number(),
    paintedCells: v.number(),
    playerStats: v.array(v.object({
      playerId: v.id('players'),
      cellCount: v.number(),
      percentage: v.number(),
    })),
    fromCache: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // If we have recent changes and cached data, update incrementally
    if (args.recentChanges && args.recentChanges.length < 20) {
      // For small changes, calculate incrementally
      // In production, this would update cached stats
    }
    
    // Full calculation (would be cached in production)
    const territories = await ctx.db
      .query('territory')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()
    
    const totalCells = 100 * 100 // Grid size
    const paintedCells = territories.length
    
    const playerCounts = new Map<string, number>()
    territories.forEach(t => {
      if (t.ownerId) {
        const count = playerCounts.get(t.ownerId) || 0
        playerCounts.set(t.ownerId, count + 1)
      }
    })
    
    const playerStats = Array.from(playerCounts.entries()).map(([playerId, cellCount]) => ({
      playerId: playerId as Id<'players'>,
      cellCount,
      percentage: (cellCount / totalCells) * 100,
    }))
    
    playerStats.sort((a, b) => b.cellCount - a.cellCount)
    
    return {
      totalCells,
      paintedCells,
      playerStats,
      fromCache: false,
    }
  },
})

// Batch get game data for AI processing
export const getCachedGameData = internalMutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.object({
    alivePlayers: v.array(v.object({
      playerId: v.id('players'),
      gamePlayerId: v.id('gamePlayers'),
      position: v.object({ x: v.number(), y: v.number() }),
      glowRadius: v.number(),
      hasShadowCloak: v.boolean(),
    })),
    aiEntities: v.object({
      sparks: v.array(v.object({
        id: v.id('aiEntities'),
        position: v.object({ x: v.number(), y: v.number() }),
        state: v.string(),
        targetId: v.optional(v.id('players')),
      })),
      creepers: v.array(v.object({
        id: v.id('aiEntities'),
        position: v.object({ x: v.number(), y: v.number() }),
        state: v.string(),
        targetId: v.optional(v.id('players')),
      })),
    }),
    fromCache: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Get all alive players
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .filter(q => q.eq(q.field('isAlive'), true))
      .collect()
    
    // Get all player effects for shadow cloak checking
    const now = Date.now()
    const shadowCloaks = await ctx.db
      .query('playerEffects')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .filter(q => q.eq(q.field('effect'), 'shadow_cloak'))
      .filter(q => q.gt(q.field('expiresAt'), now))
      .collect()
    
    const cloakedPlayers = new Set(shadowCloaks.map(e => e.playerId))
    
    // Get all AI entities
    const aiEntities = await ctx.db
      .query('aiEntities')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()
    
    // Format response
    const alivePlayers = gamePlayers.map(gp => ({
      playerId: gp.playerId,
      gamePlayerId: gp._id,
      position: gp.position,
      glowRadius: gp.glowRadius,
      hasShadowCloak: cloakedPlayers.has(gp.playerId),
    }))
    
    const sparks = aiEntities
      .filter(e => e.type === 'spark')
      .map(e => ({
        id: e._id,
        position: e.position,
        state: e.state,
        targetId: e.targetId,
      }))
    
    const creepers = aiEntities
      .filter(e => e.type === 'creeper')
      .map(e => ({
        id: e._id,
        position: e.position,
        state: e.state,
        targetId: e.targetId,
      }))
    
    return {
      alivePlayers,
      aiEntities: { sparks, creepers },
      fromCache: false,
    }
  },
})

// Prefetch and cache data for upcoming operations
export const prefetchGameData = internalMutation({
  args: {
    gameId: v.id('games'),
    operations: v.array(v.union(
      v.literal('collision'),
      v.literal('ai'),
      v.literal('territory'),
      v.literal('effects')
    )),
  },
  returns: v.object({
    prefetched: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const prefetched = []
    
    // Prefetch data based on upcoming operations
    if (args.operations.includes('collision') || args.operations.includes('ai')) {
      await ctx.runMutation(api.optimizations.cache.getCachedGameData, {
        gameId: args.gameId,
      })
      prefetched.push('gameData')
    }
    
    if (args.operations.includes('effects')) {
      await ctx.runMutation(api.optimizations.cache.getCachedPlayerEffects, {
        gameId: args.gameId,
      })
      prefetched.push('playerEffects')
    }
    
    if (args.operations.includes('territory')) {
      await ctx.runMutation(api.optimizations.cache.getCachedTerritoryStats, {
        gameId: args.gameId,
      })
      prefetched.push('territoryStats')
    }
    
    return { prefetched }
  },
})

// Clear cache for a game (useful after major updates)
export const clearGameCache = internalMutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // In production, this would clear all cached data for the game
    // For now, this is a no-op placeholder
    return null
  },
})