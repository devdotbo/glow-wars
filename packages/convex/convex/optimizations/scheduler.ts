import { mutation, internalMutation, query, MutationCtx } from '../_generated/server'
import { v } from 'convex/values'
import { Id } from '../_generated/dataModel'
import { api, internal } from '../_generated/api'
import { GameId } from '../types'

// Time thresholds for smart scheduling
const RECENT_ACTIVITY_THRESHOLD = 5000 // 5 seconds
const IDLE_GAME_THRESHOLD = 30000 // 30 seconds
const CLEANUP_THRESHOLD = 300000 // 5 minutes

// Game activity tracking interface
interface GameActivity {
  gameId: GameId
  lastActivity: number
  playerCount: number
  aiEntityCount: number
}

// Update schema to track game activity
export const updateGameActivity = internalMutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      lastActivity: Date.now(),
    })
    return null
  },
})

// Get active games that need processing
export const getGamesForProcessing = internalMutation({
  args: {
    processType: v.union(
      v.literal('collision'),
      v.literal('ai'),
      v.literal('glow'),
      v.literal('victory')
    ),
    maxGames: v.optional(v.number()),
  },
  returns: v.array(v.object({
    gameId: v.id('games'),
    playerCount: v.number(),
    lastActivity: v.number(),
    priority: v.number(),
  })),
  handler: async (ctx, args) => {
    const activeGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    const now = Date.now()
    const gameActivities: GameActivity[] = []
    
    // Gather activity data for each game
    for (const game of activeGames) {
      const players = await ctx.db
        .query('gamePlayers')
        .withIndex('by_game', q => q.eq('gameId', game._id))
        .filter(q => q.eq(q.field('isAlive'), true))
        .collect()
      
      const aiEntities = await ctx.db
        .query('aiEntities')
        .withIndex('by_game', q => q.eq('gameId', game._id))
        .collect()
      
      gameActivities.push({
        gameId: game._id,
        lastActivity: (game as any).lastActivity || game.startedAt || 0,
        playerCount: players.length,
        aiEntityCount: aiEntities.length,
      })
    }
    
    // Filter and prioritize based on process type
    let filtered = gameActivities.filter(ga => {
      const timeSinceActivity = now - ga.lastActivity
      
      switch (args.processType) {
        case 'collision':
          // Process if recent activity and has multiple players
          return timeSinceActivity < RECENT_ACTIVITY_THRESHOLD && ga.playerCount > 1
          
        case 'ai':
          // Process if has AI entities and not idle
          return ga.aiEntityCount > 0 && timeSinceActivity < IDLE_GAME_THRESHOLD
          
        case 'glow':
          // Process all games with players, but less frequently if idle
          return ga.playerCount > 0
          
        case 'victory':
          // Always check active games
          return true
          
        default:
          return true
      }
    })
    
    // Calculate priority scores
    const gamesWithPriority = filtered.map(ga => {
      let priority = 0
      
      // Higher priority for more players
      priority += ga.playerCount * 10
      
      // Higher priority for recent activity
      const activityScore = Math.max(0, 100 - (now - ga.lastActivity) / 1000)
      priority += activityScore
      
      // Bonus for games with both players and AI
      if (ga.playerCount > 0 && ga.aiEntityCount > 0) {
        priority += 20
      }
      
      return {
        gameId: ga.gameId,
        playerCount: ga.playerCount,
        lastActivity: ga.lastActivity,
        priority,
      }
    })
    
    // Sort by priority and limit results
    gamesWithPriority.sort((a, b) => b.priority - a.priority)
    
    const maxGames = args.maxGames || 10
    return gamesWithPriority.slice(0, maxGames)
  },
})

// Optimized collision check that only processes active games
export const smartCheckCollisions = internalMutation({
  args: {},
  returns: v.object({
    gamesChecked: v.number(),
    totalCollisions: v.number(),
    totalEliminations: v.number(),
    skippedGames: v.number(),
  }),
  handler: async (ctx): Promise<{ gamesChecked: number; totalCollisions: number; totalEliminations: number; skippedGames: number }> => {
    const gamesToProcess: Array<{ gameId: GameId; playerCount: number; lastActivity: number; priority: number }> = await ctx.runMutation(
      internal.optimizations.scheduler.getGamesForProcessing,
      { processType: 'collision', maxGames: 20 }
    )
    
    let totalCollisions = 0
    let totalEliminations = 0
    
    for (const game of gamesToProcess) {
      const result = await ctx.runMutation(api.collision.checkCollisions, {
        gameId: game.gameId,
      })
      
      totalCollisions += result.collisions
      totalEliminations += result.eliminations
      
      // Update activity if there were collisions
      if (result.collisions > 0) {
        await ctx.runMutation(internal.optimizations.scheduler.updateGameActivity, {
          gameId: game.gameId,
        })
      }
    }
    
    // Count total active games to calculate skipped
    const totalActiveGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    return {
      gamesChecked: gamesToProcess.length,
      totalCollisions,
      totalEliminations,
      skippedGames: totalActiveGames.length - gamesToProcess.length,
    }
  },
})

// Optimized AI update that skips idle games
export const smartUpdateAI = internalMutation({
  args: {
    entityType: v.union(v.literal('spark'), v.literal('creeper')),
  },
  returns: v.object({
    gamesUpdated: v.number(),
    entitiesUpdated: v.number(),
    skippedGames: v.number(),
  }),
  handler: async (ctx, args): Promise<{ gamesUpdated: number; entitiesUpdated: number; skippedGames: number }> => {
    const gamesToProcess: Array<{ gameId: GameId; playerCount: number; lastActivity: number; priority: number }> = await ctx.runMutation(
      internal.optimizations.scheduler.getGamesForProcessing,
      { processType: 'ai', maxGames: 15 }
    )
    
    let gamesUpdated = 0
    let entitiesUpdated = 0
    
    for (const game of gamesToProcess) {
      let result
      
      if (args.entityType === 'spark') {
        result = await ctx.runMutation(api.ai.sparks.updateSparkBehavior, {
          gameId: game.gameId,
        })
        entitiesUpdated += result.updated
      } else {
        result = await ctx.runMutation(api.ai.creepers.updateCreeperBehavior, {
          gameId: game.gameId,
        })
        entitiesUpdated += result.updated
      }
      
      if (result.updated > 0) {
        gamesUpdated++
        
        // Update activity
        await ctx.runMutation(internal.optimizations.scheduler.updateGameActivity, {
          gameId: game.gameId,
        })
      }
    }
    
    // Count total games with AI entities
    const allGamesWithAI = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    let totalGamesWithAI = 0
    for (const game of allGamesWithAI) {
      const hasEntities = await ctx.db
        .query('aiEntities')
        .withIndex('by_game_and_type', q => 
          q.eq('gameId', game._id).eq('type', args.entityType)
        )
        .first()
      
      if (hasEntities) {
        totalGamesWithAI++
      }
    }
    
    return {
      gamesUpdated,
      entitiesUpdated,
      skippedGames: totalGamesWithAI - gamesToProcess.length,
    }
  },
})

// Adaptive glow decay based on game activity
export const smartDecayGlow = internalMutation({
  args: {},
  returns: v.object({
    gamesProcessed: v.number(),
    playersDecayed: v.number(),
    skippedGames: v.number(),
  }),
  handler: async (ctx): Promise<{ gamesProcessed: number; playersDecayed: number; skippedGames: number }> => {
    const gamesToProcess: Array<{ gameId: GameId; playerCount: number; lastActivity: number; priority: number }> = await ctx.runMutation(
      internal.optimizations.scheduler.getGamesForProcessing,
      { processType: 'glow' }
    )
    
    const now = Date.now()
    let gamesProcessed = 0
    let playersDecayed = 0
    
    for (const game of gamesToProcess) {
      const timeSinceActivity = now - game.lastActivity
      
      // Adjust decay rate based on activity
      let decayAmount = 0.5 // Default decay
      if (timeSinceActivity > IDLE_GAME_THRESHOLD) {
        decayAmount = 0.1 // Slower decay for idle games
      }
      
      const gamePlayers = await ctx.db
        .query('gamePlayers')
        .withIndex('by_game', q => q.eq('gameId', game.gameId))
        .filter(q => q.eq(q.field('isAlive'), true))
        .collect()
      
      for (const player of gamePlayers) {
        const newRadius = Math.max(10, player.glowRadius - decayAmount)
        
        if (newRadius !== player.glowRadius) {
          await ctx.db.patch(player._id, { glowRadius: newRadius })
          playersDecayed++
        }
      }
      
      if (gamePlayers.length > 0) {
        gamesProcessed++
      }
    }
    
    // Count total active games
    const totalActiveGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    return {
      gamesProcessed,
      playersDecayed,
      skippedGames: totalActiveGames.length - gamesToProcess.length,
    }
  },
})

// Mark games for cleanup
export const identifyInactiveGames = query({
  args: {},
  returns: v.array(v.object({
    gameId: v.id('games'),
    lastActivity: v.number(),
    playerCount: v.number(),
    inactiveDuration: v.number(),
  })),
  handler: async (ctx) => {
    const activeGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    const now = Date.now()
    const inactiveGames = []
    
    for (const game of activeGames) {
      const lastActivity = (game as any).lastActivity || game.startedAt || 0
      const inactiveDuration = now - lastActivity
      
      if (inactiveDuration > CLEANUP_THRESHOLD) {
        const players = await ctx.db
          .query('gamePlayers')
          .withIndex('by_game', q => q.eq('gameId', game._id))
          .collect()
        
        inactiveGames.push({
          gameId: game._id,
          lastActivity,
          playerCount: players.length,
          inactiveDuration,
        })
      }
    }
    
    return inactiveGames
  },
})