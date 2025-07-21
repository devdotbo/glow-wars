import { internalMutation, query, MutationCtx, QueryCtx } from '../_generated/server'
import { v } from 'convex/values'
import { Id } from '../_generated/dataModel'
import { api, internal } from '../_generated/api'
import { GameId, PlayerId } from '../types'

// Cleanup thresholds
const POSITION_HISTORY_LIMIT = 100 // Keep last 100 positions per player
const POSITION_HISTORY_AGE = 300000 // 5 minutes
const FINISHED_GAME_RETENTION = 3600000 // 1 hour
const ORPHANED_DATA_AGE = 600000 // 10 minutes
const POWERUP_LIFETIME = 30000 // 30 seconds

// Clean up old position history
export const cleanupPositionHistory = internalMutation({
  args: {
    gameId: v.optional(v.id('games')),
    maxPositionsPerPlayer: v.optional(v.number()),
  },
  returns: v.object({
    deletedPositions: v.number(),
    playersProcessed: v.number(),
  }),
  handler: async (ctx, args) => {
    const maxPositions = args.maxPositionsPerPlayer || POSITION_HISTORY_LIMIT
    const cutoffTime = Date.now() - POSITION_HISTORY_AGE
    
    let deletedPositions = 0
    let playersProcessed = 0
    
    // Get all players in the game (or all players if no game specified)
    const playerQuery = args.gameId
      ? ctx.db
          .query('gamePlayers')
          .withIndex('by_game', q => q.eq('gameId', args.gameId!))
      : ctx.db.query('gamePlayers')
    
    const gamePlayers = await playerQuery.collect()
    
    for (const gamePlayer of gamePlayers) {
      // Get all positions for this player, sorted by timestamp descending
      const positions = await ctx.db
        .query('positions')
        .withIndex('by_game_and_player', q =>
          q.eq('gameId', gamePlayer.gameId).eq('playerId', gamePlayer.playerId)
        )
        .order('desc')
        .collect()
      
      // Keep only the most recent positions
      const positionsToDelete = positions
        .slice(maxPositions)
        .filter(p => p.timestamp < cutoffTime)
      
      // Delete old positions
      for (const position of positionsToDelete) {
        await ctx.db.delete(position._id)
        deletedPositions++
      }
      
      if (positions.length > 0) {
        playersProcessed++
      }
    }
    
    return { deletedPositions, playersProcessed }
  },
})

// Clean up finished game data
export const cleanupFinishedGames = internalMutation({
  args: {
    retentionPeriod: v.optional(v.number()),
  },
  returns: v.object({
    gamesDeleted: v.number(),
    relatedDataDeleted: v.object({
      gamePlayers: v.number(),
      positions: v.number(),
      territory: v.number(),
      aiEntities: v.number(),
      powerups: v.number(),
      playerEffects: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const retention = args.retentionPeriod || FINISHED_GAME_RETENTION
    const cutoffTime = Date.now() - retention
    
    // Find old finished games
    const finishedGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'finished'))
      .filter(q => q.lt(q.field('finishedAt'), cutoffTime))
      .collect()
    
    let gamesDeleted = 0
    const relatedDataDeleted = {
      gamePlayers: 0,
      positions: 0,
      territory: 0,
      aiEntities: 0,
      powerups: 0,
      playerEffects: 0,
    }
    
    for (const game of finishedGames) {
      const gameId = game._id
      
      // Delete all related data
      // GamePlayers
      const gamePlayers = await ctx.db
        .query('gamePlayers')
        .withIndex('by_game', q => q.eq('gameId', gameId))
        .collect()
      
      for (const gp of gamePlayers) {
        await ctx.db.delete(gp._id)
        relatedDataDeleted.gamePlayers++
      }
      
      // Positions
      const positions = await ctx.db
        .query('positions')
        .withIndex('by_game', q => q.eq('gameId', gameId))
        .collect()
      
      for (const pos of positions) {
        await ctx.db.delete(pos._id)
        relatedDataDeleted.positions++
      }
      
      // Territory
      const territories = await ctx.db
        .query('territory')
        .withIndex('by_game', q => q.eq('gameId', gameId))
        .collect()
      
      for (const terr of territories) {
        await ctx.db.delete(terr._id)
        relatedDataDeleted.territory++
      }
      
      // AI Entities
      const aiEntities = await ctx.db
        .query('aiEntities')
        .withIndex('by_game', q => q.eq('gameId', gameId))
        .collect()
      
      for (const entity of aiEntities) {
        await ctx.db.delete(entity._id)
        relatedDataDeleted.aiEntities++
      }
      
      // Powerups
      const powerups = await ctx.db
        .query('powerups')
        .withIndex('by_game', q => q.eq('gameId', gameId))
        .collect()
      
      for (const powerup of powerups) {
        await ctx.db.delete(powerup._id)
        relatedDataDeleted.powerups++
      }
      
      // Player Effects
      const effects = await ctx.db
        .query('playerEffects')
        .withIndex('by_game', q => q.eq('gameId', gameId))
        .collect()
      
      for (const effect of effects) {
        await ctx.db.delete(effect._id)
        relatedDataDeleted.playerEffects++
      }
      
      // Finally, delete the game itself
      await ctx.db.delete(gameId)
      gamesDeleted++
    }
    
    return { gamesDeleted, relatedDataDeleted }
  },
})

// Clean up orphaned data (data without associated game)
export const cleanupOrphanedData = internalMutation({
  args: {},
  returns: v.object({
    orphanedDataDeleted: v.object({
      gamePlayers: v.number(),
      positions: v.number(),
      territory: v.number(),
      aiEntities: v.number(),
      powerups: v.number(),
      playerEffects: v.number(),
    }),
  }),
  handler: async (ctx) => {
    // Get all game IDs
    const games = await ctx.db.query('games').collect()
    const gameIds = new Set(games.map(g => g._id))
    
    const orphanedDataDeleted = {
      gamePlayers: 0,
      positions: 0,
      territory: 0,
      aiEntities: 0,
      powerups: 0,
      playerEffects: 0,
    }
    
    // Check each table for orphaned data
    // GamePlayers
    const gamePlayers = await ctx.db.query('gamePlayers').collect()
    for (const gp of gamePlayers) {
      if (!gameIds.has(gp.gameId)) {
        await ctx.db.delete(gp._id)
        orphanedDataDeleted.gamePlayers++
      }
    }
    
    // Positions
    const positions = await ctx.db.query('positions').take(1000) // Limit to prevent timeout
    for (const pos of positions) {
      if (!gameIds.has(pos.gameId)) {
        await ctx.db.delete(pos._id)
        orphanedDataDeleted.positions++
      }
    }
    
    // Territory
    const territories = await ctx.db.query('territory').take(1000)
    for (const terr of territories) {
      if (!gameIds.has(terr.gameId)) {
        await ctx.db.delete(terr._id)
        orphanedDataDeleted.territory++
      }
    }
    
    // AI Entities
    const aiEntities = await ctx.db.query('aiEntities').collect()
    for (const entity of aiEntities) {
      if (!gameIds.has(entity.gameId)) {
        await ctx.db.delete(entity._id)
        orphanedDataDeleted.aiEntities++
      }
    }
    
    // Powerups
    const powerups = await ctx.db.query('powerups').collect()
    for (const powerup of powerups) {
      if (!gameIds.has(powerup.gameId)) {
        await ctx.db.delete(powerup._id)
        orphanedDataDeleted.powerups++
      }
    }
    
    // Player Effects
    const effects = await ctx.db.query('playerEffects').collect()
    for (const effect of effects) {
      if (!gameIds.has(effect.gameId)) {
        await ctx.db.delete(effect._id)
        orphanedDataDeleted.playerEffects++
      }
    }
    
    return { orphanedDataDeleted }
  },
})

// Archive game data (move to separate archive tables in production)
export const archiveGameData = internalMutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.object({
    archived: v.boolean(),
    summary: v.object({
      gameName: v.string(),
      winnerId: v.optional(v.id('players')),
      duration: v.optional(v.number()),
      playerCount: v.number(),
      finalTerritoryCount: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'finished') {
      return {
        archived: false,
        summary: {
          gameName: 'Unknown',
          winnerId: undefined,
          duration: undefined,
          playerCount: 0,
          finalTerritoryCount: 0,
        },
      }
    }
    
    // Gather summary data
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()
    
    const territories = await ctx.db
      .query('territory')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()
    
    const duration = game.finishedAt && game.startedAt
      ? game.finishedAt - game.startedAt
      : undefined
    
    // In production, this would write to archive tables
    // For now, we just return the summary
    
    return {
      archived: true,
      summary: {
        gameName: game.name,
        winnerId: game.winnerId,
        duration,
        playerCount: gamePlayers.length,
        finalTerritoryCount: territories.length,
      },
    }
  },
})

// Get cleanup statistics
export const getCleanupStats = query({
  args: {},
  returns: v.object({
    totalGames: v.number(),
    activeGames: v.number(),
    finishedGames: v.number(),
    oldFinishedGames: v.number(),
    totalPositions: v.number(),
    totalTerritory: v.number(),
    totalAIEntities: v.number(),
    totalPowerups: v.number(),
    expiredEffects: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now()
    const oldGameCutoff = now - FINISHED_GAME_RETENTION
    
    // Count games
    const games = await ctx.db.query('games').collect()
    const activeGames = games.filter(g => g.status === 'active').length
    const finishedGames = games.filter(g => g.status === 'finished').length
    const oldFinishedGames = games.filter(
      g => g.status === 'finished' && g.finishedAt && g.finishedAt < oldGameCutoff
    ).length
    
    // Count other data (limited queries to prevent timeout)
    const positions = await ctx.db.query('positions').take(1)
    const totalPositions = positions.length // In production, use proper count
    
    const territories = await ctx.db.query('territory').take(1)
    const totalTerritory = territories.length
    
    const aiEntities = await ctx.db.query('aiEntities').collect()
    const totalAIEntities = aiEntities.length
    
    const powerups = await ctx.db.query('powerups').collect()
    const totalPowerups = powerups.length
    
    const effects = await ctx.db.query('playerEffects').collect()
    const expiredEffects = effects.filter(e => e.expiresAt < now).length
    
    return {
      totalGames: games.length,
      activeGames,
      finishedGames,
      oldFinishedGames,
      totalPositions,
      totalTerritory,
      totalAIEntities,
      totalPowerups,
      expiredEffects,
    }
  },
})

// Main cleanup orchestrator
export const runCleanup = internalMutation({
  args: {
    cleanupTypes: v.optional(v.array(v.union(
      v.literal('positions'),
      v.literal('finishedGames'),
      v.literal('orphaned'),
      v.literal('all')
    ))),
  },
  returns: v.object({
    results: v.array(v.object({
      type: v.string(),
      success: v.boolean(),
      details: v.any(),
    })),
  }),
  handler: async (ctx, args): Promise<{ results: Array<{ type: string; success: boolean; details: any }> }> => {
    const types = args.cleanupTypes || ['all']
    const results: Array<{ type: string; success: boolean; details: any }> = []
    
    if (types.includes('all') || types.includes('positions')) {
      try {
        const positionResult = await ctx.runMutation(
          internal.optimizations.cleanup.cleanupPositionHistory,
          {}
        )
        results.push({
          type: 'positions',
          success: true,
          details: positionResult,
        })
      } catch (error) {
        results.push({
          type: 'positions',
          success: false,
          details: { error: (error as Error).message },
        })
      }
    }
    
    if (types.includes('all') || types.includes('finishedGames')) {
      try {
        const gameResult = await ctx.runMutation(
          internal.optimizations.cleanup.cleanupFinishedGames,
          {}
        )
        results.push({
          type: 'finishedGames',
          success: true,
          details: gameResult,
        })
      } catch (error) {
        results.push({
          type: 'finishedGames',
          success: false,
          details: { error: (error as Error).message },
        })
      }
    }
    
    if (types.includes('all') || types.includes('orphaned')) {
      try {
        const orphanedResult = await ctx.runMutation(
          internal.optimizations.cleanup.cleanupOrphanedData,
          {}
        )
        results.push({
          type: 'orphaned',
          success: true,
          details: orphanedResult,
        })
      } catch (error) {
        results.push({
          type: 'orphaned',
          success: false,
          details: { error: (error as Error).message },
        })
      }
    }
    
    return { results }
  },
})