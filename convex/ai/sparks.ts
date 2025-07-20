import { mutation } from '../_generated/server'
import { v } from 'convex/values'

const SPARK_DETECTION_RADIUS = 50
const SPARK_SPEED = 2
const SPARK_HEALTH = 10
const SPARK_CONSUME_DISTANCE = 10
const MAP_SIZE = 1000

export async function detectNearbyPlayers(
  ctx: any,
  gameId: any,
  position: { x: number; y: number }
): Promise<{ playerId: any; distance: number }[]> {
  const gamePlayers = await ctx.db
    .query('gamePlayers')
    .withIndex('by_game', (q: any) => q.eq('gameId', gameId))
    .filter((q: any) => q.eq(q.field('isAlive'), true))
    .collect()
  
  const nearbyPlayers = []
  
  for (const player of gamePlayers) {
    // Check if player has shadow cloak effect
    const cloakEffect = await ctx.db
      .query('playerEffects')
      .withIndex('by_game_and_player', (q: any) =>
        q.eq('gameId', gameId).eq('playerId', player.playerId)
      )
      .filter((q: any) => q.eq(q.field('effect'), 'shadow_cloak'))
      .filter((q: any) => q.gt(q.field('expiresAt'), Date.now()))
      .first()
    
    // Skip cloaked players
    if (cloakEffect) {
      continue
    }
    
    const dx = player.position.x - position.x
    const dy = player.position.y - position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance <= SPARK_DETECTION_RADIUS) {
      nearbyPlayers.push({
        playerId: player.playerId,
        distance,
      })
    }
  }
  
  return nearbyPlayers.sort((a, b) => a.distance - b.distance)
}

export const spawnSparks = mutation({
  args: {
    gameId: v.id('games'),
    count: v.optional(v.number()),
  },
  returns: v.array(v.id('aiEntities')),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    
    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }
    
    const sparkCount = args.count || 8
    const entityIds = []
    
    for (let i = 0; i < sparkCount; i++) {
      const position = {
        x: Math.random() * (MAP_SIZE - 100) + 50,
        y: Math.random() * (MAP_SIZE - 100) + 50,
      }
      
      const entityId = await ctx.db.insert('aiEntities', {
        gameId: args.gameId,
        type: 'spark',
        position,
        state: 'wander',
        targetId: undefined,
        health: SPARK_HEALTH,
      })
      
      entityIds.push(entityId)
    }
    
    return entityIds
  },
})

export async function updateSparkBehaviorHelper(
  ctx: any,
  args: { gameId: any }
): Promise<{ updated: number; consumed: number }> {
    const sparks = await ctx.db
      .query('aiEntities')
      .withIndex('by_game_and_type', (q: any) =>
        q.eq('gameId', args.gameId).eq('type', 'spark')
      )
      .collect()
    
    let updated = 0
    let consumed = 0
    
    for (const spark of sparks) {
      const nearbyPlayers = await detectNearbyPlayers(ctx, args.gameId, spark.position)
      
      if (nearbyPlayers.length > 0 && nearbyPlayers[0].distance < SPARK_CONSUME_DISTANCE) {
        const gamePlayer = await ctx.db
          .query('gamePlayers')
          .withIndex('by_game_and_player', (q: any) =>
            q.eq('gameId', args.gameId).eq('playerId', nearbyPlayers[0].playerId)
          )
          .unique()
        
        if (gamePlayer && gamePlayer.isAlive) {
          await ctx.db.patch(gamePlayer._id, {
            glowRadius: Math.min(100, gamePlayer.glowRadius + 5),
          })
          await ctx.db.delete(spark._id)
          consumed++
          continue
        }
      }
      
      let newPosition = { ...spark.position }
      let newState = spark.state
      let targetId = spark.targetId
      
      if (nearbyPlayers.length > 0) {
        newState = 'flee'
        targetId = nearbyPlayers[0].playerId
        
        const player = nearbyPlayers[0]
        const gamePlayer = await ctx.db
          .query('gamePlayers')
          .withIndex('by_game_and_player', (q: any) =>
            q.eq('gameId', args.gameId).eq('playerId', player.playerId)
          )
          .unique()
        
        if (gamePlayer) {
          const dx = spark.position.x - gamePlayer.position.x
          const dy = spark.position.y - gamePlayer.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance > 0) {
            const moveX = (dx / distance) * SPARK_SPEED
            const moveY = (dy / distance) * SPARK_SPEED
            
            newPosition.x = Math.max(10, Math.min(MAP_SIZE - 10, spark.position.x + moveX))
            newPosition.y = Math.max(10, Math.min(MAP_SIZE - 10, spark.position.y + moveY))
          }
        }
      } else {
        newState = 'wander'
        targetId = undefined
        
        const angle = Math.random() * Math.PI * 2
        const moveX = Math.cos(angle) * SPARK_SPEED
        const moveY = Math.sin(angle) * SPARK_SPEED
        
        newPosition.x = Math.max(10, Math.min(MAP_SIZE - 10, spark.position.x + moveX))
        newPosition.y = Math.max(10, Math.min(MAP_SIZE - 10, spark.position.y + moveY))
      }
      
      await ctx.db.patch(spark._id, {
        position: newPosition,
        state: newState,
        targetId,
      })
      
      updated++
    }
    
    return { updated, consumed }
}

export const updateSparkBehavior = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.object({
    updated: v.number(),
    consumed: v.number(),
  }),
  handler: async (ctx, args) => {
    return await updateSparkBehaviorHelper(ctx, args)
  },
})

export const updateAllSparks = mutation({
  args: {},
  returns: v.object({
    gamesUpdated: v.number(),
    totalUpdated: v.number(),
    totalConsumed: v.number(),
  }),
  handler: async (ctx) => {
    const activeGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    let gamesUpdated = 0
    let totalUpdated = 0
    let totalConsumed = 0
    
    for (const game of activeGames) {
      const result = await updateSparkBehaviorHelper(ctx, { gameId: game._id })
      if (result.updated > 0 || result.consumed > 0) {
        gamesUpdated++
        totalUpdated += result.updated
        totalConsumed += result.consumed
      }
    }
    
    return { gamesUpdated, totalUpdated, totalConsumed }
  },
})