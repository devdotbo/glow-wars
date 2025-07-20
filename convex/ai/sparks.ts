import { mutation } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'
import { getCachedGameData } from '../optimizations/cache'
import { batchUpdateAIEntities } from '../optimizations/batch'
import { getEntitiesInRange, buildSpatialIndex } from '../optimizations/spatial'

const SPARK_DETECTION_RADIUS = 50
const SPARK_SPEED = 2
const SPARK_HEALTH = 10
const SPARK_CONSUME_DISTANCE = 10
const MAP_SIZE = 1000

export async function detectNearbyPlayers(
  ctx: any,
  gameId: any,
  position: { x: number; y: number },
  cachedPlayers?: Array<{
    playerId: any
    gamePlayerId: any
    position: { x: number; y: number }
    glowRadius: number
    hasShadowCloak: boolean
  }>
): Promise<{ playerId: any; gamePlayerId: any; distance: number }[]> {
  // Use cached players if provided, otherwise fetch
  let players = cachedPlayers
  if (!players) {
    const gameData = await ctx.runMutation(api.optimizations.cache.getCachedGameData, {
      gameId,
    })
    players = gameData.alivePlayers
  }
  
  // Build spatial index for efficient range queries
  const spatialIndex = buildSpatialIndex(players.map(p => ({
    id: p.gamePlayerId,
    position: p.position,
  })))
  
  // Get players in range using spatial partitioning
  const playersInRange = getEntitiesInRange(position, SPARK_DETECTION_RADIUS, spatialIndex)
  const playerIdSet = new Set(playersInRange.map(p => p.id))
  
  const nearbyPlayers = []
  
  for (const player of players) {
    // Skip players not in range
    if (!playerIdSet.has(player.gamePlayerId)) {
      continue
    }
    
    // Skip cloaked players
    if (player.hasShadowCloak) {
      continue
    }
    
    const dx = player.position.x - position.x
    const dy = player.position.y - position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    nearbyPlayers.push({
      playerId: player.playerId,
      gamePlayerId: player.gamePlayerId,
      distance,
    })
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
    // Get all game data in one query
    const gameData = await ctx.runMutation(api.optimizations.cache.getCachedGameData, {
      gameId: args.gameId,
    })
    
    const sparks = gameData.aiEntities.sparks
    const players = gameData.alivePlayers
    
    // Create player lookup map
    const playerMap = new Map(
      players.map(p => [p.playerId, p])
    )
    
    let consumed = 0
    const updates = []
    
    for (const spark of sparks) {
      const nearbyPlayers = await detectNearbyPlayers(
        ctx,
        args.gameId,
        spark.position,
        players // Pass cached players
      )
      
      if (nearbyPlayers.length > 0 && nearbyPlayers[0].distance < SPARK_CONSUME_DISTANCE) {
        const gamePlayer = playerMap.get(nearbyPlayers[0].playerId)
        
        if (gamePlayer) {
          await ctx.db.patch(gamePlayer.gamePlayerId, {
            glowRadius: Math.min(100, gamePlayer.glowRadius + 5),
          })
          await ctx.db.delete(spark.id)
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
        
        const player = playerMap.get(nearbyPlayers[0].playerId)
        
        if (player) {
          const dx = spark.position.x - player.position.x
          const dy = spark.position.y - player.position.y
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
      
      // Collect update for batch processing
      updates.push({
        entityId: spark.id,
        position: newPosition,
        state: newState,
        targetId: targetId,
      })
    }
    
    // Batch update all sparks
    let updated = 0
    if (updates.length > 0) {
      const result = await ctx.runMutation(api.optimizations.batch.batchUpdateAIEntities, {
        updates,
      })
      updated = result.updated
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