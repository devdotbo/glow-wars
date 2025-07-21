import { mutation, query } from '../_generated/server'
import { v } from 'convex/values'
import { api } from '../_generated/api'

export const spawnEntity = mutation({
  args: {
    gameId: v.id('games'),
    type: v.string(),
    position: v.object({ x: v.number(), y: v.number() }),
  },
  returns: v.id('aiEntities'),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    
    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }
    
    const entityId = await ctx.db.insert('aiEntities', {
      gameId: args.gameId,
      type: args.type,
      position: args.position,
      state: 'wander',
      targetId: undefined,
      health: 10,
    })
    
    return entityId
  },
})

export const updateEntityPosition = mutation({
  args: {
    entityId: v.id('aiEntities'),
    position: v.object({ x: v.number(), y: v.number() }),
    state: v.optional(v.string()),
    targetId: v.optional(v.id('players')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entity = await ctx.db.get(args.entityId)
    if (!entity) {
      throw new Error('Entity not found')
    }
    
    const updateData: any = {
      position: args.position,
    }
    
    if (args.state !== undefined) {
      updateData.state = args.state
    }
    
    if (args.targetId !== undefined) {
      updateData.targetId = args.targetId
    }
    
    await ctx.db.patch(args.entityId, updateData)
    
    return null
  },
})

export const consumeEntity = mutation({
  args: {
    entityId: v.id('aiEntities'),
    playerId: v.id('players'),
  },
  returns: v.object({
    glowBonus: v.number(),
    powerupSpawned: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const entity = await ctx.db.get(args.entityId)
    if (!entity) {
      throw new Error('Entity not found')
    }
    
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', q =>
        q.eq('gameId', entity.gameId).eq('playerId', args.playerId)
      )
      .unique()
    
    if (!gamePlayer) {
      throw new Error('Player not in game')
    }
    
    if (!gamePlayer.isAlive) {
      throw new Error('Player is not alive')
    }
    
    const glowBonus = entity.type === 'spark' ? 5 : 0
    
    if (glowBonus > 0) {
      await ctx.db.patch(gamePlayer._id, {
        glowRadius: Math.min(100, gamePlayer.glowRadius + glowBonus),
      })
    }
    
    // Store entity position before deletion
    const entityPosition = entity.position
    const gameId = entity.gameId
    
    await ctx.db.delete(args.entityId)
    
    // 30% chance to spawn a power-up
    let powerupSpawned: string | undefined
    if (Math.random() < 0.3) {
      await ctx.scheduler.runAfter(0, api.powerups.spawnPowerup, {
        gameId,
        position: entityPosition,
      })
      powerupSpawned = 'random'
    }
    
    return { glowBonus, powerupSpawned }
  },
})

export const getEntities = query({
  args: {
    gameId: v.id('games'),
    type: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id('aiEntities'),
      type: v.string(),
      position: v.object({ x: v.number(), y: v.number() }),
      state: v.string(),
      targetId: v.optional(v.id('players')),
      health: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let query
    
    if (args.type) {
      query = ctx.db
        .query('aiEntities')
        .withIndex('by_game_and_type', q =>
          q.eq('gameId', args.gameId).eq('type', args.type!)
        )
    } else {
      query = ctx.db
        .query('aiEntities')
        .withIndex('by_game', q => q.eq('gameId', args.gameId))
    }
    
    const entities = await query.collect()
    
    return entities.map(entity => ({
      _id: entity._id,
      type: entity.type,
      position: entity.position,
      state: entity.state,
      targetId: entity.targetId,
      health: entity.health,
    }))
  },
})

export const removeDeadEntities = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const deadEntities = await ctx.db
      .query('aiEntities')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .filter(q => q.lte(q.field('health'), 0))
      .collect()
    
    let removed = 0
    for (const entity of deadEntities) {
      await ctx.db.delete(entity._id)
      removed++
    }
    
    return removed
  },
})