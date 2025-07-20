import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { paintTerritoryHelper } from './territory'
import { checkCollisionsHelper } from './collision'

const MAP_SIZE = 1000

export const updatePosition = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    x: v.number(),
    y: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validate boundaries
    if (args.x < 0 || args.x > MAP_SIZE || args.y < 0 || args.y > MAP_SIZE) {
      throw new Error(`Position out of bounds. Must be between 0 and ${MAP_SIZE}`)
    }

    // Get game and verify it's active
    const game = await ctx.db.get(args.gameId)
    if (!game) {
      throw new Error('Game not found')
    }
    if (game.status !== 'active') {
      throw new Error('Game is not active')
    }

    // Get game player and verify they're alive
    const gamePlayer = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game_and_player', (q) =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .unique()

    if (!gamePlayer) {
      throw new Error('Player not in game')
    }
    if (!gamePlayer.isAlive) {
      throw new Error('Player is not alive')
    }

    // Update position in gamePlayers table
    await ctx.db.patch(gamePlayer._id, {
      position: { x: args.x, y: args.y },
    })

    // Record position history
    await ctx.db.insert('positions', {
      gameId: args.gameId,
      playerId: args.playerId,
      x: args.x,
      y: args.y,
      timestamp: Date.now(),
    })

    // Automatically paint territory at new position
    await paintTerritoryHelper(ctx, {
      gameId: args.gameId,
      playerId: args.playerId,
      x: args.x,
      y: args.y,
    })

    // Check for collisions after position update
    await checkCollisionsHelper(ctx, {
      gameId: args.gameId,
    })

    return null
  },
})

export const getPlayerPosition = query({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
  },
  returns: v.union(
    v.object({
      x: v.number(),
      y: v.number(),
      timestamp: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get latest position from positions table
    const position = await ctx.db
      .query('positions')
      .withIndex('by_game_and_player', (q) =>
        q.eq('gameId', args.gameId).eq('playerId', args.playerId)
      )
      .order('desc')
      .first()

    if (!position) {
      // Fall back to gamePlayers position
      const gamePlayer = await ctx.db
        .query('gamePlayers')
        .withIndex('by_game_and_player', (q) =>
          q.eq('gameId', args.gameId).eq('playerId', args.playerId)
        )
        .unique()

      if (gamePlayer) {
        return {
          x: gamePlayer.position.x,
          y: gamePlayer.position.y,
          timestamp: gamePlayer.joinedAt,
        }
      }
      return null
    }

    return {
      x: position.x,
      y: position.y,
      timestamp: position.timestamp,
    }
  },
})

export const streamPositions = query({
  args: {
    gameId: v.id('games'),
  },
  returns: v.array(
    v.object({
      playerId: v.id('players'),
      x: v.number(),
      y: v.number(),
      glowRadius: v.number(),
      isAlive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all alive players in the game
    const gamePlayers = await ctx.db
      .query('gamePlayers')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .filter((q) => q.eq(q.field('isAlive'), true))
      .collect()

    // Return current positions
    return gamePlayers.map((gp) => ({
      playerId: gp.playerId,
      x: gp.position.x,
      y: gp.position.y,
      glowRadius: gp.glowRadius,
      isAlive: gp.isAlive,
    }))
  },
})