import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const GLOW_DECAY_RATE = 1
const MIN_GLOW_RADIUS = 10
const MAX_GLOW_RADIUS = 100
const MAX_HYPER_GLOW_RADIUS = 200
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
      // Check if player has hyper glow effect for higher cap
      const hyperGlowEffect = await ctx.db
        .query('playerEffects')
        .withIndex('by_game_and_player', q =>
          q.eq('gameId', args.gameId).eq('playerId', player.playerId)
        )
        .filter(q => q.eq(q.field('effect'), 'hyper_glow'))
        .filter(q => q.gt(q.field('expiresAt'), Date.now()))
        .first()
      
      const maxRadius = hyperGlowEffect ? MAX_HYPER_GLOW_RADIUS : MAX_GLOW_RADIUS
      let newGlowRadius = Math.max(MIN_GLOW_RADIUS, player.glowRadius - GLOW_DECAY_RATE)
      newGlowRadius = Math.min(newGlowRadius, maxRadius)
      
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
    
    if (gamePlayer.glowRadius < BOOST_COST) {
      throw new Error('Insufficient glow for boost')
    }
    
    await ctx.db.patch(gamePlayer._id, {
      glowRadius: gamePlayer.glowRadius - BOOST_COST,
    })
    
    return null
  },
})

export const consumeGlow = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    amount: v.number(),
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
    
    const newGlowRadius = Math.max(MIN_GLOW_RADIUS, gamePlayer.glowRadius - args.amount)
    await ctx.db.patch(gamePlayer._id, {
      glowRadius: newGlowRadius,
    })
    
    return null
  },
})

export const calculatePaintingSpeed = query({
  args: {
    glowRadius: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (args.glowRadius >= 50) {
      return 2
    } else if (args.glowRadius >= 30) {
      return 1
    } else {
      return 0
    }
  },
})

export const replenishGlow = mutation({
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
    
    const territory = await ctx.db
      .query('territory')
      .withIndex('by_game', q => q.eq('gameId', args.gameId))
      .filter(q => q.eq(q.field('ownerId'), args.playerId))
      .collect()
    
    const territoryCount = territory.length
    const glowBonus = territoryCount * TERRITORY_GLOW_BONUS
    
    const newGlowRadius = Math.min(MAX_GLOW_RADIUS, gamePlayer.glowRadius + glowBonus)
    await ctx.db.patch(gamePlayer._id, { glowRadius: newGlowRadius })
    
    return null
  },
})

export const decayAllActiveGames = mutation({
  args: {},
  returns: v.object({
    gamesProcessed: v.number(),
  }),
  handler: async (ctx) => {
    const activeGames = await ctx.db
      .query('games')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()
    
    let gamesProcessed = 0
    
    for (const game of activeGames) {
      await ctx.db
        .query('gamePlayers')
        .withIndex('by_game', q => q.eq('gameId', game._id))
        .filter(q => q.eq(q.field('isAlive'), true))
        .collect()
        .then(async (players) => {
          for (const player of players) {
            // Check if player has hyper glow effect for higher cap
            const hyperGlowEffect = await ctx.db
              .query('playerEffects')
              .withIndex('by_game_and_player', q =>
                q.eq('gameId', game._id).eq('playerId', player.playerId)
              )
              .filter(q => q.eq(q.field('effect'), 'hyper_glow'))
              .filter(q => q.gt(q.field('expiresAt'), Date.now()))
              .first()
            
            const maxRadius = hyperGlowEffect ? MAX_HYPER_GLOW_RADIUS : MAX_GLOW_RADIUS
            let newGlowRadius = Math.max(MIN_GLOW_RADIUS, player.glowRadius - GLOW_DECAY_RATE)
            newGlowRadius = Math.min(newGlowRadius, maxRadius)
            
            await ctx.db.patch(player._id, { glowRadius: newGlowRadius })
          }
        })
      
      gamesProcessed++
    }
    
    return { gamesProcessed }
  },
})