import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const GLOW_DECAY_RATE = 1
const MIN_GLOW_RADIUS = 10
const MAX_GLOW_RADIUS = 100
const BOOST_COST = 5
const BOOST_DURATION = 5000
const TERRITORY_GLOW_BONUS = 0.1

export const decayGlow = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    
    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }
    
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .filter(q => q.eq(q.field('isAlive'), true))
      .collect()
    
    for (const player of gamePlayers) {
      const newGlowRadius = Math.max(MIN_GLOW_RADIUS, player.glowRadius - GLOW_DECAY_RATE)
      await ctx.db.patch(player._id, { glowRadius: newGlowRadius })
    }
    
    return null
  },
})

export const boost = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    
    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }
    
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', q =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .unique()
    
    if (!gamePlayer) {
      throw new Error('Player not in game')
    }
    
    if (!gamePlayer.isAlive) {
      throw new Error('Player is not alive')
    }
    
    if (gamePlayer.glowRadius < MIN_GLOW_RADIUS + BOOST_COST) {
      throw new Error('Not enough glow to boost')
    }
    
    await ctx.db.patch(gamePlayer._id, {
      glowRadius: gamePlayer.glowRadius - BOOST_COST,
    })
    
    return null
  },
})

export const calculatePaintingSpeed = query({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
  },
  returns: v.object({
    radius: v.number(),
    efficiency: v.number(),
  }),
  handler: async (ctx, args) => {
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', q =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .unique()
    
    if (!gamePlayer) {
      return { radius: 1, efficiency: 0.5 }
    }
    
    const glowRadius = gamePlayer.glowRadius
    
    let radius = 1
    let efficiency = 0.5
    
    if (glowRadius >= 50) {
      radius = 2
      efficiency = 1.0
    } else if (glowRadius >= 30) {
      radius = 1
      efficiency = 0.8
    } else if (glowRadius >= 20) {
      radius = 1
      efficiency = 0.6
    }
    
    return { radius, efficiency }
  },
})

export const replenishGlow = mutation({
  args: {
    gameId: v.id('games'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    
    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }
    
    const territories = await ctx.db
      .query('territory')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .collect()
    
    const territoryCounts = new Map<string, number>()
    territories.forEach(t => {
      if (t.ownerId) {
        const count = territoryCounts.get(t.ownerId) || 0
        territoryCounts.set(t.ownerId, count + 1)
      }
    })
    
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .filter(q => q.eq(q.field('isAlive'), true))
      .collect()
    
    for (const player of gamePlayers) {
      const territoryCount = territoryCounts.get(player.playerId) || 0
      const glowBonus = Math.floor(territoryCount * TERRITORY_GLOW_BONUS)
      
      if (glowBonus > 0) {
        const newGlowRadius = Math.min(MAX_GLOW_RADIUS, player.glowRadius + glowBonus)
        await ctx.db.patch(player._id, { glowRadius: newGlowRadius })
      }
    }
    
    return null
  },
})

export const decayAllActiveGames = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const activeGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    for (const game of activeGames) {
      const gamePlayers = await ctx.db
        .query('gamePlayers')
        .withIndex('by_game', q => q.eq('gameId', game._id))
        .filter(q => q.eq(q.field('isAlive'), true))
        .collect()
      
      for (const player of gamePlayers) {
        const newGlowRadius = Math.max(MIN_GLOW_RADIUS, player.glowRadius - GLOW_DECAY_RATE)
        await ctx.db.patch(player._id, { glowRadius: newGlowRadius })
      }
    }
    
    return null
  },
})